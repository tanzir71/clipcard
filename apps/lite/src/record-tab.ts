import { maxClipSeconds } from '@clipcard/core';
import {
  beginClipEncoding,
  maxRecordedBytes,
} from '@clipcard/ui/video-encoding';

export class TabRecordingError extends Error {
  constructor(readonly reason: 'surface' | 'empty') {
    super(reason);
  }
}

export function canRecordTab() {
  return typeof navigator.mediaDevices?.getDisplayMedia === 'function';
}

function samples(video: HTMLVideoElement) {
  const sample = document.createElement('canvas');
  sample.width = sample.height = 12;
  const reader = sample.getContext('2d', { willReadFrequently: true });
  return () => {
    if (!reader || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA)
      return false;
    reader.drawImage(video, 0, 0, 12, 12);
    const pixels = reader.getImageData(0, 0, 12, 12).data;
    return pixels.some((value, index) => index % 4 !== 3 && value > 12);
  };
}

export async function recordTab(
  signal: AbortSignal,
  progress: (elapsed: number) => void,
) {
  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: { displaySurface: 'browser', frameRate: { ideal: 30, max: 30 } },
    audio: true,
    monitorTypeSurfaces: 'exclude',
    surfaceSwitching: 'exclude',
    systemAudio: 'exclude',
    selfBrowserSurface: 'exclude',
  } as DisplayMediaStreamOptions);
  const preview = document.createElement('video');
  const [track] = stream.getVideoTracks();
  const cleanup = new AbortController();
  let encoder: Awaited<ReturnType<typeof beginClipEncoding>> | undefined;
  let timer: ReturnType<typeof setInterval> | undefined;
  let limit: ReturnType<typeof setTimeout> | undefined;
  try {
    if (track?.getSettings().displaySurface !== 'browser')
      throw new TabRecordingError('surface');
    signal.throwIfAborted();
    preview.muted = true;
    preview.playsInline = true;
    preview.srcObject = new MediaStream([track]);
    void preview.play().catch(() => undefined);
    const hasPicture = samples(preview);
    encoder = await beginClipEncoding(stream);
    const started = performance.now();
    const elapsed = () =>
      Math.min(maxClipSeconds, (performance.now() - started) / 1000);
    let visible = false;
    let poster: string | undefined;
    const sample = () => {
      if (visible || !hasPicture()) return;
      visible = true;
      const frame = document.createElement('canvas');
      frame.width = Math.min(420, preview.videoWidth);
      frame.height = Math.round(
        (frame.width * preview.videoHeight) / preview.videoWidth,
      );
      frame
        .getContext('2d')
        ?.drawImage(preview, 0, 0, frame.width, frame.height);
      poster = frame.toDataURL('image/jpeg', 0.8);
    };
    progress(0);
    await Promise.race([
      encoder.failure,
      new Promise<void>((resolve) => {
        const done = () => resolve();
        signal.addEventListener('abort', done, {
          once: true,
          signal: cleanup.signal,
        });
        track.addEventListener('ended', done, {
          once: true,
          signal: cleanup.signal,
        });
        timer = setInterval(() => {
          sample();
          progress(elapsed());
        }, 250);
        limit = setTimeout(done, maxClipSeconds * 1000);
        if (signal.aborted || track.readyState === 'ended') done();
      }),
    ]);
    sample();
    const duration = elapsed();
    if (!visible || duration < 0.15) throw new TabRecordingError('empty');
    const blob = await encoder.finish();
    encoder = undefined;
    if (blob.size > maxRecordedBytes) throw new RangeError('video-size');
    return { blob, duration, poster };
  } finally {
    clearInterval(timer);
    clearTimeout(limit);
    cleanup.abort();
    preview.pause();
    preview.srcObject = null;
    stream.getTracks().forEach((item) => item.stop());
    await encoder?.abort().catch(() => undefined);
  }
}
