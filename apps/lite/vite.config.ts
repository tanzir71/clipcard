import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { buildBookmarklet } from '../../scripts/bookmarklet.ts';

export default defineConfig(async ({ command }) => {
  const siteBase =
    process.env.CLIPCARD_BASE ?? (command === 'serve' ? '/' : '/clipcard/');
  const base = siteBase.replace(/\/$/, '') + '/app/';
  const origin = process.env.CLIPCARD_SITE ?? 'https://tanzir71.github.io';
  const bookmark = await buildBookmarklet(new URL(base, origin).href);

  return {
    base,
    build: { outDir: '../landing/dist/app', emptyOutDir: true },
    define: { __CLIPCARD_BOOKMARK__: JSON.stringify(bookmark) },
    plugins: [
      VitePWA({
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'sw.ts',
        registerType: 'autoUpdate',
        injectRegister: false,
        injectManifest: {
          globPatterns: ['**/*.{js,css,html,png,svg,woff2,webmanifest}'],
        },
        includeAssets: ['icon/*.png'],
        manifest: {
          id: base,
          name: 'Clipcard',
          short_name: 'Clipcard',
          start_url: base,
          scope: base,
          display: 'standalone',
          theme_color: '#0a0a0a',
          background_color: '#f4f4f5',
          icons: [
            {
              src: 'icon/192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any maskable',
            },
            {
              src: 'icon/512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable',
            },
          ],
          share_target: {
            action: base + 'share/',
            method: 'POST',
            enctype: 'multipart/form-data',
            params: {
              title: 'title',
              text: 'text',
              url: 'url',
              files: {
                name: 'photo',
                accept: ['image/png', 'image/jpeg', 'image/webp', 'image/avif'],
              },
            },
          },
        },
      }),
    ],
  };
});
