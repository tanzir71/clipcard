import { useEffect, useState } from 'react';
import { interfaceStrings as strings } from '@clipcard/i18n';
import { BatchEditor, BatchStart } from '@clipcard/ui/batch-editor';
import { FLAGS } from '@clipcard/core/flags';
import { Icon } from '@clipcard/ui';
import type { CardDraft } from '@clipcard/ui';
import { CardEditor } from '@clipcard/ui/card-editor';
import { CollectionThumbnail } from '@clipcard/ui/collection-thumbnail';
import { cardFromCollection } from '@clipcard/ui/collection-card';
import {
  getDraftCollection,
  getCurrentDraftCollection,
  listDraftCollections,
  resumeDraftCollection,
  saveCollectionForLater,
  updateDraftCollection,
} from '@clipcard/ui/collections';
import type {
  ClipDraft,
  DraftClip,
  DraftCollection,
} from '@clipcard/ui/collections';
import { LibraryPanel } from '@clipcard/ui/library-panel';
import { VideoProjectEditor } from '@clipcard/ui/video-project-editor';
import { VideoEditor } from '@clipcard/ui/video-editor';
import { GridEditor } from '@clipcard/ui/grid-editor';
import { getDraft, saveDraft } from '@clipcard/ui/storage';
import { browser } from 'wxt/browser';
import type { BackgroundMessage } from './messages.ts';
import { getUserSettings } from './user-settings.ts';

async function visibleDrafts() {
  const list = await listDraftCollections();
  if (!FLAGS.languages || (await getUserSettings()).keepHistory) return list;
  const current = await getCurrentDraftCollection();
  return list.filter(
    (item) => item.savedForLater || item.id === current?.draft.id,
  );
}

export function CollectionPopup({
  initialId,
  card,
  close,
  share,
}: {
  initialId?: string;
  card?: CardDraft;
  close: () => void;
  share?: boolean;
}) {
  const [collection, setCollection] = useState<DraftCollection>();
  const [cardState, setCard] = useState<CardDraft | null>(card ?? null);
  const [items, setItems] = useState<ClipDraft[]>([]);
  const [status, setStatus] = useState('');
  const [batchStart, setBatchStart] = useState(false);
  const [library, setLibrary] = useState<'library' | 'gifs'>();
  const failed = () => setStatus(strings['card.savedFailed']);

  useEffect(() => {
    let active = true;
    const operation = initialId
      ? getDraftCollection(initialId).then(async (item) => {
          if (!item || !active) return;
          setCollection(item);
          if (item.draft.mode === 'card' && !card) {
            const restored =
              (await getDraft(item.draft.id)) ??
              (await cardFromCollection(item));
            if (active) setCard(restored);
          }
        })
      : visibleDrafts().then((drafts) => {
          if (active) setItems(drafts);
        });
    void operation.catch(() => {
      if (active) failed();
    });
    return () => {
      active = false;
    };
  }, [initialId, card]);

  async function restore(id: string) {
    try {
      const item = await resumeDraftCollection(id);
      if (!item) return;
      setCollection(item);
      if (item.draft.mode === 'card')
        setCard(
          (await getDraft(item.draft.id)) ?? (await cardFromCollection(item)),
        );
    } catch {
      failed();
    }
  }

  const hasVideo =
    FLAGS.videoClips &&
    Boolean(
      collection?.clips.some((clip) => clip.kind === 'video' && clip.video),
    );
  const canMakeVideo =
    hasVideo || (FLAGS.videoJoin && Boolean(collection?.clips.length));
  const toVideo = canMakeVideo ? () => void switchMode('video') : undefined;
  const permitGifs = (origins: string[]) =>
    browser.permissions.request({ origins });

  async function switchMode(mode: ClipDraft['mode'], moment?: DraftClip) {
    if (!collection) return;
    try {
      const item = await updateDraftCollection(collection.draft.id, { mode });
      if (!item) return;
      if (mode === 'card') {
        const next = moment
          ? await cardFromCollection(item, moment)
          : ((await getDraft(item.draft.id)) ??
            (await cardFromCollection(item)));
        if (moment && next) await saveDraft(next);
        setCard(next);
      }
      setCollection(item);
    } catch {
      failed();
    }
  }

  async function fromPage(kind: 'pageCard' | 'addPage') {
    try {
      const request: BackgroundMessage = { to: 'background', kind };
      if (!(await browser.runtime.sendMessage(request))) failed();
    } catch {
      failed();
    }
  }

  async function sendBatch(request: BackgroundMessage) {
    const success = Boolean(await browser.runtime.sendMessage(request));
    if (success) close();
    return success;
  }

  if (batchStart) {
    return (
      <BatchStart
        close={() => setBatchStart(false)}
        collect={(links) =>
          sendBatch({
            to: 'background',
            kind: 'batchLinks',
            origin: 'paste',
            links,
          })
        }
        select={() => sendBatch({ to: 'background', kind: 'startBatch' })}
        tabs={async () => {
          await browser.permissions
            .request({ origins: ['<all_urls>'] })
            .catch(() => false);
          return sendBatch({ to: 'background', kind: 'batchTabs' });
        }}
      />
    );
  }
  if (
    FLAGS.batch &&
    collection?.draft.batch &&
    collection.draft.mode === 'grid'
  ) {
    return (
      <BatchEditor
        key={collection.draft.id}
        collection={collection}
        change={setCollection}
        close={close}
        digest={() => void switchMode('video')}
      />
    );
  }
  if (library) {
    return (
      <LibraryPanel
        initialTab={library}
        allowGifs={FLAGS.gifs}
        permit={permitGifs}
        draftId={collection?.draft.id}
        close={() => setLibrary(undefined)}
        change={(group) => {
          setCollection(group);
          setCard(null);
          setLibrary(undefined);
        }}
      />
    );
  }
  if (
    collection &&
    FLAGS.videoJoin &&
    collection.clips.length &&
    collection.draft.mode === 'video'
  ) {
    return (
      <VideoProjectEditor
        collection={collection}
        change={setCollection}
        close={close}
        permit={permitGifs}
        onCard={(clip) => void switchMode('card', clip)}
        onGrid={() => void switchMode('grid')}
      />
    );
  }
  if (collection && hasVideo && collection.draft.mode === 'video') {
    return (
      <VideoEditor
        collection={collection}
        close={close}
        onCard={(clip) => void switchMode('card', clip)}
        onGrid={() => void switchMode('grid')}
      />
    );
  }
  if (collection && (collection.draft.mode === 'grid' || !cardState)) {
    return (
      <GridEditor
        collection={collection}
        change={setCollection}
        onVideo={toVideo}
        close={close}
        onCard={
          collection.clips.length ? () => void switchMode('card') : undefined
        }
      />
    );
  }
  if (cardState) {
    return (
      <CardEditor
        draft={cardState}
        onChange={(next) => {
          setCard(next);
          void saveDraft(next)
            .then(() => {
              const request: BackgroundMessage = {
                to: 'background',
                kind: 'remember',
                id: next.id,
              };
              return browser.runtime.sendMessage(request);
            })
            .catch(failed);
          if (collection) {
            void updateDraftCollection(collection.draft.id, {
              title:
                next.headline === next.original
                  ? collection.draft.title
                  : next.headline,
              overrides: next.overrides,
            }).catch(failed);
          }
        }}
        onClose={close}
        initialShareOpen={share}
        onSaveForLater={
          collection
            ? async (title) => {
                await saveDraft(cardState);
                await saveCollectionForLater(collection.draft.id, title);
                close();
              }
            : undefined
        }
        onVideo={toVideo}
        onGrid={collection ? () => void switchMode('grid') : undefined}
        openExternal={(url) => browser.tabs.create({ url })}
      />
    );
  }
  return (
    <section className="popup-empty popup-collections">
      <header className="popup-collections-header">
        <h1>
          {strings['drafts.title']} · {items.length}
        </h1>
        <button
          type="button"
          className="clip-icon-button"
          title={strings['action.close']}
          aria-label={strings['action.close']}
          onClick={close}
        >
          <Icon name="close" />
        </button>
      </header>
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <button
              className="clip-popup-draft"
              type="button"
              onClick={() => void restore(item.id)}
            >
              <div className="clip-popup-thumb">
                <CollectionThumbnail draft={item} />
              </div>
              <span className="clip-popup-caption">
                <strong>{item.title}</strong>
                <small>
                  {strings['clip.count'].replace(
                    '{count}',
                    String(item.order.length),
                  )}
                </small>
              </span>
              <Icon name={item.mode} size={16} />
            </button>
          </li>
        ))}
      </ul>
      <footer className="clip-grid-actions">
        {FLAGS.batch ? (
          <button
            type="button"
            className="clip-button"
            onClick={() => setBatchStart(true)}
          >
            {strings['batch.collect']}
          </button>
        ) : null}
        {FLAGS.videoJoin ? (
          <button
            type="button"
            className="clip-button"
            onClick={() => setLibrary('library')}
          >
            {strings['library.tab']}
          </button>
        ) : null}
        {FLAGS.gifs ? (
          <button
            type="button"
            className="clip-button"
            onClick={() => setLibrary('gifs')}
          >
            {strings['gifs.tab']}
          </button>
        ) : null}
        <button
          type="button"
          className="clip-button clip-primary"
          onClick={() => void fromPage('pageCard')}
        >
          {strings['drafts.fromPage']}
        </button>
        <button
          type="button"
          className="clip-button"
          onClick={() => void fromPage('addPage')}
        >
          <Icon name="add" />
          {strings['drafts.addPage']}
        </button>
      </footer>
      {status ? <p role="status">{status}</p> : null}
    </section>
  );
}
