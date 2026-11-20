import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import jsQR from 'jsqr';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import headlines from '../../fixtures/headlines.json' with { type: 'json' };

const faces: Readonly<Record<string, string>> = {
  am: 'Menbere',
  ar: 'Cairo',
  bn: 'Anek Bangla',
  fa: 'Vazirmatn',
  gu: 'Anek Gujarati',
  ha: 'Noto Sans',
  hi: 'Mukta',
  kn: 'Anek Kannada',
  ml: 'Anek Malayalam',
  mr: 'Mukta',
  my: 'Padauk',
  ne: 'Mukta',
  or: 'Anek Odia',
  pa: 'Anek Gurmukhi',
  si: 'Yaldevi',
  ta: 'Anek Tamil',
  te: 'Anek Telugu',
  th: 'Kanit',
  uk: 'Onest',
  ur: 'Lateef',
  vi: 'Be Vietnam Pro',
  yo: 'Noto Sans',
};

async function exportPng(page: Page, figure: Locator) {
  const download = page.waitForEvent('download');
  await figure.getByRole('button', { name: 'Download PNG' }).click();
  return readFile(await (await download).path());
}

test('lays out all 30 headline languages in Header and Split', async ({
  page,
}) => {
  await page.goto('./');
  await expect(
    page.locator('figure[data-sample*="-language-"] .cc-headline'),
  ).toHaveCount(60);
  for (const template of ['header', 'split'] as const) {
    for (const { lang, text, dir, glyphTest } of headlines.samples) {
      const sample = page.locator(
        '[data-sample="' + template + '-language-' + lang + '"]',
      );
      const article = sample.locator('article');
      const headline = sample.locator('.cc-headline');
      const family =
        faces[lang] ?? (template === 'header' ? 'Geist' : 'Libre Caslon Text');
      const checked = await headline.evaluate(
        (element, { sampleText, extra, familyName }) => {
          const style = getComputedStyle(element);
          const font =
            style.fontWeight + ' ' + style.fontSize + ' "' + familyName + '"';
          return {
            family: style.fontFamily.split(',')[0]?.replaceAll('"', ''),
            weight: style.fontWeight,
            italic: style.fontStyle,
            glyphs: Array.from(sampleText + (extra ?? '')).every((glyph) =>
              document.fonts.check(font, glyph),
            ),
            clipX: element.scrollWidth - element.clientWidth,
            clipY: element.scrollHeight - element.clientHeight,
          };
        },
        { sampleText: text, extra: glyphTest, familyName: family },
      );
      expect(checked.family, lang).toBe(family);
      expect(checked.italic, lang).toBe('normal');
      expect(checked.glyphs, lang).toBe(true);
      expect(checked.clipX, lang).toBeLessThanOrEqual(1);
      expect(checked.clipY, lang).toBeLessThanOrEqual(1);
      await expect(article).toHaveAttribute('lang', lang);
      await expect(article).toHaveAttribute('dir', dir);
      if (lang === 'th' || lang === 'my')
        expect(await headline.locator('wbr').count()).toBeGreaterThan(0);
    }
  }
});

test('uses the bundled faces for extended Latin glyphs', async ({ page }) => {
  await page.goto('./');
  const devtools = await page.context().newCDPSession(page);
  await devtools.send('DOM.enable');
  await devtools.send('CSS.enable');
  const { root } = await devtools.send('DOM.getDocument');

  for (const { lang, glyphTest } of headlines.samples) {
    if (!glyphTest) continue;
    const sample = page.locator('[data-sample="header-language-' + lang + '"]');
    const headline = sample.locator('.cc-headline');
    const id = 'glyphs-' + lang;
    await sample.scrollIntoViewIfNeeded();
    await headline.evaluate(
      (element, { id, glyphTest }) => {
        const probe = document.createElement('span');
        const style = getComputedStyle(element);
        probe.id = id;
        probe.textContent = glyphTest;
        probe.style.cssText =
          'position:absolute;inset:0 auto auto 0;white-space:nowrap';
        probe.style.fontFamily = style.fontFamily;
        probe.style.fontWeight = style.fontWeight;
        probe.style.fontSize = style.fontSize;
        element.closest('article')?.append(probe);
        return probe.offsetWidth;
      },
      { id, glyphTest },
    );
    const { nodeId } = await devtools.send('DOM.querySelector', {
      nodeId: root.nodeId,
      selector: '#' + id,
    });
    const { fonts } = await devtools.send('CSS.getPlatformFontsForNode', {
      nodeId,
    });
    expect(fonts.length, lang).toBeGreaterThan(0);
    for (const { familyName, isCustomFont } of fonts) {
      expect(familyName.startsWith(faces[lang]!), lang).toBe(true);
      expect(isCustomFont, lang).toBe(true);
    }
  }
});

for (const [id, family] of [
  ['header-4x5-bn', 'Anek Bangla'],
  ['header-4x5-hi', 'Mukta'],
  ['split-4x5-ur-rtl', 'Lateef'],
] as const) {
  test(
    'exports ' + id + ' within 2% of the reference',
    async ({ page }, testInfo) => {
      await page.goto('./');
      const sample = page.locator('[data-sample="' + id + '"]');
      await expect(sample.locator('.cc-headline')).toHaveCSS(
        'font-family',
        new RegExp(family),
      );
      const bytes = await exportPng(page, sample);
      const png = PNG.sync.read(bytes);
      const reference = PNG.sync.read(
        await readFile(
          new URL('../../design/cards/' + id + '.png', import.meta.url),
        ),
      );
      const pixels = new Uint8ClampedArray(png.data);
      expect(
        jsQR(pixels, png.width, png.height, { inversionAttempts: 'dontInvert' })
          ?.data,
      ).toBe('https://deltadispatch.news/city/electric-river-buses');
      const difference =
        pixelmatch(png.data, reference.data, null, png.width, png.height, {
          threshold: 0.1,
        }) /
        (png.width * png.height);
      testInfo.annotations.push({
        type: 'reference pixel difference',
        description: (difference * 100).toFixed(2) + '%',
      });
      await testInfo.attach(id, { body: bytes, contentType: 'image/png' });
      expect(difference).toBeLessThanOrEqual(0.02);
    },
  );
}

test('exports the captured Zawgyi sample like its Unicode equivalent', async ({
  page,
}) => {
  await page.goto('./');
  const zawgyi = page.locator('[data-sample="myanmar-zawgyi"]');
  const unicode = page.locator('[data-sample="myanmar-unicode"]');
  for (const sample of [zawgyi, unicode]) {
    await expect(sample.locator('.cc-headline')).toHaveText(
      headlines.zawgyi.unicode,
    );
  }
  const converted = PNG.sync.read(await exportPng(page, zawgyi));
  const baseline = PNG.sync.read(await exportPng(page, unicode));
  expect(converted.data.equals(baseline.data)).toBe(true);
});
