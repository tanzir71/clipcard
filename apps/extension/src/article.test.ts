import { readFileSync, readdirSync } from 'node:fs';
import { DOMParser } from 'linkedom';
import { expect, it, vi } from 'vitest';
import { fetchArticle } from './article.ts';

const fixtures = new URL('../../../fixtures/', import.meta.url);
const cases = readdirSync(new URL('expected/', fixtures)).filter((entry) =>
  entry.endsWith('.json'),
);
const parse = (html: string) =>
  new DOMParser().parseFromString(html, 'text/html') as unknown as Document;

it.each(cases)('fetches and extracts %s from the final URL', async (file) => {
  const reference = JSON.parse(
    readFileSync(new URL('expected/' + file, fixtures), 'utf8'),
  ) as { _finalUrl: string } & Record<string, unknown>;
  const response = new Response(
    readFileSync(
      new URL('pages/' + file.replace(/\.json$/, '.html'), fixtures),
    ),
    { headers: { 'content-type': 'text/html; charset=utf-8' } },
  );
  Object.defineProperty(response, 'url', { value: reference._finalUrl });
  const request = vi.fn<typeof fetch>().mockResolvedValue(response);
  const visibleUrl = 'https://example.net/visible';
  await expect(fetchArticle(visibleUrl, parse, request)).resolves.toEqual(
    Object.fromEntries(
      Object.entries(reference).filter(([key]) => !key.startsWith('_')),
    ),
  );
  expect(request).toHaveBeenCalledWith(
    visibleUrl,
    expect.objectContaining({
      credentials: 'omit',
      redirect: 'follow',
      referrerPolicy: 'no-referrer',
    }),
  );
});

it('honors the declared charset for older pages', async () => {
  const html = '<html lang="fr"><head><title>Café</title></head></html>';
  const response = new Response(
    Uint8Array.from(html, (character) => character.charCodeAt(0)),
    { headers: { 'content-type': 'text/html; charset=windows-1252' } },
  );
  await expect(
    fetchArticle('https://example.net', parse, async () => response),
  ).resolves.toMatchObject({ title: 'Café' });
});

it('rejects non-HTML, denied, oversized and unavailable pages without parsing', async () => {
  const tooLarge = 2 * 1024 * 1024 + 1;
  const mime = { 'content-type': 'text/html' };
  const parser = vi.fn(parse);
  const attempts = [
    new Response('image', { headers: { 'content-type': 'image/png' } }),
    new Response('denied', { status: 403, headers: mime }),
    new Response('body', {
      headers: { ...mime, 'content-length': String(tooLarge) },
    }),
    new Response(new Uint8Array(tooLarge), { headers: mime }),
  ];
  for (const attempt of attempts) {
    await expect(
      fetchArticle('https://example.net', parser, async () => attempt),
    ).resolves.toBeNull();
    expect(attempt.bodyUsed).toBe(true);
  }
  await expect(
    fetchArticle(
      'https://example.net',
      parser,
      vi
        .fn<typeof fetch>()
        .mockRejectedValue(new DOMException('Timed out', 'TimeoutError')),
    ),
  ).resolves.toBeNull();
  expect(parser).not.toHaveBeenCalled();
});
