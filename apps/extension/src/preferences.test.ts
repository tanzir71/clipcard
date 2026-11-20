import { expect, it } from 'vitest';
import { destinationFor, siteKey } from './preferences.ts';

it('keys preferences by registrable publisher domain', () => {
  expect(siteKey('https://news.example.co.uk/a')).toBe('site:example.co.uk');
  expect(siteKey('https://first.github.io/a')).toBe('site:first.github.io');
  expect(siteKey('http://localhost:4321/a')).toBe('site:localhost');
  expect(siteKey('chrome://extensions')).toBeNull();
});

it('picks a share format from the destination and keeps other sites neutral', () => {
  expect(destinationFor('https://www.facebook.com/')).toEqual({
    name: 'facebook',
    format: '4:5',
  });
  expect(destinationFor('https://www.linkedin.com/feed/')).toEqual({
    name: 'linkedin',
    format: '16:9',
  });
  expect(destinationFor('https://www.youtube.com/shorts/abc')).toEqual({
    name: 'youtube',
    format: '9:16',
  });
  expect(destinationFor('https://www.instagram.com/reel/abc')).toEqual({
    name: 'instagram',
    format: '9:16',
  });
  expect(destinationFor('https://x.com.example.net/')).toBeUndefined();
});
