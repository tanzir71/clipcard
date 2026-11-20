import { z } from 'zod';
import {
  cleanTitle,
  cleanUrl,
  detectLang,
  detectScript,
  dirFor,
  imageUrl,
  limitHeadline,
  outletFromHost,
  parseWebUrl,
  unwrapUrl,
} from '@clipcard/core';
import { fetchPhoto, inspectPhoto } from './input.ts';
import { newCardDraft } from './draft.ts';
import type { CardDraft } from './draft.ts';

const tokenFormat = /^[a-z0-9]+(?:-[a-z0-9]+){3}$/;
const envelope = z
  .object({
    type: z.literal('clipcard:bookmark'),
    token: z.string().max(32).regex(tokenFormat),
    address: z.string().min(1).max(2200),
    canonical: z.string().max(2200),
    title: z.string().max(400),
    outlet: z.string().max(100),
    section: z.string().max(96),
    published: z.string().max(50),
    lang: z.string().max(50),
    image: z.string().max(2200),
    selection: z.string().max(500),
    frame: z.string().max(1_600_000),
  })
  .strict();

export function validateBookmark(
  value: unknown,
  origin: string,
  token: string,
) {
  if (origin === 'null') return null;
  const result = envelope.safeParse(value);
  if (!result.success || result.data.token !== token) return null;
  const url = parseWebUrl(result.data.address);
  if (!url || url.origin !== origin) return null;
  return result.data;
}

export async function draftFromBookmark(data: z.infer<typeof envelope>) {
  const address = new URL(data.address);
  const canonical = data.canonical && parseWebUrl(data.canonical, address.href);
  const canonicalUrl = cleanUrl(
    unwrapUrl(canonical ? canonical.href : address.href),
  ).url;
  if (canonicalUrl.length > 1500) return null;
  const outlet = data.outlet || outletFromHost(address.hostname);
  const title = cleanTitle(data.title, outlet, address.hostname) || outlet;
  const selection = limitHeadline(data.selection) || undefined;
  const headline = selection ?? title;
  const lang = detectLang(headline, data.lang);
  let photo = await fetchPhoto(imageUrl(data.image, address.href));
  if (
    !photo &&
    /^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(data.frame)
  ) {
    const blob = await fetch(data.frame).then((result) => result.blob());
    photo = await inspectPhoto(blob, 600);
  }
  return newCardDraft({
    source: {
      canonicalUrl,
      title,
      lang,
      siteName: outlet,
      script: detectScript(headline),
      dir: dirFor(lang),
      image: null,
      favicon: new URL('/favicon.ico', address).href,
      description: null,
      themeColor: null,
      isArticle: true,
      publishedAt: data.published || null,
    },
    selection,
    headline,
    photo,
    section: data.section || undefined,
  });
}

export function receiveBookmark(
  onDraft: (draft: CardDraft) => void,
  onFailure: () => void,
) {
  const fragment = new URLSearchParams(location.hash.slice(1));
  const token = fragment.get('token');
  const origin = fragment.get('origin');
  if (
    !token ||
    !tokenFormat.test(token) ||
    !origin ||
    parseWebUrl(origin)?.origin !== origin
  )
    return;
  let sender: WindowProxy | null = null;

  const listener = (event: MessageEvent) => {
    if (
      event.origin !== origin ||
      !event.source ||
      !event.data ||
      event.source === window
    )
      return;
    if (event.data.type === 'clipcard:hello' && event.data.token === token) {
      sender ??= event.source as WindowProxy;
      if (event.source === sender)
        sender.postMessage({ type: 'clipcard:ready', token }, origin);
      return;
    }
    if (event.source !== sender) return;
    const data = validateBookmark(event.data, origin, token);
    if (!data) return;
    cleanup();
    history.replaceState(null, '', location.pathname + location.search);
    void draftFromBookmark(data)
      .then((draft) => {
        if (draft) onDraft(draft);
        else onFailure();
      })
      .catch(onFailure);
  };
  const timeout = setTimeout(() => {
    cleanup();
    onFailure();
  }, 12_000);
  function cleanup() {
    clearTimeout(timeout);
    window.removeEventListener('message', listener);
  }
  window.addEventListener('message', listener);
  return cleanup;
}
