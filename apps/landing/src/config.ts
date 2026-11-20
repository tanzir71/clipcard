export const STORE_URL = import.meta.env.STORE_URL ?? '';
export const REPO_URL =
  import.meta.env.CLIPCARD_REPO_URL ?? 'https://github.com/tanzir71/clipcard';
export const ZIP_URL = `${REPO_URL}/releases/latest/download/clipcard-chrome.zip`;
const previewR1 = import.meta.env.CLIPCARD_PREVIEW_R1 === '1';

export const RELEASED = {
  lite: previewR1,
  cards: previewR1,
  extension: false,
  clips: false,
  drafts: false,
  languages: false,
  videoClips: false,
  videoJoin: false,
  gifs: false,
  app: previewR1,
  batch: false,
  pwa: previewR1,
} as const satisfies Record<string, boolean>;
