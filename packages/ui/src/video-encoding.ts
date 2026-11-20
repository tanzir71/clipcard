export interface ClipEncoder {
  failure: Promise<void>;
  finish(): Promise<Blob>;
  abort(): Promise<void>;
}

const videoBitrate = 2_400_000;
const audioBitrate = 128_000;
export const maxRecordedBytes = 27 * 1024 * 1024;

async function mp4Encoder(stream: MediaStream): Promise<ClipEncoder | null> {
  const [videoTrack] = stream.getVideoTracks();
  const [audioTrack] = stream.getAudioTracks();
  if (!videoTrack || typeof VideoEncoder === 'undefined') return null;
  const {
    BufferTarget,
    MediaStreamAudioTrackSource,
    MediaStreamVideoTrackSource,
    Mp4OutputFormat,
    Output,
    canEncodeAudio,
    canEncodeVideo,
  } = await import('mediabunny');
  const settings = videoTrack.getSettings();
  if (
    !(await canEncodeVideo('avc', {
      width: settings.width ?? 640,
      height: settings.height ?? 360,
      bitrate: videoBitrate,
    }))
  )
    return null;
  if (
    audioTrack &&
    !(await canEncodeAudio('aac', {
      sampleRate: audioTrack.getSettings().sampleRate ?? 48_000,
      numberOfChannels: audioTrack.getSettings().channelCount ?? 2,
      bitrate: audioBitrate,
    }))
  )
    return null;

  const target = new BufferTarget();
  const output = new Output({ format: new Mp4OutputFormat(), target });
  const video = new MediaStreamVideoTrackSource(
    videoTrack as ConstructorParameters<typeof MediaStreamVideoTrackSource>[0],
    { codec: 'avc', bitrate: videoBitrate },
  );
  const audio = audioTrack
    ? new MediaStreamAudioTrackSource(
        audioTrack as ConstructorParameters<
          typeof MediaStreamAudioTrackSource
        >[0],
        { codec: 'aac', bitrate: audioBitrate },
      )
    : undefined;
  output.addVideoTrack(video);
  if (audio) output.addAudioTrack(audio);
  const failure = Promise.race(
    audio ? [video.errorPromise, audio.errorPromise] : [video.errorPromise],
  );
  void failure.catch(() => undefined);
  try {
    await output.start();
  } catch (error) {
    await output.cancel().catch(() => undefined);
    throw error;
  }
  return {
    failure,
    async finish() {
      video.close();
      audio?.close();
      await Promise.race([output.finalize(), failure]);
      if (!target.buffer?.byteLength) throw new Error('empty-video');
      return new Blob([target.buffer], { type: 'video/mp4' });
    },
    abort: () => output.cancel(),
  };
}

function browserEncoder(stream: MediaStream): ClipEncoder {
  const types = stream.getAudioTracks().length
    ? ['video/mp4;codecs=avc1,mp4a.40.2', 'video/webm;codecs=vp8,opus']
    : ['video/mp4;codecs=avc1', 'video/webm;codecs=vp8'];
  const mimeType = types.find((type) => MediaRecorder.isTypeSupported(type));
  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: videoBitrate,
    audioBitsPerSecond: audioBitrate,
  });
  const chunks: Blob[] = [];
  let size = 0;
  const failure = new Promise<never>((_, reject) => {
    recorder.addEventListener(
      'error',
      () => reject(new Error('video-encoder-error')),
      { once: true },
    );
    recorder.addEventListener('dataavailable', ({ data }) => {
      size += data.size;
      if (size > maxRecordedBytes) {
        reject(new RangeError('video-size'));
        if (recorder.state !== 'inactive') recorder.stop();
      } else if (data.size) chunks.push(data);
    });
  });
  void failure.catch(() => undefined);
  const result = new Promise<Blob>((resolve) => {
    recorder.addEventListener(
      'stop',
      () =>
        resolve(
          new Blob(chunks, {
            type: recorder.mimeType.split(';')[0],
          }),
        ),
      { once: true },
    );
  });
  recorder.start(500);
  const stop = () => {
    if (recorder.state !== 'inactive') recorder.stop();
  };
  return {
    failure,
    async finish() {
      stop();
      const blob = await Promise.race([result, failure]);
      if (!blob.size) throw new Error('empty-video');
      return blob;
    },
    async abort() {
      stop();
      await result;
    },
  };
}

export async function beginClipEncoding(stream: MediaStream) {
  return (await mp4Encoder(stream).catch(() => null)) ?? browserEncoder(stream);
}
