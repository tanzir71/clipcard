import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('fits the viewport and sends the canonical URL with the share sheet', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', {
      value: ({ url }: ShareData) => {
        document.body.dataset.sharedUrl = url;
        return Promise.resolve();
      },
    });
  });
  await page.goto('./');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    await page.evaluate(() => window.innerWidth),
  );
  await page
    .getByRole('button', { name: 'Send to my computer' })
    .first()
    .click();
  await expect(page.locator('body')).toHaveAttribute(
    'data-shared-url',
    'https://tanzir71.github.io/clipcard/',
  );
  await page.getByLabel('Menu', { exact: true }).click();
  await expect(
    page.getByRole('link', { name: 'Templates', exact: true }),
  ).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test('copies the canonical link when Web Share is absent', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', { value: undefined });
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: (url: string) => {
          document.body.dataset.copiedUrl = url;
          return Promise.resolve();
        },
      },
    });
  });
  await page.goto('./');
  await page
    .getByRole('button', { name: 'Send to my computer' })
    .first()
    .click();
  await expect(page.getByText('Link copied')).toBeVisible();
  await expect(page.locator('body')).toHaveAttribute(
    'data-copied-url',
    'https://tanzir71.github.io/clipcard/',
  );
});
