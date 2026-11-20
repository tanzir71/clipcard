import { interfaceLanguages } from '@clipcard/i18n';
import type { InterfaceLanguage } from '@clipcard/i18n';
import { landingStrings } from '@clipcard/i18n/landing';
import { RELEASED } from './config';
import { sitePath } from './site';

export type LocalizedPage = 'home' | 'privacy';
export const landingLocales = RELEASED.languages
  ? interfaceLanguages
  : (['en'] as const);

const ogLocales = {
  en: 'en_US',
  am: 'am_ET',
  ar: 'ar_AR',
  bn: 'bn_BD',
  es: 'es_ES',
  fil: 'fil_PH',
  hi: 'hi_IN',
  id: 'id_ID',
  my: 'my_MM',
  'pt-BR': 'pt_BR',
  sw: 'sw_KE',
  ur: 'ur_PK',
} satisfies Record<InterfaceLanguage, string>;

export function ogLocale(locale: InterfaceLanguage) {
  return ogLocales[locale];
}

export function localizedPaths() {
  return landingLocales
    .filter((locale) => locale !== 'en')
    .map((locale) => ({
      params: { lang: locale.toLowerCase() },
      props: { locale },
    }));
}

export function homePath(locale: InterfaceLanguage, suffix = '') {
  return sitePath((locale === 'en' ? '' : locale.toLowerCase() + '/') + suffix);
}

export function localizedPath(locale: InterfaceLanguage, page: LocalizedPage) {
  return homePath(locale, page === 'home' ? '' : 'privacy/');
}

export function appPath(locale: InterfaceLanguage) {
  return sitePath('app/' + (locale === 'en' ? '' : '?lang=' + locale));
}

export function alternates(page: LocalizedPage, site: URL | undefined) {
  return [...landingLocales, 'x-default' as const].map((lang) => ({
    lang,
    url: new URL(localizedPath(lang === 'x-default' ? 'en' : lang, page), site),
  }));
}

export function landingCopy(locale: InterfaceLanguage) {
  const copy = landingStrings(locale);
  const faq = copy.faq.map((item, index) =>
    RELEASED.languages && index === 2
      ? { ...item, answer: copy.languageSupport }
      : item,
  );
  if (RELEASED.videoClips) faq.push(copy.videoFaq);
  return { ...copy, faq };
}
