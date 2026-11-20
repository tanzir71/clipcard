import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import {
  cleanUrl,
  parseWebUrl,
  resolveUrl,
  textFragment,
  unwrapUrl,
} from './url.ts';

type ResolveFixture = {
  name: string;
  in: string;
  out?: string;
  error?: string;
  network?: boolean;
  redirectsTo?: string;
};
type FragmentFixture = {
  name: string;
  url: string;
  selection: string;
  out: string;
};
const fixtures = JSON.parse(
  readFileSync(new URL('../../../fixtures/urls.json', import.meta.url), 'utf8'),
) as {
  resolve: ResolveFixture[];
  textFragment: FragmentFixture[];
};

function redirectedResponse(url: string, body?: BodyInit) {
  const response = new Response(body);
  Object.defineProperty(response, 'url', { value: url });
  return response;
}

describe('resolveUrl', () => {
  it.each(fixtures.resolve)('$name', async (row) => {
    const request = vi.fn<typeof fetch>(async () =>
      redirectedResponse(row.redirectsTo ?? ''),
    );
    const result = resolveUrl(row.in, { fetch: request });
    if (row.error) await expect(result).rejects.toThrow(row.error);
    else await expect(result).resolves.toMatchObject({ url: row.out });
    expect(request).toHaveBeenCalledTimes(row.network ? 1 : 0);
  });

  it('strips tracking after resolving and discards the response body', async () => {
    const response = redirectedResponse(
      'https://example.net/article?utm_source=shortener&id=7',
      'body',
    );
    const request = vi.fn<typeof fetch>().mockResolvedValue(response);
    const result = await resolveUrl('https://news.google.com/rss/articles/1', {
      fetch: request,
      timeoutMs: 60,
    });
    expect(result).toEqual({
      url: 'https://example.net/article?id=7',
      removed: ['utm_source'],
      unwrapped: true,
    });
    expect(request).toHaveBeenCalledWith(
      'https://news.google.com/rss/articles/1',
      {
        credentials: 'omit',
        redirect: 'follow',
        referrerPolicy: 'no-referrer',
        signal: expect.any(AbortSignal) as AbortSignal,
      },
    );
    expect(response.bodyUsed).toBe(true);
  });

  it('keeps ordinary pages local and distinguishes cleaning from unwrapping', async () => {
    await expect(
      resolveUrl('https://news.google.com/home?utm_id=7'),
    ).resolves.toEqual({
      url: 'https://news.google.com/home',
      removed: ['utm_id'],
      unwrapped: false,
    });
  });

  it('falls back to a cleaned visible link if a shortener cannot be resolved', async () => {
    const request = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new DOMException('Timed out', 'TimeoutError'))
      .mockResolvedValueOnce(redirectedResponse('mailto:editor@example.net'));
    const input = 'https://t.co/example?utm_source=feed';
    const fallback = {
      url: 'https://t.co/example',
      removed: ['utm_source'],
      unwrapped: false,
    };
    await expect(resolveUrl(input, { fetch: request })).resolves.toEqual(
      fallback,
    );
    await expect(resolveUrl(input, { fetch: request })).resolves.toEqual(
      fallback,
    );
  });
});

describe('page-side URL helpers', () => {
  it.each(fixtures.textFragment)('$name', ({ url, selection, out }) => {
    expect(textFragment(url, selection)).toBe(out);
  });

  it('strips only tracking keys, keeps raw parameter encoding and retains repeat values', () => {
    expect(
      cleanUrl(
        'https://example.org/?%55TM_ID=yes&name=a%20b&id=7&id=8&ref_src=x',
      ),
    ).toEqual({
      url: 'https://example.org/?name=a%20b&id=7&id=8',
      removed: ['UTM_ID', 'ref_src'],
    });
    expect(cleanUrl('https://x.com/news?s=1&t=4').url).toBe(
      'https://x.com/news?s=1&t=4',
    );
  });

  it('unwraps known redirects without treating a similar host as a wrapper', () => {
    expect(unwrapUrl('https://href.li/?https%3A%2F%2Fexample.net%2Fa')).toBe(
      'https://example.net/a',
    );
    expect(
      unwrapUrl(
        'https://example-com.cdn.ampproject.org/c/s/example.com/a/amp?id=1',
      ),
    ).toBe('https://example.com/a/amp?id=1');
    expect(
      unwrapUrl(
        'https://l.facebook.com.example.org/l.php?u=https://example.net',
      ),
    ).toBe('https://l.facebook.com.example.org/l.php?u=https://example.net');
    expect(unwrapUrl('https://www.google.com/url?q=%E0%20')).toBe(
      'https://www.google.com/url?q=%E0%20',
    );
    expect(unwrapUrl('https://www.google.com/url?q=not-a-url')).toBe(
      'https://www.google.com/url?q=not-a-url',
    );
    expect(unwrapUrl('https://www.google.com/url?q=%25GG')).toBe(
      'https://www.google.com/url?q=%25GG',
    );
    let deeplyEncoded = 'https://example.net/article';
    for (let pass = 0; pass < 6; pass++)
      deeplyEncoded = encodeURIComponent(deeplyEncoded);
    const wrapper = 'https://www.google.com/url?q=' + deeplyEncoded;
    expect(unwrapUrl(wrapper)).toBe(wrapper);
  });

  it('rejects invalid URLs, non-web schemes and embedded credentials', () => {
    expect(parseWebUrl('https://user:secret@example.com/')).toBeNull();
    expect(parseWebUrl('not a url')).toBeNull();
    expect(
      parseWebUrl('javascript:undefined', 'https://example.net/a'),
    ).toBeNull();
    expect(
      parseWebUrl('../photo.jpg', 'https://example.net/news/01')?.href,
    ).toBe('https://example.net/photo.jpg');
  });

  it('replaces old fragments and retains quote commas and hyphens as literal text', () => {
    const source = 'https://example.org/article?utm_id=5#:~:text=old';
    expect(textFragment(source, '  ')).toBe('https://example.org/article');
    expect(textFragment(source, 'New-line,  first & last')).toBe(
      'https://example.org/article#:~:text=New%2Dline%2C%20first%20%26%20last',
    );
    expect(
      textFragment(
        source,
        'The first four words start this deliberately long excerpt and end with the very last four words.',
      ),
    ).toBe(
      'https://example.org/article#:~:text=The%20first%20four%20words,very%20last%20four%20words.',
    );
  });
});
