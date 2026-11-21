import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import jsQR from 'jsqr';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

const original = 'https://deltadispatch.news/city/electric-river-buses';
const quoted =
  original +
  '#:~:text=The%20river%20was%20always%20our%20oldest%20road.%20We%20just%20forgot%20how%20to%20use%20it.';
const cases = [
  ['header-4x5', 'Geist', original, 1080, 1350, true],
  ['split-4x5', 'Libre Caslon Text', original, 1080, 1350, true],
  ['split-16x9', 'Libre Caslon Text', original, 1600, 900, true],
  ['split-191x1', 'Libre Caslon Text', original, 1200, 628, false],
  ['caps-4x5', 'Schibsted Grotesk', original, 1080, 1350, true],
  ['overlay-4x5', 'Schibsted Grotesk', original, 1080, 1350, true],
  ['duotone-4x5', 'Geist', original, 1080, 1350, true],
  ['duotone-1x1', 'Geist', original, 1080, 1080, true],
  ['solid-4x5', 'Libre Caslon Text', original, 1080, 1350, true],
  ['quote-4x5', 'Libre Caslon Text', quoted, 1080, 1350, true],
  ['header-9x16-story', 'Geist', original, 1080, 1920, true],
  ['header-1x1', 'Geist', original, 1080, 1080, false],
] as const;

for (const [id, font, url, width, height, compare] of cases) {
  test(
    'exports ' + id + ' and decodes its source',
    async ({ page }, testInfo) => {
      await page.goto('./');
      const sample = page.locator('[data-sample="' + id + '"]');
      const headline = sample.locator('.cc-headline');
      await expect(headline).toHaveCSS('font-family', new RegExp(font));
      await expect(headline).toHaveCSS('font-style', 'normal');
      const pending = page.waitForEvent('download');
      await sample.getByRole('button', { name: 'Download PNG' }).click();
      const download = await pending;
      const exportedPath = await download.path();
      const bytes = await readFile(exportedPath);
      const png = PNG.sync.read(bytes);

      expect([png.width, png.height]).toEqual([width, height]);
      const pixels = new Uint8ClampedArray(png.data);
      expect(
        jsQR(pixels, png.width, png.height, { inversionAttempts: 'dontInvert' })
          ?.data,
      ).toBe(url);

      if (!compare) return;
      const reference = PNG.sync.read(
        await readFile(
          new URL('../../design/cards/' + id + '.png', import.meta.url),
        ),
      );
      const mismatched = pixelmatch(
        reference.data,
        png.data,
        null,
        png.width,
        png.height,
        { threshold: 0.1 },
      );
      const difference = mismatched / (png.width * png.height);
      testInfo.annotations.push({
        type: 'reference pixel difference',
        description: (difference * 100).toFixed(2) + '%',
      });
      await testInfo.attach('Rendered ' + id, {
        body: bytes,
        contentType: 'image/png',
      });
      expect(difference).toBeLessThanOrEqual(0.02);
    },
  );
}

test('keeps long headlines clear of source QRs', async ({ page }) => {
  await page.goto('./');
  const cases = page.locator('[data-sample^="qr-spacing-"]');
  await expect(cases.locator('.cc-qr')).toHaveCount(4);
  for (const artwork of await cases.locator('article').all()) {
    const collides = await artwork.evaluate((card) => {
      const title = card.querySelector('.cc-headline');
      const qr = card.querySelector('.cc-qr');
      if (!title || !qr) throw new Error('Missing title or source QR');
      const bounds = title.getBoundingClientRect();
      const code = qr.getBoundingClientRect();
      const nodes = document.createTreeWalker(title, NodeFilter.SHOW_TEXT);
      while (nodes.nextNode()) {
        const range = document.createRange();
        range.selectNodeContents(nodes.currentNode);
        for (const part of range.getClientRects()) {
          const overlapWidth =
            Math.min(part.right, bounds.right, code.right) -
            Math.max(part.left, bounds.left, code.left);
          const overlapHeight =
            Math.min(part.bottom, bounds.bottom, code.bottom) -
            Math.max(part.top, bounds.top, code.top);
          if (overlapWidth > 0.2 && overlapHeight > 0.2) return true;
        }
      }
      return false;
    });
    expect(collides).toBe(false);
  }
});
