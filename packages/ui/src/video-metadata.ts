import { BlobSource, Input, MP4 } from 'mediabunny';

export function videoMetadata(blob: Blob) {
  const player = document.createElement('video');
  const address = URL.createObjectURL(blob);
  player.muted = true;
  player.playsInline = true;
  player.preload = 'auto';
  return new Promise<{ duration: number; poster?: string }>(
    (resolve, reject) => {
      const cleanup = () => {
        clearTimeout(timeout);
        URL.revokeObjectURL(address);
        player.removeAttribute('src');
        player.load();
      };
      const failed = () => {
        cleanup();
        reject(new Error('video-metadata'));
      };
      const timeout = window.setTimeout(failed, 6000);
      player.onerror = failed;
      player.onloadeddata = () => {
        const duration = player.duration;
        if (!Number.isFinite(duration) || duration <= 0) return failed();
        const canvas = document.createElement('canvas');
        canvas.width = Math.min(480, player.videoWidth);
        canvas.height = Math.round(
          (canvas.width * player.videoHeight) / player.videoWidth,
        );
        const context = canvas.getContext('2d');
        context?.drawImage(player, 0, 0, canvas.width, canvas.height);
        const poster =
          context && canvas.width && canvas.height
            ? canvas.toDataURL('image/jpeg', 0.78)
            : undefined;
        cleanup();
        resolve({ duration, poster });
      };
      player.src = address;
    },
  );
}

export async function mp4Duration(blob: Blob) {
  const data = new Input({ source: new BlobSource(blob), formats: [MP4] });
  try {
    const track = await data.getPrimaryVideoTrack();
    if (!track) throw new Error('video-metadata');
    const duration = await track.computeDuration();
    if (!Number.isFinite(duration) || duration <= 0)
      throw new Error('video-metadata');
    return duration;
  } finally {
    data.dispose();
  }
}
