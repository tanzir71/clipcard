import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { dirFor } from '@clipcard/core';
import { FLAGS } from '@clipcard/core/flags';
import {
  interfaceLanguage,
  interfaceStrings,
  setInterfaceLanguage,
} from '@clipcard/i18n';
import { App } from './App.tsx';
import './app.css';

const root = document.getElementById('root');
if (root) {
  if (FLAGS.languages) {
    const requested = new URL(location.href).searchParams.get('lang');
    let remembered: string | null = null;
    try {
      remembered = localStorage.getItem('clipcard.locale');
      if (requested)
        localStorage.setItem('clipcard.locale', interfaceLanguage(requested));
    } catch {
      // The share window can still use the browser locale without local storage.
    }
    const lang = interfaceLanguage(
      requested || remembered || navigator.language,
    );
    setInterfaceLanguage(lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = dirFor(lang);
    document.title = interfaceStrings['ext.shortName'];
  }
  createRoot(root).render(<App />);
  registerSW({ immediate: true });
}
