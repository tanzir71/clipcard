export const BASIC_SCRIPTS = {
  latin: /\p{Script=Latin}/u,
  bengali: /\p{Script=Bengali}/u,
  devanagari: /\p{Script=Devanagari}/u,
  arabic: /\p{Script=Arabic}/u,
  tamil: /\p{Script=Tamil}/u,
  telugu: /\p{Script=Telugu}/u,
  malayalam: /\p{Script=Malayalam}/u,
  kannada: /\p{Script=Kannada}/u,
  gujarati: /\p{Script=Gujarati}/u,
  gurmukhi: /\p{Script=Gurmukhi}/u,
  odia: /\p{Script=Oriya}/u,
  sinhala: /\p{Script=Sinhala}/u,
  myanmar: /\p{Script=Myanmar}/u,
  ethiopic: /\p{Script=Ethiopic}/u,
  cyrillic: /\p{Script=Cyrillic}/u,
  thai: /\p{Script=Thai}/u,
} as const;

export type Script = keyof typeof BASIC_SCRIPTS;
export type Direction = 'ltr' | 'rtl';

const DEFAULT_LANG = {
  latin: 'en',
  bengali: 'bn',
  devanagari: 'hi',
  arabic: 'ar',
  tamil: 'ta',
  telugu: 'te',
  malayalam: 'ml',
  kannada: 'kn',
  gujarati: 'gu',
  gurmukhi: 'pa',
  odia: 'or',
  sinhala: 'si',
  myanmar: 'my',
  ethiopic: 'am',
  cyrillic: 'uk',
  thai: 'th',
} as const satisfies Record<Script, string>;

const OTHER_LANG_SCRIPTS: Readonly<Record<string, Script>> = {
  ar: 'arabic',
  fa: 'arabic',
  ur: 'arabic',
  ps: 'arabic',
  sd: 'arabic',
  ne: 'devanagari',
  mr: 'devanagari',
  ru: 'cyrillic',
  be: 'cyrillic',
};

const SCRIPT_SUBTAGS: Readonly<Record<string, Script>> = {
  latn: 'latin',
  arab: 'arabic',
  cyrl: 'cyrillic',
  deva: 'devanagari',
};

const defaultEntries = Object.entries(DEFAULT_LANG) as [Script, string][];
const scriptEntries = Object.entries(BASIC_SCRIPTS) as [Script, RegExp][];
const languageToken = (lang: string) =>
  lang.replaceAll('_', '-').toLowerCase().split('-')[0] ?? '';

export function langToScript(lang: string): Script {
  const tokens = lang.toLowerCase().split(/[-_]/);
  const explicitScript =
    tokens.length > 1 ? SCRIPT_SUBTAGS[tokens[1]!] : undefined;
  const code = languageToken(lang);
  return (
    explicitScript ??
    OTHER_LANG_SCRIPTS[code] ??
    defaultEntries.find(([, entry]) => entry === code)?.[0] ??
    'latin'
  );
}

export function detectScript(text: string): Script {
  const counts = new Map<Script, number>();
  for (const character of text) {
    if (!/\p{Letter}/u.test(character)) continue;
    const script = scriptEntries.find(([, pattern]) =>
      pattern.test(character),
    )?.[0];
    if (script) counts.set(script, (counts.get(script) ?? 0) + 1);
  }
  let winner: Script = 'latin';
  for (const [script, count] of counts)
    if (count > (counts.get(winner) ?? 0)) winner = script;
  return winner;
}

export function detectLang(text: string, htmlLang?: string | null): string {
  const supplied = htmlLang?.trim().replaceAll('_', '-');
  if (supplied && supplied !== 'und') {
    try {
      return Intl.getCanonicalLocales(supplied)[0] ?? supplied;
    } catch {
      // Some sites use a display name in place of a locale code.
    }
  }
  const script = detectScript(text);
  if (script === 'arabic') {
    if (/[ٹڈڑںےۂھ]/u.test(text)) return 'ur';
    if (/[پچژگکی\u200C]/u.test(text)) return 'fa';
  }
  return DEFAULT_LANG[script];
}

export function dirFor(lang: string): Direction {
  const code = languageToken(lang);
  return langToScript(lang) === 'arabic' || code === 'he' || code === 'yi'
    ? 'rtl'
    : 'ltr';
}
