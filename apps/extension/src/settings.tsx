import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import strings from '@clipcard/i18n/en';
import { clearDrafts } from '@clipcard/ui/storage';
import { browser } from 'wxt/browser';
import { webApp } from './site.ts';
import './popup.css';
import '@clipcard/ui/style.css';

function Settings() {
  const [status, setStatus] = useState('');
  async function clear() {
    try {
      await clearDrafts();
      setStatus(strings['settings.historyCleared']);
    } catch {
      setStatus(strings['card.savedFailed']);
    }
  }
  return (
    <main className="popup-empty">
      <h1>{strings['ext.shortName']}</h1>
      <section aria-labelledby="storage-title">
        <h2 id="storage-title">{strings['settings.privacy']}</h2>
        <p>{strings['settings.cardStorage']}</p>
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
