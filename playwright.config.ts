import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  use: { trace: 'retain-on-failure' },
  projects: [
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
        baseURL: 'http://127.0.0.1:4321/clipcard/',
      },
    },
    {
      name: 'mobile',
      testMatch: /landing-mobile\.spec\.ts/,
      use: {
        ...devices['Pixel 7'],
        baseURL: 'http://127.0.0.1:4321/clipcard/',
      },
    },
  ],
  webServer: [
    {
      command: 'node scripts/serve-static.ts 4321 apps/landing/dist /clipcard/',
      url: 'http://127.0.0.1:4321/clipcard/',
    },
    {
      command: 'node scripts/serve-static.ts 4322 fixtures/pages /',
      url: 'http://127.0.0.1:4322/news-og.html',
    },
  ],
});
