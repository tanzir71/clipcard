export const STORE_URL = import.meta.env.STORE_URL ?? '';
export const REPO_URL =
  import.meta.env.CLIPCARD_REPO_URL ?? 'https://github.com/tanzir71/clipcard';
export const ZIP_URL = `${REPO_URL}/releases/latest/download/clipcard-chrome.zip`;

export const RELEASED = {
  lite: false,
  cards: false,
  extension: false,
  clips: false,
  drafts: false,
  languages: false,
  videoClips: false,
  videoJoin: false,
  gifs: false,
  app: false,
  batch: false,
  pwa: false,
} as const satisfies Record<string, boolean>;
