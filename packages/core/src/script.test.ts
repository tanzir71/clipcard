import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { detectLang, detectScript, dirFor, langToScript } from './script.ts';
import type { Script } from './script.ts';

const data = JSON.parse(
  readFileSync(
    new URL('../../../fixtures/headlines.json', import.meta.url),
    'utf8',
  ),
) as {
  samples: { lang: string; text: string; dir: string }[];
};
const nonLatin: Record<string, Script> = {
  bn: 'bengali',
  hi: 'devanagari',
  ur: 'arabic',
  ar: 'arabic',
  am: 'ethiopic',
  my: 'myanmar',
  ne: 'devanagari',
  ta: 'tamil',
  te: 'telugu',
  mr: 'devanagari',
  ml: 'malayalam',
  kn: 'kannada',
  gu: 'gujarati',
  pa: 'gurmukhi',
  si: 'sinhala',
  fa: 'arabic',
  uk: 'cyrillic',
  th: 'thai',
  or: 'odia',
};

it.each(data.samples)(
  'detects the script and preserves a supplied $lang locale',
  ({ lang, text, dir }) => {
    expect(detectScript(text)).toBe(nonLatin[lang] ?? 'latin');
    expect(langToScript(lang)).toBe(nonLatin[lang] ?? 'latin');
    expect(detectLang(text, lang)).toBe(lang);
    expect(dirFor(lang)).toBe(dir);
  },
);

it('infers script and direction when the page has no language metadata', () => {
  const examples = ['bn', 'hi', 'ur', 'ar', 'fa', 'ta'];
  for (const code of examples) {
    const item = data.samples.find(({ lang }) => lang === code)!;
    expect(detectLang(item.text)).toBe(code);
  }
  expect(detectScript('2026 ✂')).toBe('latin');
  expect(detectLang('A headline', 'invalid language name')).toBe('en');
  expect(dirFor('az-Arab')).toBe('rtl');
});
