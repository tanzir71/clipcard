import { afterEach, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

it('enables the shipped workflow flags by default', async () => {
  const { FLAGS } = await import('../flags.ts');
  expect(
    Object.entries(FLAGS)
      .filter(([, enabled]) => enabled)
      .map(([feature]) => feature),
  ).toEqual([
    'clips',
    'drafts',
    'languages',
    'videoClips',
    'videoJoin',
    'gifs',
    'batch',
  ]);
});

it('only activates overrides in development', async () => {
  vi.stubEnv('VITE_CLIPCARD_LITE', '1');
  vi.stubEnv('DEV', true);
  expect((await import('../flags.ts')).FLAGS.lite).toBe(true);

  vi.resetModules();
  vi.stubEnv('DEV', false);
  expect((await import('../flags.ts')).FLAGS.lite).toBe(false);
});
