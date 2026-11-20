import { chooseTemplate, modelFromSource, THEMES } from '@clipcard/cards';
import type {
  CardModel,
  CardOptions,
  EmphasisStyle,
  Format,
  Template,
} from '@clipcard/cards';
import { detectScript, detectLang, dirFor, keyphrase } from '@clipcard/core';
import type { CardSource, TextRange } from '@clipcard/core';

export interface DraftPhoto {
  blob: Blob;
  width: number;
  height: number;
  light: number;
  focal?: { x: number; y: number };
  portrait?: boolean;
}

export interface Overrides {
  format?: Format;
  template?: Template;
  theme?: CardOptions['theme'];
  emphasis?: EmphasisStyle;
  keyColor?: string;
  textColor?: string;
  phrase?: TextRange | null;
}

export interface CardDraft {
  id: string;
  updatedAt: number;
  createdAt: number;
  source: CardSource | null;
  section?: string;
  original: string;
  headline: string;
  photo: DraftPhoto | null;
  selection?: string;
  overrides: Overrides;
  version: 1;
}

export function newCardDraft(input: {
  source?: CardSource | null;
  headline: string;
  selection?: string;
  section?: string;
  photo?: DraftPhoto | null;
}): CardDraft {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    version: 1,
    updatedAt: now,
    createdAt: now,
    source: input.source ?? null,
    original: input.headline,
    headline: input.headline,
    section: input.section,
    selection: input.selection,
    photo: input.photo ?? null,
    overrides: {},
  };
}

export function modelForDraft(
  draft: CardDraft,
  image: string | null,
  now: number,
): CardModel {
  const { source, selection, section, headline, original, photo, overrides } =
    draft;
  const changed = headline !== original;
  const lang = detectLang(headline, source?.lang);
  const originalModel = source
    ? modelFromSource(source, { image, selection, section, now })
    : null;

  return {
    ...originalModel,
    headline,
    lang,
    dir: changed ? dirFor(lang) : (originalModel?.dir ?? dirFor(lang)),
    script: detectScript(headline),
    image,
    imageIsPortrait: photo?.portrait,
    photoLight: photo?.light,
    focal: photo?.focal,
    outlet: originalModel?.outlet ?? null,
    sourceUrl: originalModel?.sourceUrl ?? null,
    qrUrl: originalModel?.qrUrl ?? null,
    quote: Boolean(selection),
    edited: changed,
    emphasisRange:
      overrides.phrase !== undefined ? overrides.phrase : keyphrase(headline),
  };
}

export function optionsForDraft(
  draft: CardDraft,
  model: CardModel,
): CardOptions {
  const { overrides } = draft;
  return {
    format: overrides.format ?? '4:5',
    template: overrides.template ?? chooseTemplate(model),
    theme: overrides.theme ?? THEMES.midnight,
    emphasis: overrides.emphasis,
    keyColor: overrides.keyColor,
    textColor: overrides.textColor,
  };
}
