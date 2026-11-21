import {
  cleanBatchLinks,
  detectLang,
  detectScript,
  dirFor,
  maxBatchLinks,
  outletFromHost,
  parseWebUrl,
  slugHeadline,
} from '@clipcard/core';
import type { BatchLink } from '@clipcard/core';
import { canonicalSource, collectionDatabase } from './collection-db.ts';
import { removeMedia, storeMedia, withMediaLock } from './collection-media.ts';
import type {
  BatchOptions,
  ClipDraft,
  DraftClip,
  DraftCollection,
} from './collection-types.ts';
import { newCardDraft } from './draft.ts';
import type { CardDraft } from './draft.ts';
import { draftFromInput } from './input.ts';

export async function resolveBatchLinks(
  links: readonly BatchLink[],
  resolve: (link: BatchLink) => Promise<CardDraft | null>,
) {
  const normalized = cleanBatchLinks(links);
  if (normalized.length > maxBatchLinks) throw new RangeError('batch-limit');
  const cards: CardDraft[] = [];
  for (let offset = 0; offset < normalized.length; offset += 4) {
    const group = await Promise.all(
      normalized.slice(offset, offset + 4).map(resolve),
    );
    for (const card of group) if (card) cards.push(card);
  }
  return cards;
}

export async function webBatchCard({ address, title }: BatchLink) {
  const card = await draftFromInput({ text: address }, title ?? 'Clipcard');
  if (!card) return null;
  return title
    ? {
        ...card,
        headline: title,
        original: title,
        source: card.source ? { ...card.source, title } : null,
      }
    : card;
}

export async function createBatch(
  cards: readonly CardDraft[],
  source: BatchOptions['source'],
  title: string,
): Promise<DraftCollection | null> {
  const byAddress = new Map<string, CardDraft>();
  for (const card of cards) {
    const address = canonicalSource(card.source?.canonicalUrl ?? null);
    if (address && !byAddress.has(address)) byAddress.set(address, card);
  }
  if (!byAddress.size) return null;
  if (byAddress.size > maxBatchLinks) throw new RangeError('batch-limit');
  return withMediaLock(async () => {
    const db = await collectionDatabase();
    const id = crypto.randomUUID();
    const now = Date.now();
    const clips: DraftClip[] = [];
    try {
      for (const [sourceUrl, card] of byAddress) {
        const clipId = crypto.randomUUID();
        const media = card.photo
          ? await storeMedia(clipId, card.photo.blob)
          : {};
        clips.push({
          id: clipId,
          draftId: id,
          kind: 'link',
          title: card.headline,
          sourceUrl,
          outlet: card.source?.siteName,
          lang: card.source?.lang,
          publishedAt: card.source?.publishedAt ?? undefined,
          createdAt: now,
          ...media,
        });
      }
      const draft: ClipDraft = {
        id,
        title,
        createdAt: now,
        updatedAt: now,
        mode: 'grid',
        batch: { source, output: 'roundup' },
        order: clips.map((clip) => clip.id),
        overrides: {},
      };
      const tx = db.transaction(['drafts', 'clips', 'prefs'], 'readwrite');
      await Promise.all([
        tx.objectStore('drafts').put(draft),
        ...clips.map((clip) => tx.objectStore('clips').add(clip)),
        tx.objectStore('prefs').put(id, 'currentDraftId'),
        tx.done,
      ]);
      return { draft, clips };
    } catch (error) {
      await Promise.all(
        clips.map(
          ({ mediaKey }) =>
            mediaKey && removeMedia(mediaKey).catch(() => undefined),
        ),
      );
      throw error;
    }
  });
}

export function batchFallback(link: BatchLink) {
  const url = parseWebUrl(link.address);
  if (!url) return null;
  const headline = link.title || slugHeadline(url.href) || url.hostname;
  const lang = detectLang(headline);
  return newCardDraft({
    headline,
    source: {
      canonicalUrl: url.href,
      title: headline,
      siteName: outletFromHost(url.hostname),
      image: null,
      favicon: new URL('/favicon.ico', url).href,
      lang,
      dir: dirFor(lang),
      script: detectScript(headline),
      publishedAt: null,
      description: null,
      themeColor: null,
      isArticle: false,
    },
  });
}
