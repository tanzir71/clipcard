import {
  detectLang,
  detectScript,
  dirFor,
  limitHeadline,
  maxClipSeconds,
  outletFromHost,
  parseWebUrl,
  slugHeadline,
  videoMomentUrl,
  videoSourceUrl,
} from '@clipcard/core';
import { newCardDraft } from '@clipcard/ui';
import {
  appendDraftClip,
  updateDraftCollection,
} from '@clipcard/ui/collections';
import { fetchPhoto, inspectPhoto } from '@clipcard/ui/input';
import { saveDraft } from '@clipcard/ui/storage';
import { maxRecordedBytes } from '@clipcard/ui/video-encoding';
import type { Browser } from 'wxt/browser';
import { cropVisible, trayFor } from './clip-capture.ts';
import type { Hints, MomentCapture, RecordedCapture } from './messages.ts';
import { sitePrefs } from './preferences.ts';

function validPoster(poster?: string) {
  return typeof poster === 'string' &&
    poster.length <= 800_000 &&
    /^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(poster)
    ? poster
    : undefined;
}

function getMomentSource(
  tab: Browser.tabs.Tab,
  hints: Hints | null,
  time: number,
) {
  const address = parseWebUrl(
    hints?.source?.canonicalUrl ?? hints?.address ?? tab.url ?? '',
  );
  if (!address) return null;
  const source = videoSourceUrl(address.href);
  const moment = videoMomentUrl(address.href, time);
  if (!source || !moment) return null;
  return {
    source,
    moment,
    title:
      hints?.source?.title ||
      hints?.title ||
      tab.title ||
      slugHeadline(address.href) ||
      address.hostname,
    outlet: hints?.source?.siteName ?? outletFromHost(address.hostname),
  };
}

export async function persistMoment(
  tab: Browser.tabs.Tab,
  hints: Hints | null,
  capture: MomentCapture,
  topFrame: boolean,
  mayFetch: boolean,
) {
  const info = getMomentSource(tab, hints, capture.time);
  if (!info) return null;
  const poster = validPoster(capture.poster);
  const frame = poster
    ? await fetch(poster).then((response) => response.blob())
    : topFrame
      ? await cropVisible(tab, capture.rect).catch(() => undefined)
      : undefined;
  const photo =
    (frame && (await inspectPhoto(frame))) ||
    (mayFetch &&
      (await fetchPhoto(hints?.source?.image ?? hints?.image ?? null))) ||
    null;
  const caption =
    typeof capture.caption === 'string'
      ? limitHeadline(capture.caption.replace(/<[^>]*>/g, ''))
      : '';
  const headline = caption || info.title;
  const lang = detectLang(headline, hints?.source?.lang);
  const draft = newCardDraft({
    headline,
    photo,
    source: {
      canonicalUrl: info.moment,
      title: info.title,
      lang,
      script: detectScript(headline),
      dir: dirFor(lang),
      siteName: info.outlet,
      image: null,
      favicon: new URL('/favicon.ico', info.source).href,
      description: null,
      themeColor: null,
      publishedAt: hints?.source?.publishedAt ?? null,
      isArticle: false,
    },
  });
  const prefs = await sitePrefs(info.source);
  const collection = await appendDraftClip(
    {
      kind: photo ? 'image' : 'link',
      sourceUrl: info.moment,
      title: headline,
      text: caption || undefined,
      outlet: info.outlet,
      lang,
    },
    { media: photo?.blob },
  );
  await updateDraftCollection(collection.draft.id, { mode: 'card' });
  await saveDraft({
    ...draft,
    id: collection.draft.id,
    defaults: prefs.defaults,
    overrides: {
      format: prefs.format,
      template: prefs.template,
      theme: prefs.theme,
    },
  });
  return collection.draft.id;
}

export async function persistRecording(
  tab: Browser.tabs.Tab,
  hints: Hints | null,
  capture: RecordedCapture,
) {
  const info = getMomentSource(tab, hints, capture.start);
  const duration = capture.end - capture.start;
  if (
    !info ||
    !Number.isFinite(duration) ||
    duration <= 0 ||
    duration > maxClipSeconds ||
    typeof capture.media !== 'string' ||
    capture.media.length > Math.ceil((maxRecordedBytes * 4) / 3) + 64 ||
    !/^data:video\/(mp4|webm);base64,/.test(capture.media)
  )
    return null;
  const media = await fetch(capture.media).then((result) => result.blob());
  if (!media.size || media.size > maxRecordedBytes) return null;
  const poster = validPoster(capture.poster);
  const cues = Array.isArray(capture.cues)
    ? capture.cues
        .filter(
          (cue) =>
            typeof cue?.text === 'string' &&
            Number.isFinite(cue.start) &&
            Number.isFinite(cue.end) &&
            cue.start >= 0 &&
            cue.end > cue.start &&
            cue.end <= duration + 0.01,
        )
        .slice(0, 300)
        .map((cue) => ({
          start: cue.start,
          end: cue.end,
          text: cue.text.slice(0, 600),
        }))
    : [];
  const collection = await appendDraftClip(
    {
      kind: 'video',
      title: info.title,
      outlet: info.outlet,
      sourceUrl: info.moment,
      lang: hints?.source?.lang,
      video: {
        source: info.source,
        start: capture.start,
        end: capture.end,
        cues,
        poster,
      },
    },
    { media },
  );
  return trayFor(collection);
}
