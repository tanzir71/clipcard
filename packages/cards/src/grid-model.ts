import { detectLang, dirFor, parseWebUrl, textFragment } from '@clipcard/core';
import type { Direction } from '@clipcard/core';
import { getOldNewsYear } from './model.ts';
import type { CardColor, Format } from './model.ts';

export const GRID_LAYOUTS = ['excerpts', 'grid3', 'grid4', 'board'] as const;
export type GridLayout = (typeof GRID_LAYOUTS)[number];

export interface GridClip {
  id: string;
  kind: 'link' | 'text' | 'image' | 'section';
  sourceUrl: string | null;
  title: string;
  outlet?: string;
  publishedAt?: string;
  text?: string;
  image?: string;
}

export interface GridOptions {
  format: Format;
  theme?: CardColor;
}

export interface GridSource {
  clips: GridClip[];
  canonicalUrl: string | null;
  qrUrl: string | null;
  year: number | null;
}

export interface GridModel {
  headline: string;
  mark?: string;
  lang: string;
  dir: Direction;
  layout: GridLayout;
  clips: GridClip[];
  sources: GridSource[];
  background?: string;
}

export function gridLayouts(clips: GridClip[]): GridLayout[] {
  if (clips.every((clip) => clip.kind === 'text')) return ['excerpts', 'board'];
  if (clips.every((clip) => clip.kind === 'image'))
    return ['grid3', 'grid4', 'board'];
  return ['board'];
}

export function excerptText(text: string): string {
  const trimmed = text.trim();
  const chars = new Intl.Segmenter().segment(trimmed);
  let count = 0;
  for (const char of chars) {
    if (count++ === 280) return trimmed.slice(0, char.index);
  }
  return trimmed;
}

export function gridModel(
  rawClips: GridClip[],
  {
    headline = rawClips[0]?.title ?? '',
    mark,
    layout,
    now = Date.now(),
  }: {
    headline?: string;
    mark?: string;
    layout?: GridLayout;
    now?: number;
  } = {},
): GridModel {
  const supported = gridLayouts(rawClips);
  const auto =
    supported[0] === 'grid3' && rawClips.length >= 4 ? 'grid4' : supported[0]!;
  const chosen = layout && supported.includes(layout) ? layout : auto;
  const group = new Map<string | null, GridClip[]>();
  const clips: GridClip[] = [];
  const max =
    chosen === 'excerpts'
      ? 3
      : chosen === 'grid3'
        ? 3
        : chosen === 'grid4'
          ? 6
          : 4;

  for (const input of rawClips) {
    if (clips.length >= max) break;
    const sourceUrl =
      input.sourceUrl && parseWebUrl(input.sourceUrl)
        ? textFragment(input.sourceUrl, '')
        : null;
    const clip = {
      ...input,
      sourceUrl,
      text: input.text && excerptText(input.text),
    };
    const members = group.get(sourceUrl) ?? [];
    if (
      clip.kind === 'text' &&
      members.filter((item) => item.kind === 'text').length >= 3
    ) {
      continue;
    }
    if (group.size >= 4 && !group.has(sourceUrl)) continue;
    members.push(clip);
    group.set(sourceUrl, members);
    clips.push(clip);
  }

  const sources: GridSource[] = [...group].map(([canonicalUrl, clips]) => {
    const excerpts = clips.flatMap((clip) =>
      clip.kind === 'text' && clip.text ? [clip.text] : [],
    );
    const compactAfter =
      excerpts.reduce((size, text) => size + text.length, 0) > 160
        ? 48
        : undefined;
    const directives = canonicalUrl
      ? excerpts.flatMap((text) => {
          const directive = textFragment(
            canonicalUrl,
            text,
            compactAfter,
          ).split('#:~:')[1];
          return directive ? [directive] : [];
        })
      : [];
    return {
      clips,
      canonicalUrl,
      year: getOldNewsYear(clips[0]?.publishedAt ?? null, now),
      qrUrl: directives.length
        ? canonicalUrl + '#:~:' + directives.join('&')
        : canonicalUrl,
    };
  });
  const lang = detectLang(headline);
  return {
    headline,
    mark,
    lang,
    dir: dirFor(lang),
    layout: chosen,
    clips,
    sources,
    background: clips.find((clip) => clip.image)?.image,
  };
}
