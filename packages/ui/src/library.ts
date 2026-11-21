import { detectLang, parseWebUrl, slugHeadline } from '@clipcard/core';
import { canonicalSource, collectionDatabase } from './collection-db.ts';
import {
  readStoredMedia,
  removeMedia,
  requestPersistentStorage,
  storeMedia,
} from './collection-media.ts';
import { appendDraftClip, readClipMedia } from './collections.ts';
import type { DraftClip, LibraryItem } from './collection-types.ts';

const maxBytes = 28 * 1024 * 1024;
export const libraryFileTypes =
  'image/jpeg,image/png,image/webp,image/avif,image/gif,video/mp4,video/webm';

const trimmedTags = (values: string[]) =>
  [...new Set(values.map((tag) => tag.trim()).filter(Boolean))]
    .slice(0, 12)
    .map((tag) => tag.slice(0, 40));

export async function listLibrary() {
  return (await (await collectionDatabase()).getAll('library')).sort(
    (left, right) => right.savedAt - left.savedAt,
  );
}

export const readLibraryItem = (item: LibraryItem) => readStoredMedia(item);

async function putLibraryMedia(
  item: Omit<LibraryItem, 'id' | 'savedAt' | 'favorite'>,
  blob: Blob,
) {
  if (
    !blob.size ||
    blob.size > maxBytes ||
    !libraryFileTypes.split(',').includes(blob.type)
  )
    throw new RangeError('library-media');
  const id = crypto.randomUUID();
  const db = await collectionDatabase();
  void requestPersistentStorage().catch(() => undefined);
  const stored = await storeMedia(id, blob);
  const entry = {
    ...item,
    id,
    savedAt: Date.now(),
    favorite: false,
    ...stored,
  };
  try {
    await db.put('library', entry);
  } catch (error) {
    if (entry.mediaKey)
      await removeMedia(entry.mediaKey).catch(() => undefined);
    throw error;
  }
  return entry;
}

export function libraryTitle(item: LibraryItem) {
  return (
    item.title ??
    (item.sourceUrl && slugHeadline(item.sourceUrl)) ??
    item.tags[0] ??
    ''
  );
}

export async function saveClipToLibrary(clip: DraftClip) {
  const blob = await readClipMedia(clip);
  if (!blob) return null;
  const title = clip.title.slice(0, 200);
  const tags = trimmedTags(
    title.match(/[\p{L}\p{M}\p{N}]{4,}/gu)?.slice(0, 4) ?? [],
  );
  return putLibraryMedia(
    {
      kind: clip.kind,
      title,
      tags,
      sourceUrl: canonicalSource(clip.sourceUrl),
      outlet: clip.outlet,
      lang: clip.lang,
      video: clip.video,
    },
    blob,
  );
}

export async function saveLibraryFile(file: File) {
  const title = file.name
    .replace(/\.[^.]+$/, '')
    .replaceAll(/[_-]+/g, ' ')
    .slice(0, 200);
  const kind =
    file.type === 'image/gif'
      ? 'gif'
      : file.type.startsWith('video/')
        ? 'video'
        : 'image';
  let video: LibraryItem['video'];
  if (kind === 'video') {
    if (!file.size || file.size > maxBytes)
      throw new RangeError('library-media');
    const { videoMetadata } = await import('./video-metadata.ts');
    const data = await videoMetadata(file);
    video = {
      source: null,
      start: 0,
      end: Math.min(60, data.duration),
      cues: [],
      poster: data.poster,
    };
  }
  return putLibraryMedia(
    { kind, title, sourceUrl: null, tags: [], lang: detectLang(title), video },
    file,
  );
}

export function saveSourcedImage(
  title: string,
  sourceUrl: string,
  image: Blob,
) {
  return putLibraryMedia(
    {
      kind: 'image',
      title: title.slice(0, 200),
      sourceUrl: canonicalSource(sourceUrl),
      tags: trimmedTags(
        title.match(/[\p{L}\p{M}\p{N}]{4,}/gu)?.slice(0, 4) ?? [],
      ),
    },
    image,
  );
}

export async function editLibraryItem(
  id: string,
  change: Pick<LibraryItem, 'tags' | 'favorite'>,
) {
  const db = await collectionDatabase();
  const tx = db.transaction('library', 'readwrite');
  const item = await tx.store.get(id);
  if (item)
    await tx.store.put({
      ...item,
      tags: trimmedTags(change.tags),
      favorite: change.favorite,
    });
  await tx.done;
}

export async function removeLibraryItem(id: string) {
  const db = await collectionDatabase();
  const tx = db.transaction(['library', 'expiredMedia'], 'readwrite');
  const item = await tx.objectStore('library').get(id);
  if (item) await tx.objectStore('library').delete(id);
  if (item?.mediaKey)
    await tx.objectStore('expiredMedia').put(item.mediaKey, item.mediaKey);
  await tx.done;
  if (item?.mediaKey) {
    await removeMedia(item.mediaKey)
      .then(() => db.delete('expiredMedia', item.mediaKey!))
      .catch(() => undefined);
  }
}

export async function addLibraryItem(
  item: LibraryItem,
  {
    draftId,
    after,
    reaction,
  }: { draftId?: string; after?: string; reaction?: boolean } = {},
) {
  const media = await readLibraryItem(item);
  if (!media) throw new Error('missing-library-media');
  const address = item.sourceUrl && parseWebUrl(item.sourceUrl);
  const isVideo = media.type.startsWith('video/') && item.kind !== 'gif';
  const isGif = media.type === 'image/gif' || item.kind === 'gif';
  return appendDraftClip(
    {
      kind: reaction || isGif ? 'gif' : isVideo ? 'video' : 'image',
      title: libraryTitle(item),
      sourceUrl: address ? address.href : null,
      lang: item.lang,
      outlet: item.outlet,
      video: item.video,
      reaction,
    },
    {
      media,
      preferVideo: reaction || isVideo || isGif,
      preferGrid: true,
      draftId,
      after,
    },
  );
}
