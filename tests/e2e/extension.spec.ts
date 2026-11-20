import { expect, test } from './extension-fixture';

test('loads the localized scaffold and starts the service worker', async ({
  extension,
  worker,
}) => {
  expect(worker.url()).toMatch(/^chrome-extension:\/\/[a-p]+\/background\.js$/);
  const page = await extension.newPage();
  await page.goto(new URL('sheet.html', worker.url()).href);
  await expect(page).toHaveTitle('Clipcard');

  const localizedName = await page.evaluate(() => {
    const scope = globalThis as typeof globalThis & {
      chrome: { i18n: { getMessage(name: string): string } };
    };
    return scope.chrome.i18n.getMessage('ext_name');
  });
  expect(localizedName).toBe(
    'Clipcard – Link to Photo Card & Video Clip Maker with QR Code',
  );

  const manifest = await worker.evaluate(async () =>
    (await fetch('manifest.json')).json(),
  );
  expect(manifest.permissions).toEqual([
    'contextMenus',
    'storage',
    'offscreen',
    'clipboardWrite',
    'activeTab',
    'scripting',
  ]);
  expect(manifest.optional_host_permissions).toEqual(['<all_urls>']);
  for (const path of Object.values(manifest.icons) as string[]) {
    const mime = await page.evaluate(
      async (url) => (await fetch(url)).headers.get('content-type'),
      path,
    );
    expect(mime).toBe('image/png');
  }
});
