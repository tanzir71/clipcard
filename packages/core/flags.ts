const env = import.meta.env;
const clipPreview = env?.DEV === true || env?.MODE === 'r3-preview';
const languagePreview =
  env?.DEV === true || env?.MODE === 'r4-preview' || env?.MODE === 'store';
export const CLIP_DRAFTS_RELEASED = true;
export const CARD_LANGUAGES_RELEASED = true;
export const VIDEO_CLIPS_RELEASED = true;
export const VIDEO_JOIN_RELEASED = true;
export const GIFS_RELEASED = true;
export const BATCH_RELEASED = false;
const batchPreview = env?.DEV === true || env?.MODE === 'r7-preview';
const videoPreview = env?.DEV === true || env?.MODE === 'r6-preview';

export const FLAGS = {
  app: env?.DEV === true && env.VITE_CLIPCARD_APP === '1',
  lite: env?.DEV === true && env.VITE_CLIPCARD_LITE === '1',
  cards: env?.DEV === true && env.VITE_CLIPCARD_CARDS === '1',
  extension: env?.DEV === true && env.VITE_CLIPCARD_EXTENSION === '1',
  clips:
    CLIP_DRAFTS_RELEASED || (clipPreview && env?.VITE_CLIPCARD_CLIPS === '1'),
  drafts:
    CLIP_DRAFTS_RELEASED || (clipPreview && env?.VITE_CLIPCARD_DRAFTS === '1'),
  languages:
    CARD_LANGUAGES_RELEASED ||
    (languagePreview && env?.VITE_CLIPCARD_LANGUAGES === '1'),
  videoClips:
    VIDEO_CLIPS_RELEASED ||
    ((env?.DEV === true || env?.MODE === 'r5-preview') &&
      env?.VITE_CLIPCARD_VIDEO_CLIPS === '1'),
  videoJoin:
    VIDEO_JOIN_RELEASED ||
    (videoPreview && env?.VITE_CLIPCARD_VIDEO_JOIN === '1'),
  gifs: GIFS_RELEASED || (videoPreview && env?.VITE_CLIPCARD_GIFS === '1'),
  batch: BATCH_RELEASED || (batchPreview && env?.VITE_CLIPCARD_BATCH === '1'),
  pwa: env?.DEV === true && env.VITE_CLIPCARD_PWA === '1',
} as const;
