import { expect, it } from 'vitest';
import { releaseEntries } from './changelog';

it('shows published versions in file order with their dated release notes', () => {
  expect(
    releaseEntries(
      '# Changelog\r\n\r\n## Unreleased\r\n- Draft note\r\n\r\n## [v0.1.0] - 2026-11-20\r\n- Released note\r\n\r\n## v0.0.0 - 2026-11-19\r\n- Earlier note',
    ),
  ).toEqual([
    { version: 'v0.1.0', date: '2026-11-20', changes: ['Released note'] },
    { version: 'v0.0.0', date: '2026-11-19', changes: ['Earlier note'] },
  ]);
});
