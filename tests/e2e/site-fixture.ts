import { test as base } from '@playwright/test';

export { expect } from '@playwright/test';

export const test = base.extend<{ mockCountry: void }>({
  mockCountry: [
    async ({ context }, use) => {
      await context.route('https://api.country.is/', (route) =>
        route.fulfill({ json: { country: 'US' } }),
      );
      await use();
    },
    { auto: true },
  ],
});
