import { expect, it } from 'vitest';
import { capsPhrases } from './caps-phrases.ts';

it('prefers names and keeps the two highlighted phrases in reading order', () => {
  const headline = 'City Council opens River Market after winter storms';
  expect(
    capsPhrases(headline).map(([start, end]) => headline.slice(start, end)),
  ).toEqual(['City Council', 'River Market']);
});

it('falls back to the available headline words', () => {
  expect(capsPhrases('The storm')).toEqual([[4, 9]]);
  expect(capsPhrases('123')).toEqual([]);
});
