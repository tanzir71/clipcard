import { parseWebUrl } from '@clipcard/core';
import { FLAGS } from '@clipcard/core/flags';
import { THEMES, toCardColor } from '@clipcard/cards';
import type { CardDraft } from '@clipcard/ui';
import { getDomain } from 'tldts';
import { browser } from 'wxt/browser';
import type { Destination, SitePrefs } from './messages.ts';
import { getUserSettings } from './user-settings.ts';

export function siteKey(address: string): string | null {
  const host = parseWebUrl(address)?.hostname;
  if (!host) return null;
  return 'site:' + (getDomain(host, { allowPrivateDomains: true }) ?? host);
}

export async function sitePrefs(address: string): Promise<SitePrefs> {
  const key = siteKey(address);
  if (!key) return {};
  const [record, profile] = await Promise.all([
    browser.storage.local.get(key),
    FLAGS.languages ? getUserSettings() : undefined,
  ]);
  const prefs = (record[key] as SitePrefs | undefined) ?? {};
  if (!profile) return prefs;
  const color = profile.color;
  const theme = Object.hasOwn(THEMES, color)
    ? THEMES[color as keyof typeof THEMES]
    : /^#[\da-f]{6}$/i.test(color)
      ? toCardColor(color)
      : undefined;
  return {
    ...prefs,
    defaults: {
      format: profile.format === 'auto' ? undefined : profile.format,
      template: profile.template === 'auto' ? undefined : profile.template,
      theme,
      lang: profile.cardLanguage === 'auto' ? undefined : profile.cardLanguage,
      numerals: profile.numerals,
      qr: profile.qr,
      markEdited: profile.markEdited,
      texture: profile.texture,
      handle: profile.handle,
      markImage: profile.markImage,
    },
  };
}

export async function rememberPrefs(draft: CardDraft) {
  if (!draft.source) return;
  const key = siteKey(draft.source.canonicalUrl);
  if (!key) return;
  const { format, template, theme } = draft.overrides;
  await browser.storage.local.set({ [key]: { format, template, theme } });
}

const destinations = new Map<string, Destination>([
  ['facebook.com', { name: 'facebook', format: '4:5' }],
  ['instagram.com', { name: 'instagram', format: '4:5' }],
  ['whatsapp.com', { name: 'whatsapp', format: '4:5' }],
  ['x.com', { name: 'x', format: '16:9' }],
  ['twitter.com', { name: 'x', format: '16:9' }],
  ['linkedin.com', { name: 'linkedin', format: '16:9' }],
  ['tiktok.com', { name: 'tiktok', format: '9:16' }],
  ['youtube.com', { name: 'youtube', format: '4:5' }],
]);

export function destinationFor(address: string): Destination | undefined {
  const url = parseWebUrl(address);
  if (!url) return;
  const domain = getDomain(url.hostname);
  if (!domain) return;
  const destination = destinations.get(domain);
  if (!destination) return;
  const tall =
    (destination.name === 'youtube' && url.pathname.startsWith('/shorts/')) ||
    (destination.name === 'whatsapp' && url.pathname.startsWith('/status')) ||
    ((destination.name === 'instagram' || destination.name === 'facebook') &&
      /^\/reels?(?:\/|$)/.test(url.pathname));
  return tall ? { ...destination, format: '9:16' } : destination;
}
