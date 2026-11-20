import { maxClipSeconds } from '@clipcard/core';
import type { VideoRange } from '@clipcard/core';
import {
  beginClipEncoding,
  maxRecordedBytes,
} from '@clipcard/ui/video-encoding';

export type RecordingError =
  'unsupported' | 'tab' | 'protected' | 'length' | 'capture';

export class VideoRecordingError extends Error {
  constructor(readonly reason: RecordingError) {
    super(reason);
  }
}

interface CropTargetFactory {
  fromElement(element: Element): Promise<object>;
}

type CroppableTrack = MediaStreamTrack & {
  cropTo?: (target: object) => Promise<void>;
};

const encrypted = new WeakSet<HTMLVideoElement>();
export function watchProtectedPlayers() {
  document.addEventListener(
    'encrypted',
    (event) => {
      if (event.target instanceof HTMLVideoElement) encrypted.add(event.target);
    },
    true,
  );
}

export const protectedPlayer = (video: HTMLVideoElement) =>
  Boolean(video.mediaKeys) || encrypted.has(video);

function frameReady(video: HTMLVideoElement, signal: AbortSignal) {
  if (!video.seeking && video.readyState >= 2) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    function cleanup() {
      video.removeEventListener('seeked', ready);
      video.removeEventListener('loadeddata', ready);
      signal.removeEventListener('abort', abort);
    }
    function ready() {
      if (video.seeking || video.readyState < 2) return;
      cleanup();
      resolve();
    }
    function abort() {
      cleanup();
      reject(signal.reason);
    }
    signal.addEventListener('abort', abort, { once: true });
    video.addEventListener('seeked', ready);
    video.addEventListener('loadeddata', ready);
    if (signal.aborted) abort();
  });
}

export async function seekVideo(video: HTMLVideoElement, time: number) {
  video.currentTime = time;
  await frameReady(video, AbortSignal.timeout(5000));
}

function hidePlayerControls(video: HTMLVideoElement) {
  const controls = video.controls;
  video.controls = false;
  const player = video.closest('#movie_player');
  const restore: Array<() => void> = [];
  for (const element of player?.querySelectorAll<HTMLElement>(
    '.ytp-chrome-bottom, .ytp-chrome-top, .ytp-gradient-bottom, .ytp-gradient-top, .ytp-caption-window-container, .ytp-pause-overlay',
  ) ?? []) {
    const value = element.style.getPropertyValue('visibility');
    const priority = element.style.getPropertyPriority('visibility');
    element.style.setProperty('visibility', 'hidden', 'important');
    restore.push(() =>
      element.style.setProperty('visibility', value, priority),
    );
  }
  return () => {
    video.controls = controls;
    restore.forEach((run) => run());
  };
}

async function capturePoster(track: MediaStreamTrack) {
  const preview = document.createElement('video');
  preview.muted = true;
  preview.playsInline = true;
  preview.srcObject = new MediaStream([track]);
  try {
    await preview.play();
    await frameReady(preview, AbortSignal.timeout(2500));
    const canvas = document.createElement('canvas');
    const width = Math.min(preview.videoWidth, 640);
    canvas.width = width;
    canvas.height = Math.round(
      (width * preview.videoHeight) / preview.videoWidth,
    );
    const context = canvas.getContext('2d');
    if (!context || !canvas.width || !canvas.height) return undefined;
    context.drawImage(preview, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.82);
  } finally {
    preview.pause();
    preview.srcObject = null;
  }
}

function playbackEnd(
  video: HTMLVideoElement,
  track: MediaStreamTrack,
  range: VideoRange,
  stop: AbortSignal,
  progress: (elapsed: number) => void,
) {
  const timeout = Math.min(maxClipSeconds, range.end - range.start + 3) * 1000;
  return new Promise<number>((resolve, reject) => {
    const finish = () => {
      clearInterval(timer);
      clearTimeout(limit);
      stop.removeEventListener('abort', finish);
      track.removeEventListener('ended', finish);
      video.removeEventListener('ended', finish);
      if (protectedPlayer(video)) reject(new VideoRecordingError('protected'));
      else if (!video.isConnected) reject(new VideoRecordingError('capture'));
      else resolve(Math.min(range.end, video.currentTime));
    };
    const tick = () => {
      progress(Math.max(0, video.currentTime - range.start));
      if (video.currentTime >= range.end - 0.025 || protectedPlayer(video))
        finish();
    };
    const timer = setInterval(tick, 40);
    const limit = setTimeout(finish, timeout);
    stop.addEventListener('abort', finish, { once: true });
    track.addEventListener('ended', finish, { once: true });
    video.addEventListener('ended', finish, { once: true });
    if (stop.aborted || track.readyState === 'ended') finish();
  });
}

export async function recordPlayerRange(
  video: HTMLVideoElement,
  range: VideoRange,
  stop: AbortSignal,
  progress: (elapsed: number) => void,
) {
  if (protectedPlayer(video)) throw new VideoRecordingError('protected');
  if (
    !Number.isFinite(range.start) ||
    !Number.isFinite(range.end) ||
    range.start < 0 ||
    range.end <= range.start ||
    range.end - range.start > maxClipSeconds
  )
    throw new VideoRecordingError('length');
  const devices = navigator.mediaDevices;
  const crop = (
    globalThis as typeof globalThis & { CropTarget?: CropTargetFactory }
  ).CropTarget;
  if (!devices?.getDisplayMedia || !crop)
    throw new VideoRecordingError('unsupported');

  // The chooser must open from the Add clip click. A CropTarget proves the
  // user chose this tab before any frames are encoded or saved.
  const stream = await devices.getDisplayMedia({
    video: { displaySurface: 'browser', frameRate: { ideal: 30, max: 30 } },
    audio: true,
    preferCurrentTab: true,
    surfaceSwitching: 'exclude',
    monitorTypeSurfaces: 'exclude',
    systemAudio: 'exclude',
  } as DisplayMediaStreamOptions);
  const priorTime = video.currentTime;
  const priorRate = video.playbackRate;
  const wasPlaying = !video.paused;
  let restoreControls: (() => void) | undefined;
  let encoder: Awaited<ReturnType<typeof beginClipEncoding>> | undefined;
  let changedPlayer = false;
  const cleanup = new AbortController();
  try {
    const track = stream.getVideoTracks()[0] as CroppableTrack | undefined;
    if (!track?.cropTo) throw new VideoRecordingError('tab');
    try {
      await track.cropTo(await crop.fromElement(video));
    } catch {
      throw new VideoRecordingError('tab');
    }
    if (stop.aborted || !video.isConnected)
      throw new VideoRecordingError('capture');
    if (protectedPlayer(video)) throw new VideoRecordingError('protected');
    changedPlayer = true;
    restoreControls = hidePlayerControls(video);
    video.pause();
    video.playbackRate = 1;
    await seekVideo(video, range.start);
    const poster = await capturePoster(track).catch(() => undefined);
    if (stop.aborted) throw new VideoRecordingError('capture');
    encoder = await beginClipEncoding(stream);
    await video.play();
    const end = await Promise.race([
      playbackEnd(
        video,
        track,
        range,
        AbortSignal.any([stop, cleanup.signal]),
        progress,
      ),
      encoder.failure.then(() => {
        throw new VideoRecordingError('capture');
      }),
    ]);
    video.pause();
    if (end - range.start < 0.2) throw new VideoRecordingError('length');
    const blob = await encoder.finish();
    encoder = undefined;
    if (blob.size > maxRecordedBytes) throw new VideoRecordingError('length');
    return { blob, end, poster };
  } finally {
    cleanup.abort();
    await encoder?.abort().catch(() => undefined);
    stream.getTracks().forEach((track) => track.stop());
    restoreControls?.();
    if (changedPlayer) {
      video.pause();
      video.playbackRate = priorRate;
      video.currentTime = priorTime;
      if (wasPlaying && video.isConnected)
        void video.play().catch(() => undefined);
    }
  }
}
