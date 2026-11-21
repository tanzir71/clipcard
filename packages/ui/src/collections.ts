import { maxClipSeconds, maxSourceSeconds, textFragment } from '@clipcard/core';
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
  ClipVideo,
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
  {
    now = Date.now(),
    media,
    preferGrid = false,
    draftId,
    preferVideo = false,
    after,
  }: {
    now?: number;
    media?: Blob;
    preferGrid?: boolean;
    draftId?: string;
    preferVideo?: boolean;
    after?: string;
  } = {},
): Promise<DraftCollection> {
  const db = await collectionDatabase();
  const id = crypto.randomUUID();
  const sourceUrl = canonicalSource(input.sourceUrl);
  const video = input.kind === 'video' ? input.video : undefined;
  const length = video ? video.end - video.start : 0;
  if (
    video &&
    (!Number.isFinite(length) || length <= 0 || length > maxClipSeconds)
  )
    throw new RangeError('video-clip-length');
  const storedMedia = media ? await storeMedia(id, media) : {};
  try {
    const tx = db.transaction(['prefs', 'drafts', 'clips'], 'readwrite');
    const prefs = tx.objectStore('prefs');
    const drafts = tx.objectStore('drafts');
    const clips = tx.objectStore('clips');
    const currentId = draftId ?? (await prefs.get('currentDraftId'));
    const previous = currentId ? await drafts.get(currentId) : undefined;
    if (draftId && !previous) {
      await tx.done;
      throw new Error('missing-draft');
    }
    const current =
      previous && (draftId || now - previous.updatedAt < draftTimeout)
        ? previous
        : undefined;
    if (current && video?.source) {
      const saved = await clips.index('draftId').getAll(current.id);
      const used = saved.reduce(
        (total, clip) =>
          clip.video?.source === video.source
            ? total + clip.video.end - clip.video.start
            : total,
        0,
      );
      if (used + length > maxSourceSeconds) {
        await tx.done;
        throw new RangeError('video-source-length');
      }
    }
    const mode =
      preferVideo || video || current?.mode === 'video'
        ? 'video'
        : preferGrid || current?.order.length
          ? 'grid'
          : 'card';
    const order = current?.order.slice() ?? [];
    const position = after ? order.indexOf(after) : -1;
    order.splice(position < 0 ? order.length : position + 1, 0, id);
    const draft: ClipDraft = current
      ? {
          ...current,
          updatedAt: Math.max(current.updatedAt, now),
          mode,
          order,
        }
      : {
          id: crypto.randomUUID(),
          title: input.title,
          createdAt: now,
          updatedAt: now,
          mode,
          overrides: {},
          order,
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

export async function getCurrentDraftCollection() {
  const db = await collectionDatabase();
  const id = await db.get('prefs', 'currentDraftId');
  return id ? getDraftCollection(id) : undefined;
}

export async function startNewDraftCollection(): Promise<void> {
  const db = await collectionDatabase();
  await db.delete('prefs', 'currentDraftId');
}

export async function updateDraftCollection(
  id: string,
  patch: Partial<
    Pick<
      ClipDraft,
      'mode' | 'gridLayout' | 'overrides' | 'title' | 'videoOptions' | 'batch'
    >
  >,
): Promise<DraftCollection | undefined> {
  const db = await collectionDatabase();
  const tx = db.transaction(['drafts', 'clips'], 'readwrite');
  const drafts = tx.objectStore('drafts');
  const existing = await drafts.get(id);
  if (!existing) {
    await tx.done;
    return undefined;
  }
  const draft = { ...existing, ...patch, updatedAt: Date.now() };
  const [clips] = await Promise.all([
    tx.objectStore('clips').index('draftId').getAll(id),
    drafts.put(draft),
    tx.done,
  ]);
  return { draft, clips: orderedClips(clips, draft.order) };
}

export async function updateVideoClip(
  draftId: string,
  clipId: string,
  change: {
    trim?: DraftClip['trim'];
    fit?: DraftClip['fit'];
    cues?: NonNullable<DraftClip['video']>['cues'];
  },
): Promise<DraftCollection | undefined> {
  const db = await collectionDatabase();
  const tx = db.transaction(['drafts', 'clips'], 'readwrite');
  const drafts = tx.objectStore('drafts');
  const clips = tx.objectStore('clips');
  const [draft, clip] = await Promise.all([
    drafts.get(draftId),
    clips.get(clipId),
  ]);
  if (!draft || !clip?.video || clip.draftId !== draftId) {
    await tx.done;
    return;
  }
  const duration = clip.video.end - clip.video.start;
  const trim = change.trim && {
    start: Math.max(0, Math.min(duration - 0.2, change.trim.start)),
    end: Math.min(duration, change.trim.end),
  };
  const next = {
    ...clip,
    trim: trim && trim.end - trim.start >= 0.19 ? trim : clip.trim,
    fit: change.fit ?? clip.fit,
    video: { ...clip.video, cues: change.cues ?? clip.video.cues },
  };
  const updated = { ...draft, updatedAt: Date.now() };
  await Promise.all([clips.put(next), drafts.put(updated), tx.done]);
  return getDraftCollection(draftId);
}

export async function moveDraftClip(
  draftId: string,
  clipId: string,
  targetId: string,
): Promise<DraftCollection | undefined> {
  const db = await collectionDatabase();
  const tx = db.transaction(['drafts', 'clips'], 'readwrite');
  const drafts = tx.objectStore('drafts');
  const existing = await drafts.get(draftId);
  const order = existing?.order.slice() ?? [];
  const from = order.indexOf(clipId);
  const to = order.indexOf(targetId);
  if (!existing || from < 0 || to < 0 || from === to) {
    await tx.done;
    return undefined;
  }
  order.splice(from, 1);
  order.splice(to, 0, clipId);
  const draft = { ...existing, order, updatedAt: Date.now() };
  const [clips] = await Promise.all([
    tx.objectStore('clips').index('draftId').getAll(draftId),
    drafts.put(draft),
    tx.done,
  ]);
  return { draft, clips: orderedClips(clips, order) };
}

export async function removeDraftClip(
  draftId: string,
  clipId: string,
): Promise<DraftCollection | undefined> {
  const db = await collectionDatabase();
  const tx = db.transaction(['drafts', 'clips', 'expiredMedia'], 'readwrite');
  const drafts = tx.objectStore('drafts');
  const clips = tx.objectStore('clips');
  const [existing, clip] = await Promise.all([
    drafts.get(draftId),
    clips.get(clipId),
  ]);
  if (!existing || clip?.draftId !== draftId) {
    await tx.done;
    return undefined;
  }
  const order = existing.order.filter((id) => id !== clipId);
  const draft = { ...existing, order, updatedAt: Date.now() };
  const mediaKey = clip.mediaKey;
  const [remaining] = await Promise.all([
    clips.index('draftId').getAll(draftId),
    drafts.put(draft),
    clips.delete(clipId),
    mediaKey
      ? tx.objectStore('expiredMedia').put(mediaKey, mediaKey)
      : undefined,
    tx.done,
  ]);
  if (mediaKey) {
    await withMediaLock(async () => {
      await removeMedia(mediaKey);
      await db.delete('expiredMedia', mediaKey);
    }).catch(() => undefined);
  }
  return { draft, clips: orderedClips(remaining, order) };
}

export async function setDraftRetention(retention: Retention): Promise<void> {
  const db = await collectionDatabase();
  await db.put('prefs', retention, 'retention');
}

export async function getDraftRetention(): Promise<Retention> {
  const db = await collectionDatabase();
  return (await db.get('prefs', 'retention')) === 'forever'
    ? 'forever'
    : '30-days';
}

export function sweepDraftCollections(now = Date.now()): Promise<number> {
  return withMediaLock(() => sweep(now));
}

export async function clearDraftCollections(): Promise<void> {
  await withMediaLock(() => sweep(Date.now(), true));
}

async function sweep(now: number, clearAll = false): Promise<number> {
  const db = await collectionDatabase();
  const tx = db.transaction(
    ['prefs', 'drafts', 'clips', 'cards', 'expiredMedia'],
    'readwrite',
  );
  const prefs = tx.objectStore('prefs');
  const drafts = tx.objectStore('drafts');
  let expired: ClipDraft[] = [];
  if (clearAll) expired = await drafts.getAll();
  else if ((await prefs.get('retention')) !== 'forever') {
    expired = await drafts
      .index('updatedAt')
      .getAll(IDBKeyRange.upperBound(now - retentionPeriod, true));
  }
  const current = await prefs.get('currentDraftId');
  const clips = tx.objectStore('clips');
  const expiredMedia = tx.objectStore('expiredMedia');
  const cards = tx.objectStore('cards');
  for (const draft of expired) {
    for (const clip of await clips.index('draftId').getAll(draft.id)) {
      if (clip.mediaKey) await expiredMedia.put(clip.mediaKey, clip.mediaKey);
      await clips.delete(clip.id);
    }
    if (!draft.legacyCard) {
      await cards.delete(draft.id);
    } else {
      const card = await cards.get(draft.id);
      if (card?.updatedAt === draft.legacyCard.updatedAt)
        await cards.delete(draft.id);
    }
    await drafts.delete(draft.id);
    if (draft.id === current) await prefs.delete('currentDraftId');
  }
  if (clearAll) {
    await cards.clear();
    await prefs.delete('currentDraftId');
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
    savedForLater: true,
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
