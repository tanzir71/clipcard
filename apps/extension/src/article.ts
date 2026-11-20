import { extract, parseWebUrl } from '@clipcard/core';
import type { CardSource } from '@clipcard/core';

const maxHtmlBytes = 2 * 1024 * 1024;

export async function fetchArticle(
  address: string,
  parse: (html: string) => Document,
  request: typeof fetch = globalThis.fetch,
): Promise<CardSource | null> {
  try {
    const response = await request(address, {
      credentials: 'omit',
      redirect: 'follow',
      referrerPolicy: 'no-referrer',
      signal: AbortSignal.timeout(8000),
    });
    const mime = response.headers.get('content-type') ?? '';
    const finalUrl = parseWebUrl(response.url || address);
    const body = response.body;
    if (
      !response.ok ||
      !/^text\/html(?:\s*;|$)/i.test(mime) ||
      !finalUrl ||
      !body ||
      Number(response.headers.get('content-length')) > maxHtmlBytes
    ) {
      await body?.cancel();
      return null;
    }

    const charset = /;\s*charset\s*=\s*["']?([\w-]+)/i.exec(mime)?.[1];
    let decoder: TextDecoder;
    try {
      decoder = new TextDecoder(charset);
    } catch {
      decoder = new TextDecoder();
    }
    const reader = body.getReader();
    let used = 0;
    let html = '';
    try {
      for (;;) {
        const chunk = await reader.read();
        if (chunk.done) break;
        used += chunk.value.byteLength;
        if (used > maxHtmlBytes) {
          await reader.cancel();
          return null;
        }
        html += decoder.decode(chunk.value, { stream: true });
      }
      return extract(parse(html + decoder.decode()), finalUrl.href);
    } finally {
      reader.releaseLock();
    }
  } catch {
    return null;
  }
}
