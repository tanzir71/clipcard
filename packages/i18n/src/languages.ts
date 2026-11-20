import en from '../locales/en.json';
import bn from '../locales/bn.json';

export const interfaceLanguages = [
  'en',
  'bn',
  'hi',
  'ur',
  'id',
  'fil',
  'ar',
  'es',
  'pt-BR',
  'sw',
  'am',
  'my',
] as const;

export const cardLanguages = [
  ...interfaceLanguages,
  'ne',
  'ta',
  'te',
  'mr',
  'ml',
  'kn',
  'gu',
  'pa',
  'si',
  'ha',
  'yo',
  'fr',
  'fa',
  'uk',
  'vi',
  'th',
  'ms',
  'or',
] as const;

export type InterfaceLanguage = (typeof interfaceLanguages)[number];
export type CardLanguage = (typeof cardLanguages)[number];
export type UiStrings = typeof en;

export function interfaceLanguage(value: string) {
  const locale = value.replaceAll('_', '-').toLowerCase();
  if (locale === 'tl' || locale.startsWith('tl-')) return 'fil';
  const base = locale.split('-')[0];
  return (
    interfaceLanguages.find(
      (lang) =>
        lang.toLowerCase() === locale ||
        lang.toLowerCase().split('-')[0] === base,
    ) ?? 'en'
  );
}

export function languageName(lang: CardLanguage) {
  return (
    new Intl.DisplayNames([lang], {
      type: 'language',
      languageDisplay: 'standard',
    }).of(lang) ?? lang
  );
}

export function interfaceCopy(lang: InterfaceLanguage): UiStrings {
  return lang === 'bn' ? { ...en, ...bn } : en;
}
