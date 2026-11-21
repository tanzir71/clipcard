import { useCallback, useEffect, useRef, useState } from 'react';
import {
  activeInterfaceLanguage,
  interfaceStrings as strings,
} from '@clipcard/i18n';
import type { DraftCollection, LibraryItem } from '../collection-types.ts';
import {
  gifKey,
  gifOrigins,
  readGifSettings,
  searchGifs,
  setGifProvider,
} from '../gifs.ts';
import type { GifProvider, GifResult } from '../gifs.ts';
import {
  addLibraryItem,
  editLibraryItem,
  libraryFileTypes,
  libraryTitle,
  listLibrary,
  readLibraryItem,
  removeLibraryItem,
  saveLibraryFile,
} from '../library.ts';
import { GifSettings } from './GifSettings.tsx';
import { Icon } from './Icon.tsx';
import './library-panel.css';

const giphyAttribution = new URL(
  '../media/powered-by-giphy.png',
  import.meta.url,
).href;

export type GifPermission = (origins: string[]) => Promise<boolean>;

export function LibraryMedia({ item }: { item: LibraryItem }) {
  const [preview, setPreview] = useState<{ src: string; type: string }>();
  useEffect(() => {
    if (item.video?.poster) return;
    let alive = true;
    let url: string | undefined;
    void readLibraryItem(item)
      .then((blob) => {
        if (!alive || !blob) return;
        url = URL.createObjectURL(blob);
        setPreview({ src: url, type: blob.type });
      })
      .catch(() => undefined);
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [item]);
  if (item.video?.poster) return <img alt="" src={item.video.poster} />;
  if (!preview) return <Icon name="photo" />;
  return preview.type.startsWith('video/') ? (
    <video
      src={preview.src}
      preload="metadata"
      muted
      tabIndex={-1}
      aria-hidden="true"
    />
  ) : (
    <img alt="" src={preview.src} />
  );
}

function GifSearch({ permit }: { permit?: GifPermission }) {
  const [provider, setProvider] = useState<GifProvider>('klipy');
  const [off, setOff] = useState(false);
  const [query, setQuery] = useState('');
  const [showSettings, openSettings] = useState(false);
  const [status, setStatus] = useState('');
  const [results, setResults] = useState<GifResult[]>([]);
  const request = useRef<AbortController | null>(null);
  const refresh = useCallback(() => {
    void readGifSettings()
      .then(({ provider }) => {
        setOff(provider === 'off');
        if (provider !== 'off') setProvider(provider);
      })
      .catch(() => setStatus(strings['gifs.failure']));
  }, []);
  useEffect(() => {
    refresh();
    return () => request.current?.abort();
  }, [refresh]);

  function choose(next: GifProvider) {
    request.current?.abort();
    setProvider(next);
    setOff(false);
    setResults([]);
    setStatus('');
    void setGifProvider(next).catch(() => setStatus(strings['gifs.failure']));
  }

  async function search() {
    if (!query.trim() || off) return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setStatus(strings['gifs.loading']);
    setResults([]);
    try {
      // Ask from the submit gesture, before the asynchronous key read.
      if (permit && !(await permit(gifOrigins[provider]))) {
        if (!controller.signal.aborted) setStatus(strings['gifs.failure']);
        return;
      }
      const key = await gifKey(provider);
      if (!key) {
        if (!controller.signal.aborted) {
          setStatus(strings['gifs.enterKey']);
          openSettings(true);
        }
        return;
      }
      const found = await searchGifs(
        provider,
        query,
        key,
        activeInterfaceLanguage,
        controller.signal,
      );
      if (controller.signal.aborted) return;
      setResults(found);
      setStatus(found.length ? '' : strings['gifs.noResults']);
    } catch {
      if (!controller.signal.aborted) setStatus(strings['gifs.failure']);
    }
  }

  return (
    <div className="clip-gif-search">
      <div className="clip-library-tools">
        <button
          type="button"
          className="clip-button"
          aria-pressed={provider === 'klipy' && !off}
          onClick={() => choose('klipy')}
        >
          KLIPY
        </button>
        <button
          type="button"
          className="clip-button"
          aria-pressed={provider === 'giphy' && !off}
          onClick={() => choose('giphy')}
        >
          GIPHY
        </button>
        <button
          type="button"
          className="clip-icon-button"
          aria-expanded={showSettings}
          aria-label={strings['gifs.provider']}
          title={strings['gifs.provider']}
          onClick={() => openSettings(!showSettings)}
        >
          <Icon name="settings" size={16} />
        </button>
      </div>
      {showSettings ? <GifSettings key={provider} changed={refresh} /> : null}
      <form
        className="clip-library-tools"
        onSubmit={(event) => {
          event.preventDefault();
          void search();
        }}
      >
        <input
          type="search"
          maxLength={50}
          required
          value={query}
          aria-label={
            strings[
              provider === 'klipy' ? 'gifs.searchKlipy' : 'gifs.searchGiphy'
            ]
          }
          placeholder={
            strings[
              provider === 'klipy' ? 'gifs.searchKlipy' : 'gifs.searchGiphy'
            ]
          }
          onChange={(event) => setQuery(event.currentTarget.value)}
        />
        <button
          type="submit"
          className="clip-button clip-primary"
          disabled={off}
        >
          {strings['gifs.search']}
        </button>
      </form>
      {status ? <p role="status">{status}</p> : null}
      {results.length ? (
        <>
          <p className="clip-gif-credit">
            {provider === 'giphy' ? (
              <img src={giphyAttribution} alt={strings['gifs.attribution']} />
            ) : (
              strings['gifs.poweredKlipy']
            )}
          </p>
          <ul className="clip-library-tiles">
            {results.map(({ id, title, href, preview, video, creator }) => (
              <li key={id}>
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={title || strings['gifs.open']}
                >
                  {video ? (
                    <video
                      src={preview}
                      muted
                      loop
                      autoPlay={
                        !matchMedia('(prefers-reduced-motion: reduce)').matches
                      }
                      playsInline
                      preload="metadata"
                      aria-hidden="true"
                    />
                  ) : (
                    <img src={preview} alt="" loading="lazy" />
                  )}
                  <span>{title || strings['gifs.open']}</span>
                  {creator ? <small>{creator}</small> : null}
                </a>
              </li>
            ))}
          </ul>
          <p className="clip-library-note">{strings['gifs.searchOnly']}</p>
        </>
      ) : null}
    </div>
  );
}

export function LibraryPanel({
  initialTab = 'library',
  allowGifs = true,
  permit,
  draftId,
  after,
  reaction,
  change,
  close,
  refreshToken = 0,
}: {
  initialTab?: 'library' | 'gifs';
  allowGifs?: boolean;
  permit?: GifPermission;
  draftId?: string;
  after?: string;
  reaction?: boolean;
  change: (collection: DraftCollection) => void;
  close?: () => void;
  refreshToken?: number;
}) {
  const [tab, setTab] = useState(initialTab);
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [favorites, setFavorites] = useState(false);
  const [tag, setTag] = useState('');
  const [working, setWorking] = useState(false);
  const [status, setStatus] = useState('');
  const picker = useRef<HTMLInputElement>(null);
  const refresh = useCallback(async () => {
    setItems(await listLibrary());
  }, []);
  useEffect(() => {
    void refresh().catch(() => setStatus(strings['library.failed']));
  }, [refresh, refreshToken]);
  const chosen = items.find((item) => item.id === selected.at(-1));
  const tags = [...new Set(items.flatMap((item) => item.tags))].slice(0, 12);
  const normalized = query.trim().toLocaleLowerCase();
  const filtered = items.filter(
    (item) =>
      (!favorites || item.favorite) &&
      (!tag || item.tags.includes(tag)) &&
      (!normalized ||
        (libraryTitle(item) + ' ' + item.tags.join(' '))
          .toLocaleLowerCase()
          .includes(normalized)),
  );

  async function work(action: () => Promise<void>) {
    if (working) return;
    setWorking(true);
    setStatus('');
    try {
      await action();
      await refresh();
    } catch {
      setStatus(strings['library.failed']);
    } finally {
      setWorking(false);
    }
  }

  function ingest(files: FileList | null) {
    if (!files?.length) return;
    const queue = Array.from(files);
    void work(async () => {
      const added = [];
      for (const file of queue) added.push((await saveLibraryFile(file)).id);
      setSelected(added);
      if (picker.current) picker.current.value = '';
    });
  }

  async function append() {
    let group: DraftCollection | undefined;
    let insert = after;
    for (const id of selected) {
      const item = items.find((item) => item.id === id);
      if (!item) continue;
      group = await addLibraryItem(item, {
        draftId: group?.draft.id ?? draftId,
        after: insert,
        reaction,
      });
      if (insert) {
        const at = group.draft.order.indexOf(insert);
        insert = group.draft.order[at + 1];
      }
    }
    if (group) change(group);
    setSelected([]);
  }

  return (
    <section
      className="clip-library"
      aria-label={strings['library.tab']}
      onDragOver={(event) => {
        if (tab === 'library' && event.dataTransfer.types.includes('Files'))
          event.preventDefault();
      }}
      onDrop={(event) => {
        if (tab !== 'library' || !event.dataTransfer.files.length) return;
        event.preventDefault();
        ingest(event.dataTransfer.files);
      }}
    >
      <header className="clip-library-tools">
        <button
          type="button"
          className="clip-button"
          aria-pressed={tab === 'library'}
          onClick={() => setTab('library')}
        >
          {strings['library.tab']}
        </button>
        {allowGifs ? (
          <button
            type="button"
            className="clip-button"
            aria-pressed={tab === 'gifs'}
            onClick={() => setTab('gifs')}
          >
            {strings['gifs.tab']}
          </button>
        ) : null}
        {close ? (
          <button
            className="clip-icon-button clip-library-close"
            type="button"
            title={strings['action.close']}
            aria-label={strings['action.close']}
            onClick={close}
          >
            <Icon name="close" />
          </button>
        ) : null}
      </header>
      {allowGifs && tab === 'gifs' ? (
        <GifSearch permit={permit} />
      ) : (
        <>
          <div className="clip-library-tools">
            <input
              type="search"
              value={query}
              placeholder={strings['library.search']}
              aria-label={strings['library.search']}
              onChange={(event) => setQuery(event.currentTarget.value)}
            />
            <button
              type="button"
              className="clip-button"
              aria-pressed={favorites}
              onClick={() => setFavorites(!favorites)}
            >
              {strings['library.favorites']}
            </button>
            <input
              type="file"
              ref={picker}
              accept={libraryFileTypes}
              multiple
              hidden
              onChange={(event) => ingest(event.currentTarget.files)}
            />
            <button
              type="button"
              className="clip-button"
              disabled={working}
              onClick={() => picker.current?.click()}
            >
              {strings['library.import']}
            </button>
          </div>
          {tags.length ? (
            <div className="clip-library-tags">
              {tags.map((item) => (
                <button
                  type="button"
                  className="clip-button"
                  aria-pressed={tag === item}
                  key={item}
                  onClick={() => setTag(tag === item ? '' : item)}
                >
                  {item}
                </button>
              ))}
            </div>
          ) : null}
          {items.length ? (
            <ul className="clip-library-tiles">
              {filtered.map((item) => (
                <li key={item.id}>
                  <button
                    className="clip-library-item"
                    type="button"
                    aria-pressed={selected.includes(item.id)}
                    onClick={() =>
                      setSelected((previous) =>
                        previous.includes(item.id)
                          ? previous.filter((id) => id !== item.id)
                          : [...previous, item.id],
                      )
                    }
                  >
                    <LibraryMedia item={item} />
                    <span>
                      {libraryTitle(item) || strings['library.untitled']}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="clip-library-note">{strings['library.empty']}</p>
          )}
          {chosen ? (
            <div className="clip-library-tools">
              <input
                key={chosen.id}
                aria-label={strings['library.tags']}
                placeholder={strings['library.tags']}
                defaultValue={chosen.tags.join(', ')}
                onBlur={(event) => {
                  const tags = event.currentTarget.value.split(',');
                  if (
                    tags.map((tag) => tag.trim()).join(', ') !==
                    chosen.tags.join(', ')
                  )
                    void work(() =>
                      editLibraryItem(chosen.id, {
                        favorite: chosen.favorite,
                        tags,
                      }),
                    );
                }}
              />
              <button
                type="button"
                className="clip-button"
                aria-pressed={chosen.favorite}
                onClick={() =>
                  void work(() =>
                    editLibraryItem(chosen.id, {
                      tags: chosen.tags,
                      favorite: !chosen.favorite,
                    }),
                  )
                }
              >
                {strings['library.favorite']}
              </button>
              <button
                type="button"
                className="clip-icon-button"
                title={strings['library.remove']}
                aria-label={strings['library.remove']}
                onClick={() =>
                  void work(async () => {
                    await removeLibraryItem(chosen.id);
                    setSelected((previous) =>
                      previous.filter((id) => id !== chosen.id),
                    );
                  })
                }
              >
                <Icon name="close" size={16} />
              </button>
            </div>
          ) : null}
          {selected.length ? (
            <button
              type="button"
              className="clip-button clip-primary"
              disabled={working}
              onClick={() => void work(append)}
            >
              {strings['library.add'].replace('{n}', String(selected.length))}
            </button>
          ) : null}
          {status ? <p role="status">{status}</p> : null}
        </>
      )}
    </section>
  );
}
