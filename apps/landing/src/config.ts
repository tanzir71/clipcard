import { CLIP_DRAFTS_RELEASED, FLAGS } from '@clipcard/core/flags';

export const STORE_URL = import.meta.env.STORE_URL ?? '';
export const REPO_URL =
  import.meta.env.CLIPCARD_REPO_URL ?? 'https://github.com/tanzir71/clipcard';
export const ZIP_URL = `${REPO_URL}/releases/latest/download/clipcard-chrome.zip`;
export const INSTALL_URL = STORE_URL || ZIP_URL;
export const RELEASED = {
  lite: true,
  cards: true,
  extension: true,
  clips: CLIP_DRAFTS_RELEASED,
  drafts: CLIP_DRAFTS_RELEASED,
  languages: FLAGS.languages,
  videoClips: FLAGS.videoClips,
  videoJoin: FLAGS.videoJoin,
  gifs: FLAGS.gifs,
  app: true,
  batch: false,
  pwa: true,
} as const satisfies Record<string, boolean>;
