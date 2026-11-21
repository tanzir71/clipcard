import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  maxBatchLinks,
  maxClipSeconds,
  pastedBatchLinks,
} from '@clipcard/core';
import type { BatchLink } from '@clipcard/core';
import { BatchEditor, BatchStart } from '@clipcard/ui/batch-editor';
import {
  createBatch,
  resolveBatchLinks,
  webBatchCard,
} from '@clipcard/ui/batch';
import { FLAGS } from '@clipcard/core/flags';
import { interfaceStrings as strings } from '@clipcard/i18n';
import { Icon, InputRow } from '@clipcard/ui';
import type { CardDraft } from '@clipcard/ui';
import { receiveBookmark } from '@clipcard/ui/bookmark';
import { CardEditor } from '@clipcard/ui/card-editor';
import { DraftPreview } from '@clipcard/ui/card-preview';
import {
  appendCardDraft,
  cardFromCollection,
} from '@clipcard/ui/collection-card';
import {
  appendDraftClip,
  listDraftCollections,
  resumeDraftCollection,
  saveCollectionForLater,
  startNewDraftCollection,
  sweepDraftCollections,
  updateDraftCollection,
} from '@clipcard/ui/collections';
import type {
  ClipDraft,
  DraftClip,
  DraftCollection,
} from '@clipcard/ui/collections';
import { LibraryPanel } from '@clipcard/ui/library-panel';
import { VideoProjectEditor } from '@clipcard/ui/video-project-editor';
import { GifSettings } from '@clipcard/ui/gif-settings';
import { GridEditor } from '@clipcard/ui/grid-editor';
import { CollectionBackupControls } from '@clipcard/ui/collection-backup-controls';
import { CollectionThumbnail } from '@clipcard/ui/collection-thumbnail';
import { draftFromInput, inspectPhoto, readTransfer } from '@clipcard/ui/input';
import type { CardInput } from '@clipcard/ui/input';
import {
  deleteDraft,
  getDraft,
  recentDrafts,
  saveDraft,
} from '@clipcard/ui/storage';
import mark from '../../../design/brand/mark.svg?url';
import { canRecordTab, recordTab, TabRecordingError } from './record-tab.ts';
import './collections.css';

declare const __CLIPCARD_BOOKMARK__: string;
type Screen = 'make' | 'drafts' | 'library' | 'gifs' | 'settings';
const getParams = () => new URLSearchParams(location.search);
const appUrl = import.meta.env.BASE_URL;
const collectionsEnabled = FLAGS.drafts && FLAGS.clips;
type View = 'workspace' | 'popup' | 'shared';

function SiteBookmark() {
  return (
    <a
      className="app-bookmark"
      ref={(link) => {
        if (link) link.setAttribute('href', __CLIPCARD_BOOKMARK__);
      }}
      draggable
      onClick={(event) => event.preventDefault()}
    >
      <Icon name="scissors" />
      {strings['card.bookmarkLabel']}
    </a>
  );
}

function DraftList({
  drafts,
  open,
  remove,
  compact,
}: {
  drafts: CardDraft[];
  open: (draft: CardDraft) => void;
  remove?: (id: string) => void;
  compact?: boolean;
}) {
  return (
    <ul
      className={'app-draft-list' + (compact ? ' app-draft-list-compact' : '')}
    >
      {drafts.map((draft) => (
        <li key={draft.id}>
          <button
            className="app-draft"
            type="button"
            onClick={() => open(draft)}
          >
            <DraftPreview draft={draft} />
            <strong>{draft.headline}</strong>
            {draft.source?.siteName ? (
              <span>{draft.source.siteName}</span>
            ) : null}
          </button>
          {remove ? (
            <button
              type="button"
              className="clip-icon-button app-remove-draft"
              onClick={() => remove(draft.id)}
              aria-label={strings['card.delete']}
              title={strings['card.delete']}
            >
              <Icon name="close" size={15} />
            </button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function AppNav({
  screen,
  length,
  go,
  fresh,
}: {
  screen: Screen;
  length: number;
  go: (screen: Screen) => void;
  fresh: () => void;
}) {
  return (
    <aside className="app-sidebar">
      <a
        href={appUrl}
        className="app-brand"
        aria-label={strings['ext.shortName']}
      >
        <img src={mark} width="24" height="24" alt="" />{' '}
        <span>{strings['ext.shortName']}</span>
      </a>
      <button
        type="button"
        className="clip-button clip-primary app-new"
        onClick={fresh}
        aria-label={strings['card.new']}
        title={strings['card.new']}
      >
        <Icon name="add" />
        <span>{strings['card.new']}</span>
      </button>
      <nav
        className="app-section-nav"
        aria-label={strings['card.appNavigation']}
      >
        <button
          type="button"
          onClick={() => go('make')}
          aria-label={strings['card.make']}
          title={strings['card.make']}
          aria-current={screen === 'make' ? 'page' : undefined}
        >
          <Icon name="card" />
          <span>{strings['card.make']}</span>
        </button>
        <button
          type="button"
          onClick={() => go('drafts')}
          title={strings['drafts.title']}
          aria-current={screen === 'drafts' ? 'page' : undefined}
        >
          <Icon name="bookmark" />
          <span>{strings['drafts.title']}</span>
          {length ? <small>{length}</small> : null}
        </button>
        {FLAGS.videoJoin ? (
          <button
            type="button"
            title={strings['library.tab']}
            aria-current={screen === 'library' ? 'page' : undefined}
            onClick={() => go('library')}
          >
            <Icon name="photo" />
            <span>{strings['library.tab']}</span>
          </button>
        ) : null}
        {FLAGS.gifs ? (
          <>
            <button
              type="button"
              title={strings['gifs.tab']}
              aria-current={screen === 'gifs' ? 'page' : undefined}
              onClick={() => go('gifs')}
            >
              <Icon name="video" />
              <span>{strings['gifs.tab']}</span>
            </button>
            <button
              type="button"
              title={strings['settings.title']}
              aria-current={screen === 'settings' ? 'page' : undefined}
              onClick={() => go('settings')}
            >
              <Icon name="settings" />
              <span>{strings['settings.title']}</span>
            </button>
          </>
        ) : null}
      </nav>
      <div className="app-bookmark-help">
        <strong>{strings['card.oneClickBookmark']}</strong>
        <p>{strings['card.bookmarkHint']}</p>
        <SiteBookmark />
      </div>
    </aside>
  );
}

function Welcome({
  input,
  drafts,
  open,
  go,
}: {
  input: ReactNode;
  drafts: CardDraft[];
  open: (draft: CardDraft) => void;
  go: () => void;
}) {
  return (
    <div className="app-welcome">
      <header className="app-work-header">
        <h1>{strings['card.makeCard']}</h1>
      </header>
      <div className="app-welcome-body">
        <h1 className="app-phone-brand">{strings['ext.shortName']}</h1>
        {input}
        {drafts.length ? (
          <section className="app-recent">
            <div>
              <h2>{strings['drafts.title']}</h2>
              <button type="button" className="clip-inline-button" onClick={go}>
                {strings['card.viewAll']}
              </button>
            </div>
            <DraftList drafts={drafts.slice(0, 6)} open={open} compact />
          </section>
        ) : null}
        <p className="app-share-hint">
          <Icon name="share" />
          {strings['card.shareTip']}
        </p>
      </div>
    </div>
  );
}

export function App() {
  const params = getParams();
  const [screen, setScreen] = useState<Screen>(
    params.has('drafts') ? 'drafts' : 'make',
  );
  const [active, setActive] = useState<CardDraft | null>(null);
  const [history, setHistory] = useState<CardDraft[]>([]);
  const [collection, setCollection] = useState<DraftCollection | null>(null);
  const [collections, setCollections] = useState<ClipDraft[]>([]);
  const [filter, setFilter] = useState<'all' | ClipDraft['mode']>('all');
  const [flow, setFlow] = useState<'workspace' | 'popup' | 'shared'>(
    'workspace',
  );
  const [message, setMessage] = useState('');
  const [batchStart, setBatchStart] = useState(false);
  const [recording, setRecording] = useState<number | 'chooser'>();
  const recordingStop = useRef<AbortController | null>(null);
  const [working, setWorking] = useState(false);
  const picker = useRef<HTMLInputElement>(null);
  const draftRef = useRef<CardDraft | null>(null);
  const pending = useRef<number | undefined>(undefined);

  const refresh = useCallback(async () => {
    if (collectionsEnabled) setCollections(await listDraftCollections());
    setHistory(await recentDrafts());
  }, []);
  const failed = useCallback(() => setMessage(strings['card.savedFailed']), []);
  const put = useCallback(
    async (draft: CardDraft) => {
      await saveDraft(draft);
      await refresh();
    },
    [refresh],
  );

  const display = useCallback(
    (draft: CardDraft, view: View, group: DraftCollection | null = null) => {
      draftRef.current = draft;
      setCollection(group);
      setScreen('make');
      setFlow(view);
      setActive(draft);
      setMessage('');
      const next = new URL(location.href);
      next.hash = '';
      next.search = '';
      if (group) next.searchParams.set('collection', group.draft.id);
      else next.searchParams.set('draft', draft.id);
      if (view === 'popup') next.searchParams.set('from', 'bookmark');
      if (view === 'shared') next.searchParams.set('from', 'share');
      window.history.replaceState(null, '', next);
    },
    [],
  );

  const showGrid = useCallback((group: DraftCollection, view: View) => {
    draftRef.current = null;
    setActive(null);
    setCollection(group);
    setScreen('make');
    setFlow(view);
    setMessage('');
    const address = new URL(appUrl, location.origin);
    address.searchParams.set('collection', group.draft.id);
    if (view === 'popup') address.searchParams.set('from', 'bookmark');
    if (view === 'shared') address.searchParams.set('from', 'share');
    window.history.replaceState(null, '', address);
  }, []);

  const close = useCallback(() => {
    setBatchStart(false);
    if (draftRef.current) void put(draftRef.current).catch(failed);
    if (flow === 'popup' && window.opener) {
      window.close();
      return;
    }
    draftRef.current = null;
    setActive(null);
    setCollection(null);
    setScreen('make');
    setFlow('workspace');
    window.history.replaceState(null, '', appUrl);
  }, [flow, put, failed]);

  const open = useCallback(
    async (draft: CardDraft, view: View = 'workspace') => {
      const previous = draftRef.current;
      if (previous && previous.id !== draft.id)
        void put(previous).catch(failed);
      display(draft, view);
      await put(draft).catch(failed);
    },
    [display, put, failed],
  );

  const find = useCallback(
    async (draft: CardDraft, view: View = 'workspace') => {
      if (!collectionsEnabled) {
        await open(draft, view);
        return;
      }
      const group = await appendCardDraft(draft);
      if (
        group.draft.mode === 'grid' ||
        (FLAGS.videoJoin && group.draft.mode === 'video')
      ) {
        showGrid(group, view);
        await refresh();
        return;
      }
      const card = { ...draft, id: group.draft.id };
      display(card, view, group);
      await put(card);
    },
    [display, open, put, refresh, showGrid],
  );

  const restoreCollection = useCallback(
    async (id: string, view: View = 'workspace') => {
      const group = await resumeDraftCollection(id);
      if (!group) {
        setMessage(strings['card.draftMissing']);
        return;
      }
      if (
        group.draft.mode === 'grid' ||
        (FLAGS.videoJoin && group.draft.mode === 'video') ||
        group.clips.length === 0
      ) {
        showGrid(group, view);
        return;
      }
      const card =
        (await getDraft(group.draft.id)) ?? (await cardFromCollection(group));
      if (card) display(card, view, group);
    },
    [display, showGrid],
  );

  const pasteBatch = useCallback(
    async (links: BatchLink[]) => {
      if (links.length < 2 || links.length > maxBatchLinks) {
        setMessage(strings[links.length < 2 ? 'batch.empty' : 'batch.limit']);
        return false;
      }
      const cards = await resolveBatchLinks(links, webBatchCard);
      const group = await createBatch(cards, 'paste', strings['batch.roundup']);
      if (!group) return false;
      setBatchStart(false);
      showGrid(group, 'workspace');
      await refresh();
      return true;
    },
    [showGrid, refresh],
  );

  const add = useCallback(
    async (input: CardInput) => {
      if (FLAGS.batch && !input.file && input.text) {
        const links = pastedBatchLinks(input.text);
        if (links) {
          await pasteBatch(links);
          return true;
        }
      }
      const draft = await draftFromInput(input, strings['card.photo']);
      if (!draft) return false;
      await find(draft);
      return true;
    },
    [find, pasteBatch],
  );

  useEffect(() => {
    const start = getParams();
    const id = start.get('draft');
    const collectionId = start.get('collection');
    const from = start.get('from');
    const view =
      from === 'share' ? 'shared' : from === 'bookmark' ? 'popup' : 'workspace';
    let current = true;
    const ready = collectionsEnabled
      ? sweepDraftCollections()
      : Promise.resolve();
    void ready.then(refresh).catch(failed);
    if (collectionsEnabled && collectionId) {
      void ready
        .then(() => restoreCollection(collectionId, view))
        .catch(failed);
    } else if (id) {
      void getDraft(id)
        .then((draft) => {
          if (!current) return;
          if (draft && collectionsEnabled && view === 'shared')
            return find(draft, view);
          if (draft) display(draft, view);
          else setMessage(strings['card.draftMissing']);
        })
        .catch(failed);
    } else if (from === 'share-error') {
      setMessage(strings['card.unsupported']);
    } else if (start.has('url') || start.has('text')) {
      void add({
        text: start.get('text') ?? '',
        uri: start.get('url') ?? undefined,
        title: start.get('title') ?? undefined,
      }).catch(failed);
    }
    const stop =
      from === 'bookmark' && !collectionId
        ? receiveBookmark(
            (draft) => {
              void ready.then(() => find(draft, 'popup')).catch(failed);
            },
            () => setMessage(strings['card.bookmarkFailed']),
            collectionsEnabled,
          )
        : undefined;
    return () => {
      current = false;
      stop?.();
    };
  }, [add, display, failed, find, refresh, restoreCollection]);

  useEffect(() => {
    function onPaste(event: ClipboardEvent) {
      const target = event.target;
      if (
        event.defaultPrevented ||
        !event.clipboardData ||
        (target instanceof HTMLElement &&
          (target.isContentEditable || target.closest('input,textarea,select')))
      )
        return;
      const input = readTransfer(event.clipboardData);
      if (!input.file && !input.text && !input.uri && !input.html) return;
      event.preventDefault();
      void add(input)
        .then((applied) => {
          if (!applied) setMessage(strings['card.unsupported']);
        })
        .catch(failed);
    }
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [add, failed]);

  function update(draft: CardDraft) {
    draftRef.current = draft;
    setActive(draft);
    clearTimeout(pending.current);
    pending.current = window.setTimeout(() => {
      void put(draft).catch(failed);
      if (collection) {
        const title =
          draft.headline === draft.original
            ? collection.draft.title
            : draft.headline;
        void updateDraftCollection(collection.draft.id, {
          title,
          overrides: draft.overrides,
        })
          .then(refresh)
          .catch(failed);
      }
    }, 250);
  }

  async function photo(file: File) {
    const item = draftRef.current;
    if (!item) {
      await add({ file });
      return;
    }
    setWorking(true);
    const prepared = await inspectPhoto(file);
    setWorking(false);
    if (!prepared) {
      setMessage(strings['card.unsupported']);
      return;
    }
    if (draftRef.current?.id === item.id) {
      update({ ...draftRef.current, photo: prepared });
      setMessage('');
    }
  }

  useEffect(() => {
    const stop = () => recordingStop.current?.abort();
    window.addEventListener('pagehide', stop);
    return () => {
      window.removeEventListener('pagehide', stop);
      stop();
    };
  }, []);

  async function captureTab() {
    if (recordingStop.current) return;
    const stop = new AbortController();
    recordingStop.current = stop;
    setRecording('chooser');
    setMessage('');
    try {
      const { blob, duration, poster } = await recordTab(
        stop.signal,
        setRecording,
      );
      const group = await appendDraftClip(
        {
          kind: 'video',
          title: strings['batch.recordTitle'],
          sourceUrl: null,
          video: { source: null, start: 0, end: duration, cues: [], poster },
        },
        { draftId: collection?.draft.id, preferVideo: true, media: blob },
      );
      showGrid(group, 'workspace');
      await refresh();
    } catch (error) {
      if (error instanceof TabRecordingError) {
        setMessage(
          strings[
            error.reason === 'surface'
              ? 'batch.recordTabOnly'
              : 'batch.recordEmpty'
          ],
        );
      } else if (!(
        error instanceof DOMException &&
        ['NotAllowedError', 'AbortError'].includes(error.name)
      )) {
        setMessage(strings['card.renderFailed']);
      }
    } finally {
      recordingStop.current = null;
      setRecording(undefined);
    }
  }

  function navigate(destination: Screen) {
    setScreen(destination);
    if (destination === 'drafts') void refresh().catch(failed);
  }

  function fresh() {
    if (collectionsEnabled)
      void startNewDraftCollection().then(close).catch(failed);
    else close();
  }

  function switchMode(mode: ClipDraft['mode'], clip?: DraftClip) {
    if (!collection) return;
    void updateDraftCollection(collection.draft.id, { mode })
      .then(async (next) => {
        if (!next) return;
        if (mode === 'grid' || mode === 'video') showGrid(next, flow);
        else if (clip) {
          const card = await cardFromCollection(next, clip);
          if (card) {
            display(card, flow, next);
            await put(card);
          }
        } else await restoreCollection(next.draft.id, flow);
      })
      .catch(failed);
  }

  const input = (
    <InputRow
      onInput={add}
      onPhoto={
        active
          ? (file) => {
              void photo(file);
            }
          : undefined
      }
    />
  );
  const inGrid =
    collection?.draft.mode === 'grid' || collection?.clips.length === 0;
  const inVideo =
    FLAGS.videoJoin &&
    collection?.draft.mode === 'video' &&
    Boolean(collection.clips.length);
  const toVideo =
    FLAGS.videoJoin && collection?.clips.length
      ? () => switchMode('video')
      : undefined;
  const editor =
    screen === 'make' &&
    FLAGS.batch &&
    collection?.draft.batch &&
    collection.draft.mode === 'grid' ? (
      <BatchEditor
        key={collection.draft.id}
        collection={collection}
        change={setCollection}
        close={close}
        digest={() => switchMode('video')}
        view={flow === 'workspace' ? 'workspace' : 'popup'}
      />
    ) : screen === 'make' && collection && inVideo ? (
      <VideoProjectEditor
        key={collection.draft.id}
        collection={collection}
        change={setCollection}
        close={close}
        onCard={(clip) => switchMode('card', clip)}
        onGrid={() => switchMode('grid')}
        view={flow === 'workspace' ? 'workspace' : 'popup'}
        beforePreview={flow === 'workspace' ? input : undefined}
      />
    ) : screen === 'make' && collection && inGrid ? (
      <GridEditor
        key={collection.draft.id}
        collection={collection}
        change={setCollection}
        close={close}
        onVideo={toVideo}
        onCard={collection.clips.length ? () => switchMode('card') : undefined}
        view={flow === 'popup' ? 'popup' : 'workspace'}
        beforePreview={flow === 'popup' ? undefined : input}
      />
    ) : screen === 'make' && active ? (
      <CardEditor
        key={active.id}
        draft={active}
        view={flow}
        onChange={update}
        onClose={close}
        onPhoto={() => picker.current?.click()}
        onSave={() => put(active)}
        onSaveForLater={
          collection
            ? async (title) => {
                await put(active);
                await saveCollectionForLater(collection.draft.id, title);
                close();
              }
            : undefined
        }
        onGrid={collection ? () => switchMode('grid') : undefined}
        onVideo={toVideo}
        beforePreview={flow === 'workspace' ? input : undefined}
      />
    ) : null;
  const showNav = !(
    (active || inGrid || inVideo) &&
    screen === 'make' &&
    flow !== 'workspace'
  );
  const visibleCollections = collections.filter(
    (item) => filter === 'all' || item.mode === filter,
  );
  return (
    <div
      className={
        'app' +
        ((active || inGrid || inVideo) && screen === 'make'
          ? ' app-editing'
          : '') +
        (showNav ? '' : ' app-compact')
      }
    >
      {showNav ? (
        <AppNav
          screen={screen}
          length={collectionsEnabled ? collections.length : history.length}
          go={navigate}
          fresh={fresh}
        />
      ) : null}
      <main className="app-main">
        {FLAGS.batch &&
        ((screen === 'make' && flow === 'workspace') ||
          recording !== undefined) ? (
          <div className="app-find-actions">
            {screen === 'make' ? (
              <button
                type="button"
                className="clip-button"
                aria-expanded={batchStart}
                onClick={() => setBatchStart(!batchStart)}
              >
                {strings['batch.paste']}
              </button>
            ) : null}
            {canRecordTab() ? (
              <button
                type="button"
                className="clip-button"
                disabled={recording === 'chooser'}
                onClick={
                  recording === undefined
                    ? () => void captureTab()
                    : () => recordingStop.current?.abort()
                }
              >
                {
                  strings[
                    recording === undefined ? 'batch.record' : 'video.stop'
                  ]
                }
              </button>
            ) : null}
            {typeof recording === 'number' ? (
              <span role="status">
                {strings['clip.recording']
                  .replace('{elapsed}', String(Math.floor(recording)))
                  .replace('{total}', String(maxClipSeconds))}
              </span>
            ) : null}
            {batchStart && screen === 'make' ? (
              <BatchStart
                collect={pasteBatch}
                close={() => setBatchStart(false)}
              />
            ) : null}
          </div>
        ) : null}
        {screen === 'library' || screen === 'gifs' ? (
          <LibraryPanel
            key={screen}
            initialTab={screen}
            allowGifs={FLAGS.gifs}
            draftId={collection?.draft.id}
            change={(group) => {
              if (group.draft.mode === 'video' || group.draft.mode === 'grid')
                showGrid(group, 'workspace');
              else void restoreCollection(group.draft.id).catch(failed);
            }}
          />
        ) : screen === 'settings' ? (
          <section className="app-drafts">
            <GifSettings />
            <CollectionBackupControls refresh={refresh} />
          </section>
        ) : screen === 'drafts' ? (
          <section>
            <header className="app-work-header">
              <h1>{strings['drafts.title']}</h1>
              <span>
                {collectionsEnabled ? collections.length : history.length}
              </span>
            </header>
            {collectionsEnabled ? (
              <div className="app-collection-filters">
                {(FLAGS.videoJoin
                  ? (['all', 'card', 'grid', 'video'] as const)
                  : (['all', 'card', 'grid'] as const)
                ).map((value) => (
                  <button
                    type="button"
                    key={value}
                    className="clip-button"
                    aria-pressed={filter === value}
                    onClick={() => setFilter(value)}
                  >
                    {
                      strings[
                        ('drafts.filter.' + value) as keyof typeof strings
                      ]
                    }
                  </button>
                ))}
              </div>
            ) : null}
            <div className="app-drafts">
              {collectionsEnabled ? (
                <CollectionBackupControls refresh={refresh} />
              ) : null}
              {collectionsEnabled ? (
                <ul className="app-draft-list">
                  {visibleCollections.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        className="app-draft"
                        onClick={() =>
                          void restoreCollection(item.id).catch(failed)
                        }
                      >
                        <div className="app-collection-thumb">
                          <CollectionThumbnail draft={item} />
                        </div>
                        <strong>{item.title}</strong>
                        <span>
                          {
                            strings[
                              ('mode.' + item.mode) as keyof typeof strings
                            ]
                          }
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <DraftList
                  drafts={history}
                  open={(draft) => {
                    void open(draft);
                  }}
                  remove={(id) => {
                    void deleteDraft(id)
                      .then(() => {
                        if (draftRef.current?.id === id) {
                          draftRef.current = null;
                          setActive(null);
                        }
                        return refresh();
                      })
                      .catch(failed);
                  }}
                />
              )}
              <button type="button" className="app-new-tile" onClick={fresh}>
                <Icon name="add" />
                {strings['card.newDraft']}
              </button>
            </div>
          </section>
        ) : (
          (editor ?? (
            <Welcome
              input={input}
              drafts={history}
              open={(draft) => {
                void open(draft);
              }}
              go={() => navigate('drafts')}
            />
          ))
        )}
        {message ? (
          <p className="app-message" role="status">
            {message}
          </p>
        ) : null}
        {working ? (
          <span className="app-message" role="status">
            {strings['card.processing']}
          </span>
        ) : null}
      </main>
      <input
        type="file"
        ref={picker}
        accept="image/*"
        hidden
        onChange={(event) => {
          const item = event.currentTarget.files?.[0];
          if (item) void photo(item);
          event.currentTarget.value = '';
        }}
      />
    </div>
  );
}
