import serif from '@fontsource/libre-caslon-text/files/libre-caslon-text-latin-400-normal.woff2?url';
import serifBold from '@fontsource/libre-caslon-text/files/libre-caslon-text-latin-700-normal.woff2?url';
import geist from '@fontsource-variable/geist/files/geist-latin-wght-normal.woff2?url';
import mono from '@fontsource-variable/geist-mono/files/geist-mono-latin-wght-normal.woff2?url';
import grotesk from '@fontsource-variable/schibsted-grotesk/files/schibsted-grotesk-latin-wght-normal.woff2?url';
import type { Template } from './model.ts';
import { prepareGrain } from './texture.ts';

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
} as const;
type Font = keyof typeof FONT_FILES;
const loaded = new Map<Font, Promise<string>>();

export function dataUrlFor(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function loadFont(font: Font) {
  const pending = loaded.get(font);
  if (pending) return pending;

  const [family, url, weight] = FONT_FILES[font];
  const next = (async () => {
    const response = await fetch(url, { cache: 'force-cache' });
    if (!response.ok) throw new Error('Could not load ' + family);
    const bytes = await response.arrayBuffer();
    const face = await new FontFace(family, bytes, {
      weight,
      style: 'normal',
    }).load();
    document.fonts.add(face);
    const data = await dataUrlFor(new Blob([bytes], { type: 'font/woff2' }));
    return (
      '@font-face{font-family:"' +
      family +
      '";font-weight:' +
      weight +
      ';font-style:normal;src:url("' +
      data +
      '") format("woff2")}'
    );
  })().catch((error: unknown) => {
    loaded.delete(font);
    throw error;
  });
  loaded.set(font, next);
  return next;
}

export interface CardAssets {
  grain: string;
  fontCss: string;
}

export async function prepareCardAssets(
  template: Template,
): Promise<CardAssets> {
  const [grain, fonts] = await Promise.all([
    prepareGrain(),
    Promise.all(fontsFor[template].map(loadFont)),
  ]);
  return { grain, fontCss: fonts.join('\n') };
}
