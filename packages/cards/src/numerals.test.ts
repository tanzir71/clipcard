import { expect, it } from 'vitest';
import { numberingSystem } from './numerals.ts';

it.each([
  ['ar', '٢٠٢٦'],
  ['bn-BD', '২০২৬'],
  ['fa-IR', '۲۰۲۶'],
  ['hi', '2026'],
  ['ne-NP', '२०२६'],
  ['mr', '२०२६'],
  ['my', '၂၀၂၆'],
  ['ur-PK', '۲۰۲۶'],
])('formats years in %s with the card numeral choice', (lang, expected) => {
  const format = (numbers: string) =>
    new Intl.NumberFormat(lang, {
      useGrouping: false,
      numberingSystem: numbers,
    }).format(2026);
  expect(format(numberingSystem(lang))).toBe(expected);
  expect(format(numberingSystem(lang, 'western'))).toBe('2026');
});
