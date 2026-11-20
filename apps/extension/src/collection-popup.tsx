import { useEffect, useState } from 'react';
import strings from '@clipcard/i18n/en';
import { Icon } from '@clipcard/ui';
import type { CardDraft } from '@clipcard/ui';
import { CardEditor } from '@clipcard/ui/card-editor';
import { CollectionThumbnail } from '@clipcard/ui/collection-thumbnail';
import { cardFromCollection } from '@clipcard/ui/collection-card';
import {
  getDraftCollection,
  listDraftCollections,
  resumeDraftCollection,
  saveCollectionForLater,
  updateDraftCollection,
} from '@clipcard/ui/collections';
import type { ClipDraft, DraftCollection } from '@clipcard/ui/collections';
import { GridEditor } from '@clipcard/ui/grid-editor';
import { getDraft, saveDraft } from '@clipcard/ui/storage';
import { browser } from 'wxt/browser';
import type { BackgroundMessage } from './messages.ts';

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
      : listDraftCollections().then((drafts) => {
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

  async function switchMode(mode: 'card' | 'grid') {
    if (!collection) return;
    try {
      const item = await updateDraftCollection(collection.draft.id, { mode });
      if (!item) return;
      if (mode === 'card')
        setCard(
          (await getDraft(item.draft.id)) ?? (await cardFromCollection(item)),
        );
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

  if (collection && (collection.draft.mode === 'grid' || !cardState)) {
    return (
      <GridEditor
        collection={collection}
        change={setCollection}
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
              <Icon name={item.mode === 'grid' ? 'grid' : 'card'} size={16} />
            </button>
          </li>
        ))}
      </ul>
      <footer className="clip-grid-actions">
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
