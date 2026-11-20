import {
  clampRgb,
  converter,
  formatHex,
  wcagContrast,
  wcagLuminance,
} from 'culori';
import type { CardColor } from './model.ts';
import { tokens } from './tokens.ts';

const oklch = converter('oklch');
const rgb = converter('rgb');
const { presets, customMaxOklchL, customMinContrastWithWhite } =
  tokens.card.color;
const { customMinOklchL } = tokens.card.textColors;
export const THEMES = presets;
export const TEXT_COLORS = {
  white: tokens.card.textColors.White,
  mist: tokens.card.textColors.Mist,
  rose: tokens.card.textColors.Rose,
  sage: tokens.card.textColors.Sage,
  aqua: tokens.card.textColors.Aqua,
  lilac: tokens.card.textColors.Lilac,
} as const;
export const INK = tokens.card.color.presets.ink.deep;

export function toCardColor(value: string): CardColor {
  const color = oklch(value);
  if (!color || (color.alpha !== undefined && color.alpha !== 1))
    return THEMES.midnight;
  const light = formatHex(
    clampRgb({ ...color, l: 0.84, c: Math.min(color.c, 0.065) }),
  );
  let l = Math.min(color.l, customMaxOklchL - 0.005);
  let deep = formatHex(clampRgb({ ...color, l }));

  // Gamut mapping and 8-bit quantization can raise contrast luminance slightly.
  while (
    l > 0 &&
    (wcagContrast(deep, TEXT_COLORS.white) < customMinContrastWithWhite ||
      (oklch(deep)?.l ?? 0) > customMaxOklchL)
  ) {
    l = Math.max(0, l - 0.01);
    deep = formatHex(clampRgb({ ...color, l }));
  }
  return { deep, light };
}

export function toTextColor(value: string): string {
  const color = oklch(value);
  if (!color || (color.alpha !== undefined && color.alpha !== 1))
    return TEXT_COLORS.white;
  if (color.l >= customMinOklchL) return formatHex(clampRgb(color));
  return formatHex(
    clampRgb({
      ...color,
      l: customMinOklchL + 0.012,
      c: Math.min(color.c, 0.1),
    }),
  );
}

export function contrastWithLuminance(color: string, background: number) {
  const shade = wcagLuminance(color);
  return (
    (Math.max(shade, background) + 0.05) / (Math.min(shade, background) + 0.05)
  );
}

export function inkGradient(color: string, alpha: number) {
  const channels = rgb(color) ?? { r: 0, g: 0, b: 0 };
  return (
    'rgba(' +
    [channels.r, channels.g, channels.b]
      .map((channel) => Math.round(channel * 255))
      .join(',') +
    ',' +
    alpha.toFixed(4) +
    ')'
  );
}

export function guardText(
  photoLight: number,
  wantedText: string,
  wantedKey: string,
  style: 'box' | 'line' | 'color',
  alpha: number,
) {
  const background = (shade: number) =>
    photoLight * (1 - shade) + wcagLuminance(INK) * shade;
  const min = tokens.card.textColors.minContrast;
  let text = toTextColor(wantedText);
  let key = toTextColor(wantedKey);
  let shade = alpha;
  if (style === 'box' && wcagContrast(INK, key) < 7) key = TEXT_COLORS.white;

  const accessible = () =>
    contrastWithLuminance(text, background(shade)) >= min &&
    (style === 'box' || contrastWithLuminance(key, background(shade)) >= min);
  if (!accessible()) {
    shade = Math.max(shade, 0.9);
    if (contrastWithLuminance(text, background(shade)) < min)
      text = TEXT_COLORS.white;
    if (style !== 'box' && contrastWithLuminance(key, background(shade)) < min)
      key = TEXT_COLORS.white;
  }
  return { text, key, shade };
}
