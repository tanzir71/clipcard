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
  ['header-4x5', 'Geist', original, 1350],
  ['split-4x5', 'Libre Caslon Text', original, 1350],
  ['overlay-4x5', 'Schibsted Grotesk', original, 1350],
  ['solid-4x5', 'Libre Caslon Text', original, 1350],
  ['quote-4x5', 'Libre Caslon Text', quoted, 1350],
  ['header-9x16-story', 'Geist', original, 1920],
  ['header-1x1', 'Geist', original, 1080],
] as const;

for (const [id, font, url, height] of cases) {
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

      expect([png.width, png.height]).toEqual([1080, height]);
      const pixels = new Uint8ClampedArray(png.data);
      expect(
        jsQR(pixels, png.width, png.height, { inversionAttempts: 'dontInvert' })
          ?.data,
      ).toBe(url);

      if (id === 'header-1x1') return;
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
