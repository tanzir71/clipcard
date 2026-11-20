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
