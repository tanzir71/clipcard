import { z } from 'zod';
import { collectionDatabase } from './collection-db.ts';

export type GifProvider = 'klipy' | 'giphy';
export type GifPreference = GifProvider | 'off';
const keyName = { klipy: 'gifKeyKlipy', giphy: 'gifKeyGiphy' } as const;
const env = (import.meta as ImportMeta & { env?: Record<string, string> }).env;
const keyDefaults = {
  klipy: env?.VITE_KLIPY_KEY ?? '',
  giphy: env?.VITE_GIPHY_KEY ?? '',
};

export const gifOrigins = {
  klipy: ['https://api.klipy.com/*', 'https://*.klipy.com/*'],
  giphy: ['https://api.giphy.com/*', 'https://*.giphy.com/*'],
} satisfies Record<GifProvider, string[]>;

export interface GifResult {
  id: string;
  title: string;
  href: string;
  preview: string;
  video: boolean;
  creator?: string;
}

export async function readGifSettings() {
  const db = await collectionDatabase();
  const [provider, klipy, giphy] = await Promise.all([
    db.get('prefs', 'gifProvider'),
    db.get('prefs', keyName.klipy),
    db.get('prefs', keyName.giphy),
  ]);
  return {
    provider:
      provider === 'off' || provider === 'giphy'
        ? provider
        : ('klipy' as GifPreference),
    klipy: klipy ?? '',
    giphy: giphy ?? '',
    defaultKeys: {
      klipy: Boolean(keyDefaults.klipy),
      giphy: Boolean(keyDefaults.giphy),
    },
  };
}

export async function setGifProvider(provider: GifPreference) {
  const db = await collectionDatabase();
  await db.put('prefs', provider, 'gifProvider');
}

export async function setGifKey(provider: GifProvider, key: string) {
  const db = await collectionDatabase();
  await db.put('prefs', key.trim().slice(0, 256), keyName[provider]);
}

export async function gifKey(provider: GifProvider) {
  const db = await collectionDatabase();
  return (await db.get('prefs', keyName[provider])) || keyDefaults[provider];
}

const text = z.string().max(2200).optional();
const rendition = z.object({ url: text, mp4: text });
const giphyResult = z.object({
  id: z.string().min(1).max(200),
  title: text,
  url: text,
  username: text,
  images: z.object({
    fixed_height: rendition.optional(),
    fixed_width: rendition.optional(),
    original: rendition.optional(),
  }),
});
const content = z.union([z.string(), z.object({ url: text })]).optional();
const klipyFormat = z.object({ mp4: content, gif: content, webp: content });
const klipyResult = z.object({
  slug: z.string().min(1).max(200),
  id: z.union([z.string(), z.number()]).optional(),
  title: text,
  url: text,
  username: text,
  file: z.object({
    sm: klipyFormat.optional(),
    md: klipyFormat.optional(),
    hd: klipyFormat.optional(),
    mp4: content,
    gif: content,
    webp: content,
  }),
});

function safeUrl(value: string | undefined, provider: GifProvider) {
  if (!value) return;
  try {
    const url = new URL(value);
    if (
      url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      (url.hostname === provider + '.com' ||
        url.hostname.endsWith('.' + provider + '.com'))
    )
      return value;
  } catch {
    return;
  }
}

function extractResults(payload: unknown, provider: GifProvider): GifResult[] {
  if (provider === 'giphy') {
    const list = z.object({ data: z.array(z.unknown()) }).parse(payload).data;
    return list.slice(0, 32).flatMap<GifResult>((value) => {
      const parsed = giphyResult.safeParse(value);
      if (!parsed.success) return [];
      const { title, id, url, images, username } = parsed.data;
      const asset =
        images.fixed_height ?? images.fixed_width ?? images.original;
      const preview = safeUrl(asset?.mp4 ?? asset?.url, provider);
      const href = safeUrl(url, provider);
      return preview && href
        ? [
            {
              id,
              title: title ?? '',
              href,
              preview,
              video: Boolean(asset?.mp4),
              creator: username,
            },
          ]
        : [];
    });
  }

  const list = z
    .object({ data: z.object({ data: z.array(z.unknown()) }) })
    .parse(payload).data.data;
  return list.slice(0, 32).flatMap<GifResult>((value) => {
    const parsed = klipyResult.safeParse(value);
    if (!parsed.success) return [];
    const { slug, title, url, file, username } = parsed.data;
    const asset = file.sm ?? file.md ?? file.hd ?? file;
    const selected = asset.mp4 ?? asset.webp ?? asset.gif;
    const preview = safeUrl(
      typeof selected === 'string' ? selected : selected?.url,
      provider,
    );
    const href =
      safeUrl(url, provider) ??
      'https://klipy.com/gifs/' + encodeURIComponent(slug);
    return preview
      ? [
          {
            id: slug,
            title: title ?? '',
            href,
            preview,
            video: Boolean(asset.mp4),
            creator: username,
          },
        ]
      : [];
  });
}

export async function searchGifs(
  provider: GifProvider,
  input: string,
  key: string,
  locale: string,
  signal?: AbortSignal,
) {
  const query = input.trim().slice(0, 50);
  if (!query || !key) return [];
  const language = locale.split('-')[0] ?? 'en';
  const url =
    provider === 'giphy'
      ? new URL('https://api.giphy.com/v1/gifs/search')
      : new URL(
          'https://api.klipy.com/api/v1/' +
            encodeURIComponent(key) +
            '/gifs/search',
        );
  url.search = new URLSearchParams(
    provider === 'giphy'
      ? { api_key: key, q: query, limit: '24', rating: 'pg-13', lang: language }
      : {
          q: query,
          page: '1',
          per_page: '24',
          content_filter: 'medium',
          locale: language,
          format_filter: 'mp4,webp,gif',
        },
  ).toString();
  const timeout = AbortSignal.timeout(12000);
  const response = await fetch(url, {
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    credentials: 'omit',
    cache: 'no-store',
    referrerPolicy: 'no-referrer',
  });
  if (!response.ok) throw new Error('gif-provider');
  return extractResults(await response.json(), provider);
}
