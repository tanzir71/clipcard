import { textFragment } from '@clipcard/core';
import {
  readStoredMedia,
  removeMedia,
  withMediaLock,
  storeMedia,
} from './collection-media.ts';
import { canonicalSource, collectionDatabase } from './collection-db.ts';
import type {
  ClipDraft,
  ClipInput,
  DraftClip,
  DraftCollection,
  Retention,
} from './collection-types.ts';

export type {
  ClipDraft,
  ClipInput,
  DraftClip,
  DraftCollection,
  Retention,
} from './collection-types.ts';
export {
  requestPersistentStorage,
  storageEstimate,
} from './collection-media.ts';

const hours = 60 * 60 * 1000;
const draftTimeout = 6 * hours;
const retentionPeriod = 30 * 24 * hours;

export async function appendDraftClip(
  input: ClipInput,
  { now = Date.now(), media }: { now?: number; media?: Blob } = {},
): Promise<DraftCollection> {
  const db = await collectionDatabase();
  const id = crypto.randomUUID();
  const sourceUrl = canonicalSource(input.sourceUrl);
  const storedMedia = media ? await storeMedia(id, media) : {};
  try {
    const tx = db.transaction(['prefs', 'drafts', 'clips'], 'readwrite');
    const prefs = tx.objectStore('prefs');
    const drafts = tx.objectStore('drafts');
    const clips = tx.objectStore('clips');
    const currentId = await prefs.get('currentDraftId');
    const current = currentId ? await drafts.get(currentId) : undefined;
    const draft: ClipDraft =
      current && now - current.updatedAt < draftTimeout
        ? {
            ...current,
            updatedAt: Math.max(current.updatedAt, now),
            order: [...current.order, id],
          }
        : {
            id: crypto.randomUUID(),
            title: input.title,
            createdAt: now,
            updatedAt: now,
            mode: 'card',
            overrides: {},
            order: [id],
          };
    const clip: DraftClip = {
      ...input,
      id,
      draftId: draft.id,
      sourceUrl,
      textFragment:
        sourceUrl && input.kind === 'text' && input.text?.trim()
          ? textFragment(sourceUrl, input.text)
          : undefined,
      createdAt: now,
      ...storedMedia,
    };
    const [, , , allClips] = await Promise.all([
      clips.add(clip),
      drafts.put(draft),
      prefs.put(draft.id, 'currentDraftId'),
      clips.index('draftId').getAll(draft.id),
      tx.done,
    ]);
    return { draft, clips: orderedClips(allClips, draft.order) };
  } catch (error) {
    if (storedMedia.mediaKey)
      await removeMedia(storedMedia.mediaKey).catch(() => undefined);
    throw error;
  }
}

function orderedClips(clips: DraftClip[], order: string[]): DraftClip[] {
  const byId = new Map(clips.map((clip) => [clip.id, clip]));
  return order.flatMap((id) => {
    const clip = byId.get(id);
    return clip ? [clip] : [];
  });
}

export async function getDraftCollection(
  id: string,
): Promise<DraftCollection | undefined> {
  const db = await collectionDatabase();
  const tx = db.transaction(['drafts', 'clips'], 'readonly');
  const [draft, clips] = await Promise.all([
    tx.objectStore('drafts').get(id),
    tx.objectStore('clips').index('draftId').getAll(id),
    tx.done,
  ]);
  if (!draft) return undefined;
  return { draft, clips: orderedClips(clips, draft.order) };
}

export async function listDraftCollections(): Promise<ClipDraft[]> {
  const db = await collectionDatabase();
  return (await db.getAllFromIndex('drafts', 'updatedAt')).reverse();
}

export async function setDraftRetention(retention: Retention): Promise<void> {
  const db = await collectionDatabase();
  await db.put('prefs', retention, 'retention');
}

export function sweepDraftCollections(now = Date.now()): Promise<number> {
  return withMediaLock(() => sweep(now));
}

async function sweep(now: number): Promise<number> {
  const db = await collectionDatabase();
  const tx = db.transaction(
    ['prefs', 'drafts', 'clips', 'cards', 'expiredMedia'],
    'readwrite',
  );
  const prefs = tx.objectStore('prefs');
  const drafts = tx.objectStore('drafts');
  const expired =
    (await prefs.get('retention')) === 'forever'
      ? []
      : await drafts
          .index('updatedAt')
          .getAll(IDBKeyRange.upperBound(now - retentionPeriod, true));
  const current = await prefs.get('currentDraftId');
  const clips = tx.objectStore('clips');
  const expiredMedia = tx.objectStore('expiredMedia');
  const cards = tx.objectStore('cards');
  for (const draft of expired) {
    for (const clip of await clips.index('draftId').getAll(draft.id)) {
      if (clip.mediaKey) await expiredMedia.put(clip.mediaKey, clip.mediaKey);
      await clips.delete(clip.id);
    }
    if (draft.legacyCard) {
      const card = await cards.get(draft.id);
      if (card?.updatedAt === draft.legacyCard.updatedAt)
        await cards.delete(draft.id);
    }
    await drafts.delete(draft.id);
    if (draft.id === current) await prefs.delete('currentDraftId');
  }
  const toRemove = await expiredMedia.getAllKeys();
  await tx.done;
  for (const key of toRemove) {
    try {
      await removeMedia(key);
      await db.delete('expiredMedia', key);
    } catch {
      // The next sweep retries file removal.
    }
  }
  return expired.length;
}

export async function saveCollectionForLater(
  id: string,
  title: string,
  now = Date.now(),
): Promise<ClipDraft | undefined> {
  const db = await collectionDatabase();
  const tx = db.transaction(['drafts', 'prefs'], 'readwrite');
  const drafts = tx.objectStore('drafts');
  const prefs = tx.objectStore('prefs');
  const draft = await drafts.get(id);
  if (!draft) {
    await tx.done;
    return undefined;
  }
  const renamed = {
    ...draft,
    title: title.trim() || draft.title,
    updatedAt: Math.max(draft.updatedAt, now),
  };
  const active = await prefs.get('currentDraftId');
  await Promise.all([
    drafts.put(renamed),
    active === id ? prefs.delete('currentDraftId') : undefined,
    tx.done,
  ]);
  return renamed;
}

export async function resumeDraftCollection(
  id: string,
  now = Date.now(),
): Promise<DraftCollection | undefined> {
  const db = await collectionDatabase();
  const tx = db.transaction(['drafts', 'clips', 'prefs'], 'readwrite');
  const drafts = tx.objectStore('drafts');
  const draft = await drafts.get(id);
  if (!draft) {
    await tx.done;
    return undefined;
  }
  const resumed = { ...draft, updatedAt: Math.max(draft.updatedAt, now) };
  const [clips] = await Promise.all([
    tx.objectStore('clips').index('draftId').getAll(id),
    tx.objectStore('prefs').put(id, 'currentDraftId'),
    drafts.put(resumed),
    tx.done,
  ]);
  return { draft: resumed, clips: orderedClips(clips, resumed.order) };
}

export const readClipMedia = (clip: DraftClip) => readStoredMedia(clip);
