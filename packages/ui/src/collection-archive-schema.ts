import { CARD_FORMATS, CARD_TEMPLATES } from '@clipcard/cards';
import { GRID_LAYOUTS } from '@clipcard/cards/grid-model';
import { parseWebUrl, BASIC_SCRIPTS } from '@clipcard/core';
import { cardLanguages } from '@clipcard/i18n';
import { z } from 'zod';

const text = z.string();
const key = text.min(1);
const time = z.number().nonnegative();
const url = text.refine((value) => parseWebUrl(value) !== null);
const hex = text.regex(/^#[\da-f]{6}$/i);
const point = z.object({ x: z.number(), y: z.number() });
const range = z
  .tuple([z.number().int().nonnegative(), z.number().int().nonnegative()])
  .transform((value): readonly [number, number] => value);
const media = z.object({ entry: z.number().int().nonnegative(), type: text });
const overrides = z.object({
  template: z.enum(CARD_TEMPLATES).optional(),
  format: z.enum(CARD_FORMATS).optional(),
  emphasis: z.enum(['box', 'line', 'color']).optional(),
  theme: z.object({ deep: hex, light: hex }).optional(),
  keyColor: hex.optional(),
  textColor: hex.optional(),
  phrase: range.nullable().optional(),
  lang: z.enum(cardLanguages).optional(),
});
const defaults = overrides
  .pick({ format: true, template: true, theme: true, lang: true })
  .extend({
    numerals: z.enum(['native', 'western']).optional(),
    qr: z.boolean().optional(),
    markEdited: z.boolean().optional(),
    texture: z.boolean().optional(),
    handle: z.string().max(50).optional(),
    markImage: z
      .string()
      .max(400_000)
      .regex(/^(?:data:image\/png;base64,[\w+/]+={0,2})?$/)
      .optional(),
  });

const source = z.object({
  canonicalUrl: url,
  title: text,
  image: url.nullable(),
  siteName: text,
  favicon: url.or(z.literal('')),
  lang: text,
  script: z.enum(Object.keys(BASIC_SCRIPTS) as (keyof typeof BASIC_SCRIPTS)[]),
  dir: z.enum(['ltr', 'rtl']),
  description: text.nullable(),
  publishedAt: text.nullable(),
  themeColor: text.nullable(),
  isArticle: z.boolean(),
});

const legacyCard = z.object({
  id: key,
  updatedAt: time,
  createdAt: time,
  source: source.nullable(),
  section: text.optional(),
  original: text,
  headline: text,
  photo: z
    .object({
      image: media,
      width: z.number().positive(),
      height: z.number().positive(),
      light: z.number(),
      focal: point.optional(),
      portrait: z.boolean().optional(),
    })
    .nullable(),
  selection: text.optional(),
  overrides,
  defaults: defaults.optional(),
  autoFormat: z.enum(CARD_FORMATS).optional(),
  destination: z
    .enum([
      'facebook',
      'instagram',
      'whatsapp',
      'x',
      'linkedin',
      'tiktok',
      'youtube',
    ])
    .optional(),
  thumb: media.optional(),
  fallback: z.boolean().optional(),
  version: z.literal(1),
});

const clipKind = z.enum([
  'link',
  'text',
  'image',
  'section',
  'video',
  'library',
  'gif',
]);

export const archiveSchema = z.object({
  version: z.literal(1),
  drafts: z.array(
    z.object({
      id: key,
      title: text,
      createdAt: time,
      updatedAt: time,
      mode: z.enum(['card', 'grid', 'video']),
      gridLayout: z.enum(GRID_LAYOUTS).optional(),
      overrides,
      order: z.array(key),
      savedForLater: z.boolean().optional(),
      legacyCard: legacyCard.optional(),
    }),
  ),
  clips: z.array(
    z.object({
      id: key,
      draftId: key,
      kind: clipKind,
      title: text,
      text: text.optional(),
      sourceUrl: url.nullable(),
      outlet: text.optional(),
      lang: text.optional(),
      publishedAt: text.optional(),
      range: range.optional(),
      rect: point.extend({ width: z.number(), height: z.number() }).optional(),
      textFragment: url.optional(),
      media: media.optional(),
      createdAt: time,
    }),
  ),
  library: z.array(
    z.object({
      id: key,
      kind: clipKind,
      tags: z.array(text),
      favorite: z.boolean(),
      sourceUrl: url.nullable(),
      savedAt: time,
      media: media.optional(),
    }),
  ),
});

export type ArchiveManifest = z.infer<typeof archiveSchema>;
