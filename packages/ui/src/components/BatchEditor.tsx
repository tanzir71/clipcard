import { useEffect, useMemo, useRef, useState } from 'react';
import {
  interfaceStrings as strings,
  activeInterfaceLanguage,
} from '@clipcard/i18n';
import { maxBatchLinks, pastedBatchLinks } from '@clipcard/core';
import type { BatchLink } from '@clipcard/core';
import type { GridClip } from '@clipcard/cards/grid-model';
import {
  prepareRoundup,
  renderRoundup,
  RoundupCard,
} from '@clipcard/cards/roundup';
import type { RoundupModel } from '@clipcard/cards/roundup';
import { zipSync } from 'fflate';
import { copyPng, fileName, renderPng, shareFile } from '../actions.ts';
import { cardFromCollection } from '../collection-card.ts';
import {
  saveCollectionForLater,
  updateDraftCollection,
} from '../collections.ts';
import type { BatchOptions, DraftCollection } from '../collection-types.ts';
import { modelForDraft, optionsForDraft } from '../draft.ts';
import type { CardDraft } from '../draft.ts';
import { gridClipsForCollection } from '../grid-clips.ts';
import { DraftPreview } from './CardPreview.tsx';
import { Icon } from './Icon.tsx';
import './batch-editor.css';

const rowsPerPage = 4;

function stories(count: number) {
  return count === 4
    ? strings['batch.four']
    : strings['batch.stories'].replace('{n}', String(count));
}

export function BatchStart({
  collect,
  close,
  select,
  tabs,
}: {
  collect: (links: BatchLink[]) => Promise<boolean>;
  close: () => void;
  select?: () => Promise<boolean>;
  tabs?: () => Promise<boolean>;
}) {
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function run(task: () => Promise<boolean>) {
    setBusy(true);
    setMessage('');
    try {
      if (!(await task())) setMessage(strings['batch.empty']);
    } catch {
      setMessage(strings['card.renderFailed']);
    } finally {
      setBusy(false);
    }
  }
  function paste() {
    const links = pastedBatchLinks(input);
    if (!links || links.length < 2) setMessage(strings['batch.empty']);
    else if (links.length > maxBatchLinks) setMessage(strings['batch.limit']);
    else void run(() => collect(links));
  }
  return (
    <form
      className="clip-batch-start"
      onSubmit={(event) => {
        event.preventDefault();
        paste();
      }}
    >
      <div className="clip-batch-count">
        <strong>{strings['batch.collect']}</strong>
        <button
          type="button"
          className="clip-icon-button"
          title={strings['action.close']}
          aria-label={strings['action.close']}
          onClick={close}
        >
          <Icon name="close" />
        </button>
      </div>
      <textarea
        autoFocus
        aria-label={strings['batch.paste']}
        placeholder={strings['batch.pasteHint']}
        value={input}
        rows={4}
        onChange={(event) => setInput(event.target.value)}
      />
      <div className="clip-grid-actions">
        <button
          type="submit"
          className="clip-button clip-primary"
          disabled={busy}
        >
          {strings['batch.collect']}
        </button>
        {tabs ? (
          <button
            type="button"
            className="clip-button"
            disabled={busy}
            onClick={() => void run(tabs)}
          >
            {strings['batch.tabs']}
          </button>
        ) : null}
        {select ? (
          <button
            type="button"
            className="clip-button"
            disabled={busy}
            onClick={() => void run(select)}
          >
            {strings['batch.select']}
          </button>
        ) : null}
      </div>
      {message || busy ? (
        <p role="status">{busy ? strings['batch.loading'] : message}</p>
      ) : null}
    </form>
  );
}

export function BatchEditor({
  collection,
  change,
  close,
  digest,
  view = 'popup',
}: {
  collection: DraftCollection;
  change: (collection: DraftCollection) => void;
  close: () => void;
  digest: () => void;
  view?: 'popup' | 'workspace';
}) {
  const { clips, draft } = collection;
  const output = draft.batch?.output ?? 'roundup';
  const roundup = output === 'roundup';
  const [at, setAt] = useState(0);
  const [content, setContent] = useState<{
    clips: typeof clips;
    grid: GridClip[];
  }>();
  const [card, setCard] = useState<CardDraft | null>();
  const [art, setArt] = useState<{
    model: RoundupModel;
    assets: Awaited<ReturnType<typeof prepareRoundup>>;
  }>();
  const [width, setWidth] = useState(0);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const preview = useRef<HTMLDivElement>(null);
  const copied = useRef(0);
  const [nextCopy, setNextCopy] = useState(0);
  const count = roundup ? Math.ceil(clips.length / rowsPerPage) : clips.length;
  const index = Math.max(0, Math.min(at, count - 1));
  const grid = content?.clips === clips ? content.grid : undefined;
  const date = useMemo(
    () =>
      new Intl.DateTimeFormat(activeInterfaceLanguage, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(draft.createdAt),
    [draft.createdAt],
  );
  const pages = useMemo(
    () =>
      grid
        ? Array.from(
            { length: Math.ceil(grid.length / rowsPerPage) },
            (_, page): RoundupModel => {
              const offset = page * rowsPerPage;
              return {
                lead: strings['batch.today'],
                count: stories(grid.length),
                date,
                lang: activeInterfaceLanguage,
                mark: strings['ext.shortName'],
                clips: grid.slice(offset, offset + rowsPerPage),
                offset,
              };
            },
          )
        : [],
    [grid, date],
  );
  const current = pages[index];

  useEffect(() => {
    const urls: string[] = [];
    let active = true;
    void gridClipsForCollection({ draft, clips }, (blob) => {
      if (!active) return;
      const url = URL.createObjectURL(blob);
      urls.push(url);
      return url;
    })
      .then((grid) => {
        if (active) setContent({ clips, grid });
      })
      .catch(() => {
        if (active) setStatus(strings['card.renderFailed']);
      });
    return () => {
      active = false;
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [draft, clips]);

  useEffect(() => {
    if (!current || !roundup) return;
    let active = true;
    void prepareRoundup(current)
      .then((assets) => {
        if (active) setArt({ model: current, assets });
      })
      .catch(() => {
        if (active) setStatus(strings['card.renderFailed']);
      });
    return () => {
      active = false;
    };
  }, [current, roundup]);

  useEffect(() => {
    if (roundup || !clips[index]) return;
    let active = true;
    void cardFromCollection(collection, clips[index])
      .then((candidate) => {
        if (active) setCard(candidate);
      })
      .catch(() => {
        if (active) setStatus(strings['card.renderFailed']);
      });
    return () => {
      active = false;
    };
  }, [collection, clips, index, roundup]);

  useEffect(() => {
    if (!preview.current) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(entry.contentRect.width);
    });
    observer.observe(preview.current);
    return () => observer.disconnect();
  }, []);

  function select(value: BatchOptions['output']) {
    if (!draft.batch || value === output) return;
    setAt(0);
    copied.current = 0;
    setNextCopy(0);
    void updateDraftCollection(draft.id, {
      batch: { ...draft.batch, output: value },
    })
      .then((group) => {
        if (group) change(group);
      })
      .catch(() => setStatus(strings['card.savedFailed']));
  }

  async function png(position: number) {
    if (roundup) {
      const model = pages[position];
      if (!model) throw new Error('batch-page');
      return renderRoundup(model);
    }
    const draftCard = await cardFromCollection(collection, clips[position]);
    if (!draftCard) throw new Error('batch-card');
    const image = draftCard.photo && URL.createObjectURL(draftCard.photo.blob);
    try {
      const model = modelForDraft(draftCard, image, Date.now());
      return await renderPng(model, optionsForDraft(draftCard, model));
    } finally {
      if (image) URL.revokeObjectURL(image);
    }
  }

  async function save() {
    try {
      await saveCollectionForLater(draft.id, draft.title);
      close();
    } catch {
      setStatus(strings['card.savedFailed']);
    }
  }

  async function exportAction(action: 'copy' | 'zip' | 'share') {
    if (busy || (roundup && !grid)) return;
    setBusy(true);
    setStatus('');
    try {
      if (action === 'copy') {
        const position = roundup ? index : copied.current;
        await copyPng(png(position));
        setAt(position);
        copied.current = roundup ? index : (position + 1) % count;
        setNextCopy(copied.current);
        setStatus(strings['toast.copied']);
      } else if (action === 'share') {
        const image = await png(index);
        const request = shareFile(image, draft.title);
        if (request) await request;
        else saveFile(image, fileName(draft.title));
      } else {
        const files: Record<string, Uint8Array<ArrayBuffer>> = {};
        for (let page = 0; page < count; page++) {
          const filename =
            String(page + 1).padStart(2, '0') +
            '-' +
            fileName(roundup ? draft.title : clips[page]!.title);
          files[filename] = new Uint8Array(
            await (await png(page)).arrayBuffer(),
          );
        }
        const bytes = zipSync(files, { level: 0 });
        saveFile(
          new Blob([bytes], { type: 'application/zip' }),
          fileName(draft.title).replace(/\.png$/, '.zip'),
        );
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError'))
        setStatus(strings['card.renderFailed']);
    } finally {
      setBusy(false);
    }
  }

  const copyLabel =
    !roundup && nextCopy > 0
      ? strings['batch.copyNext']
          .replace('{position}', String(nextCopy + 1))
          .replace('{total}', String(count))
      : strings['action.copy'];

  return (
    <section
      className={'clip-batch clip-batch-' + view}
      aria-label={strings['batch.roundup']}
    >
      <div className="clip-batch-art" ref={preview}>
        {roundup ? (
          <div className="clip-batch-roundup" style={{ height: width * 1.25 }}>
            {art && art.model === current && width > 0 ? (
              <div style={{ transform: 'scale(' + width / 1080 + ')' }}>
                <RoundupCard model={art.model} assets={art.assets} />
              </div>
            ) : null}
          </div>
        ) : card ? (
          <DraftPreview draft={card} />
        ) : null}
        <button
          type="button"
          className="clip-grid-close"
          aria-label={strings['action.close']}
          title={strings['action.close']}
          onClick={close}
        >
          <Icon name="close" size={16} />
        </button>
      </div>
      <div className="clip-batch-tools">
        <div className="clip-grid-mode-row">
          <button
            type="button"
            className="clip-button"
            aria-pressed={!roundup}
            onClick={() => select('carousel')}
          >
            {strings['batch.carousel'].replace('{n}', String(clips.length))}
          </button>
          <button
            type="button"
            className="clip-button"
            aria-pressed={roundup}
            onClick={() => select('roundup')}
          >
            {strings['batch.roundup']}
          </button>
          <button type="button" className="clip-button" onClick={digest}>
            {strings['batch.digest']}
          </button>
        </div>
        <div className="clip-batch-count">
          <span>
            {strings['batch.linkCount']
              .replace('{n}', String(clips.length))
              .replace(
                '{source}',
                strings[
                  ('batch.source.' +
                    draft.batch?.source) as keyof typeof strings
                ] ?? '',
              )}
          </span>
          {count > 1 ? (
            <div className="clip-grid-actions">
              <button
                type="button"
                className="clip-icon-button"
                aria-label={strings['action.templatePrev']}
                title={strings['action.templatePrev']}
                disabled={index === 0}
                onClick={() => setAt(index - 1)}
              >
                <Icon name="arrowLeft" size={15} />
              </button>
              <span>
                {index + 1} / {count}
              </span>
              <button
                type="button"
                className="clip-icon-button"
                aria-label={strings['action.templateNext']}
                title={strings['action.templateNext']}
                disabled={index === count - 1}
                onClick={() => setAt(index + 1)}
              >
                <Icon name="arrowRight" size={15} />
              </button>
            </div>
          ) : null}
        </div>
        <ul className="clip-batch-list">
          {clips.map(({ id, title, sourceUrl }, position) => (
            <li key={id}>
              <button
                type="button"
                onClick={() =>
                  setAt(roundup ? Math.floor(position / rowsPerPage) : position)
                }
                title={title}
              >
                <Icon name="link" size={13} />
                <span>{title}</span>
                <small>{sourceUrl ? new URL(sourceUrl).hostname : ''}</small>
              </button>
            </li>
          ))}
        </ul>
        <div className="clip-grid-actions">
          <button
            type="button"
            className="clip-button clip-primary"
            disabled={busy || (roundup && !grid)}
            onClick={() => void exportAction('copy')}
          >
            {copyLabel}
          </button>
          {!roundup || count > 1 ? (
            <button
              type="button"
              className="clip-button"
              disabled={busy}
              onClick={() => void exportAction('zip')}
            >
              {strings['batch.downloadZip']}
            </button>
          ) : null}
          <button
            type="button"
            className="clip-icon-button"
            title={strings['action.save']}
            aria-label={strings['action.save']}
            onClick={() => void save()}
          >
            <Icon name="bookmark" size={16} />
          </button>
          <button
            type="button"
            className="clip-icon-button"
            disabled={busy}
            title={strings['action.share']}
            aria-label={strings['action.share']}
            onClick={() => void exportAction('share')}
          >
            <Icon name="share" size={16} />
          </button>
        </div>
        {status ? <p role="status">{status}</p> : null}
      </div>
    </section>
  );
}

function saveFile(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}
