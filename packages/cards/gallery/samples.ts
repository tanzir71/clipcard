import river from './photos/river-bus.png?url';
import boarding from './photos/boarding.png?url';
import cabin from './photos/cabin.png?url';
import tea from '../../../design/photos/tea-garden.jpg?url';
import { textFragment } from '@clipcard/core';
import type { CardModel, Format, Template } from '../src/model.ts';

export const sourceUrl = 'https://deltadispatch.news/city/electric-river-buses';
export const headline =
  'Dhaka’s electric river buses cut commutes in half, says transport authority';
const sentence =
  'The river was always our oldest road. We just forgot how to use it.';
const markedLength = headline.indexOf(',') + 1;
const caption = headline.slice(0, markedLength - 1);
const teaHeadline = 'Tea estates trial shade-grown leaves as heat rises';
const capsPhrase = 'electric river buses';
const capsHeadline = headline.slice(0, markedLength - 1);
const source: CardModel = {
  headline,
  outlet: 'Delta Dispatch',
  image: river,
  lang: 'en',
  dir: 'ltr',
  script: 'latin',
  sourceUrl,
  qrUrl: sourceUrl,
  section: 'City',
  subsection: 'Transport',
  publishedAt: '2026-11-20',
  mark: 'river\ndesk.',
  emphasisRange: [0, markedLength],
  focal: { x: 0.5, y: 0.5 },
};

export const samples: {
  id: string;
  template: Template;
  format: Format;
  model: CardModel;
}[] = [
  { id: 'header-4x5', template: 'header', format: '4:5', model: source },
  {
    id: 'split-4x5',
    template: 'split',
    format: '4:5',
    model: { ...source, image: boarding, emphasisRange: [0, markedLength - 1] },
  },
  {
    id: 'split-16x9',
    template: 'split',
    format: '16:9',
    model: { ...source, image: boarding, emphasisRange: [0, markedLength - 1] },
  },
  {
    id: 'split-191x1',
    template: 'split',
    format: '1.91:1',
    model: { ...source, image: boarding, emphasisRange: [0, markedLength - 1] },
  },
  {
    id: 'caps-4x5',
    template: 'caps',
    format: '4:5',
    model: {
      ...source,
      headline: capsHeadline,
      emphasisRange: [
        capsHeadline.indexOf(capsPhrase),
        capsHeadline.indexOf(capsPhrase) + capsPhrase.length,
      ],
      extraEmphasisRange: [
        capsHeadline.indexOf('in half'),
        capsHeadline.length,
      ],
      dek: 'Two more routes open before the monsoon',
    },
  },
  {
    id: 'overlay-4x5',
    template: 'overlay',
    format: '4:5',
    model: {
      ...source,
      image: cabin,
      headline: caption,
      emphasisRange: [caption.indexOf('cut '), caption.length],
      photoLight: 0.2,
    },
  },
  {
    id: 'solid-4x5',
    template: 'solid',
    format: '4:5',
    model: { ...source, image: null, emphasisRange: [0, markedLength - 1] },
  },
  {
    id: 'duotone-4x5',
    template: 'duotone',
    format: '4:5',
    model: {
      ...source,
      image: tea,
      section: 'Climate',
      headline: teaHeadline,
      emphasisRange: [
        teaHeadline.indexOf('shade-grown'),
        teaHeadline.indexOf(' as heat'),
      ],
    },
  },
  {
    id: 'duotone-1x1',
    template: 'duotone',
    format: '1:1',
    model: {
      ...source,
      image: tea,
      section: 'Climate',
      headline: teaHeadline,
      emphasisRange: [
        teaHeadline.indexOf('shade-grown'),
        teaHeadline.indexOf(' as heat'),
      ],
    },
  },
  {
    id: 'quote-4x5',
    template: 'quote',
    format: '4:5',
    model: {
      ...source,
      image: boarding,
      headline: '“' + sentence + '”',
      quoteAttribution: 'River bus pilot · Gabtoli terminal',
      quote: true,
      qrUrl: textFragment(sourceUrl, sentence),
      emphasisRange: null,
    },
  },
  {
    id: 'header-9x16-story',
    template: 'header',
    format: '9:16',
    model: source,
  },
  {
    id: 'header-1x1',
    template: 'header',
    format: '1:1',
    model: { ...source, image: tea },
  },
];
