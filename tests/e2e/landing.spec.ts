import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { CARD_LANGUAGES_RELEASED } from '../../packages/core/flags.ts';
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
  const centerOffset = await page.locator('.hero-copy').evaluate((hero) => {
    const actions = [...hero.querySelectorAll('.extension-hero-actions a')].map(
      (link) => link.getBoundingClientRect(),
    );
    const left = Math.min(...actions.map((box) => box.left));
    const right = Math.max(...actions.map((box) => box.right));
    const paste = hero.querySelector('.app-shortcut')!.getBoundingClientRect();
    return Math.abs((left + right - paste.left - paste.right) / 2);
  });
  expect(centerOffset).toBeLessThanOrEqual(1);
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
    page.getByText(
      CARD_LANGUAGES_RELEASED
        ? 'Make cards in 30 languages.'
        : 'Card support for 30 languages is planned.',
      {
        exact: false,
      },
    ),
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

test('wave-one routes switch locale, mirror RTL and link to the same-language app', async ({
  page,
  request,
}) => {
  test.skip(
    !CARD_LANGUAGES_RELEASED && process.env.CLIPCARD_TEST_R4_LANDING !== '1',
    'Run against the R4 landing preview.',
  );
  await page.goto('./');
  const languageMenu = page.locator('.language-menu');
  await languageMenu.locator('summary').press('Enter');
  await expect(languageMenu.locator('a')).toHaveCount(12);
  await languageMenu.getByRole('link', { name: 'العربية' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'شارك الأخبار على هيئة بطاقات',
  );
  const home = 'https://tanzir71.github.io/clipcard/';
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    home + 'ar/',
  );
  await expect(page.locator('link[rel="alternate"][hreflang]')).toHaveCount(13);
  await expect(page.locator('link[hreflang="pt-BR"]')).toHaveAttribute(
    'href',
    home + 'pt-br/',
  );
  const social = await page
    .locator('meta[property="og:image"]')
    .getAttribute('content');
  expect(social).toContain('social-ar');
  expect((await request.get(new URL(social!).pathname)).ok()).toBe(true);
  await page
    .getByRole('link', { name: 'تطبيق الويب', exact: true })
    .first()
    .click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByRole('heading', { name: 'أنشئ بطاقة' })).toBeVisible();
  await page.goto('ur/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveAttribute('lang', 'ur');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await page.getByRole('link', { name: 'رازداری' }).click();
  await expect(page.getByRole('heading', { name: 'رازداری' })).toBeVisible();
  const xml = await (await request.get('sitemap.xml')).text();
  expect(xml).toContain('<loc>' + home + 'ur/privacy/</loc>');
  expect(xml.match(/hreflang="x-default"/g)).toHaveLength(26);
});
