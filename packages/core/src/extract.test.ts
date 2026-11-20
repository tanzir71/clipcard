import { readFileSync, readdirSync } from 'node:fs';
import { DOMParser } from 'linkedom';
import { expect, it } from 'vitest';
import { extract, imageUrl } from './extract.ts';

const fixtures = new URL('../../../fixtures/', import.meta.url);
const pages = readdirSync(new URL('expected/', fixtures))
  .filter((file) => file.endsWith('.json'))
  .map((file) => file.replace(/\.json$/, '.html'));

function parse(html: string) {
  // LinkeDOM implements the DOM subset the extractor reads.
  return new DOMParser().parseFromString(
    html,
    'text/html',
  ) as unknown as Document;
}

it.each(pages)('extracts metadata from %s', (file) => {
  const html = readFileSync(new URL('pages/' + file, fixtures), 'utf8');
  const expectedRaw = readFileSync(
    new URL('expected/' + file.replace(/\.html$/, '.json'), fixtures),
    'utf8',
  );
  const expected = JSON.parse(expectedRaw) as {
    _finalUrl: string;
    [key: string]: string;
  };
  const doc = parse(html);
  expect(extract(doc, expected._finalUrl)).toEqual(
    Object.fromEntries(
      Object.entries(expected).filter(([key]) => !key.startsWith('_')),
    ),
  );
});

it('reads graph data and falls through to the largest eligible image', () => {
  const doc = parse(`
    <html>
      <head>
        <title>Page title</title>
        <meta property="og:image" content="/animation.gif" />
        <meta property="og:locale" content="ar_EG" />
        <link rel="canonical" href="javascript:undefined" />
        <meta property="og:url" content="/article?utm_source=meta" />
        <link rel="icon" sizes="16x16 64x64" href="/icon.png"/>
        <link rel="icon" sizes="48x48" href="/icon-small.png"/>
        <script type="application/ld+json">{broken}</script>
        <script type="application/ld+json">
          {"@graph": [null, {"@type": ["Thing", "BlogPosting"], "headline": "Article title"}]}
        </script>
      </head>
      <body><main>
        <img src="/too-small.jpg" width="599"/>
        <img src="/too-big.svg" width="2000"/>
        <img src="/real.jpg" width="900"/>
        <img src="/runner-up.jpg" width="800"/>
      </main></body>
    </html>`);
  expect(extract(doc, 'https://example.net/story')).toMatchObject({
    canonicalUrl: 'https://example.net/article',
    title: 'Article title',
    image: 'https://example.net/real.jpg',
    favicon: 'https://example.net/icon.png',
    lang: 'ar-EG',
    dir: 'rtl',
    isArticle: true,
  });
});

it('only accepts eligible web images or sufficiently large raster data URLs', () => {
  const base = 'https://example.net/news/story';
  expect(imageUrl('../graphic.PNG?id=1', base)).toBe(
    'https://example.net/graphic.PNG?id=1',
  );
  expect(imageUrl('/logo.SVG?size=1600', base)).toBeNull();
  expect(imageUrl('javascript:undefined', base)).toBeNull();
  expect(imageUrl('data:image/png;base64,Zg==', base)).toBeNull();
  const raster = 'data:image/png;base64,' + 'a'.repeat(14_000);
  expect(imageUrl(raster, base)).toBe(raster);
});
