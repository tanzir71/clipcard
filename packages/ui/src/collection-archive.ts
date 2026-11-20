import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import { textFragment } from '@clipcard/core';
import { archiveSchema } from './collection-archive-schema.ts';
import type { ArchiveManifest } from './collection-archive-schema.ts';
import {
  readStoredMedia,
  removeMedia,
  withMediaLock,
  storeMedia,
} from './collection-media.ts';
import type { ClipDraft, DraftClip, LibraryItem } from './collection-types.ts';
import { canonicalSource, collectionDatabase } from './collection-db.ts';
import type { CardDraft } from './draft.ts';

const manifestName = 'clipcard.json';
const maxBytes = 512 * 1024 * 1024;
const maxFiles = 10_000;
const mediaPath = (entry: number) => `media/${entry}`;

type MediaRef = { entry: number; type: string };
type ArchivedCard = NonNullable<
  ArchiveManifest['drafts'][number]['legacyCard']
>;

export function exportCollections(): Promise<Blob> {
  return withMediaLock(writeArchive);
}

async function writeArchive(): Promise<Blob> {
  const db = await collectionDatabase();
  const tx = db.transaction(
    ['drafts', 'clips', 'library', 'cards'],
    'readonly',
  );
  const [drafts, clips, library, cards] = await Promise.all([
    tx.objectStore('drafts').getAll(),
    tx.objectStore('clips').getAll(),
    tx.objectStore('library').getAll(),
    tx.objectStore('cards').getAll(),
    tx.done,
  ]);
  const currentCards = new Map(cards.map((card) => [card.id, card]));
  const files: Record<string, Uint8Array> = {};
  let entries = 0;
  let bytes = 0;
  async function addFile(blob: Blob, type = blob.type): Promise<MediaRef> {
    bytes += blob.size;
    const entry = entries++;
    if (entries >= maxFiles || bytes > maxBytes)
      throw new Error('archive-too-large');
    files[mediaPath(entry)] = new Uint8Array(await blob.arrayBuffer());
    return { entry, type };
  }

  async function encodeCard(card: CardDraft): Promise<ArchivedCard> {
    const { photo, thumb, ...rest } = card;
    let encodedPhoto: ArchivedCard['photo'] = null;
    if (photo) {
      const { blob, ...geometry } = photo;
      encodedPhoto = { ...geometry, image: await addFile(blob) };
    }
    return {
      ...rest,
      photo: encodedPhoto,
      thumb: thumb && (await addFile(thumb)),
    };
  }

  async function encodeMedia<T extends DraftClip | LibraryItem>(record: T) {
    const { mediaKey, mediaType, embeddedMedia, ...rest } = record;
    const blob = await readStoredMedia({ mediaKey, mediaType, embeddedMedia });
    return { ...rest, media: blob && (await addFile(blob)) };
  }

  const manifest: ArchiveManifest = {
    version: 1,
    drafts: await Promise.all(
      drafts.map(async ({ legacyCard, ...draft }) => {
        const card = currentCards.get(draft.id) ?? legacyCard;
        return { ...draft, legacyCard: card && (await encodeCard(card)) };
      }),
    ),
    clips: await Promise.all(clips.map(encodeMedia<DraftClip>)),
    library: await Promise.all(library.map(encodeMedia<LibraryItem>)),
  };
  files[manifestName] = strToU8(JSON.stringify(manifest));
  if (bytes + files[manifestName].byteLength > maxBytes) {
    throw new Error('archive-too-large');
  }
  // The media is already compressed.
  const zip = zipSync(files, { level: 0 });
  if (zip.byteLength > maxBytes) throw new Error('archive-too-large');
  return new Blob([zip], { type: 'application/zip' });
}

export async function importCollections(archive: Blob): Promise<void> {
  if (archive.size > maxBytes) throw new Error('archive-too-large');
  let bytes = 0;
  const entries = new Set<string>();
  const files = unzipSync(new Uint8Array(await archive.arrayBuffer()), {
    filter(file) {
      if (file.name !== manifestName && !/^media\/\d+$/.test(file.name))
        return false;
      bytes += file.originalSize;
      if (
        bytes > maxBytes ||
        entries.size >= maxFiles ||
        file.size > archive.size
      ) {
        throw new Error('archive-too-large');
      }
      if (entries.has(file.name)) throw new Error('invalid-archive');
      entries.add(file.name);
      return true;
    },
  });
  const json = files[manifestName];
  if (!json) throw new Error('invalid-archive');
  const manifest = archiveSchema.parse(JSON.parse(strFromU8(json)));

  const clipsById = new Map(manifest.clips.map((clip) => [clip.id, clip]));
  const clipIds = new Set<string>();
  for (const draft of manifest.drafts) {
    for (const id of draft.order) {
      if (clipIds.has(id) || clipsById.get(id)?.draftId !== draft.id) {
        throw new Error('invalid-archive');
      }
      clipIds.add(id);
    }
  }
  if (
    clipIds.size !== manifest.clips.length ||
    new Set(manifest.drafts.map((draft) => draft.id)).size !==
      manifest.drafts.length ||
    new Set(manifest.library.map((item) => item.id)).size !==
      manifest.library.length
  ) {
    throw new Error('invalid-archive');
  }

  function blob(ref: MediaRef): Blob {
    const data = files[mediaPath(ref.entry)];
    if (!data) throw new Error('invalid-archive');
    return new Blob([data], { type: ref.type });
  }

  const staged: string[] = [];
  const used = new Set<string>();
  async function stage(ref?: MediaRef) {
    if (!ref) return {};
    const stored = await storeMedia(crypto.randomUUID(), blob(ref));
    if (stored.mediaKey) staged.push(stored.mediaKey);
    return stored;
  }

  try {
    const drafts: ClipDraft[] = manifest.drafts.map(
      ({ legacyCard, ...draft }) => {
        if (!legacyCard) return draft;
        const { photo, thumb, ...rest } = legacyCard;
        let legacyPhoto: CardDraft['photo'] = null;
        if (photo) {
          const { image, ...geometry } = photo;
          legacyPhoto = { ...geometry, blob: blob(image) };
        }
        return {
          ...draft,
          legacyCard: {
            ...rest,
            photo: legacyPhoto,
            thumb: thumb && blob(thumb),
          },
        };
      },
    );

    const clips: DraftClip[] = [];
    for (const { media, textFragment: fragment, ...clip } of manifest.clips) {
      const sourceUrl = canonicalSource(clip.sourceUrl);
      clips.push({
        ...clip,
        sourceUrl,
        textFragment:
          fragment && sourceUrl && clip.text
            ? textFragment(sourceUrl, clip.text)
            : undefined,
        ...(await stage(media)),
      });
    }
    const library: LibraryItem[] = [];
    for (const { media, ...item } of manifest.library) {
      library.push({
        ...item,
        sourceUrl: canonicalSource(item.sourceUrl),
        ...(await stage(media)),
      });
    }

    const db = await collectionDatabase();
    const tx = db.transaction(['drafts', 'clips', 'library'], 'readwrite');
    const draftStore = tx.objectStore('drafts');
    const clipStore = tx.objectStore('clips');
    const libraryStore = tx.objectStore('library');
    const acceptedIds = new Set<string>();
    async function merge() {
      for (const clip of clips) {
        const existing = await clipStore.get(clip.id);
        if (existing && existing.draftId !== clip.draftId) continue;
        if (!existing) {
          await clipStore.add(clip);
          if (clip.mediaKey) used.add(clip.mediaKey);
        }
        acceptedIds.add(clip.id);
      }
      for (const draft of drafts) {
        const existing = await draftStore.get(draft.id);
        const order = new Set(existing?.order);
        for (const id of draft.order) {
          if (acceptedIds.has(id)) order.add(id);
        }
        if (order.size !== (existing?.order.length ?? 0) || !existing) {
          await draftStore.put({ ...(existing ?? draft), order: [...order] });
        }
      }
      for (const item of library) {
        if (await libraryStore.getKey(item.id)) continue;
        await libraryStore.add(item);
        if (item.mediaKey) used.add(item.mediaKey);
      }
    }
    await Promise.all([merge(), tx.done]);
  } catch (error) {
    used.clear();
    throw error;
  } finally {
    await Promise.allSettled(
      staged.filter((key) => !used.has(key)).map(removeMedia),
    );
  }
}
