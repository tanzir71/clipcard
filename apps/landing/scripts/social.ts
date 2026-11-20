import { readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import sharp from 'sharp';
import { createServer } from 'vite';
import type {} from '../../../packages/cards/gallery/social.ts';

export async function renderSocialImages(output: URL) {
  const folders = new URL(
    '../../../packages/i18n/locales/landing/',
    import.meta.url,
  );
  const languages = (await readdir(folders))
    .filter((file) => file.endsWith('.json'))
    .map((file) => file.slice(0, -5));
  const server = await createServer({
    configFile: fileURLToPath(
      new URL(
        '../../../packages/cards/gallery/vite.config.ts',
        import.meta.url,
      ),
    ),
    server: { port: 0 },
  });
  try {
    await server.listen();
    const address = server.httpServer?.address();
    if (!address || typeof address === 'string') {
      throw new Error('The card renderer needs a local server port.');
    }
    const browser = await chromium.launch();
    try {
      const page = await browser.newPage();
      await page.goto('http://127.0.0.1:' + address.port + '/social.html');
      await page.waitForFunction(
        () => typeof window.renderSocialCard === 'function',
      );
      const origin = process.env.CLIPCARD_SITE ?? 'https://tanzir71.github.io';
      const base = (process.env.CLIPCARD_BASE ?? '/clipcard/').replace(
        /\/$/,
        '',
      );
      for (const locale of languages) {
        const path =
          base + '/' + (locale === 'en' ? '' : locale.toLowerCase() + '/');
        const url = new URL(path, origin).href;
        const image = await page.evaluate(
          ({ locale, url }) => window.renderSocialCard(locale, url),
          { locale, url },
        );
        await sharp(Buffer.from(image.split(',')[1]!, 'base64'))
          .resize(1200, 630, { fit: 'fill' })
          .jpeg({ quality: 88, mozjpeg: true })
          .toFile(fileURLToPath(new URL('social-' + locale + '.jpg', output)));
      }
    } finally {
      await browser.close();
    }
  } finally {
    await server.close();
  }
}
