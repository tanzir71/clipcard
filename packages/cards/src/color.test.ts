import { converter, wcagContrast } from 'culori';
import { expect, it } from 'vitest';
import { guardText, INK, toCardColor, toTextColor } from './color.ts';
import { fitText } from './fit-text.ts';
import { qrGeometry } from './qr.ts';
import { fade, smootherstep } from './texture.ts';

const colors = [
  '#ff4444',
  '#ffe804',
  '#a1faef',
  '#9000ff',
  '#feaffe',
  '#ffffff',
  '#000000',
  '#04be01',
  '#a2f34c',
  '#31089f',
  '#ea5923',
  '#4291b7',
  '#b15a2e',
  '#f2fadc',
  '#66ff42',
  '#128bae',
  '#013f99',
  '#332211',
  '#ff6134',
  '#444444',
];
it.each(colors)(
  'clamps %s deep enough for white and light enough for text',
  (hex) => {
    const toOklch = converter('oklch');
    expect(wcagContrast(toCardColor(hex).deep, '#fff')).toBeGreaterThanOrEqual(
      7,
    );
    expect(toOklch(toCardColor(hex).deep)?.l).toBeLessThanOrEqual(0.32);
    expect(toOklch(toTextColor(hex))?.l).toBeGreaterThanOrEqual(0.78);
  },
);

it('strengthens the shade against white imagery and guards box contrast', () => {
  const result = guardText(1, '#a9bcdf', '#a9bcdf', 'color', 0.86);
  expect(result.shade).toBeGreaterThan(0.86);
  expect(
    wcagContrast(INK, guardText(1, '#fff', '#161616', 'box', 0.86).key),
  ).toBeGreaterThanOrEqual(7);
});

it('fits by searching the maximum size and falls back to the minimum for overflow', () => {
  expect(fitText(30, 65, (size) => size <= 52)).toBe(52);
  expect(fitText(30, 65, () => false)).toBe(30);
  expect(fitText(30, 65, () => true)).toBe(65);
});

it('grows one-path QR tiles with longer sources and bounds their size', () => {
  const short = qrGeometry('https://example.org', 104);
  const long = qrGeometry('https://example.org/' + 'long-path/'.repeat(7), 104);
  expect(short.path.length).toBeGreaterThan(0);
  expect(long.size).toBeGreaterThan(short.size);
  expect(long.size).toBeLessThanOrEqual(152);
  expect(short.module).toBeGreaterThan(3.19);
});

it('generates the specified smootherstep ramp with 17 samples', () => {
  expect([smootherstep(-1), smootherstep(0.5), smootherstep(2)]).toEqual([
    0, 0.5, 1,
  ]);
  expect(fade('#000', 0.86, 'to top').match(/rgba\(/g)).toHaveLength(17);
});
