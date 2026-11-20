const env = import.meta.env;
const clipPreview = env?.DEV === true || env?.MODE === 'r3-preview';
export const CLIP_DRAFTS_RELEASED = true;

export const FLAGS = {
  app: env?.DEV === true && env.VITE_CLIPCARD_APP === '1',
  lite: env?.DEV === true && env.VITE_CLIPCARD_LITE === '1',
  cards: env?.DEV === true && env.VITE_CLIPCARD_CARDS === '1',
  extension: env?.DEV === true && env.VITE_CLIPCARD_EXTENSION === '1',
  clips:
    CLIP_DRAFTS_RELEASED || (clipPreview && env?.VITE_CLIPCARD_CLIPS === '1'),
  drafts:
    CLIP_DRAFTS_RELEASED || (clipPreview && env?.VITE_CLIPCARD_DRAFTS === '1'),
  languages: env?.DEV === true && env.VITE_CLIPCARD_LANGUAGES === '1',
  videoClips: env?.DEV === true && env.VITE_CLIPCARD_VIDEO_CLIPS === '1',
  videoJoin: env?.DEV === true && env.VITE_CLIPCARD_VIDEO_JOIN === '1',
  gifs: env?.DEV === true && env.VITE_CLIPCARD_GIFS === '1',
  batch: env?.DEV === true && env.VITE_CLIPCARD_BATCH === '1',
  pwa: env?.DEV === true && env.VITE_CLIPCARD_PWA === '1',
} as const;
