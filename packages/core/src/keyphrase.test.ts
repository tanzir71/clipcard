import { expect, it } from 'vitest';
import { keyphrase } from './keyphrase.ts';

it.each([
  [
    'New river buses arrive at the dock early this week',
    'New river buses arrive',
  ],
  [
    'The city council approves new routes, ending weeks of debate',
    'The city council approves new routes',
  ],
  [
    'A new electric city bus: where to find the first route',
    'A new electric city bus',
  ],
  [
    'The river is our oldest road, says a pilot on Monday',
    'The river is our oldest road',
  ],
  [
    '“Our electric buses are free through August,” said the minister during a visit',
    'Our electric buses are free through August',
  ],
  ['নতুন বৈদ্যুতিক নদী বাস, যাতায়াতের সময় অর্ধেক', 'নতুন বৈদ্যুতিক নদী বাস'],
  ['نئی دریائی بسیں، شہر کا سفر آدھا', 'نئی دریائی بسیں'],
  ['Three words only', null],
  ['বাংলা শিরোনামে কমা নেই', null],
])('selects a bounded phrase from %s', (title, expected) => {
  const range = keyphrase(title);
  expect(range ? title.slice(...range) : null).toBe(expected);
});
