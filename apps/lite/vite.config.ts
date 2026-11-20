import { defineConfig } from 'vite';

export default defineConfig(({ command }) => {
  const siteBase =
    process.env.CLIPCARD_BASE ?? (command === 'serve' ? '/' : '/clipcard/');

  return {
    base: `${siteBase.replace(/\/$/, '')}/app/`,
    build: { outDir: '../landing/dist/app', emptyOutDir: true },
  };
});
