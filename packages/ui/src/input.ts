import {
  cleanUrl,
  detectLang,
  detectScript,
  dirFor,
  imageUrl,
  limitHeadline,
  outletFromHost,
  parseWebUrl,
  slugHeadline,
  unwrapUrl,
} from '@clipcard/core';
import type { CardSource } from '@clipcard/core';
import { newCardDraft } from './draft.ts';
import type { CardDraft, DraftPhoto } from './draft.ts';

const MAX_IMAGE_BYTES = 16 * 1024 * 1024;
const MAX_BITMAP_PIXELS = 40_000_000;
const MAX_TEXT_BYTES = 256_000;
const MAX_SOURCE_LINK = 1800;

export interface CardInput {
  text?: string;
  uri?: string;
  html?: string;
  file?: Blob | null;
  title?: string;
}

export function readTransfer(data: DataTransfer): CardInput {
  return {
    text: data.getData('text/plain').slice(0, MAX_TEXT_BYTES),
    uri: data
      .getData('text/uri-list')
      .split(/\r?\n/)
      .find((line) => line.trim() && !line.startsWith('#')),
    html: data.getData('text/html').slice(0, MAX_TEXT_BYTES),
    file: Array.from(data.files).find((file) => file.type.startsWith('image/')),
  };
}

function urlFromText(text: string): URL | null {
  const trimmed = text.trim();
  const url = parseWebUrl(trimmed);
  if (url) return url;
  // Address bars often place a bare link on the clipboard.
  return /^(?:[\p{Letter}\p{Number}-]+\.)+[\p{Letter}]{2,}(?:[/?#]\S*)?$/u.test(
    trimmed,
  )
    ? parseWebUrl('https://' + trimmed)
    : null;
}

function sourceForLink(input: URL, headline?: string): CardSource | null {
  const canonicalUrl = cleanUrl(unwrapUrl(input.href)).url;
  if (canonicalUrl.length > MAX_SOURCE_LINK) return null;
  const url = new URL(canonicalUrl);
  const siteName = outletFromHost(url.hostname);
  const title =
    limitHeadline(headline ?? '') || slugHeadline(canonicalUrl) || siteName;
  const lang = detectLang(title);
  return {
    canonicalUrl,
    title,
    image: null,
    siteName,
    favicon: new URL('/favicon.ico', url).href,
    lang,
    script: detectScript(title),
    dir: dirFor(lang),
    description: null,
    publishedAt: null,
    themeColor: null,
    isArticle: false,
  };
}

function parseArticle(html: string, base?: string) {
  // Template contents stay inert, including embedded frames and image loads.
  const template = document.createElement('template');
  template.innerHTML = html.slice(0, MAX_TEXT_BYTES);
  const contents = template.content;
  const heading =
    contents.querySelector('h1') ??
    contents.querySelector('h2') ??
    contents.querySelector('strong');
  const img = contents.querySelector('img[src]');
  const href = contents
    .querySelector('link[rel~="canonical"]')
    ?.getAttribute('href');
  const rawImage = img?.getAttribute('src') ?? null;
  return {
    headline: limitHeadline(heading?.textContent ?? ''),
    image: rawImage ? imageUrl(rawImage, base) : null,
    canonical: href ? parseWebUrl(href, base) : null,
  };
}

function luminanceAt(data: Uint8ClampedArray, index: number) {
  const channel = (offset: number) => {
    const value = (data[index + offset] ?? 0) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return channel(0) * 0.2126 + channel(1) * 0.7152 + channel(2) * 0.0722;
}

interface Face {
  boundingBox: { x: number; y: number; width: number; height: number };
}
type FaceDetector = new (options: {
  fastMode: boolean;
  maxDetectedFaces: number;
}) => {
  detect(image: ImageBitmap): Promise<Face[]>;
};

async function faceFocal(bitmap: ImageBitmap) {
  const Constructor = (
    globalThis as typeof globalThis & { FaceDetector?: FaceDetector }
  ).FaceDetector;
  if (!Constructor) return null;
  try {
    const detector = new Constructor({ fastMode: true, maxDetectedFaces: 1 });
    const face = (await detector.detect(bitmap))[0]?.boundingBox;
    if (
      face &&
      face.width * face.height >= 0.08 * bitmap.width * bitmap.height
    ) {
      return {
        x: (face.x + face.width / 2) / bitmap.width,
        y: (face.y + face.height / 2) / bitmap.height,
      };
    }
  } catch {
    // The API can be present in Chromium even if the platform has no detector.
  }
  return null;
}

export async function inspectPhoto(
  blob: Blob,
  minimumWidth = 0,
): Promise<DraftPhoto | null> {
  if (
    blob.size > MAX_IMAGE_BYTES ||
    !/^image\/(?:png|jpe?g|webp|avif|bmp|x-icon|vnd\.microsoft\.icon)$/i.test(
      blob.type,
    )
  )
    return null;
  let image: ImageBitmap | undefined;
  try {
    image = await createImageBitmap(blob);
    const { width, height } = image;
    if (
      !width ||
      !height ||
      width * height > MAX_BITMAP_PIXELS ||
      width < minimumWidth
    )
      return null;
    const canvas = new OffscreenCanvas(24, 16);
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context?.drawImage(image, 0, 0, 24, 16);
    const pixels = context?.getImageData(0, 8, 24, 8).data;
    const luminance = pixels
      ? Array.from({ length: pixels.length / 4 }, (_, i) =>
          luminanceAt(pixels, i * 4),
        ).sort((a, b) => a - b)
      : [];
    const light = luminance[Math.floor(luminance.length * 0.95)] ?? 0.8;
    const focal = await faceFocal(image);
    return {
      blob,
      width,
      height,
      light,
      portrait: Boolean(focal) || width / height < 0.86,
      focal: focal ?? undefined,
    };
  } catch {
    return null;
  } finally {
    image?.close();
  }
}

export async function fetchPhoto(
  url: string | null,
  minimumWidth = 600,
): Promise<DraftPhoto | null> {
  if (!url) return null;
  try {
    const response = await fetch(url, {
      mode: 'cors',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      signal: AbortSignal.timeout(4200),
    });
    if (
      !response.ok ||
      Number(response.headers.get('content-length')) > MAX_IMAGE_BYTES ||
      !response.body
    )
      return null;
    const chunks: BlobPart[] = [];
    const reader = response.body.getReader();
    let byteLength = 0;
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      byteLength += value.byteLength;
      if (byteLength > MAX_IMAGE_BYTES) {
        await reader.cancel();
        return null;
      }
      chunks.push(value.slice().buffer);
    }
    return inspectPhoto(
      new Blob(chunks, {
        type: response.headers.get('content-type')?.split(';')[0],
      }),
      minimumWidth,
    );
  } catch {
    return null;
  }
}

function youtubeImage(url: string | null) {
  if (!url) return null;
  const source = new URL(url);
  if (!/(^|\.)youtube\.com$/.test(source.hostname)) return null;
  const video =
    source.searchParams.get('v') ??
    /^\/(?:shorts|live)\/([^/]+)/.exec(source.pathname)?.[1];
  return video && /^[\w-]{11}$/.test(video)
    ? 'https://i.ytimg.com/vi/' + video + '/hqdefault.jpg'
    : null;
}

export async function draftFromInput(
  input: CardInput,
  photoLabel: string,
): Promise<CardDraft | null> {
  const text = input.text?.trim().slice(0, MAX_TEXT_BYTES) ?? '';
  const initialUrl = urlFromText(input.uri ?? text);
  const article = input.html
    ? parseArticle(input.html, initialUrl?.href)
    : null;
  const url = article?.canonical ?? initialUrl;
  const source = url
    ? sourceForLink(url, article?.headline || input.title)
    : null;
  if (url && !source) return null;

  const headline =
    source?.title ||
    article?.headline ||
    limitHeadline(text) ||
    (input.file ? photoLabel : '');
  if (!headline) return null;
  const photo = input.file
    ? await inspectPhoto(input.file)
    : article?.image
      ? await fetchPhoto(article.image)
      : await fetchPhoto(youtubeImage(source?.canonicalUrl ?? null), 480);
  if (input.file && !photo) return null;
  return newCardDraft({ source, headline, photo });
}
