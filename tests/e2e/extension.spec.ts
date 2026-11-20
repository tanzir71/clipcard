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
  expect(manifest.host_permissions ?? []).toEqual([]);
  expect(manifest.content_scripts ?? []).toEqual([]);
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

type FixtureAction =
  | { kind: 'menu'; item: string; linkUrl?: string; selectionText?: string }
  | { kind: 'toolbar' | 'shortcut' | 'badge' };

async function runBrowserAction(
  worker: Worker,
  address: string,
  action: FixtureAction,
) {
  return worker.evaluate(
    async ({ address, action }) => {
      const harness = globalThis as typeof globalThis & {
        chrome: {
          tabs: {
            query(query: {
              active: boolean;
              lastFocusedWindow: boolean;
            }): Promise<{ id: number; url?: string }[]>;
          };
          action: { getBadgeText(details: { tabId: number }): Promise<string> };
        };
        clipcardTestEvents: {
          menu(info: unknown, tab: unknown): void;
          action(tab: unknown): void;
          command(command: string, tab: unknown): void;
        };
      };
      const [tab] = await harness.chrome.tabs.query({
        active: true,
        lastFocusedWindow: true,
      });
      if (!tab || (tab.url && tab.url !== address)) {
        throw new Error('Active fixture tab missing');
      }
      switch (action.kind) {
        case 'badge':
          return harness.chrome.action.getBadgeText({ tabId: tab.id });
        case 'toolbar':
          return harness.clipcardTestEvents.action(tab);
        case 'shortcut':
          return harness.clipcardTestEvents.command('copy-clipcard', tab);
        case 'menu':
          return harness.clipcardTestEvents.menu(
            {
              menuItemId: action.item,
              pageUrl: address,
              frameId: 0,
              linkUrl: action.linkUrl,
              selectionText: action.selectionText,
            },
            tab,
          );
      }
    },
    { address, action },
  );
}

function runMenu(
  worker: Worker,
  address: string,
  item: string,
  linkUrl?: string,
  selectionText?: string,
) {
  return runBrowserAction(worker, address, {
    kind: 'menu',
    item,
    linkUrl,
    selectionText,
  });
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

test('keeps the card actions visible in a short dark popup', async ({
  extension,
  worker,
}) => {
  const page = await extension.newPage();
  await page.setViewportSize({ width: 392, height: 456 });
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto(new URL('popup-fallback.html', worker.url()).href);
  await page
    .getByRole('textbox', { name: 'Paste any link…' })
    .fill('https://example.org/city/electric-river');
  await page.getByRole('button', { name: 'Make card' }).click();

  const editor = page.locator('.clip-editor-popup');
  await expect(editor.locator('.cc-card')).toHaveAttribute(
    'data-format',
    '4:5',
  );
  await expect(
    page.getByRole('button', { name: 'Close', exact: true }),
  ).toBeInViewport({ ratio: 1 });
  await expect(
    page.getByRole('button', { name: 'Copy', exact: true }),
  ).toBeInViewport({ ratio: 1 });
  await expect(editor).toHaveCSS('background-color', 'rgb(18, 18, 20)');

  await page.getByRole('button', { name: 'Auto · 4:5' }).click();
  await page.getByRole('button', { name: '9:16', exact: true }).click();
  await page
    .getByRole('button', { name: 'Copy', exact: true })
    .scrollIntoViewIfNeeded();
  await expect(
    page.getByRole('button', { name: 'Close', exact: true }),
  ).toBeInViewport({ ratio: 1 });
  await page.getByRole('button', { name: 'Auto · 9:16' }).click();
  await expect(editor.locator('.cc-card')).toHaveAttribute(
    'data-format',
    '9:16',
  );
  await expect(
    page.getByRole('button', { name: 'Copy', exact: true }),
  ).toBeInViewport({ ratio: 1 });
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test.describe('registered browser actions', () => {
  test.use({ instrumentEvents: true });

  test('opens the current article from the toolbar and falls back on a restricted page', async ({
    extension,
    worker,
  }) => {
    const page = await extension.newPage();
    await page.goto(origin + '/feed-story.html');
    await expect
      .poll(() => runBrowserAction(worker, page.url(), { kind: 'badge' }))
      .toBe('•');

    const sheetUrl = new URL('sheet.html', worker.url()).href;
    const [drafts] = await Promise.all([
      page.waitForEvent('framenavigated', (event) =>
        event.url().startsWith(sheetUrl),
      ),
      runBrowserAction(worker, page.url(), { kind: 'toolbar' }),
    ]);
    await expect(
      drafts.getByRole('heading', { name: /^Drafts/ }),
    ).toBeVisible();
    const [frame] = await Promise.all([
      page.waitForEvent(
        'framenavigated',
        (event) =>
          event.url().startsWith(sheetUrl) &&
          new URL(event.url()).searchParams.has('draft'),
      ),
      drafts.getByRole('button', { name: 'Card from this page' }).click(),
    ]);
    const headline = await page.locator('h1').innerText();
    await expect(
      frame
        .locator('.clip-preview-wrap')
        .getByRole('article', { name: headline, exact: true }),
    ).toBeVisible();

    await page.goto(origin + '/feed.html');
    await expect
      .poll(() => runBrowserAction(worker, page.url(), { kind: 'badge' }))
      .toBe('');

    await page.goto('chrome://version/');
    const [fallback] = await Promise.all([
      extension.waitForEvent('page'),
      runBrowserAction(worker, page.url(), { kind: 'toolbar' }),
    ]);
    const expected = new URL('popup-fallback.html', worker.url()).href;
    await expect(fallback).toHaveURL(
      (url) => url.href.split('?')[0] === expected,
    );
    await expect(
      fallback.getByRole('textbox', { name: 'Paste any link…' }),
    ).toBeFocused();
  });

  test('retains clips from multiple pages in one sourced grid', async ({
    extension,
    worker,
  }) => {
    const page = await extension.newPage();
    await page.goto(origin + '/feed-story.html');
    await runMenu(
      worker,
      page.url(),
      'clipText',
      undefined,
      'A quote from the first source.',
    );
    await page.locator('clipcard-clipping').waitFor({ state: 'attached' });

    async function clipCount() {
      return worker.evaluate(async () => {
        if (!(await indexedDB.databases()).some((db) => db.name === 'clipcard'))
          return 0;
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
          const request = indexedDB.open('clipcard');
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        try {
          if (!db.objectStoreNames.contains('clips')) return 0;
          return await new Promise<number>((resolve, reject) => {
            const request = db
              .transaction('clips')
              .objectStore('clips')
              .count();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
          });
        } finally {
          db.close();
        }
      });
    }

    await expect.poll(clipCount).toBe(1);
    await page.goto(origin + '/no-image.html');
    await runMenu(
      worker,
      page.url(),
      'clipText',
      undefined,
      'A quote from the second source.',
    );
    await expect.poll(clipCount).toBe(2);

    const [frame] = await Promise.all([
      page.waitForEvent('framenavigated', (event) =>
        event.url().includes('/sheet.html?drafts='),
      ),
      runBrowserAction(worker, page.url(), { kind: 'toolbar' }),
    ]);
    await frame.locator('.clip-popup-draft').first().click();
    const grid = frame.locator(
      '.clip-grid-preview-wrap [data-layout="excerpts"]',
    );
    await expect(grid.locator('.cc-grid-extract p')).toHaveText([
      'A quote from the first source.',
      'A quote from the second source.',
    ]);
    await expect(grid.locator('.cc-qr')).toHaveCount(2);
  });

  test('copies the hovered link, selection or current page from the shortcut', async ({
    extension,
    worker,
  }) => {
    test.setTimeout(60_000);
    await extension.grantPermissions(['clipboard-read', 'clipboard-write'], {
      origin,
    });
    const page = await extension.newPage();
    const canonical = 'https://deltadispatch.news/city/electric-river-buses';
    await page.goto(origin + '/feed.html');
    await page.locator('#preview').hover();
    await page.evaluate(() => navigator.clipboard.writeText(''));
    await runBrowserAction(worker, page.url(), { kind: 'shortcut' });
    await expect
      .poll(() => clipboardSource(page), { timeout: 12_000 })
      .toBe(canonical);

    await page.goto(origin + '/feed-story.html');
    await page.mouse.move(0, 0);
    await page.locator('article p').evaluate((paragraph) => {
      const text = paragraph.firstChild;
      const selection = window.getSelection();
      if (!text || !selection)
        throw new Error('Article selection is unavailable');
      const range = document.createRange();
      range.setStart(text, 0);
      range.setEnd(text, 'The first boats'.length);
      selection.removeAllRanges();
      selection.addRange(range);
    });
    await page.evaluate(() => navigator.clipboard.writeText(''));
    await runBrowserAction(worker, page.url(), { kind: 'shortcut' });
    await expect
      .poll(() => clipboardSource(page), { timeout: 12_000 })
      .toBe(canonical + '#:~:text=The%20first%20boats');

    await page.evaluate(async () => {
      window.getSelection()?.removeAllRanges();
      await navigator.clipboard.writeText('');
    });
    await runBrowserAction(worker, page.url(), { kind: 'shortcut' });
    await expect
      .poll(() => clipboardSource(page), { timeout: 12_000 })
      .toBe(canonical);
  });

  test('copies the linked article with its canonical QR and opens the edit popup', async ({
    extension,
    worker,
  }) => {
    test.setTimeout(60_000);
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
    if (process.env.CLIPCARD_LANDING_SCREENSHOT) {
      const viewport = page.viewportSize();
      if (!viewport) throw new Error('Missing landing capture viewport');
      await page.screenshot({
        path: process.env.CLIPCARD_LANDING_SCREENSHOT,
        clip: { x: viewport.width - 525, y: 0, width: 525, height: 383 },
      });
    }
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
    const preview = frame.locator('.clip-preview-wrap > .clip-preview');
    const copy = frame.getByRole('button', { name: 'Copy', exact: true });
    await expect(preview).toHaveCSS('width', '392px');
    for (const [width, height] of [
      [1024, 576],
      [854, 480],
      [640, 360],
    ] as const) {
      await page.setViewportSize({ width, height });
      await expect(preview).not.toHaveCSS('width', '392px');
      await expect(copy).toBeInViewport({ ratio: 1 });
      await expect(
        frame.getByRole('button', { name: 'Close', exact: true }),
      ).toBeInViewport({ ratio: 1 });
    }
    await page.setViewportSize({ width: 1280, height: 720 });
    await expect(preview).toHaveCSS('width', '392px');
    await page.emulateMedia({ colorScheme: 'dark' });
    await expect(frame.locator('.clip-editor-popup')).toHaveCSS(
      'background-color',
      'rgb(18, 18, 20)',
    );
    await page.emulateMedia({ colorScheme: 'light' });
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
