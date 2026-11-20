import en from '../locales/landing/en.json';
import am from '../locales/landing/am.json';
import ar from '../locales/landing/ar.json';
import bn from '../locales/landing/bn.json';
import es from '../locales/landing/es.json';
import fil from '../locales/landing/fil.json';
import hi from '../locales/landing/hi.json';
import id from '../locales/landing/id.json';
import my from '../locales/landing/my.json';
import pt from '../locales/landing/pt-BR.json';
import sw from '../locales/landing/sw.json';
import ur from '../locales/landing/ur.json';
import type { InterfaceLanguage } from './languages.ts';

type PartialCopy<T> = {
  [Key in keyof T]?: T[Key] extends readonly unknown[]
    ? T[Key]
    : T[Key] extends object
      ? PartialCopy<T[Key]>
      : T[Key];
};
type LandingCopy = typeof en;
type Draft = PartialCopy<LandingCopy> & { _status: 'needs-review' };

const drafts = {
  am,
  ar,
  bn,
  es,
  fil,
  hi,
  id,
  my,
  'pt-BR': pt,
  sw,
  ur,
} as Record<Exclude<InterfaceLanguage, 'en'>, Draft>;

function isSection(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function fill<T>(source: T, patch: PartialCopy<T>): T {
  return Object.fromEntries(
    Object.entries(source as Record<string, unknown>).map(([key, value]) => {
      const replacement = patch[key as keyof T];
      return [
        key,
        isSection(value) && isSection(replacement)
          ? fill(value, replacement)
          : (replacement ?? value),
      ];
    }),
  ) as T;
}

export function landingStrings(locale: InterfaceLanguage): LandingCopy {
  return locale === 'en' ? en : fill(en, drafts[locale]);
}
