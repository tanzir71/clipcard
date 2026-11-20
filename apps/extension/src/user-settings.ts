import { interfaceLanguage } from '@clipcard/i18n';
import type { CardLanguage, InterfaceLanguage } from '@clipcard/i18n';
import type { Format, Numerals, Template } from '@clipcard/cards';
import { browser } from 'wxt/browser';

export interface UserSettings {
  interfaceLanguage: InterfaceLanguage;
  cardLanguage: CardLanguage | 'auto';
  numerals: Numerals;
  format: Format | 'auto';
  template: Template | 'auto';
  color: string;
  links: 'off' | 'previews' | 'all';
  selectionToolbar: boolean;
  qr: boolean;
  markEdited: boolean;
  texture: boolean;
  keepHistory: boolean;
  handle: string;
  markImage: string;
}

const prefix = 'clipcard.preference.';

export function defaultSettings(): UserSettings {
  return {
    interfaceLanguage: interfaceLanguage(browser.i18n.getUILanguage()),
    cardLanguage: 'auto',
    numerals: 'native',
    format: 'auto',
    template: 'auto',
    color: '',
    links: 'previews',
    selectionToolbar: true,
    qr: true,
    markEdited: true,
    texture: true,
    keepHistory: true,
    handle: '',
    markImage: '',
  };
}

function keys(settings: UserSettings) {
  return Object.keys(settings) as Array<keyof UserSettings>;
}

export async function getUserSettings(): Promise<UserSettings> {
  const defaults = defaultSettings();
  const stored = await browser.storage.local.get(
    keys(defaults).map((key) => prefix + key),
  );
  return Object.assign(
    defaults,
    Object.fromEntries(
      keys(defaults).flatMap((key) => {
        const value = stored[prefix + key];
        return typeof value === typeof defaults[key] ? [[key, value]] : [];
      }),
    ),
  );
}

export function setUserSetting<K extends keyof UserSettings>(
  key: K,
  value: UserSettings[K],
) {
  return browser.storage.local.set({ [prefix + key]: value });
}

export function watchUserSettings(listener: () => void) {
  const changed: Parameters<typeof browser.storage.onChanged.addListener>[0] = (
    values,
    area,
  ) => {
    if (
      area === 'local' &&
      Object.keys(values).some((key) => key.startsWith(prefix))
    )
      listener();
  };
  browser.storage.onChanged.addListener(changed);
  return () => browser.storage.onChanged.removeListener(changed);
}
