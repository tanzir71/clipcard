import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { openDB } from 'idb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ClipInput } from './collection-types.ts';
import type { CardDraft } from './draft.ts';

const hour = 60 * 60 * 1000;
const day = 24 * hour;
const start = 100 * day;
const input: ClipInput = {
  kind: 'link',
  title: 'First article',
  sourceUrl: 'https://example.org/article?utm_source=feed&edition=2#details',
};

beforeEach(() => {
  vi.resetModules();
  vi.stubGlobal('indexedDB', new IDBFactory());
});

afterEach(() => vi.unstubAllGlobals());

function mockMediaDirectory({ failsToClose = false } = {}) {
  const files = new Map<string, File>();
  vi.stubGlobal('navigator', {
    storage: {
      getDirectory: async () => ({
        getDirectoryHandle: async () => ({
          getFileHandle: async (key: string, { create = false } = {}) => {
            if (!create && !files.has(key)) {
              throw new DOMException('Missing file', 'NotFoundError');
            }
            return {
              getFile: async () => files.get(key),
              createWritable: async () => ({
                write: async (blob: Blob) => {
                  files.set(key, new File([blob], key, { type: blob.type }));
                },
                close: async () => {
                  if (failsToClose)
                    throw new DOMException('Commit failed', 'UnknownError');
                },
                abort: async () => undefined,
              }),
            };
          },
          removeEntry: async (key: string) => {
            files.delete(key);
          },
        }),
      }),
    },
  });
  return files;
}

describe('persistent clip drafts', () => {
  it('migrates the v1 card and its edit state without disrupting existing card reads', async () => {
    const db = await openDB('clipcard', 1, {
      upgrade(database) {
        database
          .createObjectStore('cards', { keyPath: 'id' })
          .createIndex('updatedAt', 'updatedAt');
      },
    });
    const card: CardDraft = {
      id: 'my-card',
      version: 1,
      createdAt: start - day,
      updatedAt: start,
      original: 'First article',
      headline: 'My edited headline',
      source: {
        canonicalUrl: input.sourceUrl!,
        title: input.title,
        siteName: 'Example',
        image: null,
        favicon: 'https://example.org/favicon.ico',
        lang: 'en',
        script: 'latin',
        dir: 'ltr',
        description: null,
        publishedAt: '2026-01-01',
        themeColor: null,
        isArticle: true,
      },
      selection: 'Example quotation',
      photo: {
        blob: new Blob(['image'], { type: 'image/webp' }),
        width: 500,
        height: 300,
        light: 0.4,
        focal: { x: 0.2, y: 0.9 },
      },
      overrides: { template: 'split', format: '1:1', phrase: null },
      thumb: new Blob(['preview'], { type: 'image/png' }),
    };
    await db.put('cards', card);
    db.close();

    const { getDraft, recentDrafts } = await import('./storage.ts');
    expect(await getDraft(card.id)).toEqual(card);
    const { getDraftCollection, appendDraftClip } =
      await import('./collections.ts');
    const restored = await getDraftCollection(card.id);
    expect(restored).toMatchObject({
      draft: {
        id: card.id,
        title: card.headline,
        updatedAt: card.updatedAt,
        createdAt: card.createdAt,
        overrides: card.overrides,
        legacyCard: card,
      },
      clips: [
        {
          id: 'legacy:my-card',
          kind: 'text',
          text: card.selection,
          outlet: 'Example',
          sourceUrl: 'https://example.org/article?edition=2',
          textFragment:
            'https://example.org/article?edition=2#:~:text=Example%20quotation',
        },
      ],
    });
    expect(await restored?.draft.legacyCard?.photo?.blob.text()).toBe('image');
    expect(await restored?.draft.legacyCard?.thumb?.text()).toBe('preview');
    expect(await recentDrafts()).toEqual([card]);
    expect(
      (await appendDraftClip(input, { now: start + 1 })).draft.id,
    ).not.toBe(card.id);
  });

  it('retains append order when clips from different origins arrive concurrently', async () => {
    const { appendDraftClip, getDraftCollection, listDraftCollections } =
      await import('./collections.ts');
    const first = await appendDraftClip(input, { now: start });
    const secondInput = {
      kind: 'text',
      title: 'Second article',
      text: 'A second quote',
      sourceUrl: 'https://other.example/story?utm_medium=rss',
    } as const;
    await Promise.all([
      appendDraftClip(secondInput, { now: start + 1 }),
      appendDraftClip({ ...input, title: 'Third article' }, { now: start + 2 }),
    ]);

    expect(await listDraftCollections()).toHaveLength(1);
    const restored = await getDraftCollection(first.draft.id);
    expect(restored?.clips.map((clip) => clip.title)).toEqual([
      'First article',
      'Second article',
      'Third article',
    ]);
    expect(restored?.draft.order).toEqual(
      restored?.clips.map((clip) => clip.id),
    );
    expect(restored?.clips[0]?.sourceUrl).toBe(
      'https://example.org/article?edition=2',
    );
    expect(restored?.clips[1]?.textFragment).toBe(
      'https://other.example/story#:~:text=A%20second%20quote',
    );
    expect(restored?.draft.updatedAt).toBe(start + 2);
  });

  it('starts a new draft after six hours of inactivity', async () => {
    const { appendDraftClip, getDraftCollection } =
      await import('./collections.ts');
    const first = await appendDraftClip(input, { now: start });
    const nextTime = start + 6 * hour - 1;
    const second = await appendDraftClip(input, { now: nextTime });
    const third = await appendDraftClip(input, { now: nextTime + 6 * hour });

    expect(second.draft.id).toBe(first.draft.id);
    expect(third.draft.id).not.toBe(first.draft.id);
    expect(await getDraftCollection(first.draft.id)).toEqual(second);
    expect(await getDraftCollection(third.draft.id)).toEqual(third);
  });

  it('sweeps draft metadata and media after 30 days and honours forever retention', async () => {
    const files = mockMediaDirectory();
    const {
      appendDraftClip,
      getDraftCollection,
      readClipMedia,
      setDraftRetention,
      sweepDraftCollections,
    } = await import('./collections.ts');
    const expired = await appendDraftClip(
      { kind: 'image', title: 'Image', sourceUrl: null },
      { now: start, media: new Blob(['pixels'], { type: 'image/webp' }) },
    );
    const active = await appendDraftClip(input, { now: start + 2 * day });
    const key = expired.clips[0]!.mediaKey!;
    expect(await (await readClipMedia(expired.clips[0]!))?.text()).toBe(
      'pixels',
    );
    expect(await sweepDraftCollections(start + 30 * day)).toBe(0);
    await setDraftRetention('forever');
    expect(await sweepDraftCollections(start + 100 * day)).toBe(0);

    await setDraftRetention('30-days');
    expect(await sweepDraftCollections(start + 31 * day)).toBe(1);
    expect(await getDraftCollection(expired.draft.id)).toBeUndefined();
    expect(await getDraftCollection(active.draft.id)).toEqual(active);
    expect(files.has(key)).toBe(false);
  });
});

it('names and closes the active draft, then resumes it with the original order', async () => {
  const { appendDraftClip, saveCollectionForLater, resumeDraftCollection } =
    await import('./collections.ts');
  const first = await appendDraftClip(input, { now: start });
  const saved = await saveCollectionForLater(
    first.draft.id,
    ' My sources ',
    start + 1,
  );
  const second = await appendDraftClip(input, { now: start + 2 });
  const resumed = await resumeDraftCollection(first.draft.id, start + day);
  const third = await appendDraftClip(input, { now: start + day + 1 });

  expect(saved?.title).toBe('My sources');
  expect(second.draft.id).not.toBe(first.draft.id);
  expect(resumed?.clips).toEqual(first.clips);
  expect(third.draft.id).toBe(first.draft.id);
  expect(third.clips).toHaveLength(2);
  expect(third.clips[0]).toEqual(first.clips[0]);
});

it('restores a ZIP with both clips and card history into an empty database and merges by ID', async () => {
  mockMediaDirectory();
  const { saveDraft } = await import('./storage.ts');
  await saveDraft({
    id: 'history-with-photo',
    createdAt: start - day,
    updatedAt: start,
    original: 'Original',
    headline: 'Edited',
    version: 1,
    photo: {
      blob: new Blob(['historic image'], { type: 'image/jpeg' }),
      width: 500,
      height: 300,
      light: 0.5,
    },
    thumb: new Blob(['historic thumbnail'], { type: 'image/png' }),
    source: null,
    overrides: { phrase: [0, 2] },
  });

  const { appendDraftClip } = await import('./collections.ts');
  const created = await appendDraftClip(input, { now: start });
  await appendDraftClip(
    { kind: 'image', title: 'Image', sourceUrl: null },
    { now: start + 1, media: new Blob(['stills'], { type: 'image/webp' }) },
  );
  await saveDraft({
    id: created.draft.id,
    createdAt: start,
    updatedAt: start,
    original: 'First article',
    headline: 'The edited first article',
    version: 1,
    photo: null,
    source: null,
    overrides: { emphasis: 'line' },
  });
  const archive = await (
    await import('./collection-archive.ts')
  ).exportCollections();

  vi.resetModules();
  vi.stubGlobal('indexedDB', new IDBFactory());
  const files = mockMediaDirectory();
  const { importCollections } = await import('./collection-archive.ts');
  const {
    getDraftCollection,
    listDraftCollections,
    readClipMedia,
    saveCollectionForLater,
  } = await import('./collections.ts');
  await importCollections(archive);
  await saveCollectionForLater(created.draft.id, 'My local title', start + 10);
  await Promise.all([importCollections(archive), importCollections(archive)]);

  expect(await listDraftCollections()).toHaveLength(2);
  const restored = await getDraftCollection(created.draft.id);
  expect(restored?.draft.title).toBe('My local title');
  expect(restored?.draft.legacyCard?.headline).toBe('The edited first article');
  expect(restored?.clips.map((clip) => clip.title)).toEqual([
    'First article',
    'Image',
  ]);
  expect(restored?.clips[0]).toEqual(created.clips[0]);
  expect(files.size).toBe(1);
  const media = await readClipMedia(restored!.clips[1]!);
  expect(media?.type).toBe('image/webp');
  expect(await media?.text()).toBe('stills');

  const history = await getDraftCollection('history-with-photo');
  expect(history?.draft.legacyCard).toMatchObject({
    headline: 'Edited',
    original: 'Original',
    overrides: { phrase: [0, 2] },
  });
  const photo = history?.draft.legacyCard?.photo?.blob;
  expect(photo?.type).toBe('image/jpeg');
  expect(await photo?.text()).toBe('historic image');
  expect(await history?.draft.legacyCard?.thumb?.text()).toBe(
    'historic thumbnail',
  );
});

it('rejects unrelated archives before updating draft storage', async () => {
  const { importCollections } = await import('./collection-archive.ts');
  const { listDraftCollections } = await import('./collections.ts');
  await expect(
    importCollections(new Blob(['not a ZIP'])),
  ).rejects.toBeDefined();
  expect(await listDraftCollections()).toEqual([]);
});

it('keeps a local image when the browser cannot commit an OPFS write', async () => {
  const files = mockMediaDirectory({ failsToClose: true });
  const { appendDraftClip, getDraftCollection, readClipMedia } =
    await import('./collections.ts');
  const collection = await appendDraftClip(
    { kind: 'image', title: 'Photo', sourceUrl: null },
    { media: new Blob(['fallback photo'], { type: 'image/jpeg' }) },
  );
  const reopened = await getDraftCollection(collection.draft.id);
  const media = await readClipMedia(reopened!.clips[0]!);
  expect(media?.type).toBe('image/jpeg');
  expect(await media?.text()).toBe('fallback photo');
  expect(files.size).toBe(0);
});

it('persists manual clip order, layout and removal across collection reads', async () => {
  const {
    appendDraftClip,
    getDraftCollection,
    moveDraftClip,
    removeDraftClip,
    updateDraftCollection,
  } = await import('./collections.ts');
  const a = await appendDraftClip(input);
  const b = await appendDraftClip({ ...input, title: 'Second source' });
  const c = await appendDraftClip({ ...input, title: 'Third source' });
  const clipA = a.clips[0]!.id;
  const clipB = b.clips[1]!.id;
  const clipC = c.clips[2]!.id;
  await moveDraftClip(a.draft.id, clipC, clipA);
  await updateDraftCollection(a.draft.id, {
    mode: 'grid',
    gridLayout: 'board',
  });
  await removeDraftClip(a.draft.id, clipB);

  const restored = await getDraftCollection(a.draft.id);
  expect(restored?.draft.mode).toBe('grid');
  expect(restored?.draft.gridLayout).toBe('board');
  expect(restored?.draft.order).toEqual([clipC, clipA]);
  expect(restored?.clips.map((clip) => clip.title)).toEqual([
    'Third source',
    input.title,
  ]);
});
