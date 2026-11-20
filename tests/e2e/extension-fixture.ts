import { chromium, expect, test as base } from '@playwright/test';
import type { BrowserContext, Worker } from '@playwright/test';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const extensionPath = fileURLToPath(
  new URL('../../apps/extension/.output/chrome-mv3', import.meta.url),
);
type Fixtures = {
  extension: BrowserContext;
  worker: Worker;
  instrumentEvents: boolean;
};

// The browser menu and toolbar are outside the page. Record the real callbacks
// on a temporary copy so tests can exercise them with deterministic tab data.
const eventHarness = `
  globalThis.clipcardTestEvents = {};
  globalThis.clipcardCopyTiming = null;
  const sendToTab = chrome.tabs.sendMessage.bind(chrome.tabs);
  chrome.tabs.sendMessage = (tabId, message, options) => {
    const result = sendToTab(tabId, message, options);
    if (message?.kind === 'card' && globalThis.clipcardCopyTiming) {
      const timing = globalThis.clipcardCopyTiming;
      result.then(() => { timing.finish = performance.now(); }, () => {});
    }
    return result;
  };
  for (const [kind, event] of [
    ['menu', chrome.contextMenus.onClicked],
    ['action', chrome.action.onClicked],
    ['command', chrome.commands.onCommand]
  ]) {
    const listen = event.addListener.bind(event);
    event.addListener = (handler) => {
      globalThis.clipcardTestEvents[kind] = (...args) => {
        if (kind === 'menu' && args[0].menuItemId === 'copy') {
          globalThis.clipcardCopyTiming = { start: performance.now(), finish: null };
        }
        handler(...args);
      };
      listen(handler);
    };
  }
`;

export const test = base.extend<Fixtures>({
  instrumentEvents: [false, { option: true }],
  extension: async ({ browserName, instrumentEvents }, use) => {
    if (browserName !== 'chromium')
      throw new Error('The extension fixture uses Chromium.');
    const isolated = instrumentEvents
      ? await mkdtemp(join(tmpdir(), 'clipcard-events-'))
      : undefined;
    try {
      const loaded = isolated ?? extensionPath;
      if (isolated) {
        await cp(extensionPath, isolated, { recursive: true });
        const workerPath = join(isolated, 'background.js');
        const workerSource = await readFile(workerPath, 'utf8');
        await writeFile(workerPath, eventHarness + workerSource);
        const manifestPath = join(isolated, 'manifest.json');
        const manifest = JSON.parse(
          await readFile(manifestPath, 'utf8'),
        ) as Record<string, unknown>;
        manifest.host_permissions = ['http://127.0.0.1/*'];
        await writeFile(manifestPath, JSON.stringify(manifest));
      }
      const context = await chromium.launchPersistentContext('', {
        channel: 'chromium',
        args: [
          `--disable-extensions-except=${loaded}`,
          `--load-extension=${loaded}`,
        ],
      });
      try {
        await use(context);
      } finally {
        await context.close();
      }
    } finally {
      if (isolated) await rm(isolated, { recursive: true, force: true });
    }
  },
  worker: async ({ extension, instrumentEvents }, use) => {
    const worker =
      extension.serviceWorkers()[0] ??
      (await extension.waitForEvent('serviceworker'));
    if (instrumentEvents) {
      await expect
        .poll(() =>
          worker.evaluate(() => {
            const scope = globalThis as typeof globalThis & {
              clipcardTestEvents?: { command?: unknown };
            };
            return typeof scope.clipcardTestEvents?.command;
          }),
        )
        .toBe('function');
    }
    await use(worker);
  },
});

export { expect };
