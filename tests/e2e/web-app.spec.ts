import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { PNG } from 'pngjs';
import jsQR from 'jsqr';
import { buildBookmarklet } from '../../scripts/bookmarklet.ts';

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
  await page.getByRole('button', { name: 'Save for later' }).click();
  await expect(page.getByText('Saved in this browser')).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('textbox', { name: 'Headline', exact: true }),
  ).toHaveValue('Electric ferry opens in Dhaka');
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
