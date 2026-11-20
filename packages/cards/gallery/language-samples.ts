import { detectScript, keyphrase } from '@clipcard/core';
import headlines from '../../../fixtures/headlines.json';
import type { Direction } from '@clipcard/core';
import type { CardModel, Template } from '../src/model.ts';
import { samples } from './samples.ts';

const header = samples.find((sample) => sample.id === 'header-4x5')!.model;
const split = samples.find((sample) => sample.id === 'split-4x5')!.model;

export const languageSamples = headlines.samples.flatMap(
  ({ lang, text, dir }) =>
    (['header', 'split'] as const).map((template) => ({
      id: template + '-language-' + lang,
      template,
      format: '4:5' as const,
      model: {
        ...(template === 'header' ? header : split),
        lang,
        script: detectScript(text),
        dir: dir as Direction,
        headline: text,
        emphasisRange: keyphrase(text),
      } satisfies CardModel,
    })),
);

export const languageReferences = [
  reference(
    'bn',
    'header',
    'ঢাকার বৈদ্যুতিক রিভার বাসে যাতায়াতের সময় অর্ধেক হয়েছে, বলছে পরিবহন কর্তৃপক্ষ',
    'ঢাকার বৈদ্যুতিক রিভার বাসে যাতায়াতের সময় অর্ধেক',
    'শহর',
    'পরিবহন',
    'ডেল্টা ডিসপ্যাচ',
  ),
  reference(
    'hi',
    'header',
    'ढाका की इलेक्ट्रिक रिवर बसों ने सफ़र का समय आधा किया, परिवहन प्राधिकरण का कहना',
    'ढाका की इलेक्ट्रिक रिवर बसों ने सफ़र का समय आधा किया,',
    'शहर',
    'परिवहन',
    'डेल्टा डिस्पैच',
  ),
  reference(
    'ur',
    'split',
    'ڈھاکے کی برقی دریائی بسوں نے سفر کا وقت آدھا کر دیا، محکمہ ٹرانسپورٹ',
    'ڈھاکے کی برقی دریائی بسوں نے سفر کا وقت آدھا کر دیا',
    'شہر',
    null,
    'ڈیلٹا ڈسپیچ',
  ),
];

export const encodingSamples = (
  [
    ['zawgyi', headlines.zawgyi.text],
    ['unicode', headlines.zawgyi.unicode],
  ] as const
).map(([encoding, text]) => ({
  id: 'myanmar-' + encoding,
  template: 'header' as const,
  format: '4:5' as const,
  model: {
    ...header,
    lang: 'my',
    script: 'myanmar',
    headline: text,
    emphasisRange: keyphrase(text),
  } satisfies CardModel,
}));

function reference(
  lang: 'bn' | 'hi' | 'ur',
  template: Extract<Template, 'header' | 'split'>,
  headline: string,
  key: string,
  section: string,
  subsection: string | null,
  outlet: string,
) {
  const model: CardModel = {
    ...(template === 'header' ? header : split),
    lang,
    script: detectScript(headline),
    dir: lang === 'ur' ? 'rtl' : 'ltr',
    headline,
    section,
    subsection,
    outlet,
    emphasisRange: [0, key.length],
  };
  return {
    id: template + '-4x5-' + lang + (lang === 'ur' ? '-rtl' : ''),
    template,
    format: '4:5' as const,
    model,
  };
}
