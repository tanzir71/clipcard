import {
  ALL_FORMATS,
  AudioSample,
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
import type { InputAudioTrack, InputVideoTrack } from 'mediabunny';
import { readClipMedia } from './collections.ts';
import type { DraftCollection } from './collection-types.ts';
import {
  coverVideoArt,
  drawVideoStill,
  videoArt,
  videoTitleBitmap,
} from './video-art.ts';
import {
  buildVideoScenes,
  videoLength,
  visualFormats,
} from './video-project.ts';
import type { VideoScene } from './video-project.ts';
import { clipScene, sceneHeight, sceneWidth } from './video-scene.ts';

const fps = 30;
const videoBitrate = 2_250_000;
const audioBitrate = 128_000;
const sampleRate = 48_000;

interface LocalMedia {
  blob: Blob;
  input?: Input<BlobSource>;
  track?: InputVideoTrack | null;
  audio?: InputAudioTrack | null;
}

function canvas(width: number, height: number) {
  const element = document.createElement('canvas');
  element.width = width;
  element.height = height;
  const context = element.getContext('2d', { alpha: false });
  if (!context) throw new Error('no-canvas');
  return context;
}

function padVideo(ctx: CanvasRenderingContext2D, stage: HTMLCanvasElement) {
  const { width, height } = ctx.canvas;
  if (width === stage.width && height === stage.height) {
    ctx.drawImage(stage, 0, 0);
    return;
  }
  ctx.filter = 'blur(100px) brightness(0.34)';
  coverVideoArt(ctx, stage, width, height, 1.2);
  ctx.filter = 'none';
  const scale = Math.min(width / stage.width, height / stage.height);
  const w = Math.round(stage.width * scale);
  const h = Math.round(stage.height * scale);
  ctx.drawImage(
    stage,
    Math.round((width - w) / 2),
    Math.round((height - h) / 2),
    w,
    h,
  );
}

async function* animatedGif(blob: Blob, frames: number) {
  const decoder = new ImageDecoder({
    type: 'image/gif',
    data: await blob.arrayBuffer(),
  });
  try {
    await decoder.tracks.ready;
    const length = decoder.tracks.selectedTrack?.frameCount || 1;
    let index = 0;
    let end = 0;
    let current: VideoFrame | undefined;
    try {
      for (let frame = 0; frame < frames; frame++) {
        if (!current || frame / fps >= end) {
          current?.close();
          current = (await decoder.decode({ frameIndex: index % length }))
            .image;
          index++;
          end += Math.max(1 / fps, (current.duration ?? 100_000) / 1_000_000);
        }
        yield current;
      }
    } finally {
      current?.close();
    }
  } finally {
    decoder.close();
  }
}

function fadeAudio(
  sample: AudioSample,
  localTime: number,
  length: number,
  timestamp: number,
) {
  const data = new Float32Array(
    sample.numberOfFrames * sample.numberOfChannels,
  );
  sample.copyTo(data, { planeIndex: 0, format: 'f32' });
  for (let i = 0; i < sample.numberOfFrames; i++) {
    const at = localTime + i / sample.sampleRate;
    const fade = Math.max(0, Math.min(1, at / 0.15, (length - at) / 0.15));
    for (let channel = 0; channel < sample.numberOfChannels; channel++) {
      const offset = i * sample.numberOfChannels + channel;
      data[offset] = data[offset]! * fade;
    }
  }
  return new AudioSample({
    data,
    timestamp,
    format: 'f32',
    numberOfChannels: sample.numberOfChannels,
    sampleRate: sample.sampleRate,
  });
}

export async function exportVideoProject(
  collection: DraftCollection,
  signal: AbortSignal,
  progress: (fraction: number) => void,
) {
  const scenes = buildVideoScenes(collection);
  if (!scenes.length) throw new Error('empty-video');
  const total = videoLength(scenes);
  const format = collection.draft.videoOptions?.format ?? '9:16';
  const [width, height] = visualFormats[format];
  const stage = canvas(sceneWidth, sceneHeight);
  const targetView = canvas(width, height);
  const previous = canvas(width, height);
  const assets = await videoArt(collection);
  const media = new Map<string, LocalMedia>();

  try {
    for (const item of collection.clips) {
      signal.throwIfAborted();
      const blob = await readClipMedia(item).catch(() => undefined);
      if (!blob) continue;
      const entry: LocalMedia = { blob };
      media.set(item.id, entry);
      if (blob.type.startsWith('video/')) {
        entry.input = new Input({
          formats: ALL_FORMATS,
          source: new BlobSource(blob),
        });
        [entry.track, entry.audio] = await Promise.all([
          entry.input.getPrimaryVideoTrack(),
          entry.input.getPrimaryAudioTrack(),
        ]);
      }
    }

    const audioUsed = scenes.some(
      (scene) => scene.kind === 'clip' && media.get(scene.clip.id)?.audio,
    );
    const mp4 =
      (await canEncodeVideo('avc', { width, height, bitrate: videoBitrate })) &&
      (!audioUsed ||
        (await canEncodeAudio('aac', {
          sampleRate,
          numberOfChannels: 2,
          bitrate: audioBitrate,
        })));
    const target = new BufferTarget();
    const output = new Output({
      format: mp4 ? new Mp4OutputFormat() : new WebMOutputFormat(),
      target,
    });
    const video = new CanvasSource(targetView.canvas, {
      codec: mp4 ? 'avc' : 'vp8',
      bitrate: videoBitrate,
    });
    const audio = audioUsed
      ? new AudioSampleSource({
          codec: mp4 ? 'aac' : 'opus',
          bitrate: audioBitrate,
          transform: { sampleRate, numberOfChannels: 2 },
        })
      : null;
    output.addVideoTrack(video, { frameRate: fps });
    if (audio) output.addAudioTrack(audio);
    await output.start();

    let frame = 0;
    async function frameSink(sceneFrame: number) {
      signal.throwIfAborted();
      padVideo(targetView, stage.canvas);
      if (frame > sceneFrame && sceneFrame < 6) {
        targetView.globalAlpha = 1 - (sceneFrame + 1) / 6;
        targetView.drawImage(previous.canvas, 0, 0);
        targetView.globalAlpha = 1;
      }
      await video.add(frame / fps, 1 / fps);
      frame++;
      if (frame % 5 === 0) progress(Math.min(0.99, frame / (total * fps)));
    }

    async function render(scene: VideoScene) {
      const frames = Math.round(scene.seconds * fps);
      previous.drawImage(targetView.canvas, 0, 0);
      if (scene.kind === 'title') {
        const image = await videoTitleBitmap(collection, scene.clip);
        try {
          stage.fillStyle = '#0b0b0c';
          stage.fillRect(0, 0, sceneWidth, sceneHeight);
          if (image) stage.drawImage(image, 0, 0, sceneWidth, sceneHeight);
          for (let i = 0; i < frames; i++) await frameSink(i);
        } finally {
          image?.close();
        }
        return;
      }
      if (scene.kind === 'sources') {
        drawVideoStill(stage, scene, assets);
        for (let i = 0; i < frames; i++) await frameSink(i);
        return;
      }
      const entry = media.get(scene.clip.id);
      if (scene.kind === 'clip' && scene.clip.video && entry?.track) {
        const { video: original } = scene.clip;
        const clip = { ...scene.clip, sourceUrl: scene.url };
        const artist = await clipScene(stage, clip, {
          ...original,
          start: original.start + scene.range.start,
          end: original.start + scene.range.end,
          cues: scene.cues,
        });
        const first = await entry.track.getFirstTimestamp();
        const duration = await entry.track.computeDuration();
        const timestamps = Array.from({ length: frames }, (_, index) =>
          Math.min(duration - 0.001, first + scene.range.start + index / fps),
        );
        let index = 0;
        const sink = new CanvasSink(entry.track, {
          width: sceneWidth,
          height: 608,
          fit: scene.clip.fit ?? 'contain',
          poolSize: 2,
        });
        for await (const image of sink.canvasesAtTimestamps(timestamps)) {
          if (image) artist.frame(image.canvas, index / fps);
          await frameSink(index++);
        }
        return;
      }
      const still =
        scene.kind === 'clip' ? { ...scene, kind: 'excerpt' as const } : scene;
      if (
        entry?.blob.type === 'image/gif' &&
        typeof ImageDecoder !== 'undefined'
      ) {
        let index = 0;
        for await (const image of animatedGif(entry.blob, frames)) {
          drawVideoStill(stage, still, assets, image, index / fps);
          await frameSink(index++);
        }
        return;
      }
      if (entry?.track && still.kind === 'reaction') {
        const track = entry.track;
        const first = await track.getFirstTimestamp();
        const end = await track.computeDuration();
        const length = Math.max(1 / fps, end - first);
        const stream = new CanvasSink(track, { width: 540, poolSize: 2 });
        let index = 0;
        while (index < frames) {
          const count = Math.min(frames - index, Math.round(length * fps));
          const timestamps = Array.from(
            { length: Math.max(1, count) },
            (_, offset) => Math.min(end - 0.001, first + offset / fps),
          );
          for await (const image of stream.canvasesAtTimestamps(timestamps)) {
            drawVideoStill(stage, still, assets, image?.canvas, index / fps);
            await frameSink(index++);
          }
        }
        return;
      }
      const image = entry?.blob.type.startsWith('image/')
        ? await createImageBitmap(entry.blob).catch(() => undefined)
        : undefined;
      try {
        for (let i = 0; i < frames; i++) {
          if (i === 0 || (image && still.kind === 'image'))
            drawVideoStill(stage, still, assets, image, i / fps);
          await frameSink(i);
        }
      } finally {
        image?.close();
      }
    }

    async function copyAudio() {
      if (!audio) return;
      for (const scene of scenes) {
        if (scene.kind !== 'clip') continue;
        const entry = media.get(scene.clip.id);
        if (!entry?.audio || !entry.track) continue;
        const first =
          (await entry.track.getFirstTimestamp()) + scene.range.start;
        const end = first + scene.seconds;
        for await (const sample of new AudioSampleSink(entry.audio).samples()) {
          try {
            signal.throwIfAborted();
            if (sample.timestamp >= end) break;
            if (sample.timestamp + sample.duration <= first) continue;
            const start = Math.max(
              0,
              Math.ceil((first - sample.timestamp) * sample.sampleRate),
            );
            const last = Math.min(
              sample.numberOfFrames,
              Math.floor((end - sample.timestamp) * sample.sampleRate),
            );
            if (last <= start) continue;
            const trimmed = sample.trim(start, last);
            try {
              const at = Math.max(0, trimmed.timestamp - first);
              const mixed = fadeAudio(
                trimmed,
                at,
                scene.seconds,
                scene.at + at,
              );
              try {
                await audio.add(mixed);
              } finally {
                mixed.close();
              }
            } finally {
              trimmed.close();
            }
          } finally {
            sample.close();
          }
        }
      }
      audio.close();
    }

    async function compose() {
      for (const scene of scenes) await render(scene);
      video.close();
    }

    try {
      await Promise.all([compose(), copyAudio()]);
      signal.throwIfAborted();
      await output.finalize();
    } catch (error) {
      await output.cancel().catch(() => undefined);
      throw error;
    }
    if (!target.buffer?.byteLength) throw new Error('video-export');
    progress(1);
    return new Blob([target.buffer], {
      type: mp4 ? 'video/mp4' : 'video/webm',
    });
  } finally {
    for (const entry of media.values()) entry.input?.dispose();
  }
}
