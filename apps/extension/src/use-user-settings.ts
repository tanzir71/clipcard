import { useEffect, useRef, useState } from 'react';
import { dirFor } from '@clipcard/core';
import { interfaceCopy } from '@clipcard/i18n';
import {
  defaultSettings,
  getUserSettings,
  setUserSetting,
  watchUserSettings,
} from './user-settings.ts';
import type { UserSettings } from './user-settings.ts';

export function useUserSettings() {
  const [settings, setSettings] = useState(defaultSettings);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const pending = useRef(
    new Map<keyof UserSettings, { value: UserSettings[keyof UserSettings] }>(),
  );
  const locale = settings.interfaceLanguage;

  useEffect(() => {
    let active = true;
    const load = () => {
      void getUserSettings()
        .then((values) => {
          if (active) {
            setSettings(
              Object.assign(
                values,
                Object.fromEntries(
                  Array.from(pending.current, ([key, entry]) => [
                    key,
                    entry.value,
                  ]),
                ),
              ),
            );
            setReady(true);
          }
        })
        .catch(() => {
          if (active) setError(true);
        });
    };
    const stop = watchUserSettings(load);
    load();
    return () => {
      active = false;
      stop();
    };
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = dirFor(locale);
  }, [locale]);

  async function change<K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K],
  ) {
    const entry = { value };
    pending.current.set(key, entry);
    setSettings((values) => ({ ...values, [key]: value }));
    try {
      await setUserSetting(key, value);
    } catch (failure) {
      if (pending.current.get(key) === entry) {
        const persisted = await getUserSettings();
        setSettings((values) => ({ ...values, [key]: persisted[key] }));
      }
      throw failure;
    } finally {
      if (pending.current.get(key) === entry) pending.current.delete(key);
    }
  }

  return { settings, strings: interfaceCopy(locale), ready, error, change };
}
