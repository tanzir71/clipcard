import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { dirFor } from '@clipcard/core';
import { FLAGS } from '@clipcard/core/flags';
import {
  supportedInterfaceLanguage,
  interfaceStrings,
  setInterfaceLanguage,
} from '@clipcard/i18n';
import type { InterfaceLanguage } from '@clipcard/i18n';
import {
  automaticWebLanguage,
  readWebLanguage,
  saveWebLanguage,
} from '@clipcard/i18n/web-language';
import type { WebLanguagePreference } from '@clipcard/i18n/web-language';
import { App } from './App.tsx';
import './app.css';

const root = document.getElementById('root');

if (root) {
  const app = createRoot(root);
  let preference = readWebLanguage();
  let language: InterfaceLanguage = 'en';

  function render() {
    setInterfaceLanguage(language);
    document.documentElement.lang = language;
    document.documentElement.dir = dirFor(language);
    document.title = interfaceStrings['ext.shortName'];
    app.render(
      <App languagePreference={preference} changeLanguage={changeLanguage} />,
    );
  }

  async function changeLanguage(next: WebLanguagePreference) {
    preference = next;
    saveWebLanguage(next);
    const address = new URL(location.href);
    if (address.searchParams.has('lang')) {
      address.searchParams.delete('lang');
      history.replaceState(history.state, '', address);
    }
    if (next !== 'auto') {
      language = next;
      render();
      return;
    }
    render();
    const detected = await automaticWebLanguage();
    if (preference !== 'auto') return;
    language = detected;
    render();
  }

  if (FLAGS.languages) {
    const requested = new URL(location.href).searchParams.get('lang');
    language =
      preference !== 'auto'
        ? preference
        : (supportedInterfaceLanguage(requested ?? '') ??
          (await automaticWebLanguage()));
  }
  render();
  registerSW({ immediate: true });
}
