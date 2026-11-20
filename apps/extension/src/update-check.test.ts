import { expect, it } from 'vitest';
import { isNewer } from './update-check.ts';

it.each([
  ['v0.10.0', '0.2.10', true],
  ['v1.0.0', '0.99.99', true],
  ['v0.2.9', '0.2.10', false],
  ['v0.2.0', '0.2.0', false],
  ['v0.3.0-preview', '0.2.0', false],
  ['invalid', '0.2.0', false],
] as const)('compares release %s with installed %s', (tag, current, newer) => {
  expect(isNewer(tag, current)).toBe(newer);
});
