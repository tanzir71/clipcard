import type { CardSource, Direction, Script, TextRange } from '@clipcard/core';
import {
  detectLang,
  detectScript,
  dirFor,
  keyphrase,
  textFragment,
} from '@clipcard/core';
import { tokens } from './tokens.ts';
import type { Numerals } from './numerals.ts';

export const CARD_TEMPLATES = [
  'header',
  'split',
  'caps',
  'overlay',
  'duotone',
  'solid',
  'quote',
] as const;
export const CARD_FORMATS = ['4:5', '1:1', '9:16', '16:9', '1.91:1'] as const;
export type Template = (typeof CARD_TEMPLATES)[number];
export type Format = keyof typeof tokens.card.formats;
export type EmphasisStyle = 'box' | 'line' | 'color';

export interface CardModel {
  headline: string;
  outlet: string | null;
  sourceUrl: string | null;
  qrUrl: string | null;
  image: string | null;
  imageIsPortrait?: boolean;
  lang: string;
  script: Script;
  dir: Direction;
  section?: string | null;
  subsection?: string | null;
  publishedAt?: string | null;
  oldNewsYear?: number | null;
  mark?: string | null;
  focal?: { x: number; y: number };
  edited?: boolean;
  quote?: boolean;
  quoteAttribution?: string;
  emphasisRange?: TextRange | null;
  extraEmphasisRange?: TextRange;
  dek?: string;
  photoLight?: number;
}

export interface CardColor {
  deep: string;
  light: string;
}

export interface CardOptions {
  format: Format;
  template: Template;
  theme?: CardColor;
  emphasis?: EmphasisStyle;
  keyColor?: string;
  textColor?: string;
  numerals?: Numerals;
}

export function chooseTemplate(model: CardModel): Template {
  if (model.quote) return 'quote';
  if (!model.image) return 'solid';
  if (model.imageIsPortrait) return 'overlay';
  return [...model.headline].length > 90 ? 'split' : 'header';
}

export function getOldNewsYear(
  publishedAt: string | null,
  now: number,
): number | null {
  if (!publishedAt) return null;
  const published = new Date(publishedAt);
  const age = now - published.getTime();
  if (age > tokens.card.oldNewsDays * 86_400_000) {
    return Number(publishedAt.slice(0, 4)) || published.getUTCFullYear();
  }
  return null;
}

function pathSection(sourceUrl: string) {
  const parts = new URL(sourceUrl).pathname.split('/').filter(Boolean);
  if (parts.length < 2) return null;
  const first = parts[0]?.replace(/[-_]+/g, ' ') ?? '';
  return /^[\p{Letter} ]+$/u.test(first)
    ? first.charAt(0).toUpperCase() + first.slice(1)
    : null;
}

export function modelFromSource(
  source: CardSource,
  options: {
    image: string | null;
    selection?: string;
    section?: string;
    now: number;
  },
): CardModel {
  const selection = options.selection?.trim();
  const headline = selection || source.title;
  const lang = selection ? detectLang(headline, source.lang) : source.lang;
  return {
    headline,
    outlet: source.siteName,
    sourceUrl: source.canonicalUrl,
    qrUrl: selection
      ? textFragment(source.canonicalUrl, selection)
      : source.canonicalUrl,
    image: options.image,
    lang,
    script: selection ? detectScript(headline) : source.script,
    dir: selection ? dirFor(lang) : source.dir,
    section: options.section ?? pathSection(source.canonicalUrl),
    publishedAt: source.publishedAt,
    oldNewsYear: getOldNewsYear(source.publishedAt, options.now),
    quote: Boolean(selection),
    emphasisRange: keyphrase(headline),
  };
}
