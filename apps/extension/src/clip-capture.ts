import { excerptText } from '@clipcard/cards/grid-model';
import {
  cleanUrl,
  outletFromHost,
  parseWebUrl,
  slugHeadline,
} from '@clipcard/core';
import { appendDraftClip, readClipMedia } from '@clipcard/ui/collections';
import type { DraftCollection } from '@clipcard/ui/collections';
import { fetchPhoto } from '@clipcard/ui/input';
import { browser } from 'wxt/browser';
import type { Browser } from 'wxt/browser';
import type { ClipCapture, ClipTray, Hints } from './messages.ts';

async function thumbnail(blob: Blob) {
  const bitmap = await createImageBitmap(blob);
  try {
    const canvas = new OffscreenCanvas(40, 52);
    const context = canvas.getContext('2d');
    if (!context) return undefined;
    const scale = Math.max(40 / bitmap.width, 52 / bitmap.height);
    const width = bitmap.width * scale;
    const height = bitmap.height * scale;
    context.drawImage(
      bitmap,
      (40 - width) / 2,
      (52 - height) / 2,
      width,
      height,
    );
    const png = await canvas.convertToBlob({
      type: 'image/jpeg',
      quality: 0.68,
    });
    const bytes = new Uint8Array(await png.arrayBuffer());
    return (
      'data:image/jpeg;base64,' +
      btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(''))
    );
  } finally {
    bitmap.close();
  }
}

async function trayFor({ draft, clips }: DraftCollection): Promise<ClipTray> {
  return {
    id: draft.id,
    count: clips.length,
    sources: new Set(
      clips.flatMap((clip) => (clip.sourceUrl ? [clip.sourceUrl] : [])),
    ).size,
    thumbnails: await Promise.all(
      clips.slice(-3).map(async (clip) => {
        const blob = await readClipMedia(clip).catch(() => undefined);
        return {
          kind: clip.kind,
          image: blob
            ? await thumbnail(blob).catch(() => undefined)
            : undefined,
        };
      }),
    ),
  };
}

async function cropVisible(
  tab: Browser.tabs.Tab,
  rect: NonNullable<ClipCapture['rect']>,
) {
  if (
    !Number.isFinite(rect.viewport) ||
    rect.viewport <= 0 ||
    [rect.x, rect.y, rect.width, rect.height].some(
      (value) => !Number.isFinite(value),
    ) ||
    rect.width < 4 ||
    rect.height < 4
  )
    return undefined;
  const [active] = await browser.tabs.query({
    windowId: tab.windowId,
    active: true,
  });
  if (tab.id === undefined || active?.id !== tab.id) return undefined;
  const data = await browser.tabs.captureVisibleTab(tab.windowId, {
    format: 'png',
  });
  const blob = await fetch(data).then((response) => response.blob());
  const bitmap = await createImageBitmap(blob);
  try {
    const factor = bitmap.width / rect.viewport;
    const x = Math.max(0, Math.floor(rect.x * factor));
    const y = Math.max(0, Math.floor(rect.y * factor));
    const right = Math.min(
      bitmap.width,
      Math.ceil((rect.x + rect.width) * factor),
    );
    const bottom = Math.min(
      bitmap.height,
      Math.ceil((rect.y + rect.height) * factor),
    );
    const width = right - x;
    const height = bottom - y;
    if (width < 4 || height < 4) return undefined;
    const scale = Math.min(1, 1800 / Math.max(width, height));
    const canvas = new OffscreenCanvas(
      Math.round(width * scale),
      Math.round(height * scale),
    );
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) return undefined;
    context.drawImage(
      bitmap,
      x,
      y,
      width,
      height,
      0,
      0,
      canvas.width,
      canvas.height,
    );
    return canvas.convertToBlob({ type: 'image/webp', quality: 0.92 });
  } finally {
    bitmap.close();
  }
}

export async function persistCapture(
  tab: Browser.tabs.Tab,
  hints: Hints | null,
  capture: ClipCapture,
  canFetchImage: boolean,
  topFrame: boolean,
) {
  if (
    capture.kind !== 'text' &&
    capture.kind !== 'image' &&
    capture.kind !== 'section'
  )
    return;
  const address = parseWebUrl(
    hints?.source?.canonicalUrl ?? hints?.address ?? tab.url ?? '',
  );
  if (!address) return;
  const text =
    capture.kind === 'text' && typeof capture.text === 'string'
      ? excerptText(capture.text.slice(0, 1000))
      : undefined;
  let media: Blob | undefined;
  if (capture.kind !== 'text') {
    if (
      capture.kind === 'image' &&
      typeof capture.image === 'string' &&
      canFetchImage
    ) {
      media = (await fetchPhoto(capture.image, 1))?.blob;
    }
    if (!media && topFrame && capture.rect) {
      media = await cropVisible(tab, capture.rect).catch(() => undefined);
    }
    if (!media) return;
  } else if (!text) return;
  const source = hints?.source;
  const section = capture.rect;
  const collection = await appendDraftClip(
    {
      kind: capture.kind,
      sourceUrl: cleanUrl(address.href).url,
      title:
        source?.title ||
        hints?.title ||
        tab.title ||
        slugHeadline(address.href) ||
        address.hostname,
      outlet: source?.siteName ?? outletFromHost(address.hostname),
      lang: source?.lang,
      publishedAt: source?.publishedAt ?? undefined,
      text,
      rect: section && {
        x: section.x,
        y: section.y,
        width: section.width,
        height: section.height,
      },
    },
    { media, preferGrid: true },
  );
  return trayFor(collection);
}
