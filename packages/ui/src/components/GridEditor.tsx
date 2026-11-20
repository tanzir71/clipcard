import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { CARD_FORMATS, tokens } from '@clipcard/cards';
import type { Format } from '@clipcard/cards';
import { prepareGridAssets } from '@clipcard/cards/assets';
import type { CardAssets } from '@clipcard/cards/assets';
import { gridLayouts, gridModel } from '@clipcard/cards/grid-model';
import type {
  GridClip,
  GridLayout,
  GridModel,
} from '@clipcard/cards/grid-model';
import { GridCard } from '@clipcard/cards/grid-view';
import strings from '@clipcard/i18n/en';
import { copyPng, downloadPng, shareFile } from '../actions.ts';
import {
  moveDraftClip,
  removeDraftClip,
  saveCollectionForLater,
  updateDraftCollection,
} from '../collections.ts';
import type { DraftCollection } from '../collections.ts';
import { Icon } from './Icon.tsx';
import { DraftNameForm } from './DraftNameForm.tsx';
import { gridClipsForCollection } from '../grid-clips.ts';
import '../ui.css';
import './grid-editor.css';

export function GridEditor({
  collection,
  change,
  close,
  onCard,
  beforePreview,
  view = 'popup',
}: {
  collection: DraftCollection;
  change: (item: DraftCollection) => void;
  close: () => void;
  onCard?: () => void;
  beforePreview?: ReactNode;
  view?: 'popup' | 'workspace';
}) {
  const { draft, clips } = collection;
  const dragging = useRef<string | undefined>(undefined);
  const viewport = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [art, setArt] = useState<{ model: GridModel; assets: CardAssets }>();
  const [loaded, setLoaded] = useState<{
    forClips: typeof clips;
    grid: GridClip[];
  }>();
  const [auto, setAuto] = useState(false);
  const [save, setSave] = useState(false);
  const [share, setShare] = useState(false);
  const [working, setWorking] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    let active = true;
    const urls: string[] = [];
    void gridClipsForCollection({ draft, clips }, (blob) => {
      if (!active) return undefined;
      const url = URL.createObjectURL(blob);
      urls.push(url);
      return url;
    })
      .then((grid) => {
        if (active) setLoaded({ forClips: clips, grid });
      })
      .catch(() => {
        if (active) setStatus(strings['card.renderFailed']);
      });
    return () => {
      active = false;
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [clips, draft.id, draft.legacyCard?.photo]);

  useEffect(() => {
    const node = viewport.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(entry.contentRect.width);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    function escape(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      if (auto || save || share) {
        setAuto(false);
        setSave(false);
        setShare(false);
      } else close();
    }
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [auto, close, save, share]);

  const grid = loaded?.forClips === clips ? loaded.grid : undefined;
  const model = useMemo(
    () =>
      grid &&
      gridModel(grid, { headline: draft.title, layout: draft.gridLayout }),
    [grid, draft.title, draft.gridLayout],
  );
  useEffect(() => {
    if (!model) return;
    let active = true;
    void prepareGridAssets(model)
      .then((assets) => {
        if (active) setArt({ model, assets });
      })
      .catch(() => {
        if (active) setStatus(strings['card.renderFailed']);
      });
    return () => {
      active = false;
    };
  }, [model]);
  const assets = art?.model === model ? art?.assets : undefined;
  const supported = grid ? gridLayouts(grid) : [];
  const options = {
    format: draft.overrides.format ?? '4:5',
    theme: draft.overrides.theme,
  } as const;
  const [naturalWidth, naturalHeight] = tokens.card.formats[options.format];
  const previewReady = assets && model && clips.length > 0;

  function update(operation: Promise<DraftCollection | undefined>) {
    void operation
      .then((next) => {
        if (next) change(next);
      })
      .catch(() => setStatus(strings['card.savedFailed']));
  }

  function layout(value?: GridLayout) {
    update(updateDraftCollection(draft.id, { gridLayout: value }));
  }

  function cycle(direction: number) {
    const index = model ? supported.indexOf(model.layout) : -1;
    if (index >= 0 && supported.length > 1)
      layout(
        supported[(index + direction + supported.length) % supported.length],
      );
  }

  function reorder(id: string, target: string) {
    update(moveDraftClip(draft.id, id, target));
  }

  async function output(action: 'copy' | 'download' | 'share') {
    if (!model || !clips.length || working) return;
    setWorking(true);
    setStatus('');
    const png = import('@clipcard/cards/grid-export').then(({ renderGrid }) =>
      renderGrid(model, options),
    );
    try {
      if (action === 'copy') {
        await copyPng(png);
        setStatus(strings['toast.copied']);
      } else {
        const blob = await png;
        if (action === 'share') {
          const shared = shareFile(blob, draft.title);
          if (shared) {
            await shared;
            return;
          }
        }
        downloadPng(blob, draft.title);
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        setStatus(strings['card.renderFailed']);
      }
    } finally {
      setWorking(false);
    }
  }

  const clipList = (
    <ol className="clip-grid-clips" aria-label={strings['grid.clips']}>
      {clips.map((clip, index) => {
        const image = grid?.find((item) => item.id === clip.id)?.image;
        const title = clip.text || clip.title;
        return (
          <li
            key={clip.id}
            tabIndex={view === 'popup' ? 0 : undefined}
            aria-label={view === 'popup' ? title : undefined}
            draggable
            onDragStart={(event) => {
              dragging.current = clip.id;
              event.dataTransfer.effectAllowed = 'move';
            }}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const id = dragging.current;
              dragging.current = undefined;
              if (id) reorder(id, clip.id);
            }}
            onDragEnd={() => {
              dragging.current = undefined;
            }}
          >
            <div className="clip-grid-thumb" title={title}>
              {image && clip.kind !== 'text' ? (
                <img src={image} alt="" />
              ) : (
                <Icon
                  name={clip.kind === 'text' ? 'quote' : 'link'}
                  size={18}
                />
              )}
            </div>
            <span className="clip-grid-item-title">{title}</span>
            <div className="clip-grid-item-buttons">
              <button
                type="button"
                title={strings['grid.moveEarlier']}
                aria-label={strings['grid.moveEarlier']}
                disabled={index === 0}
                onClick={() => reorder(clip.id, clips[index - 1]!.id)}
              >
                <Icon name="arrowLeft" size={13} />
              </button>
              <button
                type="button"
                title={strings['grid.moveLater']}
                aria-label={strings['grid.moveLater']}
                disabled={index === clips.length - 1}
                onClick={() => reorder(clip.id, clips[index + 1]!.id)}
              >
                <Icon name="arrowRight" size={13} />
              </button>
              <button
                type="button"
                aria-label={strings['grid.removeClip']}
                title={strings['grid.removeClip']}
                onClick={() => update(removeDraftClip(draft.id, clip.id))}
              >
                <Icon name="close" size={13} />
              </button>
            </div>
          </li>
        );
      })}
    </ol>
  );
  const controls = (
    <div className="clip-grid-controls">
      <label>
        {strings['grid.layout']}
        <select
          value={draft.gridLayout ?? ''}
          onChange={(event) =>
            layout(
              (event.currentTarget.value || undefined) as
                GridLayout | undefined,
            )
          }
        >
          <option value="">{strings['card.auto']}</option>
          {supported.map((item) => (
            <option key={item} value={item}>
              {strings[('grid.layout.' + item) as keyof typeof strings]}
            </option>
          ))}
        </select>
      </label>
      <label>
        {strings['card.format']}
        <select
          value={options.format}
          onChange={(event) =>
            update(
              updateDraftCollection(draft.id, {
                overrides: {
                  ...draft.overrides,
                  format: event.currentTarget.value as Format,
                },
              }),
            )
          }
        >
          {CARD_FORMATS.map((format) => (
            <option key={format}>{format}</option>
          ))}
        </select>
      </label>
    </div>
  );

  return (
    <section
      className={'clip-grid-editor clip-grid-' + view}
      aria-label={strings['mode.grid']}
    >
      {view === 'workspace' ? (
        <header className="clip-grid-header">
          <h1>{draft.title}</h1>
          <button
            type="button"
            className="clip-button"
            aria-label={strings['action.close']}
            title={strings['action.close']}
            onClick={close}
          >
            <Icon name="close" />
          </button>
        </header>
      ) : null}
      <div className="clip-grid-stage">
        {beforePreview}
        <div
          className="clip-grid-preview-wrap clip-preview-wrap"
          style={
            {
              '--clip-card-ratio': naturalWidth / naturalHeight,
            } as CSSProperties
          }
        >
          <div
            className="clip-preview"
            ref={viewport}
            style={{ aspectRatio: naturalWidth + ' / ' + naturalHeight }}
          >
            {previewReady && width > 0 ? (
              <div
                className="clip-preview-scale"
                style={{ transform: 'scale(' + width / naturalWidth + ')' }}
              >
                <GridCard model={model} options={options} assets={assets} />
              </div>
            ) : null}
          </div>
          {view === 'popup' ? (
            <button
              type="button"
              className="clip-grid-close"
              aria-label={strings['action.close']}
              title={strings['action.close']}
              onClick={close}
            >
              <Icon name="close" size={16} />
            </button>
          ) : null}
          {supported.length > 1 ? (
            <div className="clip-grid-arrows">
              <button
                type="button"
                aria-label={strings['grid.previousLayout']}
                title={strings['grid.previousLayout']}
                onClick={() => cycle(-1)}
              >
                <Icon name="arrowLeft" />
              </button>
              <button
                type="button"
                aria-label={strings['grid.nextLayout']}
                title={strings['grid.nextLayout']}
                onClick={() => cycle(1)}
              >
                <Icon name="arrowRight" />
              </button>
            </div>
          ) : null}
        </div>
      </div>
      <aside className="clip-grid-tools">
        {clipList}
        <div className="clip-grid-mode-row">
          {onCard ? (
            <button
              type="button"
              className="clip-button"
              title={strings['mode.card']}
              aria-label={strings['mode.card']}
              onClick={onCard}
            >
              <Icon name="card" size={16} />
            </button>
          ) : null}
          <span
            className="clip-grid-selected"
            aria-label={strings['mode.grid']}
          >
            <Icon name="grid" size={16} />
          </span>
          <button
            type="button"
            className="clip-button clip-grid-auto"
            onClick={() => setAuto(!auto)}
            aria-expanded={auto}
          >
            {strings['card.auto']}
            {model
              ? ' · ' +
                strings[('grid.layout.' + model.layout) as keyof typeof strings]
              : ''}{' '}
            · {options.format}
          </button>
        </div>
        {auto || view === 'workspace' ? controls : null}
        <div className="clip-grid-actions">
          <button
            type="button"
            className="clip-button clip-primary"
            disabled={!previewReady || working}
            onClick={() => void output('copy')}
          >
            <Icon name="copy" />
            {strings['action.copy']}
          </button>
          <button
            type="button"
            className="clip-button"
            onClick={() => setSave(!save)}
            aria-label={strings['action.save']}
            title={strings['action.save']}
            aria-expanded={save}
          >
            <Icon name="bookmark" />
          </button>
          <button
            type="button"
            className="clip-button"
            onClick={() => setShare(!share)}
            aria-label={strings['action.share']}
            title={strings['action.share']}
            aria-expanded={share}
          >
            <Icon name="share" />
          </button>
        </div>
        {save ? (
          <DraftNameForm
            className="clip-grid-controls"
            title={draft.title}
            save={async (title) => {
              await saveCollectionForLater(draft.id, title);
              close();
            }}
          />
        ) : null}
        {share ? (
          <div className="clip-grid-actions">
            <button
              type="button"
              className="clip-button"
              disabled={!previewReady || working}
              onClick={() => void output('share')}
            >
              {strings['action.share']}
            </button>
            <button
              type="button"
              className="clip-button"
              disabled={!previewReady || working}
              onClick={() => void output('download')}
            >
              {strings['share.download']}
            </button>
          </div>
        ) : null}
        {status ? (
          <p role="status" className="clip-grid-status">
            {status}
          </p>
        ) : null}
      </aside>
    </section>
  );
}
