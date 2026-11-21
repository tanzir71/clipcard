import { detectScript, dirFor } from '@clipcard/core';
import { landingStrings } from '@clipcard/i18n/landing';
import { interfaceLanguage } from '@clipcard/i18n';
import { dataUrlFor } from '../src/assets.ts';
import { renderCard } from '../src/export.tsx';
import { languageReferences } from './language-samples.ts';
import { samples } from './samples.ts';

declare global {
  interface Window {
    renderBanglaExample(): Promise<string>;
    renderSocialCard(locale: string, url: string): Promise<string>;
  }
}

const example = samples.find(({ id }) => id === 'split-191x1')!.model;

window.renderBanglaExample = async () => {
  const { model, template, format } = languageReferences.find(
    ({ id }) => id === 'header-4x5-bn',
  )!;
  return dataUrlFor(await renderCard(model, { template, format }));
};

window.renderSocialCard = async (requested, url) => {
  const locale = interfaceLanguage(requested);
  const copy = landingStrings(locale);
  const headline = copy.hero.appHeading;
  const png = await renderCard(
    {
      ...example,
      headline,
      dir: dirFor(locale),
      lang: locale,
      script: detectScript(headline),
      emphasisRange: null,
      section: null,
      subsection: null,
      publishedAt: null,
      oldNewsYear: null,
      outlet: null,
      mark: copy.brand,
      sourceUrl: url,
      qrUrl: url,
    },
    { format: '1.91:1', template: 'split' },
  );
  return dataUrlFor(png);
};
