import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { HtmlValidate } from 'html-validate';

test('shows the web app, upcoming features and keyboard-accessible FAQ', async ({
  page,
}) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Share the news as cards',
  );
  await expect(page.getByText('Soon', { exact: true })).toHaveCount(3);
  await expect(
    page.getByRole('link', { name: 'Follow on GitHub' }).first(),
  ).toHaveAttribute('href', 'https://github.com/tanzir71/clipcard');
  await expect(
    page.getByRole('link', { name: 'Download for Chrome' }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Web app', exact: true }),
  ).toHaveAttribute('href', '/clipcard/app/');
  await expect(
    page.getByRole('button', { name: 'Make card', exact: true }),
  ).toBeVisible();
  await expect(page.locator('#templates figure')).toHaveCount(7);
  const install = page.locator('#install');
  await expect(
    install.getByRole('link', { name: 'Download .zip' }),
  ).toHaveAttribute(
    'href',
    'https://github.com/tanzir71/clipcard/releases/latest/download/clipcard-chrome.zip',
  );
  await expect(install.getByRole('listitem')).toHaveCount(4);
  await install.getByText('Build from source', { exact: true }).click();
  await expect(
    install.getByRole('button', { name: 'Copy build command' }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'No install? Use the bookmark' }),
  ).toHaveAttribute('href', '#bookmark');
  await expect(page.locator('.language-words li')).toHaveCount(30);
  for (const [lang, font] of [
    ['ur', 'Lateef'],
    ['ar', 'Cairo'],
  ]) {
    const label = page.locator(`.language-words [lang="${lang}"]`);
    await expect(label).toHaveAttribute('dir', 'rtl');
    await expect(label).toHaveCSS('font-family', new RegExp(font!));
  }
  const question = page.getByText('Which languages are supported?', {
    exact: true,
  });
  await question.focus();
  await page.keyboard.press('Enter');
  await expect(
    page.getByText('Card support for 30 languages is planned.', {
      exact: false,
    }),
  ).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test('serves valid HTML, discovery metadata and legal and changelog pages', async ({
  page,
  request,
}) => {
  const validator = new HtmlValidate({
    extends: ['html-validate:document'],
    rules: { 'require-sri': ['error', { target: 'crossorigin' }] },
  });
  for (const [path, heading] of [
    ['./', 'Share the news as cards'],
    ['privacy/', 'Privacy'],
    ['changelog/', 'Changelog'],
  ] as const) {
    const response = await request.get(path);
    expect(response.ok()).toBe(true);
    const report = await validator.validateString(await response.text());
    expect(report.results.flatMap(({ messages }) => messages)).toEqual([]);
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(heading);
  }
  const sitemap = await request.get('sitemap.xml');
  expect(await sitemap.text()).toContain(
    'https://tanzir71.github.io/clipcard/',
  );
  expect(await (await request.get('robots.txt')).text()).toContain(
    'sitemap.xml',
  );
});
