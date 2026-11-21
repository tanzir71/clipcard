import { expect, it } from 'vitest';
import { cleanBatchLinks, pastedBatchLinks } from './batch.ts';

it('keeps the order of distinct cleaned links in a pasted list', () => {
  expect(
    pastedBatchLinks(
      '<https://news.example/one?utm_source=email>\r\nnews.example/two\nhttps://news.example/one',
    ),
  ).toEqual([
    { address: 'https://news.example/one', title: undefined },
    { address: 'https://news.example/two', title: undefined },
  ]);
});

it('leaves prose and invalid schemes outside the batch path', () => {
  expect(
    pastedBatchLinks('Read more below\nhttps://news.example/one'),
  ).toBeNull();
  expect(pastedBatchLinks('https://news.example/one')).toBeNull();
  expect(
    cleanBatchLinks([
      { address: 'javascript:alert(0)' },
      { address: 'https://news.example/ok', title: 'Story' },
    ]),
  ).toEqual([{ address: 'https://news.example/ok', title: 'Story' }]);
});
