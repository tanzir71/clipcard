import serif from '@fontsource/libre-caslon-text/files/libre-caslon-text-latin-400-normal.woff2?url';
import serifBold from '@fontsource/libre-caslon-text/files/libre-caslon-text-latin-700-normal.woff2?url';
import geist from '@fontsource-variable/geist/files/geist-latin-wght-normal.woff2?url';
import mono from '@fontsource-variable/geist-mono/files/geist-mono-latin-wght-normal.woff2?url';
import grotesk from '@fontsource-variable/schibsted-grotesk/files/schibsted-grotesk-latin-wght-normal.woff2?url';
import type { Template } from './model.ts';
import type { GridModel } from './grid-model.ts';
import { prepareGrain } from './texture.ts';
import type { Typeface } from './typefaces.ts';
import { typefaceFor } from './typefaces.ts';
import { prepareCardText } from './card-text.ts';

const FONT_FILES = {
  geist: ['Geist', geist, '100 900'],
  mono: ['Geist Mono', mono, '100 900'],
  serif: ['Libre Caslon Text', serif, '400'],
  serifBold: ['Libre Caslon Text', serifBold, '700'],
  caps: ['Schibsted Grotesk', grotesk, '400 900'],
} as const;

const fontsFor = {
  header: ['geist', 'caps'],
  split: ['serif', 'serifBold', 'mono', 'caps'],
  caps: ['geist', 'caps'],
  overlay: ['caps', 'mono'],
  duotone: ['geist', 'caps', 'mono'],
  solid: ['serif', 'serifBold', 'mono', 'caps'],
  quote: ['serif', 'serifBold', 'mono', 'geist', 'caps'],
  grid: ['serif', 'serifBold', 'mono', 'geist'],
} as const;
type FontFile = readonly [
  family: string,
  url: string,
  weight: string,
  unicodeRange?: string,
];
const loaded = new Map<string, Promise<string>>();

export function dataUrlFor(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function loadFont([family, url, weight, unicodeRange]: FontFile) {
  const key = family + '\n' + weight + '\n' + url;
  const pending = loaded.get(key);
  if (pending) return pending;

  const next = (async () => {
    const response = await fetch(url, { cache: 'force-cache' });
    if (!response.ok) throw new Error('Could not load ' + family);
    const bytes = await response.arrayBuffer();
    const face = await new FontFace(family, bytes, {
      weight,
      style: 'normal',
      unicodeRange,
    }).load();
    document.fonts.add(face);
    const data = await dataUrlFor(new Blob([bytes], { type: 'font/woff2' }));
    return (
      '@font-face{font-family:"' +
      family +
      '";font-weight:' +
      weight +
      ';font-style:normal;' +
      (unicodeRange ? 'unicode-range:' + unicodeRange + ';' : '') +
      'src:url("' +
      data +
      '") format("woff2")}'
    );
  })().catch((error: unknown) => {
    loaded.delete(key);
    throw error;
  });
  loaded.set(key, next);
  return next;
}

export interface CardAssets {
  grain: string;
  fontCss: string;
  converted: ReadonlyMap<string, string>;
}

export async function prepareCardAssets(
  template: Template | 'grid',
  typefaces: Iterable<Typeface | undefined> = [],
  texts: Iterable<string> = [],
): Promise<CardAssets> {
  const files: FontFile[] = fontsFor[template].map((font) => FONT_FILES[font]);
  for (const typeface of new Set(typefaces)) {
    if (!typeface) continue;
    for (const [url, weight, unicodeRange] of typeface.files)
      files.push([typeface.family, url, String(weight), unicodeRange]);
  }
  const [grain, fonts, converted] = await Promise.all([
    prepareGrain(),
    Promise.all(files.map(loadFont)),
    prepareCardText(texts),
  ]);
  return { grain, fontCss: fonts.join('\n'), converted };
}

export function prepareGridAssets(model: GridModel) {
  const content = [
    { text: model.headline, lang: model.lang },
    ...model.clips.map((clip) => ({
      text: clip.text || clip.title,
      lang: clip.lang ?? model.lang,
    })),
  ];
  return prepareCardAssets(
    'grid',
    content.map(({ text, lang }) => typefaceFor(text, lang)),
    content.map(({ text }) => text),
  );
}
