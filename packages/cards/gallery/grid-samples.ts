import river from './photos/river-bus.png?url';
import boarding from './photos/boarding.png?url';
import cabin from './photos/cabin.png?url';
import chart from './photos/commute-chart.png?url';
import boardingPortrait from './photos/boarding-portrait.png?url';
import riverGrid3 from './photos/river-grid3.png?url';
import riverGrid4 from './photos/river-grid4.png?url';
import { gridModel } from '../src/grid-model.ts';
import type { GridClip } from '../src/grid-model.ts';
import { sourceUrl } from './samples.ts';

const title =
  "Dhaka's new electric river buses cut cross-city commutes in half";
const mark = 'Delta Dispatch';
const riverQuote =
  'The river was always our oldest road. We just forgot how to use it.';
const image = (id: string, image: string): GridClip => ({
  id,
  image,
  kind: 'image',
  title,
  sourceUrl,
});
const excerpt = (id: string, text: string): GridClip => ({
  id,
  text,
  kind: 'text',
  image: river,
  title,
  sourceUrl,
});

const excerpts = [
  excerpt(
    'first',
    'The first boats left Gabtoli at 6:30 a.m. By eight, every seat was taken.',
  ),
  excerpt(
    'second',
    'Fares start at Tk 30, and two more routes open before the monsoon.',
  ),
  excerpt('third', '“' + riverQuote + '”'),
];
const section = {
  id: 'chart',
  kind: 'section',
  title,
  sourceUrl,
  image: chart,
} as const;
const separate = 'https://example.org/quotes?edition=2';
export const gridSamples = [
  { id: 'clips-excerpts-4x5', model: gridModel(excerpts, { mark }) },
  {
    id: 'clips-grid3-4x5',
    model: gridModel(
      [
        image('boarding', boardingPortrait),
        image('cabin', cabin),
        image('river', riverGrid3),
      ],
      { mark },
    ),
  },
  {
    id: 'clips-grid4-4x5',
    model: gridModel(
      [
        image('river', river),
        image('boarding', boarding),
        image('cabin', cabin),
        image('closeup', riverGrid4),
      ],
      { mark },
    ),
  },
  {
    id: 'clips-board-4x5',
    model: gridModel(
      [image('boarding', boarding), section, excerpt('third', riverQuote)],
      {
        mark,
      },
    ),
  },
  {
    id: 'clips-multiple-sources',
    model: gridModel([
      image('boarding', boarding),
      { ...excerpts[0]!, sourceUrl: separate },
      { ...excerpts[1]!, sourceUrl: separate + '&utm_source=feed' },
      {
        ...image('third-site', river),
        sourceUrl: 'https://example.net/article',
      },
    ]),
  },
];
