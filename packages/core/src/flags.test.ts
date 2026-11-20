import { afterEach, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

it('starts with every feature off', async () => {
  const { FLAGS } = await import('../flags.ts');
  expect(Object.values(FLAGS).every((enabled) => !enabled)).toBe(true);
});

it('only activates overrides in development', async () => {
  vi.stubEnv('VITE_CLIPCARD_LITE', '1');
  vi.stubEnv('DEV', true);
  expect((await import('../flags.ts')).FLAGS.lite).toBe(true);

  vi.resetModules();
  vi.stubEnv('DEV', false);
  expect((await import('../flags.ts')).FLAGS.lite).toBe(false);
});
