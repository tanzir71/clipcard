import { defineConfig } from 'wxt';
import { CLIP_DRAFTS_RELEASED } from '@clipcard/core/flags';

export default defineConfig({
  manifestVersion: 3,
  modules: ['@wxt-dev/module-react'],
  hooks: {
    'build:manifestGenerated': (_wxt, manifest) => {
      // WXT adds runtime content-script matches as required hosts.
      // Clipcard uses activeTab and requests persistent access on demand.
      if ('host_permissions' in manifest) delete manifest.host_permissions;
    },
  },
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
      ...(CLIP_DRAFTS_RELEASED ||
      (process.env.VITE_CLIPCARD_CLIPS === '1' &&
        process.env.VITE_CLIPCARD_DRAFTS === '1')
        ? {
            'clip-selection': {
              suggested_key: { default: 'Alt+Shift+C' },
              description: '__MSG_clip_start__',
            },
          }
        : {}),
    },
    web_accessible_resources: [
      { resources: ['sheet.html'], matches: ['http://*/*', 'https://*/*'] },
    ],
  },
});
