import { chromium, test as base } from '@playwright/test';
import type { BrowserContext, Worker } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const extensionPath = fileURLToPath(
  new URL('../../apps/extension/.output/chrome-mv3', import.meta.url),
);
type Fixtures = { extension: BrowserContext; worker: Worker };

export const test = base.extend<Fixtures>({
  extension: async ({ browserName }, use) => {
    if (browserName !== 'chromium')
      throw new Error('The extension fixture uses Chromium.');
    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
      ],
    });
    try {
      await use(context);
    } finally {
      await context.close();
    }
  },
  worker: async ({ extension }, use) => {
    const worker =
      extension.serviceWorkers()[0] ??
      (await extension.waitForEvent('serviceworker'));
    await use(worker);
  },
});

export { expect } from '@playwright/test';
