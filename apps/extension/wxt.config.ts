import { defineConfig } from 'wxt';

export default defineConfig({
  manifestVersion: 3,
  modules: ['@wxt-dev/module-react'],
  manifest: {
    ...(process.env.CLIPCARD_EXTENSION_VERSION
      ? { version: process.env.CLIPCARD_EXTENSION_VERSION }
      : {}),
    name: '__MSG_ext_name__',
    short_name: '__MSG_ext_shortName__',
    description: '__MSG_ext_description__',
    default_locale: 'en',
    action: { default_title: '__MSG_action_toolbarTitle__' },
    icons: {
      16: 'icon/16.png',
      32: 'icon/32.png',
      48: 'icon/48.png',
      128: 'icon/128.png',
    },
    permissions: [
      'contextMenus',
      'storage',
      'offscreen',
      'clipboardWrite',
      'activeTab',
      'scripting',
    ],
    optional_host_permissions: ['<all_urls>'],
    commands: {
      'copy-clipcard': {
        suggested_key: { default: 'Alt+Shift+S' },
        description: '__MSG_action_badgeTitle__',
      },
    },
    web_accessible_resources: [
      { resources: ['sheet.html'], matches: ['http://*/*', 'https://*/*'] },
    ],
  },
});
