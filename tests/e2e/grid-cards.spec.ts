import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import jsQR from 'jsqr';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

const original = 'https://deltadispatch.news/city/electric-river-buses';
const riverQuote =
  'The river was always our oldest road. We just forgot how to use it.';
const excerpts = [
  'The first boats left Gabtoli at 6:30 a.m. By eight, every seat was taken.',
  'Fares start at Tk 30, and two more routes open before the monsoon.',
  '“' + riverQuote + '”',
];
const combined = (source: string, text: string[]) =>
  source +
  '#:~:' +
  text.map((value) => 'text=' + encodeURIComponent(value)).join('&');

async function exportPng(sample: Locator, page: Page) {
  const downloadEvent = page.waitForEvent('download');
  await sample.getByRole('button', { name: 'Download PNG' }).click();
  const bytes = await readFile(await (await downloadEvent).path());
  return { png: PNG.sync.read(bytes), bytes };
}

async function decodeSources(artwork: Locator, png: PNG) {
  const boxes = await artwork.evaluate((element) => {
    const art = element.getBoundingClientRect();
    const scale = (element as HTMLElement).offsetWidth / art.width;
    return Array.from(element.querySelectorAll('svg.cc-qr'), (qr) => {
      const box = qr.getBoundingClientRect();
      return {
        x: Math.round((box.left - art.left) * scale),
        y: Math.round((box.top - art.top) * scale),
        width: Math.round(box.width * scale),
        height: Math.round(box.height * scale),
      };
    });
  });
  return boxes.map(({ x, y, width, height }) => {
    const qr = new PNG({ width, height });
    PNG.bitblt(png, qr, x, y, width, height, 0, 0);
    return jsQR(new Uint8ClampedArray(qr.data), width, height, {
      inversionAttempts: 'dontInvert',
    })?.data;
  });
}

const cases = [
  ['clips-excerpts-4x5', [combined(original, excerpts)]],
  ['clips-grid3-4x5', [original]],
  ['clips-grid4-4x5', [original]],
  ['clips-board-4x5', [combined(original, [riverQuote])]],
  [
    'clips-multiple-sources',
    [
      original,
      combined('https://example.org/quotes?edition=2', excerpts.slice(0, 2)),
      'https://example.net/article',
    ],
  ],
] as const;

for (const [id, destinations] of cases) {
  test(
    'exports ' + id + ' with a scannable QR per source',
    async ({ page }, testInfo) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto('./');
      const sample = page.locator('[data-sample="' + id + '"]');
      const artwork = sample.locator('article');
      const headline = artwork.locator('.cc-grid-headline');
      await expect(headline).toHaveCSS(
        'font-family',
        id.includes('excerpts') ? /Geist/ : /Libre Caslon Text/,
      );
      await expect(headline).toHaveCSS('font-style', 'normal');
      const { png, bytes } = await exportPng(sample, page);
      expect([png.width, png.height]).toEqual([1080, 1350]);
      await testInfo.attach(id, { body: bytes, contentType: 'image/png' });
      expect(await decodeSources(artwork, png)).toEqual(destinations);
      expect(errors).toEqual([]);
      if (id === 'clips-multiple-sources') return;
      const reference = PNG.sync.read(
        await readFile(
          new URL('../../design/cards/' + id + '.png', import.meta.url),
        ),
      );
      const mismatch =
        pixelmatch(png.data, reference.data, null, png.width, png.height, {
          threshold: 0.1,
        }) /
        (png.width * png.height);
      testInfo.annotations.push({
        type: 'reference pixel difference',
        description: (mismatch * 100).toFixed(2) + '%',
      });
      expect(mismatch).toBeLessThanOrEqual(0.02);
    },
  );
}
