import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { FLAGS } from '@clipcard/core/flags';
import { videoClock } from '@clipcard/core';
import { interfaceStrings as strings } from '@clipcard/i18n';
import { fileName } from '../actions.ts';
import {
  moveDraftClip,
  readClipMedia,
  removeDraftClip,
  saveCollectionForLater,
  updateDraftCollection,
  updateVideoClip,
} from '../collections.ts';
import type {
  DraftClip,
  DraftCollection,
  LibraryItem,
  VideoOptions,
} from '../collection-types.ts';
import {
  addLibraryItem,
  libraryTitle,
  listLibrary,
  saveClipToLibrary,
} from '../library.ts';
import {
  buildVideoScenes,
  videoLength,
  visualFormats,
} from '../video-project.ts';
import type { VideoFormat, VideoScene } from '../video-project.ts';
import { Icon } from './Icon.tsx';
import { LibraryMedia, LibraryPanel } from './LibraryPanel.tsx';
import type { GifPermission } from './LibraryPanel.tsx';
import './video-project-editor.css';

function sceneName(scene: VideoScene) {
  switch (scene.kind) {
    case 'title':
      return strings['video.titleScene'];
    case 'sources':
      return strings['video.sources'];
    case 'clip':
      return strings['video.title'];
    case 'image':
      return strings['video.imageScene'];
    case 'excerpt':
      return strings['video.excerptScene'];
    case 'reaction':
      return strings['video.reaction'];
  }
}

function ScenePreview({
  scene,
  time,
  playing,
}: {
  scene: VideoScene;
  time: number;
  playing: boolean;
}) {
  const [media, setMedia] = useState<{
    url: string;
    type: string;
    id: string;
  }>();
  const player = useRef<HTMLVideoElement>(null);
  const clip = 'clip' in scene ? scene.clip : undefined;
  useEffect(() => {
    if (!clip) return;
    let active = true;
    let url: string | undefined;
    void readClipMedia(clip)
      .then((blob) => {
        if (!active || !blob) return;
        url = URL.createObjectURL(blob);
        setMedia({ url, type: blob.type, id: clip.id });
      })
      .catch(() => undefined);
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [clip]);

  const selected = media?.id === clip?.id ? media : undefined;
  const offset = Math.max(0, time - scene.at);
  useEffect(() => {
    const node = player.current;
    if (!node || (scene.kind !== 'clip' && scene.kind !== 'reaction')) return;
    function sync(node: HTMLVideoElement) {
      const sourceTime =
        scene.kind === 'clip'
          ? scene.range.start + offset
          : offset % (node.duration || 1);
      if (
        Number.isFinite(sourceTime) &&
        (!playing || Math.abs(node.currentTime - sourceTime) > 0.24)
      )
        node.currentTime = Math.min(
          sourceTime,
          Math.max(0, node.duration - 0.01),
        );
      if (!playing) node.pause();
      else if (node.paused) void node.play().catch(() => undefined);
    }
    if (node.readyState > 0) sync(node);
    else {
      const loaded = () => sync(node);
      node.addEventListener('loadedmetadata', loaded, { once: true });
      return () => node.removeEventListener('loadedmetadata', loaded);
    }
  }, [offset, playing, scene, selected?.url]);

  const poster =
    clip?.video?.poster ??
    (selected?.type.startsWith('image/') ? selected.url : undefined);
  const hasVideo =
    (scene.kind === 'clip' || scene.kind === 'reaction') &&
    selected?.type.startsWith('video/');
  const cue =
    scene.kind === 'clip' &&
    scene.cues.find((cue) => offset >= cue.start && offset < cue.end);
  return (
    <div className="clip-project-stage" data-scene={scene.kind}>
      {poster ? (
        <img className="clip-project-echo" src={poster} alt="" />
      ) : null}
      {scene.kind === 'sources' ? (
        <div className="clip-project-originals">
          <strong>
            {strings['video.watch']}
            <br />
            {strings['video.originals']}
          </strong>
          {scene.sources.length ? (
            <ul>
              {scene.sources.map((source) => (
                <li key={source.url}>
                  <a href={source.url} target="_blank" rel="noreferrer">
                    {source.outlet || source.title}
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <small>{strings['video.localFiles']}</small>
          )}
        </div>
      ) : (
        <>
          {scene.kind === 'title' || scene.kind === 'clip' ? (
            <div className="clip-project-headline">
              <small>{scene.clip.outlet}</small>
              <strong>{scene.clip.title}</strong>
            </div>
          ) : null}
          {hasVideo ? (
            <video
              key={scene.id}
              ref={player}
              src={selected!.url}
              poster={poster}
              muted={scene.kind === 'reaction'}
              playsInline
              loop={scene.kind === 'reaction'}
              preload="auto"
            />
          ) : poster && scene.kind !== 'excerpt' ? (
            <img className="clip-project-photo" src={poster} alt="" />
          ) : null}
          {scene.kind === 'excerpt' ||
          (!poster &&
            !hasVideo &&
            scene.kind !== 'clip' &&
            scene.kind !== 'title') ? (
            <div className="clip-project-quote">
              {scene.clip.text || scene.clip.title}
            </div>
          ) : null}
          {cue ? (
            <span className="clip-project-caption" dir="auto">
              {cue.text}
            </span>
          ) : null}
        </>
      )}
    </div>
  );
}

export function VideoProjectEditor({
  collection,
  change,
  close,
  onCard,
  onGrid,
  permit,
  beforePreview,
  view = 'popup',
}: {
  collection: DraftCollection;
  change: (next: DraftCollection) => void;
  close: () => void;
  onCard: (clip?: DraftClip) => void;
  onGrid: () => void;
  permit?: GifPermission;
  beforePreview?: ReactNode;
  view?: 'popup' | 'workspace';
}) {
  const scenes = useMemo(() => buildVideoScenes(collection), [collection]);
  const length = videoLength(scenes);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [auto, setAuto] = useState(false);
  const [library, setLibrary] = useState<'add' | 'reaction'>();
  const [suggestions, setSuggestions] = useState<LibraryItem[]>([]);
  const [status, setStatus] = useState('');
  const [progress, setProgress] = useState<number>();
  const [output, setOutput] = useState<File>();
  const task = useRef<AbortController | null>(null);
  const drag = useRef<string | null>(null);
  const options = collection.draft.videoOptions;
  const format = options?.format ?? '9:16';
  const current =
    scenes.find((scene) => time < scene.at + scene.seconds - 0.0001) ??
    scenes.at(-1);
  const selected =
    current && current.kind !== 'title' && 'clip' in current
      ? current.clip
      : undefined;
  const firstClip = collection.clips.find(
    (clip) => clip.kind === 'video' && !clip.reaction,
  );
  const showReaction =
    !options?.reactionSkipped &&
    !collection.clips.some((clip) => clip.reaction || clip.kind === 'gif');
  const playingRef = useRef(time);
  playingRef.current = time;

  useEffect(() => {
    if (!playing) return;
    const start = performance.now() - playingRef.current * 1000;
    let pending = 0;
    function tick(now: number) {
      const elapsed = Math.min(length, (now - start) / 1000);
      setTime(elapsed);
      if (elapsed < length) pending = requestAnimationFrame(tick);
      else setPlaying(false);
    }
    pending = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(pending);
  }, [playing, length]);

  useEffect(() => {
    let live = true;
    const words = new Set(
      collection.draft.title.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [],
    );
    void listLibrary()
      .then((items) => {
        if (!live) return;
        const score = (item: LibraryItem) =>
          item.tags.reduce(
            (total, tag) => total + Number(words.has(tag.toLocaleLowerCase())),
            Number(item.favorite),
          );
        setSuggestions(
          items
            .filter((item) => item.kind === 'gif')
            .sort((a, b) => score(b) - score(a))
            .slice(0, 3),
        );
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [collection.draft.title, library]);

  useEffect(() => () => task.current?.abort(), []);
  useEffect(() => {
    setOutput(undefined);
  }, [collection]);

  const fail = () => setStatus(strings['card.savedFailed']);
  async function update(work: Promise<DraftCollection | undefined>) {
    try {
      const group = await work;
      if (group) change(group);
    } catch {
      fail();
    }
  }

  const setOptions = (patch: VideoOptions) =>
    update(
      updateDraftCollection(collection.draft.id, {
        videoOptions: { ...options, ...patch },
      }),
    );

  function play() {
    if (!playing && time >= length) setTime(0);
    setPlaying(!playing);
  }

  async function compose() {
    if (task.current) return;
    const controller = new AbortController();
    task.current = controller;
    setPlaying(false);
    setStatus('');
    setProgress(0);
    try {
      const { exportVideoProject } = await import('../video-project-export.ts');
      const blob = await exportVideoProject(
        collection,
        controller.signal,
        setProgress,
      );
      controller.signal.throwIfAborted();
      const name = fileName(collection.draft.title).replace(
        /\.png$/,
        blob.type === 'video/mp4' ? '.mp4' : '.webm',
      );
      const file = new File([blob], name, { type: blob.type });
      setOutput(file);
      const url = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 3000);
    } catch {
      if (!controller.signal.aborted) setStatus(strings['video.exportFailed']);
    } finally {
      task.current = null;
      if (!controller.signal.aborted) setProgress(undefined);
    }
  }

  async function share() {
    if (!output) return;
    const data = { files: [output], title: collection.draft.title };
    if (navigator.canShare?.(data)) {
      try {
        await navigator.share(data);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError'))
          fail();
      }
    }
  }

  const keep = () => {
    void saveCollectionForLater(collection.draft.id, collection.draft.title)
      .then(close)
      .catch(fail);
  };

  const react = (item: LibraryItem) => {
    void update(
      addLibraryItem(item, {
        draftId: collection.draft.id,
        after: firstClip?.id,
        reaction: true,
      }),
    );
  };

  if (library)
    return (
      <LibraryPanel
        allowGifs={FLAGS.gifs}
        draftId={collection.draft.id}
        reaction={library === 'reaction'}
        after={library === 'reaction' ? firstClip?.id : undefined}
        permit={permit}
        close={() => setLibrary(undefined)}
        change={(group) => {
          change(group);
          setLibrary(undefined);
        }}
      />
    );
  if (!current) return null;
  const move = (from: string, to: string) =>
    update(moveDraftClip(collection.draft.id, from, to));
  const clips = collection.clips;
  const [width, height] = visualFormats[format];
  const exporting = progress !== undefined;
  const timeline = (
    <div
      className="clip-project-timeline"
      aria-label={strings['video.timeline']}
    >
      <div className="clip-project-clock">
        <button
          type="button"
          className="clip-icon-button"
          onClick={play}
          aria-label={strings[playing ? 'video.pause' : 'video.play']}
          title={strings[playing ? 'video.pause' : 'video.play']}
        >
          <Icon name={playing ? 'pause' : 'video'} size={16} />
        </button>
        <span>
          {videoClock(time)} / {videoClock(length)}
        </span>
        <input
          type="range"
          min={0}
          max={length}
          step={0.033}
          value={Math.min(time, length)}
          aria-label={strings['video.playhead']}
          onChange={(e) => {
            setPlaying(false);
            setTime(Number(e.currentTarget.value));
          }}
        />
      </div>
      <div className="clip-project-scenes">
        {scenes.map((scene) => {
          const editable = scene.kind !== 'title' && 'clip' in scene;
          const poster = 'clip' in scene && scene.clip.video?.poster;
          return (
            <button
              type="button"
              key={scene.id}
              aria-pressed={scene.id === current.id}
              title={sceneName(scene)}
              style={{ '--clip-duration': scene.seconds } as CSSProperties}
              onClick={() => {
                setPlaying(false);
                setTime(scene.at);
              }}
              draggable={editable}
              onDragStart={() => {
                drag.current = editable ? scene.id : null;
              }}
              onDragOver={(event) => {
                if (editable && drag.current) event.preventDefault();
              }}
              onDrop={(event) => {
                event.preventDefault();
                if (editable && drag.current && scene.id !== drag.current)
                  void move(drag.current, scene.id);
                drag.current = null;
              }}
            >
              {poster ? <img src={poster} alt="" /> : null}
              <span>{sceneName(scene)}</span>
              <small>{videoClock(scene.seconds)}</small>
            </button>
          );
        })}
        <button
          className="clip-project-add"
          type="button"
          title={strings['video.addScene']}
          aria-label={strings['video.addScene']}
          onClick={() => setLibrary('add')}
        >
          <Icon name="add" size={16} />
        </button>
      </div>
    </div>
  );

  return (
    <section
      className={'clip-project clip-project-' + view}
      aria-label={strings['mode.video']}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === ' ') {
          event.preventDefault();
          play();
        }
        if (event.key === 'Delete' && selected)
          void update(removeDraftClip(collection.draft.id, selected.id));
      }}
      tabIndex={0}
    >
      <div className="clip-project-main">
        {beforePreview}
        <div className="clip-project-preview">
          <div
            className="clip-project-frame"
            style={{ aspectRatio: width + ' / ' + height }}
          >
            <ScenePreview
              key={current.id}
              scene={current}
              time={time}
              playing={playing}
            />
          </div>
          <button
            className="clip-grid-close"
            type="button"
            onClick={close}
            aria-label={strings['action.close']}
            title={strings['action.close']}
          >
            <Icon name="close" size={16} />
          </button>
        </div>
        {timeline}
      </div>
      <aside className="clip-project-inspector">
        <div className="clip-project-toolbar">
          <button
            className="clip-icon-button"
            type="button"
            onClick={() => onCard(selected)}
            aria-label={strings['mode.card']}
            title={strings['mode.card']}
          >
            <Icon name="card" size={16} />
          </button>
          <button
            className="clip-icon-button"
            type="button"
            onClick={onGrid}
            aria-label={strings['mode.grid']}
            title={strings['mode.grid']}
          >
            <Icon name="grid" size={16} />
          </button>
          <span
            className="clip-project-mode"
            aria-label={strings['mode.video']}
          >
            <Icon name="video" size={16} />
          </span>
          <button
            className="clip-button clip-project-auto"
            type="button"
            aria-expanded={auto}
            onClick={() => setAuto(!auto)}
          >
            {strings['card.auto']} · {format}
            {options?.captions !== false &&
            clips.some((clip) => clip.video?.cues.length)
              ? ' · ' + strings['video.captions']
              : ''}
          </button>
        </div>
        {auto ? (
          <section
            className="clip-project-tools"
            aria-label={strings['card.auto']}
          >
            <label>
              {strings['card.format']}
              <select
                value={format}
                onChange={(event) =>
                  void setOptions({
                    format: event.currentTarget.value as VideoFormat,
                  })
                }
              >
                {Object.keys(visualFormats).map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <label>
              {strings['video.captions']}
              <input
                type="checkbox"
                checked={options?.captions !== false}
                onChange={(event) =>
                  void setOptions({ captions: event.currentTarget.checked })
                }
              />
            </label>
            {current.kind === 'clip' && selected?.video ? (
              <>
                <div className="clip-project-trim">
                  {(['start', 'end'] as const).map((edge) => (
                    <label key={edge}>
                      {strings[edge === 'start' ? 'video.start' : 'video.end']}
                      <input
                        key={selected.id + edge + current.range[edge]}
                        type="number"
                        min={0}
                        max={selected.video!.end - selected.video!.start}
                        step={0.1}
                        defaultValue={Number(current.range[edge].toFixed(2))}
                        onBlur={(event) => {
                          const value = event.currentTarget.valueAsNumber;
                          if (
                            Number.isFinite(value) &&
                            value !== current.range[edge]
                          )
                            void update(
                              updateVideoClip(
                                collection.draft.id,
                                selected.id,
                                { trim: { ...current.range, [edge]: value } },
                              ),
                            );
                        }}
                      />
                    </label>
                  ))}
                </div>
                <label>
                  {strings['video.scene']}
                  <select
                    value={selected.fit ?? 'contain'}
                    onChange={(event) =>
                      void update(
                        updateVideoClip(collection.draft.id, selected.id, {
                          fit: event.currentTarget.value as DraftClip['fit'],
                        }),
                      )
                    }
                  >
                    <option value="contain">{strings['video.fit']}</option>
                    <option value="cover">{strings['video.fill']}</option>
                  </select>
                </label>
                {selected.video.cues.map((cue, index) => (
                  <label key={selected.id + ':' + index}>
                    {videoClock(cue.start + selected.video!.start)}
                    <input
                      key={cue.text}
                      defaultValue={cue.text}
                      maxLength={600}
                      aria-label={strings['video.cue'].replace(
                        '{time}',
                        videoClock(cue.start + selected.video!.start),
                      )}
                      onBlur={(event) => {
                        const text = event.currentTarget.value.trim();
                        if (text !== cue.text)
                          void update(
                            updateVideoClip(collection.draft.id, selected.id, {
                              cues: selected.video!.cues.map((old, at) =>
                                at === index ? { ...old, text } : old,
                              ),
                            }),
                          );
                      }}
                    />
                  </label>
                ))}
              </>
            ) : null}
            {selected ? (
              <div className="clip-project-toolbar">
                {[
                  { delta: -1, icon: 'arrowLeft', copy: 'grid.moveEarlier' },
                  { delta: 1, icon: 'arrowRight', copy: 'grid.moveLater' },
                ].map(({ delta, icon, copy }) => {
                  const next =
                    clips[
                      clips.findIndex((clip) => clip.id === selected.id) + delta
                    ];
                  return (
                    <button
                      key={copy}
                      type="button"
                      className="clip-icon-button"
                      disabled={!next}
                      title={
                        strings[copy as 'grid.moveEarlier' | 'grid.moveLater']
                      }
                      aria-label={
                        strings[copy as 'grid.moveEarlier' | 'grid.moveLater']
                      }
                      onClick={() => next && void move(selected.id, next.id)}
                    >
                      <Icon
                        name={icon as 'arrowLeft' | 'arrowRight'}
                        size={16}
                      />
                    </button>
                  );
                })}
                <button
                  type="button"
                  className="clip-icon-button"
                  title={strings['grid.removeClip']}
                  aria-label={strings['grid.removeClip']}
                  onClick={() =>
                    void update(
                      removeDraftClip(collection.draft.id, selected.id),
                    )
                  }
                >
                  <Icon name="close" size={16} />
                </button>
                {selected.mediaType ? (
                  <button
                    type="button"
                    className="clip-icon-button"
                    title={strings['library.save']}
                    aria-label={strings['library.save']}
                    onClick={() =>
                      void saveClipToLibrary(selected)
                        .then(() => setStatus(strings['card.saved']))
                        .catch(fail)
                    }
                  >
                    <Icon name="bookmark" size={16} />
                  </button>
                ) : null}
              </div>
            ) : null}
          </section>
        ) : null}
        {showReaction ? (
          <div className="clip-project-reaction">
            <strong>{strings['video.reactionAsk']}</strong>
            {suggestions.map((item) => (
              <button
                key={item.id}
                className="clip-project-suggestion"
                type="button"
                title={libraryTitle(item)}
                aria-label={libraryTitle(item) || strings['video.reaction']}
                onClick={() => react(item)}
              >
                <LibraryMedia item={item} />
              </button>
            ))}
            <button
              type="button"
              className="clip-icon-button"
              title={strings['library.tab']}
              aria-label={strings['library.tab']}
              onClick={() => setLibrary('reaction')}
            >
              <Icon name="add" size={16} />
            </button>
            <button
              className="clip-inline-button"
              type="button"
              onClick={() => void setOptions({ reactionSkipped: true })}
            >
              {strings['video.skipReaction']}
            </button>
          </div>
        ) : null}
        <div className="clip-project-toolbar clip-project-export">
          <button
            type="button"
            className="clip-button clip-primary"
            disabled={exporting}
            onClick={() => void compose()}
          >
            <Icon name="video" size={16} />
            {exporting
              ? strings['video.exportProgress'].replace(
                  '{percent}',
                  String(Math.round(progress * 100)),
                )
              : strings['video.exportProject'].replace(
                  '{time}',
                  videoClock(length),
                )}
          </button>
          <button
            type="button"
            className="clip-icon-button"
            title={strings['action.save']}
            aria-label={strings['action.save']}
            onClick={keep}
          >
            <Icon name="bookmark" size={16} />
          </button>
          {output && navigator.canShare?.({ files: [output] }) ? (
            <button
              type="button"
              className="clip-icon-button"
              title={strings['action.share']}
              aria-label={strings['action.share']}
              onClick={() => void share()}
            >
              <Icon name="share" size={16} />
            </button>
          ) : null}
        </div>
        {status ? <p role="status">{status}</p> : null}
      </aside>
    </section>
  );
}
