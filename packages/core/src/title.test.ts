import { expect, it } from 'vitest';
import { cleanTitle } from './title.ts';
import { slugHeadline } from './slug.ts';

it.each([
  ['News | Delta Dispatch', null, 'deltadispatch.news', 'News'],
  ['News - Delta Dispatch', 'Delta Dispatch', '', 'News'],
  ['News – Delta Dispatch', 'Delta Dispatch', '', 'News'],
  ['News — Delta Dispatch', 'Delta Dispatch', '', 'News'],
  ['Delta Dispatch: News', null, 'www.deltadispatch.news', 'News'],
  ['Delta Dispatch: News | Delta Dispatch', 'Delta Dispatch', '', 'News'],
  [
    'The law: a new attempt — what happens next',
    'Delta Dispatch',
    '',
    'The law: a new attempt — what happens next',
  ],
  [
    'সিলেটে চায়ের গল্প - নদীবার্তা',
    'নদীবার্তা',
    'nodibarta.news',
    'সিলেটে চায়ের গল্প',
  ],
  ['  This  is\n a    headline  ', '', '', 'This is a headline'],
  ['e\u0301'.repeat(150), null, '', 'e\u0301'.repeat(140)],
])(
  'cleans a title without removing real headline punctuation',
  (title, site, host, expected) => {
    expect(cleanTitle(title!, site, host!)).toBe(expected);
  },
);

it.each([
  [
    'https://www.example.net/news/2026/11/20/river-buses-cut-commutes-in-half-12345.html',
    'River Buses Cut Commutes in Half',
  ],
  ['https://example.net/story_2026-11-20_how-to-share', 'Story How to Share'],
  ['https://example.net/01234567/', 'Example'],
  ['https://example.net/' + encodeURIComponent('নতুন_খবর'), 'নতুন খবর'],
  ['mailto:hi@example.net', null],
])('derives a headline locally from %s', (url, expected) => {
  expect(slugHeadline(url)).toBe(expected);
});
