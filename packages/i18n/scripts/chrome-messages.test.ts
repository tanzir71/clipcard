import { expect, it } from 'vitest';
import { chromeMessages } from './chrome-messages.ts';

it('omits metadata and retains literal dollar signs in Chrome messages', () => {
  expect(
    chromeMessages({ _status: 'source', 'ext.name': 'Clipcard $5' }),
  ).toEqual({
    ext_name: { message: 'Clipcard $$5' },
  });
});

it('reports messages that would otherwise overwrite each other', () => {
  expect(() => chromeMessages({ 'ext.name': 'One', ext_name: 'Two' })).toThrow(
    'Duplicate Chrome locale key: ext_name',
  );
});
