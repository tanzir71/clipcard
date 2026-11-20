import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { PNG } from 'pngjs';
import jsQR from 'jsqr';
import { buildBookmarklet } from '../../scripts/bookmarklet.ts';

import { VIDEO_CLIPS_RELEASED } from '../../packages/core/flags.ts';

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
  await expect(app.locator('.clip-source')).toHaveAttribute(
    'href',
    origin + '/video.html#t=1',
  );
  await expect(
    app.locator('.clip-editor-canvas img.cc-photo').first(),
  ).toBeVisible();
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
