import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { cleanUrl, parseWebUrl, textFragment, unwrapUrl } from './url.ts';

type ResolveFixture = {
  name: string;
  in: string;
  out?: string;
  error?: string;
  network?: boolean;
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

describe('page-side URL helpers', () => {
  it.each(fixtures.resolve.filter(({ network }) => !network))(
    '$name',
    (row) => {
      if (row.error) {
        expect(() => unwrapUrl(row.in)).toThrow(row.error);
      } else {
        expect(cleanUrl(unwrapUrl(row.in)).url).toBe(row.out);
      }
    },
  );
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
