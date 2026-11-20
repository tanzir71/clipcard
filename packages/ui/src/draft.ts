import {
  capsPhrases,
  chooseTemplate,
  modelFromSource,
  THEMES,
} from '@clipcard/cards';
import type {
  CardModel,
  CardOptions,
  EmphasisStyle,
  Format,
  Template,
} from '@clipcard/cards';
import {
  detectScript,
  detectLang,
  dirFor,
  keyphrase,
  langToScript,
} from '@clipcard/core';
import { FLAGS } from '@clipcard/core/flags';
import type { CardSource, TextRange } from '@clipcard/core';
import type { CardLanguage } from '@clipcard/i18n';

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
  lang?: CardLanguage;
}

export interface CardDefaults extends Pick<
  CardOptions,
  'numerals' | 'qr' | 'markEdited' | 'texture' | 'theme'
> {
  format?: Format;
  template?: Template;
  lang?: CardLanguage;
  handle?: string;
  markImage?: string;
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
  defaults?: CardDefaults;
  autoFormat?: Format;
  destination?:
    | 'facebook'
    | 'instagram'
    | 'whatsapp'
    | 'x'
    | 'linkedin'
    | 'tiktok'
    | 'youtube';
  thumb?: Blob;
  fallback?: boolean;
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
  const {
    source,
    selection,
    section,
    headline,
    original,
    photo,
    overrides,
    defaults,
  } = draft;
  const changed = headline !== original;
  const languageChoice = overrides.lang ?? defaults?.lang;
  const script = detectScript(headline);
  const detected = detectLang(headline, source?.lang);
  const lang =
    languageChoice ??
    (FLAGS.languages && script !== 'latin' && langToScript(detected) !== script
      ? detectLang(headline)
      : detected);
  const originalModel = source
    ? modelFromSource(source, { image, selection, section, now })
    : null;
  const caps =
    overrides.template === 'caps' && overrides.phrase === undefined
      ? capsPhrases(headline)
      : null;

  return {
    ...originalModel,
    headline,
    lang,
    dir:
      changed || languageChoice || lang !== originalModel?.lang
        ? dirFor(lang)
        : (originalModel?.dir ?? dirFor(lang)),
    script,
    image,
    imageIsPortrait: photo?.portrait,
    photoLight: photo?.light,
    focal: photo?.focal,
    outlet: originalModel?.outlet ?? null,
    sourceUrl: originalModel?.sourceUrl ?? null,
    qrUrl: originalModel?.qrUrl ?? null,
    quote: Boolean(selection),
    mark: defaults?.handle ? '@' + defaults.handle : undefined,
    markImage: defaults?.markImage,
    edited: changed,
    emphasisRange: caps
      ? (caps[0] ?? null)
      : overrides.phrase !== undefined
        ? overrides.phrase
        : keyphrase(headline),
    extraEmphasisRange: caps?.[1],
  };
}

export function optionsForDraft(
  draft: CardDraft,
  model: CardModel,
): CardOptions {
  const { overrides, defaults } = draft;
  return {
    format: overrides.format ?? defaults?.format ?? draft.autoFormat ?? '4:5',
    template: overrides.template ?? defaults?.template ?? chooseTemplate(model),
    theme: overrides.theme ?? defaults?.theme ?? THEMES.midnight,
    emphasis: overrides.emphasis,
    keyColor: overrides.keyColor,
    textColor: overrides.textColor,
    numerals: defaults?.numerals,
    qr: defaults?.qr,
    markEdited: defaults?.markEdited,
    texture: defaults?.texture,
  };
}
