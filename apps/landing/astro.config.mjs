import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
  site: process.env.CLIPCARD_SITE ?? 'https://tanzir71.github.io',
  base:
    process.env.CLIPCARD_BASE ??
    (process.env.NODE_ENV === 'development' ? '/' : '/clipcard/'),
  trailingSlash: 'always',
  build: { inlineStylesheets: 'always' },
  telemetry: false,
});
