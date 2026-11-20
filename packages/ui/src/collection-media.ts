import type { StoredMedia } from './collection-types.ts';

const folder = 'clipcard-media';
const fileSystemUnavailable = new Set([
  'NotSupportedError',
  'NotAllowedError',
  'SecurityError',
  'UnknownError',
]);

async function mediaDirectory(create = false) {
  const storage = globalThis.navigator?.storage;
  if (!storage?.getDirectory) {
    throw new DOMException('OPFS unavailable', 'NotSupportedError');
  }
  const root = await storage.getDirectory();
  return root.getDirectoryHandle(folder, { create });
}

export async function storeMedia(
  key: string,
  blob: Blob,
): Promise<StoredMedia> {
  let writer: FileSystemWritableFileStream | undefined;
  let created = false;
  try {
    const directory = await mediaDirectory(true);
    const file = await directory.getFileHandle(key, { create: true });
    created = true;
    if (!file.createWritable) {
      throw new DOMException('OPFS writes unavailable', 'NotSupportedError');
    }
    writer = await file.createWritable();
    await writer.write(blob);
    await writer.close();
    return { mediaKey: key, mediaType: blob.type };
  } catch (error) {
    await writer?.abort().catch(() => undefined);
    if (created) await removeMedia(key).catch(() => undefined);
    if (
      error instanceof DOMException &&
      fileSystemUnavailable.has(error.name)
    ) {
      return { embeddedMedia: blob };
    }
    throw error;
  }
}

export async function readStoredMedia({
  embeddedMedia,
  mediaKey,
  mediaType,
}: StoredMedia): Promise<Blob | undefined> {
  if (embeddedMedia || !mediaKey) return embeddedMedia;
  const directory = await mediaDirectory();
  const file = await (await directory.getFileHandle(mediaKey)).getFile();
  return file.slice(0, file.size, mediaType);
}

export async function removeMedia(key: string) {
  try {
    const directory = await mediaDirectory();
    await directory.removeEntry(key);
  } catch (error) {
    if (!(error instanceof DOMException && error.name === 'NotFoundError')) {
      throw error;
    }
  }
}

export function storageEstimate() {
  return navigator.storage.estimate();
}

export async function requestPersistentStorage(): Promise<boolean> {
  const storage = navigator.storage;
  if (!storage?.persist) return false;
  return (await storage.persisted()) || storage.persist();
}

export function withMediaLock<T>(work: () => Promise<T>): Promise<T> {
  const locks = globalThis.navigator?.locks;
  return locks ? locks.request('clipcard-media-maintenance', work) : work();
}
