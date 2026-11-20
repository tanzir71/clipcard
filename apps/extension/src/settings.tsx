import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import strings from '@clipcard/i18n/en';
import { FLAGS } from '@clipcard/core/flags';
import { CollectionBackupControls } from '@clipcard/ui/collection-backup-controls';
import { clearDraftCollections } from '@clipcard/ui/collections';
import { clearDrafts } from '@clipcard/ui/storage';
import { browser } from 'wxt/browser';
import { webApp } from './site.ts';
import type { BackgroundMessage } from './messages.ts';
import { SettingsPage } from './settings-page.tsx';
import './popup.css';
import '@clipcard/ui/style.css';

function Settings() {
  const [status, setStatus] = useState('');
  const [update, setUpdate] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    const request: BackgroundMessage = {
      to: 'background',
      kind: 'releaseUpdate',
    };
    void browser.runtime
      .sendMessage(request)
      .then((value: unknown) => {
        if (active && typeof value === 'string') setUpdate(value);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);
  async function clear() {
    try {
      if (FLAGS.clips && FLAGS.drafts) await clearDraftCollections();
      else await clearDrafts();
      setStatus(strings['settings.historyCleared']);
    } catch {
      setStatus(strings['card.savedFailed']);
    }
  }
  if (FLAGS.languages) return <SettingsPage update={update} />;
  return (
    <main className="popup-empty">
      <h1>{strings['ext.shortName']}</h1>
      {update ? (
        <a
          className="popup-update"
          href={update}
          target="_blank"
          rel="noreferrer"
        >
          {strings['settings.updateAvailable']}
        </a>
      ) : null}
      <section aria-labelledby="storage-title">
        <h2 id="storage-title">{strings['settings.privacy']}</h2>
        <p>{strings['settings.cardStorage']}</p>
        {FLAGS.clips && FLAGS.drafts ? (
          <>
            <CollectionBackupControls refresh={() => Promise.resolve()} />
            <p>
              <button
                type="button"
                className="clip-button"
                onClick={() => {
                  void browser.permissions
                    .request({ origins: ['<all_urls>'] })
                    .then((granted) => {
                      if (granted) setStatus(strings['welcome.photosEnabled']);
                    })
                    .catch(() => setStatus(strings['card.savedFailed']));
                }}
              >
                {strings['clip.enable']}
              </button>
            </p>
          </>
        ) : null}
        <a href={webApp} target="_blank" rel="noreferrer">
          {strings['card.openWebApp']}
        </a>
        <p>
          <button
            type="button"
            className="clip-button"
            onClick={() => void clear()}
          >
            {strings['settings.clearHistory']}
          </button>
        </p>
        <p role="status">{status}</p>
      </section>
    </main>
  );
}

document.title = browser.i18n.getMessage('ext_shortName');
const host = document.querySelector('#root');
if (host) createRoot(host).render(<Settings />);
