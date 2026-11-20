import { expect, it } from 'vitest';
import { chooseTemplate, getOldNewsYear, modelFromSource } from './model.ts';
import type { CardSource } from '@clipcard/core';

const source: CardSource = {
  title: 'New electric river buses cut city commutes in half',
  canonicalUrl: 'https://example.net/city/river-bus',
  image: null,
  siteName: 'Example',
  favicon: 'https://example.net/favicon.ico',
  lang: 'en',
  script: 'latin',
  dir: 'ltr',
  description: null,
  publishedAt: '2024-11-20T01:00:00+06:00',
  themeColor: null,
  isArticle: true,
};
const now = Date.parse('2026-11-20T12:00:00Z');

it('derives a sourced quote with a text fragment and old-news year', () => {
  const model = modelFromSource(source, {
    image: null,
    selection: 'A real excerpt.',
    now,
  });
  expect(model.headline).toBe('A real excerpt.');
  expect(model.qrUrl).toBe(
    'https://example.net/city/river-bus#:~:text=A%20real%20excerpt.',
  );
  expect(model.oldNewsYear).toBe(2024);
  expect(chooseTemplate(model)).toBe('quote');
});

it('follows the automatic card template priority', () => {
  const solid = modelFromSource(source, { image: null, now });
  const photo = { ...solid, image: '/source.jpg' };
  expect(chooseTemplate(solid)).toBe('solid');
  expect(chooseTemplate(photo)).toBe('header');
  expect(chooseTemplate({ ...photo, headline: 'a'.repeat(91) })).toBe('split');
  expect(chooseTemplate({ ...photo, imageIsPortrait: true })).toBe('overlay');
  expect(getOldNewsYear('2025-11-20T12:00:00Z', now)).toBeNull();
  expect(getOldNewsYear('unknown', now)).toBeNull();
});
