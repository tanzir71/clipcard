import { cleanUrl, parseWebUrl } from './url.ts';

export const maxClipSeconds = 60;
export const maxSourceSeconds = 180;

export interface VideoRange {
  start: number;
  end: number;
}

export interface CaptionCue extends VideoRange {
  text: string;
}

function youtubeId(url: URL) {
  const host = url.hostname.replace(/^(?:www\.|m\.)/, '');
  const route = url.pathname.split('/').filter(Boolean);
  const id =
    host === 'youtu.be'
      ? route[0]
      : host === 'youtube.com'
        ? route[0] === 'watch'
          ? url.searchParams.get('v')
          : ['shorts', 'live', 'embed'].includes(route[0] ?? '')
            ? route[1]
            : null
        : null;
  return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
}

export function videoSourceUrl(address: string): string | null {
  const url = parseWebUrl(address);
  if (!url) return null;
  const id = youtubeId(url);
  if (id) return 'https://youtu.be/' + id;
  url.hash = '';
  return cleanUrl(url.href).url;
}

export function videoMomentUrl(
  address: string,
  seconds: number,
): string | null {
  const source = videoSourceUrl(address);
  if (!source || !Number.isFinite(seconds) || seconds < 0) return null;
  const url = new URL(source);
  const position = String(Math.floor(seconds));
  if (url.hostname === 'youtu.be') url.searchParams.set('t', position);
  else url.hash = 't=' + position;
  return url.href;
}

export function timestampedVideoUrl(address: string): string | null {
  const url = parseWebUrl(address);
  if (!url) return null;
  const seconds = youtubeId(url)
    ? url.searchParams.get('t')
    : /^#t=(\d+)$/.exec(url.hash)?.[1];
  return seconds && /^\d+$/.test(seconds)
    ? videoMomentUrl(url.href, Number(seconds))
    : null;
}

const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));

function closestBoundary(
  value: number,
  boundary: keyof VideoRange,
  cues: readonly CaptionCue[],
) {
  let closest = value;
  let distance = 2;
  for (const cue of cues) {
    const candidate = cue[boundary];
    const gap = Math.abs(candidate - value);
    if (gap < distance) {
      closest = candidate;
      distance = gap;
    }
  }
  return closest;
}

export function initialVideoRange(
  currentTime: number,
  duration: number,
  cues: readonly CaptionCue[] = [],
): VideoRange | null {
  if (!Number.isFinite(duration) || duration <= 0) return null;
  const playable = Math.min(duration, 20);
  const center = Number.isFinite(currentTime) ? currentTime : 0;
  const start = clamp(center - playable / 2, 0, duration - playable);
  const end = start + playable;
  const minimum = Math.min(1, duration);
  const snappedStart = clamp(
    closestBoundary(start, 'start', cues),
    0,
    end - minimum,
  );
  return {
    start: snappedStart,
    end: clamp(
      closestBoundary(end, 'end', cues),
      snappedStart + minimum,
      duration,
    ),
  };
}

export function moveVideoHandle(
  range: VideoRange,
  edge: keyof VideoRange,
  value: number,
  duration: number,
  cues: readonly CaptionCue[] = [],
): VideoRange {
  if (!Number.isFinite(value)) return range;
  const minimum = Math.min(1, duration);
  const snapped = closestBoundary(value, edge, cues);
  return edge === 'start'
    ? {
        ...range,
        start: clamp(
          snapped,
          Math.max(0, range.end - maxClipSeconds),
          range.end - minimum,
        ),
      }
    : {
        ...range,
        end: clamp(
          snapped,
          range.start + minimum,
          Math.min(duration, range.start + maxClipSeconds),
        ),
      };
}

export function clipCaptionCues(
  cues: readonly CaptionCue[],
  range: VideoRange,
): CaptionCue[] {
  return cues
    .flatMap((cue) => {
      const start = Math.max(cue.start, range.start);
      const end = Math.min(cue.end, range.end);
      const text = cue.text
        .replace(/<[^>]*>/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 600);
      if (
        !text ||
        !Number.isFinite(start) ||
        !Number.isFinite(end) ||
        end <= start
      )
        return [];
      return [{ text, start: start - range.start, end: end - range.start }];
    })
    .slice(0, 300);
}

export function videoClock(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor(total / 60) % 60;
  const second = (total % 60).toString().padStart(2, '0');
  return (
    (hours ? hours + ':' : '') +
    minutes.toString().padStart(2, '0') +
    ':' +
    second
  );
}
