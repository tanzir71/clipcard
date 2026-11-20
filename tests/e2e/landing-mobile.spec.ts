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
  const hero = page.locator('.hero-copy');
  await expect(hero.locator('.app-shortcut-paths')).toBeHidden();
  const paste = hero.getByRole('textbox', { name: 'Paste a link or text' });
  await expect(paste).toBeVisible();
  const install = await hero
    .getByRole('button', { name: 'Install the app' })
    .boundingBox();
  const share = await hero
    .getByRole('button', { name: 'Send to my computer' })
    .boundingBox();
  expect(install?.height).toBe(48);
  expect(share && install && share.y > install.y + install.height).toBe(true);
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
