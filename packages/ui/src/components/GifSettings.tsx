import { useEffect, useState } from 'react';
import { interfaceStrings as strings } from '@clipcard/i18n';
import { readGifSettings, setGifKey, setGifProvider } from '../gifs.ts';
import type { GifPreference } from '../gifs.ts';
import './library-panel.css';

export function GifSettings({ changed }: { changed?: () => void }) {
  const [prefs, setPrefs] =
    useState<Awaited<ReturnType<typeof readGifSettings>>>();
  const [status, setStatus] = useState('');
  useEffect(() => {
    let active = true;
    void readGifSettings()
      .then((value) => {
        if (active) setPrefs(value);
      })
      .catch(() => setStatus(strings['gifs.failure']));
    return () => {
      active = false;
    };
  }, []);
  if (!prefs) return null;
  const { provider } = prefs;
  async function choose(value: GifPreference) {
    if (!prefs) return;
    setPrefs({ ...prefs, provider: value });
    try {
      await setGifProvider(value);
      changed?.();
    } catch {
      setStatus(strings['gifs.failure']);
    }
  }
  async function save() {
    if (!prefs || provider === 'off') return;
    try {
      await setGifKey(provider, prefs[provider]);
      setStatus(strings['gifs.keySaved']);
      changed?.();
    } catch {
      setStatus(strings['gifs.failure']);
    }
  }
  return (
    <section
      className="clip-gif-settings"
      aria-label={strings['gifs.provider']}
    >
      <label>
        {strings['gifs.provider']}
        <select
          value={provider}
          onChange={(event) =>
            void choose(event.currentTarget.value as GifPreference)
          }
        >
          <option value="klipy">KLIPY</option>
          <option value="giphy">GIPHY</option>
          <option value="off">{strings['gifs.off']}</option>
        </select>
      </label>
      {provider !== 'off' ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <label>
            {strings['gifs.key']}
            <input
              type="password"
              autoComplete="off"
              value={prefs[provider]}
              onChange={(event) =>
                setPrefs({ ...prefs, [provider]: event.currentTarget.value })
              }
            />
          </label>
          <button type="submit" className="clip-button">
            {strings['gifs.saveKey']}
          </button>
        </form>
      ) : null}
      {status ? <p role="status">{status}</p> : null}
    </section>
  );
}
