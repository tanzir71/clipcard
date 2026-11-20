import {
  cleanUrl,
  detectLang,
  detectScript,
  dirFor,
  limitHeadline,
  outletFromHost,
  parseWebUrl,
  resolveUrl,
  slugHeadline,
  unwrapUrl,
} from '@clipcard/core';
import type { CardSource } from '@clipcard/core';
import { modelForDraft, newCardDraft, optionsForDraft } from '@clipcard/ui';
import { fetchPhoto } from '@clipcard/ui/input';
import { saveDraft } from '@clipcard/ui/storage';
import { fetchArticle } from './article.ts';
import type { MadeCard, SitePrefs, SourceRequest } from './messages.ts';

export async function sourceAddress(address: string, canFetch: boolean) {
  return canFetch
    ? (await resolveUrl(address)).url
    : cleanUrl(unwrapUrl(address)).url;
}

function fallbackSource(address: string, title: string): CardSource {
  const url = new URL(address);
  const siteName = outletFromHost(url.hostname);
  const headline = limitHeadline(title) || slugHeadline(address) || siteName;
  const lang = detectLang(headline);
  return {
    canonicalUrl: address,
    title: headline,
    image: null,
    siteName,
    favicon: new URL('/favicon.ico', url).href,
    lang,
    script: detectScript(headline),
    dir: dirFor(lang),
    description: null,
    publishedAt: null,
    themeColor: null,
    isArticle: Boolean(title),
  };
}

function allowedPhoto(url: string | null | undefined, request: SourceRequest) {
  if (!url) return null;
  if (url.startsWith('data:') || request.canFetch) return url;
  return parseWebUrl(url)?.origin ===
    parseWebUrl(request.hints?.address ?? '')?.origin
    ? url
    : null;
}

function asDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function makeThumbnail(png: Blob): Promise<Blob> {
  const image = await createImageBitmap(png);
  try {
    const canvas = new OffscreenCanvas(120, 150);
    const context = canvas.getContext('2d');
    const scale = Math.max(120 / image.width, 150 / image.height);
    const width = image.width * scale;
    const height = image.height * scale;
    context?.drawImage(
      image,
      (120 - width) / 2,
      (150 - height) / 2,
      width,
      height,
    );
    return await canvas.convertToBlob({ type: 'image/webp', quality: 0.8 });
  } finally {
    image.close();
  }
}

export async function makeCard(
  request: SourceRequest,
  render: boolean,
  preferencesFor: (address: string) => Promise<SitePrefs>,
): Promise<MadeCard> {
  const { hints, canFetch, destination } = request;
  const address = await sourceAddress(request.address, canFetch);
  const live = hints?.source;
  const downloaded =
    canFetch && !live
      ? await fetchArticle(address, (html) =>
          new DOMParser().parseFromString(html, 'text/html'),
        )
      : null;
  const source =
    live ?? downloaded ?? fallbackSource(address, hints?.title ?? '');
  const preferenceWork = preferencesFor(source.canonicalUrl);
  const image = allowedPhoto(source.image, request);
  const hintedImage = allowedPhoto(hints?.image, request);
  let photo = await fetchPhoto(image);
  if (
    hintedImage &&
    hintedImage !== image &&
    (!photo || (hints?.imageWidth ?? 0) > photo.width)
  ) {
    photo = (await fetchPhoto(hintedImage)) ?? photo;
  }
  const selection = request.selection?.trim().slice(0, 500) || undefined;
  const headline = selection ? limitHeadline(selection) : source.title;
  const draft = newCardDraft({ source, headline, photo, selection });
  const prefs = await preferenceWork;
  draft.overrides = {
    format: prefs.format,
    theme: prefs.theme,
    template:
      photo && !selection && prefs.template !== 'quote'
        ? prefs.template
        : undefined,
  };
  draft.autoFormat = destination?.format;
  draft.destination = destination?.name;
  draft.fallback = !live && !downloaded;

  const localImage = photo ? URL.createObjectURL(photo.blob) : null;
  try {
    const model = modelForDraft(draft, localImage, draft.createdAt);
    const options = optionsForDraft(draft, model);
    const png = render
      ? await import('@clipcard/cards/export').then(({ renderCard }) =>
          renderCard(model, options, { chromiumOffscreen: true }),
        )
      : null;
    const [thumb, encodedPng] = await Promise.all([
      png ? makeThumbnail(png) : null,
      png ? asDataUrl(png) : undefined,
    ]);
    if (thumb) draft.thumb = thumb;
    const [, preview] = await Promise.all([
      saveDraft(draft),
      thumb ? asDataUrl(thumb) : undefined,
    ]);
    return {
      id: draft.id,
      url: source.canonicalUrl,
      dir: model.dir,
      template: options.template,
      format: options.format,
      png: encodedPng,
      thumb: preview,
      fallback: draft.fallback,
    };
  } finally {
    if (localImage) URL.revokeObjectURL(localImage);
  }
}
