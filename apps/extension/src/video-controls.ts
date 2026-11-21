import {
  clipCaptionCues,
  initialVideoRange,
  moveVideoHandle,
  videoClock,
} from '@clipcard/core';
import type { CaptionCue, VideoRange } from '@clipcard/core';
import { interfaceStrings as strings } from '@clipcard/i18n';
import { browser } from 'wxt/browser';
import type { BackgroundMessage } from './messages.ts';
import {
  protectedPlayer,
  recordPlayerRange,
  seekVideo,
  VideoRecordingError,
  watchProtectedPlayers,
} from './video-recording.ts';
import css from './video-controls.css?raw';

const isYouTube = /^(?:www\.|m\.)?youtube\.com$/.test(location.hostname);

function usableVideo(video: HTMLVideoElement) {
  const { width, height, bottom, top } = video.getBoundingClientRect();
  return (
    video.readyState >= 2 &&
    Number.isFinite(video.duration) &&
    video.duration > 0 &&
    width >= 320 &&
    height >= 180 &&
    bottom > 0 &&
    top < innerHeight
  );
}

function availableVideos() {
  return Array.from(document.querySelectorAll('video')).filter(usableVideo);
}

function transcriptTime(value: string) {
  const parts = value.trim().split(':');
  if (parts.length < 2 || parts.some((part) => !/^\d{1,2}$/.test(part)))
    return NaN;
  return parts.reduce((total, part) => total * 60 + Number(part), 0);
}

function playerCaptions(video: HTMLVideoElement): CaptionCue[] {
  const tracks = Array.from(video.textTracks).filter(
    (track) => track.kind === 'captions' || track.kind === 'subtitles',
  );
  const track =
    tracks.find((item) => item.mode === 'showing' && item.cues?.length) ??
    tracks.find((item) => item.cues?.length);
  if (track?.cues) {
    return Array.from(track.cues).flatMap((cue) =>
      'text' in cue && typeof cue.text === 'string'
        ? [{ text: cue.text, start: cue.startTime, end: cue.endTime }]
        : [],
    );
  }
  if (!isYouTube) return [];
  const transcript = Array.from(
    document.querySelectorAll(
      'ytd-transcript-segment-renderer, yt-transcript-segment-view-model',
    ),
  ).flatMap((row) => {
    const stamp = row.querySelector('[class*="timestamp"]')?.textContent ?? '';
    const start = transcriptTime(stamp);
    const text = row
      .querySelector(
        'yt-formatted-string.segment-text, [class*="segment-text"]',
      )
      ?.textContent?.trim();
    return Number.isFinite(start) && text ? [{ start, text }] : [];
  });
  return transcript.flatMap((cue, index) => {
    const end = Math.min(
      transcript[index + 1]?.start ?? cue.start + 4,
      cue.start + 8,
      video.duration,
    );
    return end > cue.start ? [{ ...cue, end }] : [];
  });
}

function posterCaption(time: number, cues: CaptionCue[]) {
  return (
    cues.find((cue) => cue.start <= time && cue.end > time)?.text ??
    (isYouTube
      ? document.querySelector('.ytp-caption-segment')?.textContent
      : undefined) ??
    undefined
  );
}

function momentPoster(video: HTMLVideoElement) {
  if (protectedPlayer(video) || !video.videoWidth || !video.videoHeight) return;
  const canvas = document.createElement('canvas');
  canvas.width = Math.min(video.videoWidth, 800);
  canvas.height = Math.round(
    (canvas.width * video.videoHeight) / video.videoWidth,
  );
  try {
    canvas
      .getContext('2d')
      ?.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.84);
  } catch {
    return;
  }
}

function toDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const file = new FileReader();
    file.onload = () => resolve(String(file.result));
    file.onerror = () => reject(file.error);
    file.readAsDataURL(blob);
  });
}

function videoButton(className: string) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  return button;
}

function videoSurface(name: string) {
  const host = document.createElement(name);
  const shadow = host.attachShadow({ mode: 'closed' });
  const style = document.createElement('style');
  style.textContent = css;
  shadow.append(style);
  return { host, shadow };
}

export function mountVideoClipping() {
  watchProtectedPlayers();
  const panelSurface = videoSurface('clipcard-video-range');
  const triggerSurface = videoSurface('clipcard-video-trigger');
  const panel = document.createElement('div');
  panel.className = 'video-range';
  const capsule = document.createElement('div');
  capsule.className = 'video-capsule';
  const times = document.createElement('span');
  const card = videoButton('video-card');
  const add = videoButton('video-add');
  const rail = document.createElement('div');
  rail.className = 'video-rail';
  const highlight = document.createElement('span');
  highlight.className = 'video-highlight';
  const start = videoButton('video-handle');
  const end = videoButton('video-handle');
  const status = document.createElement('p');
  status.className = 'video-status';
  status.setAttribute('role', 'status');
  const indicator = document.createElement('div');
  indicator.className = 'video-indicator';
  const progress = document.createElement('span');
  const stopButton = videoButton('video-stop');
  const trigger = videoButton('video-trigger');
  capsule.append(times, card);
  if (!import.meta.env.FIREFOX) capsule.append(add);
  rail.append(highlight, start, end);
  panel.append(capsule, rail, status);
  indicator.append(progress, stopButton);
  panelSurface.shadow.append(panel, indicator);
  triggerSurface.shadow.append(trigger);
  document.documentElement.append(panelSurface.host, triggerSurface.host);

  let target: HTMLVideoElement | undefined;
  let range: VideoRange | null = null;
  let cues: CaptionCue[] = [];
  let recording: AbortController | undefined;
  let busy = false;
  let hiddenForPopup = false;
  let animation = 0;
  let lastPointer: { x: number; y: number } | undefined;
  let pointerInsideTrigger = false;

  function labels() {
    trigger.textContent = '✂ ' + strings['clip.add'];
    trigger.setAttribute('aria-label', strings['menu.clipVideo']);
    trigger.title = strings['menu.clipVideo'];
    card.textContent = strings['clip.card'];
    add.textContent = '+ ' + strings['video.addClip'];
    stopButton.textContent = strings['video.stop'];
  }

  function setPosition() {
    animation = 0;
    labels();
    const visible = target && usableVideo(target) && !hiddenForPopup;
    const box = visible && target?.getBoundingClientRect();
    const native =
      box && isYouTube
        ? target?.closest('#movie_player')?.querySelector('.ytp-right-controls')
        : null;
    const triggerVisible = Boolean(
      box && !range && !busy && (native || lastPointer || pointerInsideTrigger),
    );
    triggerSurface.host.hidden = !triggerVisible;
    if (!triggerVisible) triggerSurface.host.style.display = 'none';
    if (box && triggerVisible) {
      if (native) {
        if (triggerSurface.host.parentElement !== native)
          native.append(triggerSurface.host);
        triggerSurface.host.style.cssText =
          'display:inline-flex;align-items:center;height:100%;vertical-align:top';
      } else {
        if (triggerSurface.host.parentElement !== document.documentElement)
          document.documentElement.append(triggerSurface.host);
        triggerSurface.host.style.cssText =
          'position:fixed;z-index:2147483644;left:' +
          Math.max(6, Math.min(innerWidth - 82, box.right - 94)) +
          'px;top:' +
          Math.max(6, Math.min(innerHeight - 38, box.bottom - 46)) +
          'px';
      }
    }
    panel.hidden = !box || !range || busy || hiddenForPopup;
    indicator.hidden = !recording;
    panelSurface.host.style.cssText =
      'position:fixed;z-index:2147483645;inset:0;pointer-events:none';
    if (!box || !range || !target) return;
    const width = Math.max(260, Math.min(innerWidth - 24, box.width - 32));
    panel.style.width = width + 'px';
    panel.style.left =
      Math.max(12, Math.min(innerWidth - width - 12, box.left + 16)) + 'px';
    panel.style.top =
      Math.max(12, Math.min(innerHeight - 90, box.bottom - 95)) + 'px';
    const low = (range.start / target.duration) * 100;
    const high = (range.end / target.duration) * 100;
    highlight.style.left = low + '%';
    highlight.style.width = high - low + '%';
    start.style.left = low + '%';
    end.style.left = high + '%';
    times.textContent =
      videoClock(range.start) +
      ' – ' +
      videoClock(range.end) +
      ' · ' +
      Math.round(range.end - range.start) +
      's';
    const minimum = Math.min(1, target.duration);
    for (const [edge, handle, label] of [
      ['start', start, strings['video.start']],
      ['end', end, strings['video.end']],
    ] as const) {
      handle.title = label;
      handle.setAttribute('role', 'slider');
      handle.setAttribute('aria-label', label);
      handle.setAttribute(
        'aria-valuemin',
        String(
          edge === 'start'
            ? Math.max(0, range.end - 60)
            : range.start + minimum,
        ),
      );
      handle.setAttribute(
        'aria-valuemax',
        String(
          edge === 'start'
            ? range.end - minimum
            : Math.min(target.duration, range.start + 60),
        ),
      );
      handle.setAttribute('aria-valuenow', String(range[edge]));
      handle.setAttribute('aria-valuetext', videoClock(range[edge]));
    }
    add.disabled = protectedPlayer(target);
    if (add.disabled) status.textContent = strings['clip.drm'];
  }

  function redraw() {
    if (!animation) animation = requestAnimationFrame(setPosition);
  }

  function show(video: HTMLVideoElement) {
    if (busy) return false;
    target = video;
    cues = playerCaptions(video);
    range = initialVideoRange(video.currentTime, video.duration, cues);
    status.textContent = '';
    hiddenForPopup = false;
    setPosition();
    if (range) start.focus({ preventScroll: true });
    return Boolean(range);
  }

  function move(edge: keyof VideoRange, next: number) {
    if (!target || !range) return;
    range = moveVideoHandle(range, edge, next, target.duration, cues);
    redraw();
  }

  for (const [edge, handle] of [
    ['start', start],
    ['end', end],
  ] as const) {
    const pointer = (event: PointerEvent) => {
      if (!target) return;
      const rect = rail.getBoundingClientRect();
      move(edge, ((event.clientX - rect.left) / rect.width) * target.duration);
    };
    handle.onpointerdown = (event) => {
      event.preventDefault();
      event.stopPropagation();
      handle.focus({ preventScroll: true });
      handle.setPointerCapture(event.pointerId);
      pointer(event);
    };
    handle.onpointermove = (event) => {
      if (handle.hasPointerCapture(event.pointerId)) pointer(event);
    };
    handle.onkeydown = (event) => {
      if (!target || !range) return;
      const step = event.shiftKey ? 5 : 1;
      const values: Record<string, number> = {
        ArrowLeft: range[edge] - step,
        ArrowDown: range[edge] - step,
        ArrowRight: range[edge] + step,
        ArrowUp: range[edge] + step,
        Home: 0,
        End: target.duration,
      };
      const next = values[event.key];
      if (next === undefined) return;
      event.preventDefault();
      event.stopPropagation();
      move(edge, next);
    };
  }

  async function moment(video: HTMLVideoElement, selected: VideoRange) {
    const prior = video.currentTime;
    const playing = !video.paused;
    busy = true;
    setPosition();
    video.pause();
    try {
      await seekVideo(video, selected.start);
      // Wait for the clean frame to paint after the range overlay disappears.
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
      const { x, y, width, height } = video.getBoundingClientRect();
      const request: BackgroundMessage = {
        to: 'background',
        kind: 'videoMoment',
        capture: {
          time: selected.start,
          poster: momentPoster(video),
          caption: posterCaption(selected.start, cues),
          rect: { x, y, width, height, viewport: innerWidth },
        },
      };
      if (!(await browser.runtime.sendMessage(request)))
        throw new Error('moment-card');
      range = null;
    } catch {
      status.textContent = strings['card.renderFailed'];
    } finally {
      video.currentTime = prior;
      if (playing && video.isConnected)
        void video.play().catch(() => undefined);
      busy = false;
      redraw();
    }
  }

  async function record(video: HTMLVideoElement, selected: VideoRange) {
    busy = true;
    const controller = new AbortController();
    recording = controller;
    progress.textContent = strings['clip.recording']
      .replace('{elapsed}', videoClock(0))
      .replace('{total}', videoClock(selected.end - selected.start));
    status.textContent = '';
    setPosition();
    try {
      const captured = await recordPlayerRange(
        video,
        selected,
        controller.signal,
        (elapsed) => {
          progress.textContent = strings['clip.recording']
            .replace('{elapsed}', videoClock(elapsed))
            .replace('{total}', videoClock(selected.end - selected.start));
        },
      );
      recording = undefined;
      redraw();
      const finalRange = { start: selected.start, end: captured.end };
      const request: BackgroundMessage = {
        to: 'background',
        kind: 'videoRecording',
        capture: {
          ...finalRange,
          poster: captured.poster,
          cues: clipCaptionCues(cues, finalRange),
          media: await toDataUrl(captured.blob),
        },
      };
      const result = (await browser.runtime.sendMessage(request)) as {
        id?: string;
        limit?: boolean;
      } | null;
      if (result?.limit) throw new VideoRecordingError('length');
      if (!result?.id) throw new VideoRecordingError('capture');
      range = null;
    } catch (error) {
      if (!(
        error instanceof DOMException && error.name === 'NotAllowedError'
      )) {
        const reason =
          error instanceof VideoRecordingError ? error.reason : 'capture';
        const copy = {
          unsupported: 'video.unavailable',
          tab: 'video.chooseTab',
          protected: 'clip.drm',
          length: 'video.tooLong',
          capture: 'video.captureFailed',
        } as const;
        status.textContent = strings[copy[reason]];
      }
    } finally {
      recording = undefined;
      busy = false;
      redraw();
    }
  }

  function chooseAt(point?: { x: number; y: number }) {
    const videos = availableVideos();
    if (!point) return videos.find((video) => !video.paused) ?? videos[0];
    return videos.find((video) => {
      const box = video.getBoundingClientRect();
      return (
        box.left <= point.x &&
        point.x <= box.right &&
        box.top <= point.y &&
        point.y <= box.bottom
      );
    });
  }

  trigger.onclick = (event) => {
    event.stopPropagation();
    if (target) show(target);
  };
  card.onclick = () => {
    if (target && range && !busy) void moment(target, range);
  };
  if (!import.meta.env.FIREFOX) {
    add.onclick = () => {
      if (target && range && !busy) void record(target, range);
    };
  }
  stopButton.onclick = () => recording?.abort();
  triggerSurface.host.onpointerenter = () => {
    pointerInsideTrigger = true;
  };
  triggerSurface.host.onpointerleave = () => {
    pointerInsideTrigger = false;
  };
  document.addEventListener(
    'pointermove',
    (event) => {
      if (busy || range || pointerInsideTrigger) return;
      lastPointer = { x: event.clientX, y: event.clientY };
      target = chooseAt(lastPointer) ?? (isYouTube ? chooseAt() : undefined);
      redraw();
    },
    { passive: true },
  );
  document.addEventListener('focusin', ({ target: focused }) => {
    if (
      focused instanceof HTMLVideoElement &&
      usableVideo(focused) &&
      !range &&
      !busy
    ) {
      target = focused;
      lastPointer ??= { x: 0, y: 0 };
      redraw();
    }
  });
  document.addEventListener(
    'loadeddata',
    (event) => {
      if (
        isYouTube &&
        !target &&
        event.target instanceof HTMLVideoElement &&
        usableVideo(event.target)
      ) {
        target = event.target;
        redraw();
      }
    },
    true,
  );
  new MutationObserver(() => {
    if (
      isYouTube &&
      !busy &&
      !range &&
      (!target?.isConnected || !triggerSurface.host.isConnected)
    ) {
      target = chooseAt();
      redraw();
    }
  }).observe(document.documentElement, { childList: true, subtree: true });
  addEventListener('scroll', redraw, { passive: true, capture: true });
  addEventListener('resize', redraw);
  addEventListener('pagehide', () => recording?.abort());
  addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || (!range && !recording)) return;
    if (recording) recording.abort();
    else {
      range = null;
      redraw();
      trigger.focus({ preventScroll: true });
    }
  });

  if (isYouTube) {
    target = chooseAt();
    redraw();
  }
  return {
    open(address?: string) {
      const matching =
        address &&
        availableVideos().find(
          (video) => video.currentSrc === address || video.src === address,
        );
      const next = matching || chooseAt(lastPointer) || chooseAt();
      return next ? show(next) : false;
    },
    popup(open: boolean) {
      hiddenForPopup = open;
      redraw();
    },
  };
}
