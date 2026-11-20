import { chromium, expect, test as base } from '@playwright/test';
import type { BrowserContext, Worker } from '@playwright/test';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const extensionPath = fileURLToPath(
  new URL(
    '../../apps/extension/.output/chrome-mv3' +
      (process.env.CLIPCARD_TEST_VIDEO_PREVIEW === '1' ? '-r5-preview' : ''),
    import.meta.url,
  ),
);
type Fixtures = {
  extension: BrowserContext;
  worker: Worker;
  instrumentEvents: boolean;
  syntheticVideo: boolean;
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

// This supplies local fixture frames and a test tone in place of the browser picker.
// The extension still crops, encodes, stores and exports through its normal paths.
const videoHarness = `
  {
    const attach = Element.prototype.attachShadow;
    Element.prototype.attachShadow = function (options) {
      return attach.call(this, this.localName.startsWith('clipcard-video-') ? { mode: 'open' } : options);
    };
    globalThis.CropTarget = {
      fromElement: async (element) => ({ element }),
    };
    Object.defineProperty(navigator.mediaDevices, 'getDisplayMedia', {
      value: async (options) => {
        if (location.hostname !== '127.0.0.1' || location.pathname !== '/video.html')
          throw new DOMException('Fixture use only', 'NotAllowedError');
        const player = document.querySelector('video');
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 360;
        const ctx = canvas.getContext('2d');
        const stream = canvas.captureStream(30);
        const video = stream.getVideoTracks()[0];
        const audio = new AudioContext();
        const destination = audio.createMediaStreamDestination();
        const [sound] = destination.stream.getAudioTracks();
        const tone = new OscillatorNode(audio, { frequency: 440 });
        const volume = new GainNode(audio, { gain: 0.12 });
        tone.connect(volume).connect(destination);
        tone.start();
        await audio.resume();
        video.cropTo = async (target) => {
          if (document.body.dataset.wrongTab || !options.preferCurrentTab || target.element !== player)
            throw new DOMException('Wrong test surface', 'NotAllowedError');
          document.body.dataset.cropped = '1';
        };
        const draw = () => {
          if (video.readyState === 'ended') {
            tone.stop();
            void audio.close();
            return;
          }
          ctx.drawImage(player, 0, 0, canvas.width, canvas.height);
          requestAnimationFrame(draw);
        };
        draw();
        return new MediaStream([video, sound]);
      },
    });
  }
`;

export const test = base.extend<Fixtures>({
  instrumentEvents: [false, { option: true }],
  syntheticVideo: [false, { option: true }],
  extension: async ({ browserName, instrumentEvents, syntheticVideo }, use) => {
    if (browserName !== 'chromium')
      throw new Error('The extension fixture uses Chromium.');
    const isolated =
      instrumentEvents || syntheticVideo
        ? await mkdtemp(join(tmpdir(), 'clipcard-events-'))
        : undefined;
    try {
      const loaded = isolated ?? extensionPath;
      if (isolated) {
        await cp(extensionPath, isolated, { recursive: true });
        const workerPath = join(isolated, 'background.js');
        const workerSource = await readFile(workerPath, 'utf8');
        await writeFile(workerPath, eventHarness + workerSource);
        if (syntheticVideo) {
          const bridgePath = join(isolated, 'content-scripts', 'bridge.js');
          const bridgeSource = await readFile(bridgePath, 'utf8');
          await writeFile(bridgePath, videoHarness + bridgeSource);
        }
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
