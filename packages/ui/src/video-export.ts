import {
  ALL_FORMATS,
  AudioSampleSink,
  AudioSampleSource,
  BlobSource,
  BufferTarget,
  CanvasSink,
  CanvasSource,
  Input,
  Mp4OutputFormat,
  Output,
  WebMOutputFormat,
  canEncodeAudio,
  canEncodeVideo,
} from 'mediabunny';
import type { DraftClip } from './collection-types.ts';
import { clipScene, sceneHeight, sceneWidth } from './video-scene.ts';

const videoBitrate = 3_500_000;
const audioBitrate = 128_000;
const sourcesSeconds = 4;
const fps = 30;
const fadeFrames = 6;

export async function exportClip(
  clip: DraftClip,
  media: Blob,
  signal: AbortSignal,
) {
  if (!clip.video) throw new Error('missing-video-range');
  const canvas = document.createElement('canvas');
  canvas.width = sceneWidth;
  canvas.height = sceneHeight;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('missing-canvas');
  const input = new Input({
    formats: ALL_FORMATS,
    source: new BlobSource(media),
  });
  try {
    const [video, audio] = await Promise.all([
      input.getPrimaryVideoTrack(),
      input.getPrimaryAudioTrack(),
    ]);
    if (!video) throw new Error('missing-video-track');
    const first = await video.getFirstTimestamp();
    const end = await video.computeDuration();
    const duration = Math.min(clip.video.end - clip.video.start, end - first);
    if (duration <= 0) throw new Error('empty-video-track');
    const [sampleRate, numberOfChannels] = audio
      ? await Promise.all([audio.getSampleRate(), audio.getNumberOfChannels()])
      : [48_000, 2];
    const mp4 =
      (await canEncodeVideo('avc', {
        width: sceneWidth,
        height: sceneHeight,
        bitrate: videoBitrate,
      })) &&
      (!audio ||
        (await canEncodeAudio('aac', {
          sampleRate,
          numberOfChannels,
          bitrate: audioBitrate,
        })));
    const target = new BufferTarget();
    const output = new Output({
      format: mp4 ? new Mp4OutputFormat() : new WebMOutputFormat(),
      target,
    });
    const videoOut = new CanvasSource(canvas, {
      codec: mp4 ? 'avc' : 'vp8',
      bitrate: videoBitrate,
    });
    output.addVideoTrack(videoOut, { frameRate: fps });
    const audioOut = audio
      ? new AudioSampleSource({
          codec: mp4 ? 'aac' : 'opus',
          bitrate: audioBitrate,
        })
      : null;
    if (audioOut) output.addAudioTrack(audioOut);
    const scene = await clipScene(ctx, clip, clip.video);
    signal.throwIfAborted();
    await output.start();
    const frames = Math.max(1, Math.round(duration * fps));
    const playback = frames / fps;

    async function copyAudio() {
      if (!audio || !audioOut) return;
      for await (const sample of new AudioSampleSink(audio).samples()) {
        try {
          signal.throwIfAborted();
          const offset = sample.timestamp - first;
          if (offset >= playback) break;
          const start = Math.max(0, Math.ceil(-offset * sample.sampleRate));
          const end = Math.min(
            sample.numberOfFrames,
            Math.floor((playback - offset) * sample.sampleRate),
          );
          if (end <= start) continue;
          const frame = sample.trim(start, end);
          try {
            frame.setTimestamp(Math.max(0, frame.timestamp - first));
            await audioOut.add(frame);
          } finally {
            frame.close();
          }
        } finally {
          sample.close();
        }
      }
      audioOut.close();
    }

    async function composeVideo() {
      const timestamps = Array.from(
        { length: frames },
        (_, index) => first + index / fps,
      );
      const sink = new CanvasSink(video!, {
        width: sceneWidth,
        height: 608,
        fit: 'contain',
        poolSize: 2,
      });
      let index = 0;
      for await (const image of sink.canvasesAtTimestamps(timestamps)) {
        signal.throwIfAborted();
        const at = index / fps;
        if (image) scene.frame(image.canvas, at);
        const fadeStart = Math.max(0, frames - fadeFrames);
        if (index >= fadeStart)
          scene.sources((index - fadeStart + 1) / (frames - fadeStart));
        await videoOut.add(at, 1 / fps);
        index++;
      }
      scene.sources();
      for (let frame = 0; frame < fps * sourcesSeconds; frame++) {
        signal.throwIfAborted();
        await videoOut.add((frames + frame) / fps, 1 / fps);
      }
      videoOut.close();
    }

    try {
      await Promise.all([composeVideo(), copyAudio()]);
      await output.finalize();
    } catch (error) {
      await output.cancel().catch(() => undefined);
      throw error;
    }
    if (!target.buffer?.byteLength) throw new Error('empty-export');
    return new Blob([target.buffer], {
      type: mp4 ? 'video/mp4' : 'video/webm',
    });
  } finally {
    input.dispose();
  }
}
