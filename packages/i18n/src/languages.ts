import en from '../locales/en.json';
import bn from '../locales/bn.json';
import hi from '../locales/hi.json';
import ur from '../locales/ur.json';
import id from '../locales/id.json';
import fil from '../locales/fil.json';
import ar from '../locales/ar.json';
import es from '../locales/es.json';
import pt from '../locales/pt-BR.json';
import sw from '../locales/sw.json';
import am from '../locales/am.json';
import my from '../locales/my.json';

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

export let activeInterfaceLanguage: InterfaceLanguage = 'en';
export let interfaceStrings: UiStrings = en;

export function setInterfaceLanguage(lang: InterfaceLanguage) {
  activeInterfaceLanguage = lang;
  interfaceStrings = interfaceCopy(lang);
}

export function supportedInterfaceLanguage(value: string) {
  const locale = value.replaceAll('_', '-').toLowerCase();
  if (locale === 'tl' || locale.startsWith('tl-')) return 'fil';
  const base = locale.split('-')[0];
  return interfaceLanguages.find(
    (lang) =>
      lang.toLowerCase() === locale ||
      lang.toLowerCase().split('-')[0] === base,
  );
}

export function interfaceLanguage(value: string) {
  return supportedInterfaceLanguage(value) ?? 'en';
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
  const existing = copies.get(lang);
  if (existing) return existing;
  const copy = { ...en, ...draftCopy[lang] };
  copies.set(lang, copy);
  return copy;
}

const copies = new Map<InterfaceLanguage, UiStrings>();
const draftCopy = {
  en,
  bn,
  hi,
  ur,
  id,
  fil,
  ar,
  es,
  'pt-BR': pt,
  sw,
  am,
  my,
} satisfies Record<InterfaceLanguage, Partial<UiStrings>>;
