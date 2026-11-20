import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import strings from '@clipcard/i18n/en';
import { Icon, InputRow } from '@clipcard/ui';
import type { CardDraft } from '@clipcard/ui';
import { receiveBookmark } from '@clipcard/ui/bookmark';
import { CardEditor } from '@clipcard/ui/card-editor';
import { DraftPreview } from '@clipcard/ui/card-preview';
import { draftFromInput, inspectPhoto, readTransfer } from '@clipcard/ui/input';
import type { CardInput } from '@clipcard/ui/input';
import {
  deleteDraft,
  getDraft,
  recentDrafts,
  saveDraft,
} from '@clipcard/ui/storage';
import mark from '../../../design/brand/mark.svg?url';

declare const __CLIPCARD_BOOKMARK__: string;
type Screen = 'make' | 'drafts';
const getParams = () => new URLSearchParams(location.search);
const appUrl = import.meta.env.BASE_URL;

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
  const [flow, setFlow] = useState<'workspace' | 'popup' | 'shared'>(
    'workspace',
  );
  const [message, setMessage] = useState('');
  const [working, setWorking] = useState(false);
  const picker = useRef<HTMLInputElement>(null);
  const draftRef = useRef<CardDraft | null>(null);
  const pending = useRef<number | undefined>(undefined);

  const refresh = useCallback(() => recentDrafts().then(setHistory), []);
  const failed = useCallback(() => setMessage(strings['card.savedFailed']), []);
  const put = useCallback(
    async (draft: CardDraft) => {
      await saveDraft(draft);
      await refresh();
    },
    [refresh],
  );

  const display = useCallback(
    (draft: CardDraft, view: 'workspace' | 'popup' | 'shared') => {
      draftRef.current = draft;
      setScreen('make');
      setFlow(view);
      setActive(draft);
      setMessage('');
      const next = new URL(location.href);
      next.hash = '';
      next.search = '';
      next.searchParams.set('draft', draft.id);
      if (view === 'popup') next.searchParams.set('from', 'bookmark');
      if (view === 'shared') next.searchParams.set('from', 'share');
      window.history.replaceState(null, '', next);
    },
    [],
  );

  const close = useCallback(() => {
    if (draftRef.current) void put(draftRef.current).catch(failed);
    if (flow === 'popup' && window.opener) {
      window.close();
      return;
    }
    draftRef.current = null;
    setActive(null);
    setScreen('make');
    setFlow('workspace');
    window.history.replaceState(null, '', appUrl);
  }, [flow, put, failed]);

  const open = useCallback(
    async (
      draft: CardDraft,
      view: 'workspace' | 'popup' | 'shared' = 'workspace',
    ) => {
      const previous = draftRef.current;
      if (previous && previous.id !== draft.id)
        void put(previous).catch(failed);
      display(draft, view);
      await put(draft).catch(failed);
    },
    [display, put, failed],
  );

  const add = useCallback(
    async (input: CardInput) => {
      const draft = await draftFromInput(input, strings['card.photo']);
      if (!draft) return false;
      await open(draft);
      return true;
    },
    [open],
  );

  useEffect(() => {
    const start = getParams();
    const id = start.get('draft');
    const from = start.get('from');
    let current = true;
    void refresh().catch(failed);
    if (id) {
      void getDraft(id)
        .then((draft) => {
          if (!current) return;
          if (draft)
            display(
              draft,
              from === 'share'
                ? 'shared'
                : from === 'bookmark'
                  ? 'popup'
                  : 'workspace',
            );
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
      from === 'bookmark'
        ? receiveBookmark(
            (draft) => {
              void open(draft, 'popup');
            },
            () => setMessage(strings['card.bookmarkFailed']),
          )
        : undefined;
    return () => {
      current = false;
      stop?.();
    };
  }, [add, display, failed, open, refresh]);

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

  function navigate(destination: Screen) {
    if (destination === 'make') {
      setScreen('make');
      return;
    }
    setScreen('drafts');
    void refresh().catch(failed);
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
  const editor =
    screen === 'make' && active ? (
      <CardEditor
        key={active.id}
        draft={active}
        view={flow}
        onChange={update}
        onClose={close}
        onPhoto={() => picker.current?.click()}
        onSave={() => put(active)}
        beforePreview={flow === 'workspace' ? input : undefined}
      />
    ) : null;
  const showNav = !(active && screen === 'make' && flow !== 'workspace');
  return (
    <div
      className={
        'app' +
        (active && screen === 'make' ? ' app-editing' : '') +
        (showNav ? '' : ' app-compact')
      }
    >
      {showNav ? (
        <AppNav
          screen={screen}
          length={history.length}
          go={navigate}
          fresh={close}
        />
      ) : null}
      <main className="app-main">
        {screen === 'drafts' ? (
          <section>
            <header className="app-work-header">
              <h1>{strings['drafts.title']}</h1>
              <span>{history.length}</span>
            </header>
            <div className="app-drafts">
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
              <button type="button" className="app-new-tile" onClick={close}>
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
