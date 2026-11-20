import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium, expect, test } from '@playwright/test';
import type { Page, TestInfo } from '@playwright/test';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

type ExtensionApi = {
  runtime: {
    sendMessage(message: unknown): Promise<{ id: string; png: string } | null>;
  };
  permissions: { getAll(): Promise<{ origins?: string[] }> };
};

const build = resolve(
  'apps/extension/.output/' +
    (process.env.CLIPCARD_TEST_R4_PREVIEW === '1'
      ? 'chrome-mv3-r4-preview'
      : 'chrome-mv3'),
);

async function compareScreen(page: Page, id: string, info: TestInfo) {
  const result = await page.screenshot({
    animations: 'disabled',
    caret: 'hide',
  });
  const actual = PNG.sync.read(result);
  const reference = PNG.sync.read(
    await readFile(
      new URL('../../design/screens/' + id + '.png', import.meta.url),
    ),
  );
  // The reference includes the native browser frame. Capture the web viewport.
  const expected = new PNG({ width: actual.width, height: actual.height });
  PNG.bitblt(
    reference,
    expected,
    0,
    reference.height - actual.height,
    actual.width,
    actual.height,
    0,
    0,
  );
  const difference =
    pixelmatch(actual.data, expected.data, null, actual.width, actual.height, {
      threshold: 0.1,
    }) /
    (actual.width * actual.height);
  info.annotations.push({
    type: id,
    description: (difference * 100).toFixed(2) + '%',
  });
  await info.attach(id, { body: result, contentType: 'image/png' });
  expect(difference, id).toBeLessThanOrEqual(0.03);
}

test('opens Welcome and persists card settings in a fresh install', async ({
  browserName,
}, testInfo) => {
  test.skip(
    browserName !== 'chromium' || process.env.CLIPCARD_TEST_R4_PREVIEW !== '1',
    'Run with the R4 preview build before release.',
  );
  expect(existsSync(build)).toBe(true);
  const context = await chromium.launchPersistentContext('', {
    channel: 'chromium',
    locale: 'en-US',
    viewport: { width: 1440, height: 816 },
    colorScheme: 'light',
    args: ['--disable-extensions-except=' + build, '--load-extension=' + build],
  });
  try {
    const worker =
      context.serviceWorkers()[0] ??
      (await context.waitForEvent('serviceworker'));
    const root = worker.url().split('/').slice(0, 3).join('/');
    const welcomeUrl = root + '/welcome.html';
    await expect
      .poll(() => context.pages().some((page) => page.url() === welcomeUrl))
      .toBe(true);
    const welcome = context.pages().find((page) => page.url() === welcomeUrl)!;
    await expect(welcome.locator('.welcome-fan .cc-card')).toHaveCount(3);
    await expect(
      welcome.getByRole('button', { name: 'Allow', exact: true }),
    ).toBeVisible();
    await compareScreen(welcome, 'O1-welcome', testInfo);
    await welcome.locator('button[lang="bn"]').click();
    await expect(
      welcome.getByRole('heading', { name: 'যেকোনো লিংক → ফটোকার্ড।' }),
    ).toBeVisible();
    await welcome.getByRole('textbox').fill('@delta-desk');
    await welcome.getByRole('button', { name: 'শেষ', exact: true }).click();
    await expect.poll(() => welcome.isClosed()).toBe(true);

    const options = await context.newPage();
    await options.goto(root + '/options.html');
    const languages = options.getByRole('combobox', {
      name: 'ইন্টারফেসের ভাষা',
    });
    await expect(languages).toHaveValue('bn');
    await languages.selectOption('en');
    await expect(
      options.getByRole('heading', { name: 'General' }),
    ).toBeVisible();
    await compareScreen(options, 'O2-settings', testInfo);
    await options.getByRole('button', { name: 'Forest', exact: true }).click();
    await options.getByRole('button', { name: '1:1', exact: true }).click();
    await options.getByRole('switch', { name: 'Texture' }).uncheck();
    await options.getByRole('switch', { name: 'QR code' }).uncheck();
    await options
      .locator('input[type="file"]')
      .first()
      .setInputFiles({
        name: 'mark.svg',
        mimeType: 'image/svg+xml',
        buffer: Buffer.from(
          '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="16"><path d="M0 0h24v16H0z"/></svg>',
        ),
      });
    await expect(
      options.getByRole('button', { name: 'Remove mark' }),
    ).toBeVisible();
    await options.reload();
    await expect(
      options.getByRole('button', { name: 'Forest', exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');
    await expect(
      options.getByRole('switch', { name: 'QR code' }),
    ).not.toBeChecked();
    await expect(
      options.getByRole('button', { name: 'Remove mark' }),
    ).toBeVisible();

    const offscreen = await context.newPage();
    await offscreen.goto(root + '/offscreen.html');
    const card = await options.evaluate(async () => {
      const address = 'https://example.org/r4-settings-test';
      const { chrome } = globalThis as typeof globalThis & {
        chrome: ExtensionApi;
      };
      return chrome.runtime.sendMessage({
        to: 'offscreen',
        kind: 'make',
        render: true,
        source: {
          address,
          canFetch: false,
          hints: {
            address,
            title: 'A city saves time on its river routes',
            source: null,
            image: null,
            imageWidth: 0,
            selection: '',
            referrer: '',
            hoveredLink: null,
          },
        },
      });
    });
    expect(card?.png).toMatch(/^data:image\/png;base64,/);
    const editor = await context.newPage();
    await editor.goto(root + '/popup-fallback.html?draft=' + card?.id);
    const artwork = editor.locator('.cc-card').first();
    await expect(artwork).toHaveAttribute('data-format', '1:1');
    await expect(artwork).toHaveAttribute('data-texture', 'off');
    await expect(artwork).toHaveCSS('background-color', 'rgb(28, 59, 48)');
    await expect(artwork.locator('.cc-mark.cc-mark-image')).toBeVisible();
    await expect(artwork.locator('.cc-qr')).toHaveCount(0);
    await expect(artwork.locator('.cc-oversized')).toBeHidden();

    await options
      .getByRole('button', { name: 'Clear history', exact: true })
      .click();
    await expect(
      options.getByText('Clear the cards and drafts saved in this browser?'),
    ).toBeVisible();
    await options.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(
      options.getByText('Clear the cards and drafts saved in this browser?'),
    ).toHaveCount(0);
    expect(
      await worker.evaluate(async () => {
        const { chrome } = globalThis as typeof globalThis & {
          chrome: ExtensionApi;
        };
        return (await chrome.permissions.getAll()).origins ?? [];
      }),
    ).toEqual([]);
  } finally {
    await context.close();
  }
});
