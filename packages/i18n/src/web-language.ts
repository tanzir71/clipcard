import { supportedInterfaceLanguage } from './languages.ts';
import type { InterfaceLanguage } from './languages.ts';

export type WebLanguagePreference = InterfaceLanguage | 'auto';

const preferenceKey = 'clipcard.locale';
const countryKey = 'clipcard.language.country';

const countryLanguages: Partial<Record<string, InterfaceLanguage>> = {
  AE: 'ar',
  BH: 'ar',
  DZ: 'ar',
  EG: 'ar',
  IQ: 'ar',
  JO: 'ar',
  KW: 'ar',
  LB: 'ar',
  LY: 'ar',
  MA: 'ar',
  MR: 'ar',
  OM: 'ar',
  PS: 'ar',
  QA: 'ar',
  SA: 'ar',
  SD: 'ar',
  SY: 'ar',
  TN: 'ar',
  YE: 'ar',
  BD: 'bn',
  PK: 'ur',
  IN: 'hi',
  ID: 'id',
  PH: 'fil',
  BR: 'pt-BR',
  ET: 'am',
  MM: 'my',
  KE: 'sw',
  TZ: 'sw',
  UG: 'sw',
  AR: 'es',
  BO: 'es',
  CL: 'es',
  CO: 'es',
  CR: 'es',
  CU: 'es',
  DO: 'es',
  EC: 'es',
  ES: 'es',
  GT: 'es',
  HN: 'es',
  MX: 'es',
  NI: 'es',
  PA: 'es',
  PE: 'es',
  PR: 'es',
  PY: 'es',
  SV: 'es',
  UY: 'es',
  VE: 'es',
};

export function readWebLanguage(): WebLanguagePreference {
  try {
    return (
      supportedInterfaceLanguage(localStorage.getItem(preferenceKey) ?? '') ??
      'auto'
    );
  } catch {
    return 'auto';
  }
}

export function saveWebLanguage(preference: WebLanguagePreference) {
  try {
    if (preference === 'auto') localStorage.removeItem(preferenceKey);
    else localStorage.setItem(preferenceKey, preference);
  } catch {
    // Language selection still works for the current page.
  }
}

export function matchWebLanguage(
  country: string | null,
  browserLanguages: readonly string[],
): InterfaceLanguage {
  return (
    (country ? countryLanguages[country] : undefined) ??
    browserLanguages.map(supportedInterfaceLanguage).find(Boolean) ??
    'en'
  );
}

async function detectCountry(): Promise<string | null> {
  try {
    const cached = sessionStorage.getItem(countryKey);
    if (cached) return cached;
  } catch {
    // The lookup also works when browser storage is blocked.
  }
  if (!navigator.onLine) return null;
  try {
    const response = await fetch('https://api.country.is/', {
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      signal: AbortSignal.timeout(1200),
    });
    if (!response.ok) return null;
    const { country } = (await response.json()) as { country?: unknown };
    if (typeof country !== 'string' || !/^[A-Z]{2}$/.test(country)) return null;
    try {
      sessionStorage.setItem(countryKey, country);
    } catch {
      // Use the result even if the browser cannot cache it.
    }
    return country;
  } catch {
    return null;
  }
}

export async function automaticWebLanguage(): Promise<InterfaceLanguage> {
  return matchWebLanguage(await detectCountry(), navigator.languages);
}
