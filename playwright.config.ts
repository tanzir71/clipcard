import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.CLIPCARD_TEST_PORT_BASE ?? 4321);
const local = (offset: number) => 'http://127.0.0.1:' + (port + offset);

export default defineConfig({
  testDir: './tests/e2e',
  use: { trace: 'retain-on-failure' },
  projects: [
    {
      name: 'cards',
      testMatch: /cards\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], baseURL: local(2) + '/' },
    },
    {
      name: 'web-app',
      testMatch: /web-app\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: local(0) + '/clipcard/app/',
      },
    },
    {
      name: 'phone-app',
      testMatch: /phone-app\.spec\.ts/,
      use: {
        ...devices['Pixel 7'],
        baseURL: local(0) + '/clipcard/app/',
      },
    },
    {
      name: 'extension',
      testMatch: /extension\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'landing',
      testMatch: /landing\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: local(0) + '/clipcard/',
      },
    },
    {
      name: 'mobile',
      testMatch: /landing-mobile\.spec\.ts/,
      use: {
        ...devices['Pixel 7'],
        baseURL: local(0) + '/clipcard/',
      },
    },
  ],
  webServer: [
    {
      command: 'pnpm dev:gallery --port ' + (port + 2),
      url: local(2) + '/',
      env: { VITE_CLIPCARD_LANGUAGES: '1' },
    },
    {
      command:
        'node scripts/serve-static.ts ' +
        port +
        ' apps/landing/dist /clipcard/',
      url: local(0) + '/clipcard/',
    },
    {
      command:
        'node scripts/serve-static.ts ' + (port + 1) + ' fixtures/pages /',
      url: local(1) + '/news-og.html',
    },
  ],
});
