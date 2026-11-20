import { detectLang, detectScript, dirFor, langToScript } from './script.ts';
import type { Direction, Script } from './script.ts';
import { cleanTitle, outletFromHost } from './title.ts';
import { cleanUrl, parseWebUrl, unwrapUrl } from './url.ts';

export interface CardSource {
  canonicalUrl: string;
  title: string;
  image: string | null;
  siteName: string;
  favicon: string;
  lang: string;
  script: Script;
  dir: Direction;
  description: string | null;
  publishedAt: string | null;
  themeColor: string | null;
  isArticle: boolean;
}

type JsonObject = Record<string, unknown>;
const isObject = (value: unknown): value is JsonObject =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const asText = (value: unknown) =>
  typeof value === 'string' && value.trim() ? value.trim() : null;

function loadArticles(document: Document): JsonObject[] {
  const articleType = /(?:^|\/)(NewsArticle|Article|BlogPosting)$/;

  return [
    ...document.querySelectorAll('script[type="application/ld+json"]'),
  ].flatMap((script) => {
    let root: unknown;
    try {
      root = JSON.parse(script.textContent ?? '');
    } catch {
      return [];
    }
    const pending = Array.isArray(root) ? [...root] : [root];
    const articles: JsonObject[] = [];
    while (pending.length) {
      const item: unknown = pending.shift();
      if (!isObject(item)) continue;
      if (Array.isArray(item['@graph'])) pending.push(...item['@graph']);
      const type = item['@type'];
      const types = Array.isArray(type) ? type : [type];
      if (
        types.some(
          (entry: unknown) =>
            typeof entry === 'string' && articleType.test(entry),
        )
      ) {
        articles.push(item);
      }
    }
    return articles;
  });
}

export function imageUrl(raw: string | null, base?: string): string | null {
  if (!raw) return null;
  if (/^data:/i.test(raw)) {
    const dataImage =
      /^data:image\/(?:jpe?g|png|webp|avif);base64,([\w+/]+=*)$/i.exec(raw);
    // Base64 encodes three bytes in four characters.
    return dataImage && dataImage[1]!.length * 0.75 >= 10_240 ? raw : null;
  }
  const url = parseWebUrl(raw, base);
  return url && !/\.(svgz?|gif)$/i.test(url.pathname) ? url.href : null;
}

function biggestImage(document: Document, base: string) {
  let best: string | null = null;
  let maxWidth = 599;
  for (const img of document.querySelectorAll<HTMLImageElement>(
    'article img, main img',
  )) {
    const width = img.naturalWidth || Number(img.getAttribute('width'));
    if (width <= maxWidth) continue;
    const url = imageUrl(img.currentSrc || img.getAttribute('src'), base);
    if (url) {
      best = url;
      maxWidth = width;
    }
  }
  return best;
}

function structuredImage(value: unknown, base: string): string | null {
  const candidates = Array.isArray(value) ? value : [value];
  return (
    candidates
      .map((candidate: unknown) => ({
        url: imageUrl(
          isObject(candidate)
            ? (asText(candidate.contentUrl) ?? asText(candidate.url))
            : asText(candidate),
          base,
        ),
        width: isObject(candidate) ? Number(candidate.width) || 0 : 0,
      }))
      .filter(({ url }) => url !== null)
      .sort((a, b) => b.width - a.width)[0]?.url ?? null
  );
}

function faviconFromPage(document: Document, base: string): string {
  for (const selector of [
    'link[rel~="apple-touch-icon"]',
    'link[rel~="icon"]',
  ]) {
    let biggest: string | null = null;
    let size = -1;
    for (const link of document.querySelectorAll(selector)) {
      const href = asText(link.getAttribute('href'));
      const url = href && parseWebUrl(href, base);
      if (!url) continue;
      const dimensions =
        link.getAttribute('sizes')?.match(/\b\d+x\d+\b/gi) ?? [];
      const area = Math.max(
        0,
        ...dimensions.map((dimension) => {
          const [width, height] = dimension.toLowerCase().split('x');
          return Number(width) * Number(height);
        }),
      );
      if (area > size) {
        biggest = url.href;
        size = area;
      }
    }
    if (biggest) return biggest;
  }
  return new URL('/favicon.ico', base).href;
}

export function extract(document: Document, finalUrl: string): CardSource {
  const pageUrl = unwrapUrl(finalUrl);
  const page = new URL(pageUrl);
  const meta = (key: string) =>
    asText(
      document
        .querySelector(`meta[property="${key}"],meta[name="${key}"]`)
        ?.getAttribute('content'),
    );
  const canonicalLink = asText(
    document.querySelector('link[rel~="canonical"]')?.getAttribute('href'),
  );
  const canonicalCandidates = [canonicalLink, meta('og:url')];
  const canonical = canonicalCandidates
    .map((value) => (value ? parseWebUrl(value, pageUrl) : null))
    .find((url) => url !== null);
  const canonicalUrl = cleanUrl(unwrapUrl(canonical?.href ?? pageUrl)).url;
  const article = loadArticles(document)[0];
  const publisher = article?.publisher;
  const siteName =
    meta('og:site_name') ??
    (isObject(publisher) ? asText(publisher.name) : asText(publisher)) ??
    meta('application-name') ??
    outletFromHost(page.hostname);
  const rawTitle =
    meta('og:title') ??
    meta('twitter:title') ??
    asText(article?.headline) ??
    asText(document.title) ??
    siteName;
  const title = cleanTitle(rawTitle, siteName, page.hostname) || siteName;
  const image =
    ['og:image:secure_url', 'og:image', 'twitter:image']
      .map((key) => imageUrl(meta(key), pageUrl))
      .find((url) => url !== null) ??
    structuredImage(article?.image, pageUrl) ??
    biggestImage(document, pageUrl);
  const explicitLang =
    document.documentElement?.getAttribute('lang') ?? meta('og:locale');
  const lang = detectLang(title, explicitLang);
  const script = detectScript(title);
  const direction = document.documentElement
    ?.getAttribute('dir')
    ?.toLowerCase();

  return {
    canonicalUrl,
    title,
    image,
    siteName,
    favicon: faviconFromPage(document, pageUrl),
    lang,
    dir: direction === 'rtl' || direction === 'ltr' ? direction : dirFor(lang),
    description: meta('og:description') ?? meta('description'),
    publishedAt:
      meta('article:published_time') ?? asText(article?.datePublished),
    themeColor: meta('theme-color'),
    script:
      script === 'latin' && !/\p{Script=Latin}/u.test(title)
        ? langToScript(lang)
        : script,
    isArticle:
      meta('og:type')?.toLowerCase() === 'article' ||
      Boolean(article) ||
      Boolean(document.querySelector('article h1')),
  };
}
