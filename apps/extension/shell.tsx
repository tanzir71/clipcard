import { createRoot } from 'react-dom/client';
import { browser } from 'wxt/browser';

document.title = browser.i18n.getMessage('ext_shortName');
const lang = browser.i18n.getUILanguage();
document.documentElement.lang = lang;
document.documentElement.dir = /^(ar|fa|ur)(-|$)/i.test(lang) ? 'rtl' : 'ltr';

const root = document.getElementById('root');
if (root) createRoot(root).render(null);
