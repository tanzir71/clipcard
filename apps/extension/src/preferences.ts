import { parseWebUrl } from '@clipcard/core';
import type { CardDraft } from '@clipcard/ui';
import { getDomain } from 'tldts';
import { browser } from 'wxt/browser';
import type { Destination, SitePrefs } from './messages.ts';

export function siteKey(address: string): string | null {
  const host = parseWebUrl(address)?.hostname;
  if (!host) return null;
  return 'site:' + (getDomain(host, { allowPrivateDomains: true }) ?? host);
}

export async function sitePrefs(address: string): Promise<SitePrefs> {
  const key = siteKey(address);
  if (!key) return {};
  const prefs = (await browser.storage.local.get(key))[key];
  return (prefs as SitePrefs | undefined) ?? {};
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
