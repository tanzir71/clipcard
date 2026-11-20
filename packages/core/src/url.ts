import { isTracker } from './trackers.ts';
import { needsRedirect, wrappedTarget } from './wrappers.ts';

export function parseWebUrl(input: string, base?: string): URL | null {
  try {
    const url = new URL(input, base);
    if (
      (url.protocol === 'https:' || url.protocol === 'http:') &&
      !url.username &&
      !url.password
    ) {
      return url;
    }
  } catch {
    return null;
  }
  return null;
}

function webUrl(input: string): URL {
  const url = parseWebUrl(input);
  if (!url) throw new Error('unsupported-url');
  return url;
}

function decodeTarget(value: string): URL | null {
  let target = value;
  for (let attempt = 0; attempt <= 3; attempt++) {
    const parsed = parseWebUrl(target);
    if (parsed) return parsed;

    try {
      const decoded = decodeURIComponent(target);
      if (decoded === target) break;
      target = decoded;
    } catch {
      break;
    }
  }
  return null;
}

export function unwrapUrl(input: string): string {
  let url = webUrl(input);
  for (let pass = 0; pass < 3; pass++) {
    const target = wrappedTarget(url);
    if (!target) break;

    const next = decodeTarget(target);
    if (!next || next.href === url.href) break;
    url = next;
  }
  return url.href;
}

export function cleanUrl(input: string): { url: string; removed: string[] } {
  const url = webUrl(input);
  const removed: string[] = [];
  const parts = url.search
    .slice(1)
    .split('&')
    .filter(Boolean)
    .filter((part) => {
      const pair = new URLSearchParams(part).entries().next().value;
      if (!pair || !isTracker(url.hostname, url.pathname, pair[0], pair[1]))
        return true;
      removed.push(pair[0]);
      return false;
    });
  url.search = parts.join('&');
  if (!url.hash.startsWith('#:~:text=') && !/^#t=\d{1,12}$/.test(url.hash))
    url.hash = '';
  return { url: url.href, removed };
}

export async function resolveUrl(
  input: string,
  {
    fetch: request = globalThis.fetch,
    timeoutMs = 5000,
  }: {
    fetch?: typeof fetch;
    timeoutMs?: number;
  } = {},
): Promise<{ url: string; removed: string[]; unwrapped: boolean }> {
  const original = webUrl(input).href;
  let target = webUrl(unwrapUrl(original));
  if (needsRedirect(target)) {
    try {
      const response = await request(target.href, {
        credentials: 'omit',
        redirect: 'follow',
        referrerPolicy: 'no-referrer',
        signal: AbortSignal.timeout(timeoutMs),
      });
      void response.body?.cancel().catch(() => undefined);
      const redirected = parseWebUrl(response.url);
      if (redirected) target = redirected;
    } catch {
      // The visible link remains a usable source when resolution fails.
    }
  }
  return {
    ...cleanUrl(target.href),
    unwrapped: target.href !== original,
  };
}

const encodeText = (text: string) =>
  encodeURIComponent(text.replace(/[\uD800-\uDFFF]/gu, '�')).replaceAll(
    '-',
    '%2D',
  );

export function textFragment(
  input: string,
  selection: string,
  {
    compactAfter = 80,
    edgeWords = 4,
  }: { compactAfter?: number; edgeWords?: number } = {},
): string {
  const url = webUrl(cleanUrl(unwrapUrl(input)).url);
  const text = selection.trim().replace(/\s+/gu, ' ');
  if (!text) {
    url.hash = '';
    return url.href;
  }

  const words = text.split(' ');
  let directive = encodeText(text);
  if ([...text].length > compactAfter && words.length > 8) {
    const end = words.slice(-edgeWords);
    if (/^(a|an|one|the)$/i.test(end[0]!)) end.shift();
    directive = [words.slice(0, edgeWords).join(' '), end.join(' ')]
      .map(encodeText)
      .join(',');
  }
  url.hash = ':~:text=' + directive;
  return url.href;
}
