import { expect, test } from './extension-fixture';
import AxeBuilder from '@axe-core/playwright';
import type { Page, Worker } from '@playwright/test';
import jsQR from 'jsqr';
import { PNG } from 'pngjs';

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

const fixturePort = Number(process.env.CLIPCARD_TEST_PORT_BASE ?? 4321) + 1;
const origin = 'http://127.0.0.1:' + fixturePort;

async function runMenu(
  worker: Worker,
  address: string,
  item: string,
  linkUrl?: string,
  selectionText?: string,
) {
  await worker.evaluate(
    ({ address, item, linkUrl, selectionText }) => {
      const harness = globalThis as typeof globalThis & {
        chrome: {
          tabs: {
            query(query: {
              active: boolean;
            }): Promise<{ id: number; url: string }[]>;
          };
        };
        clipcardTestEvents: { menu(info: unknown, tab: unknown): void };
      };
      return harness.chrome.tabs.query({ active: true }).then((tabs) => {
        const tab = tabs.find(({ url }) => url === address);
        if (!tab) throw new Error('Active fixture tab missing');
        harness.clipcardTestEvents.menu(
          {
            menuItemId: item,
            pageUrl: address,
            frameId: 0,
            linkUrl,
            selectionText,
          },
          tab,
        );
      });
    },
    { address, item, linkUrl, selectionText },
  );
}

async function clipboardPng(page: Page) {
  const payload = await page.evaluate(async () => {
    const [item] = await navigator.clipboard.read();
    if (!item?.types.includes('image/png')) return null;
    const png = await item.getType('image/png');
    return Array.from(new Uint8Array(await png.arrayBuffer()));
  });
  return payload ? PNG.sync.read(Buffer.from(payload)) : null;
}

async function clipboardSource(page: Page) {
  const png = await clipboardPng(page);
  if (!png) return null;
  return (
    jsQR(new Uint8ClampedArray(png.data), png.width, png.height)?.data ?? null
  );
}

interface DomNode {
  nodeId: number;
  nodeName: string;
  attributes?: string[];
  children?: DomNode[];
  shadowRoots?: DomNode[];
}

function labelledButton(node: DomNode, label: string): DomNode | undefined {
  const attributes = node.attributes ?? [];
  const index = attributes.indexOf('aria-label');
  if (
    node.nodeName === 'BUTTON' &&
    index >= 0 &&
    attributes[index + 1] === label
  ) {
    return node;
  }
  for (const child of [...(node.children ?? []), ...(node.shadowRoots ?? [])]) {
    const candidate = labelledButton(child, label);
    if (candidate) return candidate;
  }
}

async function clickToastButton(page: Page, label: string) {
  // DevTools can locate controls in the closed shadow root. Click the same
  // coordinates a pointer would use so clipboard actions keep a user gesture.
  const devtools = await page.context().newCDPSession(page);
  try {
    const { root } = await devtools.send('DOM.getDocument', {
      depth: -1,
      pierce: true,
    });
    const button = labelledButton(root, label);
    if (!button) throw new Error('Missing toast button ' + label);
    const { model } = await devtools.send('DOM.getBoxModel', {
      nodeId: button.nodeId,
    });
    const [left, top, , , right, bottom] = model.border;
    await page.mouse.click((left! + right!) / 2, (top! + bottom!) / 2);
  } finally {
    await devtools.detach();
  }
}

test('opens a sourced card from paste in a clean extension profile', async ({
  extension,
  worker,
}) => {
  const page = await extension.newPage();
  await page.goto(new URL('popup-fallback.html', worker.url()).href);
  await page
    .getByRole('textbox', { name: 'Paste any link…' })
    .fill('https://example.org/city/electric-river?utm_source=fixture');
  await page.getByRole('button', { name: 'Make card' }).click();
  const editor = page.locator('.clip-editor-popup');
  await expect(editor.locator('.cc-headline')).toHaveText('Electric River');
  await expect(editor.locator('.cc-solid')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Copy', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Save for later' }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: /^(Grid|Video)$/ }),
  ).toHaveCount(0);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole('button', { name: 'Auto · 4:5' }).press('Enter');
  await page.getByRole('button', { name: '9:16', exact: true }).click();
  await expect(editor.locator('.cc-card')).toHaveAttribute(
    'data-format',
    '9:16',
  );
});

test.describe('registered browser actions', () => {
  test.use({ instrumentEvents: true });

  test('copies the linked article with its canonical QR and opens the edit popup', async ({
    extension,
    worker,
  }) => {
    await extension.grantPermissions(['clipboard-read', 'clipboard-write'], {
      origin,
    });
    const page = await extension.newPage();
    await page.goto(origin + '/feed.html');
    const clipboard = await page.locator('#preview').getAttribute('href');
    if (!clipboard) throw new Error('Fixture link missing');
    await page.evaluate(() => navigator.clipboard.writeText(''));
    await runMenu(worker, page.url(), 'copy', clipboard);
    await expect(page.locator('clipcard-toast')).toBeVisible({
      timeout: 12_000,
    });
    await page.locator('clipcard-toast').hover();
    await expect
      .poll(() => clipboardSource(page), { timeout: 12_000 })
      .toBe('https://deltadispatch.news/city/electric-river-buses');
    const rendered = await clipboardPng(page);
    if (!rendered) throw new Error('Clipboard PNG missing');
    let brightPhotoSamples = 0;
    for (let y = 470; y < 1100; y += 60) {
      for (let x = 120; x < 960; x += 60) {
        const channel = (y * rendered.width + x) * 4;
        if (rendered.data[channel]! > 110 && rendered.data[channel + 1]! > 75)
          brightPhotoSamples++;
      }
    }
    expect(brightPhotoSamples).toBeGreaterThan(20);
    await clickToastButton(page, 'Copy link for the comment');
    await expect
      .poll(() => page.evaluate(() => navigator.clipboard.readText()))
      .toBe('https://deltadispatch.news/city/electric-river-buses');

    const [frame] = await Promise.all([
      page.waitForEvent('framenavigated', (frame) =>
        frame.url().startsWith(new URL('sheet.html', worker.url()).href),
      ),
      clickToastButton(page, 'Edit'),
    ]);
    await expect(
      frame.locator('.clip-editor-popup .cc-headline'),
    ).toBeVisible();
    await expect(
      frame.getByRole('button', { name: 'Close', exact: true }),
    ).toBeVisible();
    await expect(page.locator('clipcard-popup')).toHaveCSS('right', '12px');
    await expect(page.locator('clipcard-popup')).toHaveCSS('top', '12px');
    const draftUrl = frame.url();
    await frame.locator('.clip-editor-popup .cc-headline').click();
    await frame
      .getByText('Click words to pick the key phrase', { exact: true })
      .click();
    await frame
      .getByRole('textbox', { name: 'Headline' })
      .fill('Electric ferry reaches Dhaka');
    await frame.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(page.locator('clipcard-popup')).toHaveCount(0);
    const reopened = await extension.newPage();
    await reopened.goto(draftUrl);
    await expect(
      reopened.locator('.clip-editor-popup .cc-headline'),
    ).toHaveText('Electric ferry reaches Dhaka');
  });

  test('copies a Solid fallback for an unavailable article and a source fragment for a quote', async ({
    extension,
    worker,
  }) => {
    await extension.grantPermissions(['clipboard-read', 'clipboard-write'], {
      origin,
    });
    const page = await extension.newPage();
    await page.goto(origin + '/feed.html');
    const address = origin + '/not-found';
    await page.locator('#preview').evaluate((link, value) => {
      link.querySelector('img')?.remove();
      link.setAttribute('href', value);
    }, address);
    await page.evaluate(() => navigator.clipboard.writeText(''));
    await runMenu(worker, page.url(), 'copy', address);
    await expect
      .poll(() => clipboardSource(page), { timeout: 12_000 })
      .toBe(address);
    const title = await page.locator('#preview h2').innerText();
    const settings = await extension.newPage();
    await settings.goto(new URL('popup-fallback.html', worker.url()).href);
    await settings.getByRole('button', { name: title, exact: true }).click();
    await expect(
      settings.locator('.clip-editor-popup .cc-solid'),
    ).toBeVisible();
    await settings.close();

    const text = await page.locator('#excerpt').innerText();
    await page.bringToFront();
    await page.evaluate(() => navigator.clipboard.writeText(''));
    await runMenu(worker, page.url(), 'copyQuote', undefined, text);
    await expect
      .poll(() => clipboardSource(page), { timeout: 12_000 })
      .toContain(origin + '/feed.html#:~:text=');
  });

  test('measures 20 one-click card copies', async ({ extension, worker }) => {
    test.skip(
      process.env.CLIPCARD_BENCHMARK !== '1',
      'Run the timing check on a quiet host.',
    );
    test.setTimeout(120_000);
    await extension.grantPermissions(['clipboard-read', 'clipboard-write'], {
      origin,
    });
    const page = await extension.newPage();
    await page.goto(origin + '/feed.html');
    const link = await page.locator('#preview').getAttribute('href');
    if (!link) throw new Error('Fixture link missing');
    const milliseconds: number[] = [];
    for (let index = 0; index < 20; index++) {
      await page.evaluate(() => navigator.clipboard.writeText(''));
      await runMenu(worker, page.url(), 'copy', link);
      await expect
        .poll(
          () =>
            page.evaluate(async () => {
              const [item] = await navigator.clipboard.read();
              return Boolean(item?.types.includes('image/png'));
            }),
          { intervals: [30], timeout: 12_000 },
        )
        .toBe(true);
      await expect
        .poll(
          async () =>
            worker.evaluate(() => {
              const scope = globalThis as typeof globalThis & {
                clipcardCopyTiming?: { start: number; finish: number | null };
              };
              return scope.clipcardCopyTiming?.finish ?? null;
            }),
          { intervals: [30] },
        )
        .not.toBeNull();
      milliseconds.push(
        await worker.evaluate(() => {
          const scope = globalThis as typeof globalThis & {
            clipcardCopyTiming: { start: number; finish: number };
          };
          return (
            scope.clipcardCopyTiming.finish - scope.clipcardCopyTiming.start
          );
        }),
      );
    }
    const sorted = milliseconds.toSorted((first, second) => first - second);
    const median = sorted[9]!;
    const tail = sorted[18]!;
    test.info().annotations.push({
      type: 'click to clipboard',
      description:
        'p50 ' + Math.round(median) + ' ms, p95 ' + Math.round(tail) + ' ms',
    });
    await test.info().attach('Clipboard timing samples', {
      body: JSON.stringify(milliseconds.map(Math.round)),
      contentType: 'application/json',
    });
    expect(median).toBeLessThanOrEqual(1200);
    expect(tail).toBeLessThanOrEqual(2500);
  });
});
