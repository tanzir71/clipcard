const nativeDigits: Readonly<Record<string, string>> = {
  ar: 'arab',
  bn: 'beng',
  fa: 'arabext',
  mr: 'deva',
  my: 'mymr',
  ne: 'deva',
  ur: 'arabext',
};

export type Numerals = 'native' | 'western';

export function numberingSystem(lang: string, numerals: Numerals = 'native') {
  const language = lang.toLowerCase().split(/[-_]/)[0] ?? '';
  return numerals === 'western' ? 'latn' : (nativeDigits[language] ?? 'latn');
}
