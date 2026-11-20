import { expect, it } from 'vitest';
import { validateBookmark } from './bookmark.ts';

const token = 'abcd-efgh-ijkl-mnop';
const origin = 'https://publisher.example';
const message = {
  type: 'clipcard:bookmark',
  token,
  address: origin + '/story',
  canonical: '/story',
  title: 'A real story',
  outlet: '',
  section: '',
  published: '',
  lang: 'en',
  image: '',
  selection: '',
  frame: '',
};

it('accepts the expected one-time bookmark message from its publisher window', () => {
  expect(validateBookmark(message, origin, token)).toEqual(message);
});

it('rejects messages from another origin or session, and oversized or unexpected fields', () => {
  expect(
    validateBookmark(message, 'https://elsewhere.example', token),
  ).toBeNull();
  expect(validateBookmark(message, origin, 'abcd-efgh-ijkl-zzzz')).toBeNull();
  expect(validateBookmark(message, 'null', token)).toBeNull();
  expect(
    validateBookmark({ ...message, title: 'a'.repeat(401) }, origin, token),
  ).toBeNull();
  expect(
    validateBookmark(
      { ...message, frame: 'a'.repeat(1_600_001) },
      origin,
      token,
    ),
  ).toBeNull();
  expect(
    validateBookmark({ ...message, unexpected: 1 }, origin, token),
  ).toBeNull();
  expect(
    validateBookmark({ ...message, address: 'file:///example' }, origin, token),
  ).toBeNull();
});
