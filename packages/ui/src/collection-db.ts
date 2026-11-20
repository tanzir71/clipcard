import { parseWebUrl, textFragment, timestampedVideoUrl } from '@clipcard/core';
import { connectCollections } from './storage-db.ts';
import type { Connection, Upgrade } from './storage-db.ts';

export function canonicalSource(url: string | null): string | null {
  if (!url || !parseWebUrl(url)) return null;
  return timestampedVideoUrl(url) ?? textFragment(url, '');
}

async function migrateCards(transaction: Parameters<Upgrade>[3]) {
  const cards = await transaction.objectStore('cards').getAll();
  const drafts = transaction.objectStore('drafts');
  const clips = transaction.objectStore('clips');
  for (const card of cards) {
    const id = `legacy:${card.id}`;
    const sourceUrl = canonicalSource(card.source?.canonicalUrl ?? null);
    await drafts.add({
      id: card.id,
      title: card.headline,
      createdAt: card.createdAt,
      updatedAt: card.updatedAt,
      mode: 'card',
      overrides: card.overrides,
      order: [id],
      legacyCard: card,
    });
    await clips.add({
      id,
      draftId: card.id,
      kind: card.selection
        ? 'text'
        : card.section
          ? 'section'
          : card.source
            ? 'link'
            : card.photo
              ? 'image'
              : 'text',
      title: card.original,
      sourceUrl,
      outlet: card.source?.siteName,
      lang: card.source?.lang,
      publishedAt: card.source?.publishedAt ?? undefined,
      text: card.selection ?? (card.source ? undefined : card.original),
      textFragment:
        sourceUrl && card.selection
          ? textFragment(sourceUrl, card.selection)
          : undefined,
      createdAt: card.createdAt,
    });
  }
}

export function collectionDatabase(): Connection {
  return connectCollections((db, installedVersion, newVersion, transaction) => {
    if (installedVersion >= 2 || newVersion !== 2) return;
    db.createObjectStore('drafts', { keyPath: 'id' }).createIndex(
      'updatedAt',
      'updatedAt',
    );
    db.createObjectStore('clips', { keyPath: 'id' }).createIndex(
      'draftId',
      'draftId',
    );
    db.createObjectStore('library', { keyPath: 'id' });
    db.createObjectStore('prefs');
    db.createObjectStore('expiredMedia');
    if (installedVersion === 1) {
      void transaction.done.catch(() => undefined);
      void migrateCards(transaction).catch(() => {
        try {
          transaction.abort();
        } catch {
          // A failed request may already have aborted the upgrade.
        }
      });
    }
  });
}
