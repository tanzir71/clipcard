import AxeBuilder from '@axe-core/playwright';
import { expect, test } from './site-fixture';
import type { Page } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { PNG } from 'pngjs';
import jsQR from 'jsqr';
import { buildBookmarklet } from '../../scripts/bookmarklet.ts';

import {
  BATCH_RELEASED,
  VIDEO_CLIPS_RELEASED,
} from '../../packages/core/flags.ts';

const source = 'https://publisher.example/city/electric-river-buses';
const photo = fileURLToPath(
  new URL('../../design/photos/river-bus.jpg', import.meta.url),
);
const field = 'Paste a link, text or an image to add a source';

test('makes and edits a sourced card, copies a PNG and restores it from history', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('./');
  const icon = page.locator('link[rel="icon"]');
  await expect(icon).toHaveAttribute('href', /^\/clipcard\/app\//);
  const iconUrl = await icon.evaluate((link: HTMLLinkElement) => link.href);
  const iconResponse = await page.request.get(iconUrl);
  expect(iconResponse.ok()).toBe(true);
  expect(iconResponse.headers()['content-type']).toContain('image/svg+xml');

  await page
    .getByRole('textbox', { name: field })
    .fill(source + '?utm_campaign=test');
  await page.getByRole('button', { name: 'Make card', exact: true }).click();
  await expect(
    page.locator('.clip-editor-canvas .cc-solid').first(),
  ).toBeVisible();
  await expect(page.locator('.clip-source')).toHaveAttribute('href', source);
  await page
    .getByRole('textbox', { name: 'Headline', exact: true })
    .fill('Electric ferry opens in Dhaka');
  await expect(
    page.locator('.clip-editor-canvas .cc-meta').first(),
  ).toContainText('Edited');
  await page.getByRole('button', { name: 'Auto · 4:5' }).click();
  await page.getByRole('button', { name: '9:16', exact: true }).click();
  await expect(
    page.locator('.clip-editor-canvas .cc-card').first(),
  ).toHaveAttribute('data-format', '9:16');
  await page.getByRole('button', { name: 'Copy image', exact: true }).click();
  await expect(page.getByRole('status').getByText('Copied')).toBeVisible();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PNG' }).click();
  const bytes = await readFile(await (await pending).path());
  const png = PNG.sync.read(bytes);
  expect([png.width, png.height]).toEqual([1080, 1920]);
  expect(
    jsQR(new Uint8ClampedArray(png.data), png.width, png.height)?.data,
  ).toBe(source);
  await page
    .getByRole('button', { name: 'Save for later', exact: true })
    .click();
  const save = page.locator('form.clip-draft-name');
  await save
    .getByRole('textbox', { name: 'Draft name' })
    .fill('Dhaka ferry story');
  await save
    .getByRole('button', { name: 'Save for later', exact: true })
    .click();
  await page.getByRole('button', { name: /^Drafts/ }).click();
  await page.getByRole('button', { name: /Dhaka ferry story/ }).click();
  await expect(page).toHaveURL((url) => url.searchParams.has('collection'));
  await page.reload();
  await expect(
    page.getByRole('textbox', { name: 'Headline', exact: true }),
  ).toHaveValue('Electric ferry opens in Dhaka');
  await expect(
    page.locator('.clip-editor-canvas .cc-card').first(),
  ).toHaveAttribute('data-format', '9:16');
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test('uses a local file without inventing a source', async ({ page }) => {
  await page.goto('./');
  await page
    .locator('.clip-input-shell input[type="file"]')
    .setInputFiles(photo);
  await expect(
    page.locator('.clip-editor-canvas .cc-header').first(),
  ).toBeVisible();
  await expect(page.locator('.clip-editor-canvas .cc-qr')).toHaveCount(0);
});

test('receives a bookmark payload from a fixture page and creates a canonical quote', async ({
  page,
  baseURL,
}) => {
  if (!baseURL) throw new Error('App base URL missing');
  const bookmark = await buildBookmarklet(baseURL);
  expect(Buffer.byteLength(bookmark)).toBeLessThanOrEqual(4096);
  const fixturePort = Number(new URL(baseURL).port) + 1;
  await page.goto('http://127.0.0.1:' + fixturePort + '/news-og.html');
  await page
    .locator('article p')
    .first()
    .evaluate((paragraph) => {
      const range = document.createRange();
      range.selectNodeContents(paragraph);
      const chosen = window.getSelection();
      chosen?.removeAllRanges();
      chosen?.addRange(range);
      const node = document.createElement('a');
      node.id = 'run-bookmark';
      node.textContent = 'Run bookmark';
      document.body.append(node);
    });
  await page
    .locator('#run-bookmark')
    .evaluate((node, href) => node.setAttribute('href', href), bookmark);
  const popup = page.waitForEvent('popup');
  await page.locator('#run-bookmark').click();
  const app = await popup;
  await expect(app.locator('.cc-quote').first()).toBeVisible();
  await expect(app.locator('.cc-headline').first()).toContainText(
    'The first boats left Gabtoli',
  );
});

test('bookmark uses the playing video frame and timestamp', async ({
  page,
  baseURL,
}) => {
  test.skip(
    !VIDEO_CLIPS_RELEASED && process.env.CLIPCARD_TEST_VIDEO_PREVIEW !== '1',
    'R5 preview build required',
  );
  if (!baseURL) throw new Error('App base URL missing');
  const origin = 'http://127.0.0.1:' + (Number(new URL(baseURL).port) + 1);
  await page.goto(new URL('../', baseURL).href);
  const publishedBookmark = await page
    .locator('.app-shortcut-bookmark')
    .getAttribute('href');
  expect(publishedBookmark).toMatch(/^javascript:/);
  expect(Buffer.byteLength(publishedBookmark ?? '')).toBeLessThanOrEqual(4096);
  const bookmark = publishedBookmark?.replace(
    'https://tanzir71.github.io',
    new URL(baseURL).origin,
  );
  await page.goto(origin + '/video.html?utm_campaign=fixture');
  await expect
    .poll(() =>
      page
        .locator('video')
        .evaluate(
          (video: HTMLVideoElement) =>
            video.readyState >= 2 && video.textTracks[0]?.cues?.length === 2,
        ),
    )
    .toBe(true);
  await page.locator('video').evaluate(async (video: HTMLVideoElement) => {
    const seek = new Promise<void>((resolve) =>
      video.addEventListener('seeked', () => resolve(), { once: true }),
    );
    video.currentTime = 1.7;
    await seek;
  });
  await page.locator('video').evaluate((_, link) => {
    const node = document.createElement('a');
    node.id = 'run-video-bookmark';
    node.textContent = 'Run bookmark';
    node.href = link ?? '';
    document.body.append(node);
  }, bookmark);
  const popup = page.waitForEvent('popup');
  await page.locator('#run-video-bookmark').click();
  const app = await popup;
  await expect(app).toHaveURL((url) => url.origin === new URL(baseURL).origin);
  await expect(app.locator('.cc-headline').first()).toContainText(
    'The second fixture caption',
  );
  const qr = await app
    .locator('.cc-qr')
    .first()
    .evaluate(async (element) => {
      const xml = new XMLSerializer().serializeToString(element);
      const image = new Image();
      image.src = 'data:image/svg+xml,' + encodeURIComponent(xml);
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 264;
      const context = canvas.getContext('2d')!;
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      return Array.from(
        context.getImageData(0, 0, canvas.width, canvas.height).data,
      );
    });
  expect(jsQR(new Uint8ClampedArray(qr), 264, 264)?.data).toBe(
    origin + '/video.html#t=1',
  );
  await expect(app.locator('.clip-editor-canvas .cc-photo').first()).toHaveCSS(
    'background-image',
    /url\(/,
  );
});

test('combines three bookmark selections and restores the named Excerpts draft', async ({
  page,
  baseURL,
}) => {
  if (!baseURL) throw new Error('App base URL missing');
  const bookmark = await buildBookmarklet(baseURL);
  const sourceOrigin =
    'http://127.0.0.1:' + (Number(new URL(baseURL).port) + 1);
  const quotes = [
    'A short selection from the first page.',
    'One selected sentence from the second page.',
    'A third selected passage from a different source.',
  ];
  await page.route('**/r3-story-*', async (route) => {
    const index = Number(new URL(route.request().url()).pathname.slice(-1));
    await route.fulfill({
      contentType: 'text/html; charset=utf-8',
      body:
        '<!doctype html><html lang=en><title>Story ' +
        index +
        '</title><article><h1>Story ' +
        index +
        '</h1><p>' +
        quotes[index] +
        '</p><a id="run-bookmark">Clipcard</a></article>',
    });
  });
  let popup: Page | undefined;
  for (const [index] of quotes.entries()) {
    await page.goto(sourceOrigin + '/r3-story-' + index + '?utm_source=test');
    const trigger = page.locator('#run-bookmark');
    await trigger.evaluate((node, href) => {
      const text = document.querySelector('article p');
      if (!text) throw new Error('Missing selection');
      const range = document.createRange();
      range.selectNodeContents(text);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      node.setAttribute('href', href);
    }, bookmark);
    const opened = popup ? undefined : page.waitForEvent('popup');
    await trigger.click();
    if (opened) popup = await opened;
    if (!popup) throw new Error('Bookmark window missing');
    if (index === 0) {
      await expect(popup.locator('.cc-quote').first()).toBeVisible();
    } else {
      await expect(
        popup.locator(
          '.clip-grid-preview-wrap [data-layout="excerpts"] .cc-grid-extract',
        ),
      ).toHaveCount(index + 1);
    }
  }
  if (!popup) throw new Error('Bookmark window missing');
  await expect(popup.locator('.clip-grid-preview-wrap .cc-qr')).toHaveCount(3);
  await popup
    .getByRole('button', { name: 'Save for later', exact: true })
    .click();
  const form = popup
    .locator('.clip-grid-controls')
    .filter({ has: popup.getByRole('textbox') });
  await form.getByRole('textbox').fill('Three stories');
  await form
    .getByRole('button', { name: 'Save for later', exact: true })
    .click();
  await expect.poll(() => popup.isClosed()).toBe(true);

  await page.goto('./?drafts');
  await page.getByRole('button', { name: 'Grids', exact: true }).click();
  await page.getByRole('button', { name: /Three stories/ }).click();
  await expect(
    page.locator('.clip-grid-preview-wrap .cc-grid-extract'),
  ).toHaveCount(3);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(
    page.locator('.clip-grid-preview-wrap .cc-grid-extract'),
  ).toHaveCount(3);
  const reorder = page
    .getByRole('button', { name: 'Move later', exact: true })
    .first();
  await reorder.focus();
  await reorder.press('Enter');
  await expect(
    page.locator('.clip-grid-preview-wrap .cc-grid-extract p').first(),
  ).toHaveText(quotes[1]!);
  await page.reload();
  await expect(
    page.locator('.clip-grid-preview-wrap .cc-grid-extract p').first(),
  ).toHaveText(quotes[1]!);
});

test('runs the landing shortcut and opens its draft in the web app', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('../');
  const field = page.getByRole('textbox', {
    name: 'Paste any link, copied text or an image',
  });
  await field.fill(source);
  await page.getByRole('button', { name: 'Make card', exact: true }).click();
  await expect(page.locator('[data-hero-output] .cc-solid')).toBeVisible();
  await page.getByRole('button', { name: 'Copy image', exact: true }).click();
  await expect(page.getByRole('status').getByText('Copied')).toBeVisible();
  await page.getByRole('button', { name: 'Open in app', exact: true }).click();
  await expect(
    page.getByRole('textbox', { name: 'Headline', exact: true }),
  ).toHaveValue('Electric River Buses');
});

test('pastes eight links, saves a numbered Carousel and opens a Digest', async ({
  page,
}) => {
  test.skip(!BATCH_RELEASED);
  test.setTimeout(60_000);
  const urls = Array.from(
    { length: 8 },
    (_, index) => 'https://publisher.example/news/dispatch-' + (index + 1),
  );
  await page.goto('./');
  await page.getByRole('textbox', { name: field }).evaluate((input, links) => {
    const clipboardData = new DataTransfer();
    clipboardData.setData('text/plain', links.join('\n'));
    input.dispatchEvent(
      new ClipboardEvent('paste', {
        clipboardData,
        bubbles: true,
        cancelable: true,
      }),
    );
  }, urls);
  await expect(page.locator('.cc-roundup-source .cc-qr')).toHaveCount(4);
  await page
    .getByRole('button', { name: 'Next template', exact: true })
    .click();
  await expect(page.locator('.cc-roundup-num').first()).toHaveText('05');
  await page.getByRole('button', { name: 'Carousel · 8' }).click();
  await expect(
    page.getByRole('button', { name: 'Carousel · 8' }),
  ).toHaveAttribute('aria-pressed', 'true');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save ZIP' }).click();
  const archive = await readFile(await (await download).path());
  let cursor = 0;
  for (const [index, url] of urls.entries()) {
    expect(archive.readUInt32LE(cursor)).toBe(0x04034b50);
    expect(archive.readUInt16LE(cursor + 8)).toBe(0);
    const size = archive.readUInt32LE(cursor + 18);
    const nameLength = archive.readUInt16LE(cursor + 26);
    const extraLength = archive.readUInt16LE(cursor + 28);
    const name = archive.toString(
      'utf8',
      cursor + 30,
      cursor + 30 + nameLength,
    );
    expect(name).toMatch(new RegExp('^0' + (index + 1) + '-.*[.]png$'));
    const offset = cursor + 30 + nameLength + extraLength;
    const png = PNG.sync.read(archive.subarray(offset, offset + size));
    expect(
      jsQR(new Uint8ClampedArray(png.data), png.width, png.height)?.data,
    ).toBe(url);
    cursor = offset + size;
  }
  expect(archive.readUInt32LE(cursor)).toBe(0x02014b50);
  await page.getByRole('button', { name: 'Digest video' }).click();
  await expect(
    page.locator('.clip-project-scenes button[draggable="true"]'),
  ).toHaveCount(8);
  await page.reload();
  await expect(
    page.locator('.clip-project-scenes button[draggable="true"]'),
  ).toHaveCount(8);
});

test('records a browser tab into a draft and refuses a window surface', async ({
  page,
}) => {
  test.skip(!BATCH_RELEASED);
  await page.addInitScript(() => {
    navigator.mediaDevices.getDisplayMedia = async (options) => {
      if (!navigator.userActivation.isActive || options?.audio !== true)
        throw new Error(
          'Capture must be a deliberate request for tab video and audio',
        );
      const canvas = document.createElement('canvas');
      canvas.width = 480;
      canvas.height = 270;
      const context = canvas.getContext('2d')!;
      const stream = canvas.captureStream(30);
      const [track] = stream.getVideoTracks();
      if (!track) throw new Error('Missing fixture video track');
      const video = track;
      const settings = video.getSettings.bind(video);
      video.getSettings = () => ({
        ...settings(),
        displaySurface: document.body.dataset.windowCapture
          ? 'window'
          : 'browser',
      });
      function draw() {
        if (video.readyState === 'ended') return;
        context.fillStyle = '#2578a1';
        context.fillRect(0, 0, 480, 270);
        context.fillStyle = '#fff';
        context.fillRect(performance.now() % 300, 30, 71, 95);
        requestAnimationFrame(draw);
      }
      draw();
      return stream;
    };
  });
  await page.goto('./');
  const record = page.getByRole('button', { name: 'Record tab', exact: true });
  await page.locator('body').evaluate((body) => {
    body.dataset.windowCapture = '1';
  });
  await record.click();
  await expect(page.getByRole('status')).toHaveText(
    'Choose a browser tab to make a recording.',
  );
  await page.locator('body').evaluate((body) => {
    delete body.dataset.windowCapture;
  });
  await record.click();
  await expect(page.getByRole('status')).toHaveText('Recording 1 / 60');
  await page.getByRole('button', { name: 'Stop', exact: true }).click();
  await expect(
    page.locator('.clip-project-scenes button[draggable="true"]'),
  ).toHaveCount(1);
  await page.reload();
  await expect(
    page.locator('.clip-project-scenes button[draggable="true"]'),
  ).toHaveCount(1);
});

test('keeps batch tools aligned with the source input at desktop and phone widths', async ({
  page,
}) => {
  await page.goto('./');
  const group = page.locator('.app-source-group').first();
  const pasteLinks = group.getByRole('button', {
    name: 'Paste links',
    exact: true,
  });
  for (const width of [1440, 1024, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(pasteLinks).toBeVisible();
    const layout = await group.evaluate((section) => {
      const row = section
        .querySelector('.clip-input-row')!
        .getBoundingClientRect();
      const actions = section
        .querySelector('.app-find-actions')!
        .getBoundingClientRect();
      return {
        left: actions.left,
        offset: actions.left - row.left,
        gap: actions.top - row.bottom,
        overflow: document.documentElement.scrollWidth > innerWidth,
      };
    });
    expect(layout.left).toBeGreaterThanOrEqual(width >= 1024 ? 256 : 20);
    expect(layout.offset).toBe(0);
    expect(layout.gap).toBeGreaterThanOrEqual(8);
    expect(layout.overflow).toBe(false);
  }
  await pasteLinks.click();
  await group
    .getByRole('textbox', { name: 'Paste links' })
    .fill('https://example.org/news/one\nhttps://example.org/news/two');
  await group
    .getByRole('button', { name: 'Collect links', exact: true })
    .click();
  await expect(page.locator('.cc-roundup-rows li')).toHaveCount(2);
});

test('aligns settings rows and keeps their controls usable on desktop and phone', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('./');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();

  const provider = page.locator('.clip-gif-settings').getByRole('combobox');
  const key = page.getByLabel('API key', { exact: true });
  const keep = page.locator('.clip-backup-controls').getByRole('combobox');
  const providerBox = await provider.boundingBox();
  expect(providerBox).not.toBeNull();
  expect((await key.boundingBox())?.x).toBe(providerBox!.x);
  expect((await keep.boundingBox())?.x).toBe(providerBox!.x);
  expect((await keep.boundingBox())?.width).toBe(providerBox!.width);

  await page.setViewportSize({ width: 320, height: 800 });
  const actions = page.locator('.app-settings button:visible');
  for (const button of await actions.all()) {
    const box = await button.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(20);
    expect(box!.x + box!.width).toBeLessThanOrEqual(300);
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    320,
  );
  await provider.selectOption('giphy');
  await key.fill('fixture-key');
  await page.getByRole('button', { name: 'Save key' }).click();
  await expect(page.getByRole('status')).toHaveText(
    'Key saved in this browser.',
  );
  await keep.selectOption('forever');
  await expect(keep).toHaveValue('forever');

  await page.reload();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(provider).toHaveValue('giphy');
  await expect(key).toHaveValue('fixture-key');
  await expect(keep).toHaveValue('forever');
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

for (const locale of ['ar', 'ur']) {
  test(
    'keeps settings within the phone viewport in ' + locale,
    async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto('./?lang=' + locale);
      await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
      await page.locator('.app-section-nav button').last().click();
      const panel = page.locator('.app-settings-body');
      await expect(panel.locator('.clip-gif-key-actions input')).toBeVisible();
      await expect(panel.locator('.clip-backup-actions button')).toHaveCount(2);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBe(390);
    },
  );
}
