import { describe, expect, it } from 'vitest';
import bn from '../locales/bn.json';
import english from '../locales/en.json';
import { landingStrings } from './landing.ts';
import { interfaceLanguage, interfaceLanguages } from './languages.ts';

describe('wave-one interface copy', () => {
  it('normalizes Chrome, browser and site locale names', () => {
    expect(interfaceLanguage('pt_BR')).toBe('pt-BR');
    expect(interfaceLanguage('ar-EG')).toBe('ar');
    expect(interfaceLanguage('tl-PH')).toBe('fil');
    expect(interfaceLanguage('unsupported')).toBe('en');
    expect(Object.keys(bn).sort()).toEqual(Object.keys(english).sort());
  });

  it('uses each drafted landing title and preserves sibling defaults', () => {
    const en = landingStrings('en');
    for (const locale of interfaceLanguages.filter((lang) => lang !== 'en')) {
      const copy = landingStrings(locale);
      expect(copy.hero.appHeading).not.toBe(en.hero.appHeading);
      expect(copy.privacy.appText).toHaveLength(en.privacy.appText.length);
      expect(Object.keys(copy.features.items)).toEqual(
        Object.keys(en.features.items),
      );
    }
    expect(landingStrings('ar').hero.gallery).toBe(en.hero.gallery);
    expect(landingStrings('bn').faq[0]?.question).toBe('এটি কি বিনামূল্যে?');
  });
});
