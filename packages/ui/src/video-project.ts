import { videoMomentUrl } from '@clipcard/core';
import type { CaptionCue, VideoRange } from '@clipcard/core';
import type {
  DraftClip,
  DraftCollection,
  VideoOptions,
} from './collection-types.ts';

export type VideoFormat = NonNullable<VideoOptions['format']>;
export const visualFormats = {
  '9:16': [1080, 1920],
  '4:5': [1080, 1350],
  '16:9': [1920, 1080],
} as const satisfies Record<VideoFormat, readonly [number, number]>;

export interface VideoSource {
  url: string;
  title: string;
  outlet?: string;
  range?: VideoRange;
  date?: string;
  language?: string;
}

type SceneBody =
  | { kind: 'title'; clip: DraftClip; id: 'title' }
  | {
      kind: 'clip';
      clip: DraftClip;
      range: VideoRange;
      cues: CaptionCue[];
      url: string | null;
      id: string;
    }
  | { kind: 'image' | 'excerpt' | 'reaction'; clip: DraftClip; id: string }
  | { kind: 'sources'; sources: VideoSource[]; id: string };

export type VideoScene = SceneBody & { seconds: number; at: number };
type PendingScene = SceneBody & { seconds: number };

export function clipTrim(clip: DraftClip): VideoRange {
  const duration = clip.video ? clip.video.end - clip.video.start : 0;
  const start = Math.min(
    Math.max(0, clip.trim?.start ?? 0),
    Math.max(0, duration - 0.2),
  );
  return {
    start,
    end: Math.max(start + 0.19, Math.min(duration, clip.trim?.end ?? duration)),
  };
}

function makeScene(clip: DraftClip, captions: boolean): PendingScene {
  const { id } = clip;
  if (clip.kind === 'video' && clip.video && !clip.reaction) {
    const range = clipTrim(clip);
    const cues = captions
      ? clip.video.cues.flatMap(({ start, end, text }) => {
          const from = Math.max(start, range.start);
          const to = Math.min(end, range.end);
          return to > from
            ? [{ text, start: from - range.start, end: to - range.start }]
            : [];
        })
      : [];
    const url = clip.video.source
      ? videoMomentUrl(clip.video.source, clip.video.start + range.start)
      : clip.sourceUrl;
    return {
      id,
      kind: 'clip',
      clip,
      range,
      cues,
      url,
      seconds: range.end - range.start,
    };
  }
  if (clip.kind === 'gif' || clip.reaction)
    return { id, kind: 'reaction', clip, seconds: 2 };
  if (
    clip.kind === 'image' ||
    clip.kind === 'section' ||
    clip.kind === 'library'
  )
    return { id, kind: 'image', clip, seconds: 3 };
  return {
    id,
    kind: 'excerpt',
    clip,
    seconds: Math.min(7, Math.max(3, (clip.text || clip.title).length / 14)),
  };
}

export function buildVideoScenes({
  draft,
  clips,
}: DraftCollection): VideoScene[] {
  const first = clips.find((clip) => !clip.reaction) ?? clips[0];
  if (!first) return [];
  const body = clips.map((clip) =>
    makeScene(clip, draft.videoOptions?.captions !== false),
  );
  const sources = new Map<string, VideoSource>();
  for (const scene of body) {
    if (!('clip' in scene)) continue;
    const clip = scene.clip;
    const url =
      scene.kind === 'clip' ? scene.url : (clip.textFragment ?? clip.sourceUrl);
    if (!url || sources.has(url)) continue;
    const range =
      scene.kind === 'clip' && clip.video
        ? {
            start: clip.video.start + scene.range.start,
            end: clip.video.start + scene.range.end,
          }
        : undefined;
    sources.set(url, {
      url,
      title: clip.title,
      outlet: clip.outlet,
      range,
      date: clip.publishedAt,
      language: clip.lang,
    });
  }
  const originals = [...sources.values()];
  const scenes: PendingScene[] = [
    { id: 'title', kind: 'title', clip: first, seconds: 2.5 },
    ...body,
  ];
  for (let index = 0; index < Math.max(1, originals.length); index += 4) {
    const page = originals.slice(index, index + 4);
    scenes.push({
      id: 'sources:' + index,
      kind: 'sources',
      sources: page,
      seconds: 4 + Math.max(0, page.length - 2),
    });
  }
  let at = 0;
  return scenes.map((scene) => {
    const seconds = Math.ceil(scene.seconds * 30) / 30;
    const result = { ...scene, at, seconds };
    at += seconds;
    return result;
  });
}

export function videoLength(scenes: readonly VideoScene[]) {
  const tail = scenes.at(-1);
  return tail ? tail.at + tail.seconds : 0;
}
