declare const __CLIPCARD_BOOKMARK_APP__: string;
declare const __CLIPCARD_BOOKMARK_VIDEO__: boolean;

(() => {
  if (!/^https?:$/.test(location.protocol)) return;
  const token = Array.from(crypto.getRandomValues(new Uint32Array(4)), (n) =>
    n.toString(36),
  ).join('-');
  const app = new URL(__CLIPCARD_BOOKMARK_APP__);
  const appOrigin = app.origin;
  app.searchParams.set('from', 'bookmark');
  app.hash = new URLSearchParams({ token, origin: location.origin }).toString();
  const popup = window.open(
    app.href,
    'clipcard',
    'popup,width=420,height=760,left=' +
      Math.max(0, screenX + outerWidth - 432) +
      ',top=' +
      Math.max(0, screenY + 72),
  );
  if (!popup) return;
  popup.focus();

  const select = (value: string) => document.querySelector(value);
  const meta = (key: string) =>
    select('meta[property="' + key + '"],meta[name="' + key + '"]')
      ?.getAttribute('content')
      ?.trim();
  const bounded = (text: string | undefined | null, length: number) =>
    text?.slice(0, length) ?? '';
  const selection = (getSelection()?.toString() || '').trim();
  const picture = Array.from(
    document.querySelectorAll<HTMLImageElement>('article img,main img'),
  ).reduce<HTMLImageElement | null>(
    (largest, image) =>
      image.naturalWidth > (largest?.naturalWidth ?? 599) ? image : largest,
    null,
  );
  let image =
    meta('og:image:secure_url') ||
    meta('og:image') ||
    meta('twitter:image') ||
    picture?.currentSrc ||
    picture?.src ||
    '';
  try {
    image = image ? new URL(image, document.baseURI).href : '';
  } catch {
    image = '';
  }
  const video = __CLIPCARD_BOOKMARK_VIDEO__
    ? Array.from(document.querySelectorAll('video')).find((item) => {
        const bounds = item.getBoundingClientRect();
        return (
          item.readyState >= 2 &&
          item.videoWidth > 0 &&
          Number.isFinite(item.currentTime) &&
          (!item.paused || item.currentTime > 0) &&
          bounds.width >= 200 &&
          bounds.height >= 100 &&
          bounds.bottom > 0 &&
          bounds.top < innerHeight
        );
      })
    : undefined;
  const moment = video ? { time: video.currentTime, caption: '' } : undefined;
  const payload = {
    type: 'clipcard:bookmark',
    token,
    address: bounded(location.href, 2200),
    canonical: bounded(
      select('link[rel~="canonical"]')?.getAttribute('href') || meta('og:url'),
      2200,
    ),
    title: bounded(
      meta('og:title') ||
        meta('twitter:title') ||
        select('h1')?.textContent ||
        document.title,
      400,
    ),
    outlet: bounded(meta('og:site_name') || meta('application-name'), 100),
    section: bounded(meta('article:section'), 96),
    published: bounded(meta('article:published_time'), 50),
    lang: bounded(document.documentElement.lang || meta('og:locale'), 50),
    image: bounded(image, 2200),
    selection: bounded(selection, 500),
    frame: '',
    ...(moment ? { moment } : {}),
  };

  const keep = (event: MessageEvent) => {
    if (event.source !== popup || event.origin !== appOrigin) return;
    if (event.data?.type !== 'clipcard:ready' || event.data.token !== token)
      return;
    clearInterval(retry);
    removeEventListener('message', keep);
    try {
      const candidate =
        Array.from(document.images).find(
          (img) => img.currentSrc === image || img.src === image,
        ) || picture;
      if (video && moment) {
        moment.time = video.currentTime;
        const cue = Array.from(video.textTracks).find(
          (track) => track.activeCues?.length,
        )?.activeCues?.[0] as VTTCue | undefined;
        moment.caption = bounded(
          cue?.text || select('.ytp-caption-segment')?.textContent,
          500,
        );
      }
      const frame = video && !video.mediaKeys ? video : candidate;
      const width =
        frame instanceof HTMLVideoElement
          ? frame.videoWidth
          : frame?.naturalWidth;
      const height =
        frame instanceof HTMLVideoElement
          ? frame.videoHeight
          : frame?.naturalHeight;
      if (frame && width && height) {
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, 1600 / Math.max(width, height));
        canvas.width = Math.floor(width * scale);
        canvas.height = Math.floor(height * scale);
        canvas
          .getContext('2d')
          ?.drawImage(frame, 0, 0, canvas.width, canvas.height);
        const data = canvas.toDataURL('image/jpeg', 0.8);
        if (data.length <= 1_600_000) payload.frame = data;
      }
    } catch {
      // A cross-origin image may be visible while its pixels are unavailable.
    }
    popup.postMessage(payload, appOrigin);
  };
  let tries = 0;
  addEventListener('message', keep);
  const retry = setInterval(() => {
    if (popup.closed || tries++ > 40) {
      removeEventListener('message', keep);
      clearInterval(retry);
      return;
    }
    popup.postMessage({ type: 'clipcard:hello', token }, appOrigin);
  }, 220);
})();
