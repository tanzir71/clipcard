import { excerptText } from '@clipcard/cards/grid-model';
import {
  detectLang,
  detectScript,
  dirFor,
  outletFromHost,
} from '@clipcard/core';
import { appendDraftClip, readClipMedia } from './collections.ts';
import type { DraftClip, DraftCollection } from './collections.ts';
import { newCardDraft } from './draft.ts';
import type { CardDraft } from './draft.ts';
import { inspectPhoto } from './input.ts';

export function appendCardDraft(card: CardDraft, preferGrid = false) {
  const selection = card.selection && excerptText(card.selection);
  return appendDraftClip(
    {
      kind: selection
        ? 'text'
        : card.source
          ? 'link'
          : card.photo
            ? 'image'
            : 'text',
      sourceUrl: card.source?.canonicalUrl ?? null,
      title: card.source?.title ?? card.original,
      outlet: card.source?.siteName,
      lang: card.source?.lang,
      publishedAt: card.source?.publishedAt ?? undefined,
      text:
        selection ||
        (!card.source && !card.photo ? excerptText(card.original) : undefined),
    },
    {
      media: card.photo?.blob,
      preferGrid,
    },
  );
}

export async function cardFromCollection(
  { draft, clips }: DraftCollection,
  first: DraftClip | undefined = clips[0],
): Promise<CardDraft | null> {
  if (!first) return null;
  if (draft.legacyCard && first.kind !== 'video' && first.id === clips[0]?.id)
    return { ...draft.legacyCard, overrides: draft.overrides };
  const address = first.sourceUrl ? new URL(first.sourceUrl) : null;
  const headline = first.text || first.video?.cues[0]?.text || first.title;
  const lang = detectLang(headline, first.lang);
  const blob =
    first.kind === 'video'
      ? first.video?.poster &&
        (await fetch(first.video.poster)
          .then((response) => response.blob())
          .catch(() => undefined))
      : await readClipMedia(first).catch(() => undefined);
  const card = newCardDraft({
    source: address
      ? {
          canonicalUrl: address.href,
          title: first.title,
          siteName: first.outlet ?? outletFromHost(address.hostname),
          image: null,
          favicon: new URL('/favicon.ico', address).href,
          lang,
          script: detectScript(headline),
          dir: dirFor(lang),
          description: null,
          publishedAt: first.publishedAt ?? null,
          themeColor: null,
          isArticle: false,
        }
      : null,
    headline,
    selection: first.kind === 'text' && address ? first.text : undefined,
    photo: blob ? await inspectPhoto(blob) : null,
  });
  return {
    ...card,
    id: draft.id,
    createdAt: draft.createdAt,
    updatedAt: draft.updatedAt,
    overrides: draft.overrides,
  };
}
