import { useEffect, useRef, useState } from 'react';
import { videoClock } from '@clipcard/core';
import { interfaceStrings as strings } from '@clipcard/i18n';
import { fileName } from '../actions.ts';
import { readClipMedia, saveCollectionForLater } from '../collections.ts';
import type { DraftClip, DraftCollection } from '../collection-types.ts';
import { Icon } from './Icon.tsx';
import './video-editor.css';

export function VideoEditor({
  collection,
  close,
  onCard,
  onGrid,
}: {
  collection: DraftCollection;
  close: () => void;
  onCard: (clip: DraftClip) => void;
  onGrid: () => void;
}) {
  const options = collection.clips.filter(
    (clip) => clip.kind === 'video' && clip.video,
  );
  const [selected, select] = useState(options.at(-1)?.id);
  const clip = options.find(({ id }) => id === selected) ?? options.at(-1);
  const [preview, setPreview] = useState<{
    url: string;
    blob: Blob;
    id: string;
  }>();
  const [status, setStatus] = useState('');
  const [working, setWorking] = useState(false);
  const task = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!clip) return;
    let active = true;
    let url: string | undefined;
    void readClipMedia(clip)
      .then((blob) => {
        if (!active) return;
        if (!blob) throw new Error('missing-video');
        url = URL.createObjectURL(blob);
        setPreview({ id: clip.id, url, blob });
      })
      .catch(() => {
        if (active) setStatus(strings['video.captureFailed']);
      });
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [clip]);

  useEffect(() => () => task.current?.abort(), []);

  async function exportVideo() {
    if (!clip || !preview || preview.id !== clip.id || task.current) return;
    const controller = new AbortController();
    task.current = controller;
    setWorking(true);
    setStatus(strings['video.rendering']);
    try {
      const { exportClip } = await import('../video-export.ts');
      const blob = await exportClip(clip, preview.blob, controller.signal);
      controller.signal.throwIfAborted();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName(clip.title).replace(
        /\.png$/,
        blob.type === 'video/mp4' ? '.mp4' : '.webm',
      );
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 3000);
      setStatus('');
    } catch {
      if (!controller.signal.aborted) setStatus(strings['video.exportFailed']);
    } finally {
      task.current = null;
      if (!controller.signal.aborted) setWorking(false);
    }
  }

  async function keep() {
    try {
      await saveCollectionForLater(collection.draft.id, collection.draft.title);
      close();
    } catch {
      setStatus(strings['card.savedFailed']);
    }
  }

  if (!clip?.video) return null;
  const { cues, poster, start, end } = clip.video;
  return (
    <section className="clip-video-editor" aria-label={strings['video.title']}>
      <div className="clip-video-preview">
        {preview?.id === clip.id ? (
          <video
            key={clip.id}
            src={preview.url}
            poster={poster}
            controls
            playsInline
            preload="metadata"
            aria-label={clip.title}
            ref={(node) => {
              if (!node || !cues.length || node.textTracks.length) return;
              const track = node.addTextTrack(
                'captions',
                strings['video.captions'],
                clip.lang,
              );
              track.mode = 'showing';
              for (const cue of cues)
                track.addCue(new VTTCue(cue.start, cue.end, cue.text));
            }}
          />
        ) : poster ? (
          <img src={poster} alt="" />
        ) : null}
        <button
          type="button"
          className="clip-grid-close"
          title={strings['action.close']}
          aria-label={strings['action.close']}
          onClick={close}
        >
          <Icon name="close" size={16} />
        </button>
      </div>
      <div className="clip-video-actions">
        <span className="clip-video-time">
          {videoClock(start)} – {videoClock(end)}
        </span>
        {options.length > 1 ? (
          <select
            value={clip.id}
            disabled={working}
            aria-label={strings['video.select']}
            onChange={(event) => {
              select(event.currentTarget.value);
              setStatus('');
            }}
          >
            {options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.title} · {videoClock(option.video!.start)}
              </option>
            ))}
          </select>
        ) : null}
        <div className="clip-grid-actions">
          <button
            type="button"
            className="clip-button"
            title={strings['mode.card']}
            aria-label={strings['mode.card']}
            onClick={() => onCard(clip)}
          >
            <Icon name="card" size={16} />
          </button>
          <button
            type="button"
            className="clip-button"
            title={strings['mode.grid']}
            aria-label={strings['mode.grid']}
            onClick={onGrid}
          >
            <Icon name="grid" size={16} />
          </button>
          <button
            type="button"
            className="clip-button"
            title={strings['action.save']}
            aria-label={strings['action.save']}
            onClick={() => void keep()}
          >
            <Icon name="bookmark" size={16} />
          </button>
          <button
            type="button"
            className="clip-button clip-primary"
            disabled={working || preview?.id !== clip.id}
            onClick={() => void exportVideo()}
          >
            {strings['video.export']}
          </button>
        </div>
        {status ? <p role="status">{status}</p> : null}
      </div>
    </section>
  );
}
