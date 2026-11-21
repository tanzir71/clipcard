import { detectLang, detectScript, langToScript } from '@clipcard/core';
import type { Script } from '@clipcard/core';
import { FLAGS } from '@clipcard/core/flags';
import notoBengaliRanges from '@fontsource-variable/noto-sans-bengali/unicode.json';
import notoBengali from '@fontsource-variable/noto-sans-bengali/files/noto-sans-bengali-bengali-wght-normal.woff2?url';
import muktaRanges from '@fontsource/mukta/unicode.json';
import muktaDevanagari300 from '@fontsource/mukta/files/mukta-devanagari-300-normal.woff2?url';
import muktaDevanagari600 from '@fontsource/mukta/files/mukta-devanagari-600-normal.woff2?url';
import lateefRanges from '@fontsource/lateef/unicode.json';
import lateefArabic400 from '@fontsource/lateef/files/lateef-arabic-400-normal.woff2?url';
import lateefArabic700 from '@fontsource/lateef/files/lateef-arabic-700-normal.woff2?url';
import cairoRanges from '@fontsource/cairo/unicode.json';
import cairoArabic400 from '@fontsource/cairo/files/cairo-arabic-400-normal.woff2?url';
import cairoArabic700 from '@fontsource/cairo/files/cairo-arabic-700-normal.woff2?url';
import vazirmatnRanges from '@fontsource/vazirmatn/unicode.json';
import vazirmatnArabic500 from '@fontsource/vazirmatn/files/vazirmatn-arabic-500-normal.woff2?url';
import vazirmatnArabic800 from '@fontsource/vazirmatn/files/vazirmatn-arabic-800-normal.woff2?url';
import anekTamilRanges from '@fontsource/anek-tamil/unicode.json';
import anekTamilTamil500 from '@fontsource/anek-tamil/files/anek-tamil-tamil-500-normal.woff2?url';
import anekTamilTamil800 from '@fontsource/anek-tamil/files/anek-tamil-tamil-800-normal.woff2?url';
import anekTeluguRanges from '@fontsource/anek-telugu/unicode.json';
import anekTeluguTelugu500 from '@fontsource/anek-telugu/files/anek-telugu-telugu-500-normal.woff2?url';
import anekTeluguTelugu800 from '@fontsource/anek-telugu/files/anek-telugu-telugu-800-normal.woff2?url';
import anekMalayalamRanges from '@fontsource/anek-malayalam/unicode.json';
import anekMalayalamMalayalam500 from '@fontsource/anek-malayalam/files/anek-malayalam-malayalam-500-normal.woff2?url';
import anekMalayalamMalayalam800 from '@fontsource/anek-malayalam/files/anek-malayalam-malayalam-800-normal.woff2?url';
import anekKannadaRanges from '@fontsource/anek-kannada/unicode.json';
import anekKannadaKannada500 from '@fontsource/anek-kannada/files/anek-kannada-kannada-500-normal.woff2?url';
import anekKannadaKannada800 from '@fontsource/anek-kannada/files/anek-kannada-kannada-800-normal.woff2?url';
import anekGujaratiRanges from '@fontsource/anek-gujarati/unicode.json';
import anekGujaratiGujarati500 from '@fontsource/anek-gujarati/files/anek-gujarati-gujarati-500-normal.woff2?url';
import anekGujaratiGujarati800 from '@fontsource/anek-gujarati/files/anek-gujarati-gujarati-800-normal.woff2?url';
import anekGurmukhiRanges from '@fontsource/anek-gurmukhi/unicode.json';
import anekGurmukhiGurmukhi500 from '@fontsource/anek-gurmukhi/files/anek-gurmukhi-gurmukhi-500-normal.woff2?url';
import anekGurmukhiGurmukhi800 from '@fontsource/anek-gurmukhi/files/anek-gurmukhi-gurmukhi-800-normal.woff2?url';
import anekOdiaRanges from '@fontsource/anek-odia/unicode.json';
import anekOdiaOriya500 from '@fontsource/anek-odia/files/anek-odia-oriya-500-normal.woff2?url';
import anekOdiaOriya800 from '@fontsource/anek-odia/files/anek-odia-oriya-800-normal.woff2?url';
import yaldeviRanges from '@fontsource/yaldevi/unicode.json';
import yaldeviSinhala500 from '@fontsource/yaldevi/files/yaldevi-sinhala-500-normal.woff2?url';
import yaldeviSinhala700 from '@fontsource/yaldevi/files/yaldevi-sinhala-700-normal.woff2?url';
import padaukRanges from '@fontsource/padauk/unicode.json';
import padaukMyanmar400 from '@fontsource/padauk/files/padauk-myanmar-400-normal.woff2?url';
import padaukMyanmar700 from '@fontsource/padauk/files/padauk-myanmar-700-normal.woff2?url';
import menbereRanges from '@fontsource/menbere/unicode.json';
import menbereEthiopic500 from '@fontsource/menbere/files/menbere-ethiopic-500-normal.woff2?url';
import menbereEthiopic700 from '@fontsource/menbere/files/menbere-ethiopic-700-normal.woff2?url';
import onestRanges from '@fontsource/onest/unicode.json';
import onestCyrillic500 from '@fontsource/onest/files/onest-cyrillic-500-normal.woff2?url';
import onestCyrillic800 from '@fontsource/onest/files/onest-cyrillic-800-normal.woff2?url';
import onestCyrillicExt500 from '@fontsource/onest/files/onest-cyrillic-ext-500-normal.woff2?url';
import onestCyrillicExt800 from '@fontsource/onest/files/onest-cyrillic-ext-800-normal.woff2?url';
import kanitRanges from '@fontsource/kanit/unicode.json';
import kanitThai400 from '@fontsource/kanit/files/kanit-thai-400-normal.woff2?url';
import kanitThai700 from '@fontsource/kanit/files/kanit-thai-700-normal.woff2?url';
import notoSansRanges from '@fontsource/noto-sans/unicode.json';
import notoSansLatinExt500 from '@fontsource/noto-sans/files/noto-sans-latin-ext-500-normal.woff2?url';
import notoSansLatinExt800 from '@fontsource/noto-sans/files/noto-sans-latin-ext-800-normal.woff2?url';
import notoSansVietnamese500 from '@fontsource/noto-sans/files/noto-sans-vietnamese-500-normal.woff2?url';
import notoSansVietnamese800 from '@fontsource/noto-sans/files/noto-sans-vietnamese-800-normal.woff2?url';
import notoSansLatin500 from '@fontsource/noto-sans/files/noto-sans-latin-500-normal.woff2?url';
import notoSansLatin800 from '@fontsource/noto-sans/files/noto-sans-latin-800-normal.woff2?url';
import beVietnamProRanges from '@fontsource/be-vietnam-pro/unicode.json';
import beVietnamProLatinExt500 from '@fontsource/be-vietnam-pro/files/be-vietnam-pro-latin-ext-500-normal.woff2?url';
import beVietnamProLatinExt800 from '@fontsource/be-vietnam-pro/files/be-vietnam-pro-latin-ext-800-normal.woff2?url';
import beVietnamProVietnamese500 from '@fontsource/be-vietnam-pro/files/be-vietnam-pro-vietnamese-500-normal.woff2?url';
import beVietnamProVietnamese800 from '@fontsource/be-vietnam-pro/files/be-vietnam-pro-vietnamese-800-normal.woff2?url';
import beVietnamProLatin500 from '@fontsource/be-vietnam-pro/files/be-vietnam-pro-latin-500-normal.woff2?url';
import beVietnamProLatin800 from '@fontsource/be-vietnam-pro/files/be-vietnam-pro-latin-800-normal.woff2?url';

export interface Typeface {
  family: string;
  weight: number;
  strong: number;
  size: number;
  lineHeight: number;
  files: readonly (readonly [
    url: string,
    weight: number | string,
    unicodeRange: string,
  ])[];
}

const typefaces = {
  bengali: {
    family: 'Noto Sans Bengali',
    weight: 300,
    strong: 600,
    size: 49,
    lineHeight: 1.47,
    files: [[notoBengali, '100 900', notoBengaliRanges.bengali]],
  },
  devanagari: {
    family: 'Mukta',
    weight: 300,
    strong: 600,
    size: 48,
    lineHeight: 1.46,
    files: [
      [muktaDevanagari300, 300, muktaRanges['devanagari']],
      [muktaDevanagari600, 600, muktaRanges['devanagari']],
    ],
  },
  'arabic-ur': {
    family: 'Lateef',
    weight: 400,
    strong: 700,
    size: 64,
    lineHeight: 1.3125,
    files: [
      [lateefArabic400, 400, lateefRanges['arabic']],
      [lateefArabic700, 700, lateefRanges['arabic']],
    ],
  },
  'arabic-ar': {
    family: 'Cairo',
    weight: 400,
    strong: 700,
    size: 49,
    lineHeight: 1.4,
    files: [
      [cairoArabic400, 400, cairoRanges['arabic']],
      [cairoArabic700, 700, cairoRanges['arabic']],
    ],
  },
  'arabic-fa': {
    family: 'Vazirmatn',
    weight: 500,
    strong: 800,
    size: 50,
    lineHeight: 1.4,
    files: [
      [vazirmatnArabic500, 500, vazirmatnRanges['arabic']],
      [vazirmatnArabic800, 800, vazirmatnRanges['arabic']],
    ],
  },
  tamil: {
    family: 'Anek Tamil',
    weight: 500,
    strong: 800,
    size: 49,
    lineHeight: 1.38,
    files: [
      [anekTamilTamil500, 500, anekTamilRanges['tamil']],
      [anekTamilTamil800, 800, anekTamilRanges['tamil']],
    ],
  },
  telugu: {
    family: 'Anek Telugu',
    weight: 500,
    strong: 800,
    size: 48,
    lineHeight: 1.38,
    files: [
      [anekTeluguTelugu500, 500, anekTeluguRanges['telugu']],
      [anekTeluguTelugu800, 800, anekTeluguRanges['telugu']],
    ],
  },
  malayalam: {
    family: 'Anek Malayalam',
    weight: 500,
    strong: 800,
    size: 44,
    lineHeight: 1.38,
    files: [
      [anekMalayalamMalayalam500, 500, anekMalayalamRanges['malayalam']],
      [anekMalayalamMalayalam800, 800, anekMalayalamRanges['malayalam']],
    ],
  },
  kannada: {
    family: 'Anek Kannada',
    weight: 500,
    strong: 800,
    size: 46,
    lineHeight: 1.38,
    files: [
      [anekKannadaKannada500, 500, anekKannadaRanges['kannada']],
      [anekKannadaKannada800, 800, anekKannadaRanges['kannada']],
    ],
  },
  gujarati: {
    family: 'Anek Gujarati',
    weight: 500,
    strong: 800,
    size: 48,
    lineHeight: 1.3,
    files: [
      [anekGujaratiGujarati500, 500, anekGujaratiRanges['gujarati']],
      [anekGujaratiGujarati800, 800, anekGujaratiRanges['gujarati']],
    ],
  },
  gurmukhi: {
    family: 'Anek Gurmukhi',
    weight: 500,
    strong: 800,
    size: 48,
    lineHeight: 1.3,
    files: [
      [anekGurmukhiGurmukhi500, 500, anekGurmukhiRanges['gurmukhi']],
      [anekGurmukhiGurmukhi800, 800, anekGurmukhiRanges['gurmukhi']],
    ],
  },
  odia: {
    family: 'Anek Odia',
    weight: 500,
    strong: 800,
    size: 48,
    lineHeight: 1.35,
    files: [
      [anekOdiaOriya500, 500, anekOdiaRanges['oriya']],
      [anekOdiaOriya800, 800, anekOdiaRanges['oriya']],
    ],
  },
  sinhala: {
    family: 'Yaldevi',
    weight: 500,
    strong: 700,
    size: 46,
    lineHeight: 1.35,
    files: [
      [yaldeviSinhala500, 500, yaldeviRanges['sinhala']],
      [yaldeviSinhala700, 700, yaldeviRanges['sinhala']],
    ],
  },
  myanmar: {
    family: 'Padauk',
    weight: 400,
    strong: 700,
    size: 46,
    lineHeight: 1.6,
    files: [
      [padaukMyanmar400, 400, padaukRanges['myanmar']],
      [padaukMyanmar700, 700, padaukRanges['myanmar']],
    ],
  },
  ethiopic: {
    family: 'Menbere',
    weight: 500,
    strong: 700,
    size: 48,
    lineHeight: 1.4,
    files: [
      [menbereEthiopic500, 500, menbereRanges['ethiopic']],
      [menbereEthiopic700, 700, menbereRanges['ethiopic']],
    ],
  },
  cyrillic: {
    family: 'Onest',
    weight: 500,
    strong: 800,
    size: 48,
    lineHeight: 1.3,
    files: [
      [onestCyrillic500, 500, onestRanges['cyrillic']],
      [onestCyrillic800, 800, onestRanges['cyrillic']],
      [onestCyrillicExt500, 500, onestRanges['cyrillic-ext']],
      [onestCyrillicExt800, 800, onestRanges['cyrillic-ext']],
    ],
  },
  thai: {
    family: 'Kanit',
    weight: 400,
    strong: 700,
    size: 48,
    lineHeight: 1.45,
    files: [
      [kanitThai400, 400, kanitRanges['thai']],
      [kanitThai700, 700, kanitRanges['thai']],
    ],
  },
  'latin-extended': {
    family: 'Noto Sans',
    weight: 500,
    strong: 800,
    size: 48,
    lineHeight: 1.34,
    files: [
      [notoSansLatinExt500, 500, notoSansRanges['latin-ext']],
      [notoSansLatinExt800, 800, notoSansRanges['latin-ext']],
      [notoSansVietnamese500, 500, notoSansRanges['vietnamese']],
      [notoSansVietnamese800, 800, notoSansRanges['vietnamese']],
      [notoSansLatin500, 500, notoSansRanges['latin']],
      [notoSansLatin800, 800, notoSansRanges['latin']],
    ],
  },
  vietnamese: {
    family: 'Be Vietnam Pro',
    weight: 500,
    strong: 800,
    size: 47,
    lineHeight: 1.26,
    files: [
      [beVietnamProLatinExt500, 500, beVietnamProRanges['latin-ext']],
      [beVietnamProLatinExt800, 800, beVietnamProRanges['latin-ext']],
      [beVietnamProVietnamese500, 500, beVietnamProRanges['vietnamese']],
      [beVietnamProVietnamese800, 800, beVietnamProRanges['vietnamese']],
      [beVietnamProLatin500, 500, beVietnamProRanges['latin']],
      [beVietnamProLatin800, 800, beVietnamProRanges['latin']],
    ],
  },
} as const satisfies Record<string, Typeface>;

const extendedLatin = /[ɓɗƙƴẹọṣ]/iu;

export function typefaceFor(
  text: string,
  lang = '',
  script?: Script,
): Typeface | undefined {
  if (!FLAGS.languages) return;
  const chosenScript = script ?? detectScript(text);
  const declared = lang.replaceAll('_', '-').toLowerCase().split('-')[0];
  if (chosenScript === 'latin') {
    const composed = text.normalize('NFC');
    if (declared === 'vi') return typefaces.vietnamese;
    if (declared === 'ha' || declared === 'yo' || extendedLatin.test(composed))
      return typefaces['latin-extended'];
    return;
  }
  if (chosenScript === 'arabic') {
    const language =
      langToScript(lang) === 'arabic' ? declared : detectLang(text);
    if (language === 'ur') return typefaces['arabic-ur'];
    if (language === 'fa') return typefaces['arabic-fa'];
    return typefaces['arabic-ar'];
  }
  return typefaces[chosenScript];
}
