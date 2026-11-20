import {
  mkdir,
  readFile,
  readdir,
  rmdir,
  unlink,
  writeFile,
} from 'node:fs/promises';
import { CARD_LANGUAGES_RELEASED } from '../../core/flags.ts';
import { chromeMessages } from './chrome-messages.ts';

const source = new URL('../locales/', import.meta.url);
const destination = new URL(
  '../../../apps/extension/public/_locales/',
  import.meta.url,
);

const locales = (await readdir(source)).filter((file) =>
  file.endsWith('.json'),
);
const nativeChromeLocales = new Set([
  'en',
  'bn',
  'hi',
  'id',
  'fil',
  'ar',
  'es',
  'pt_BR',
  'sw',
  'am',
]);
const preview =
  CARD_LANGUAGES_RELEASED || process.env.VITE_CLIPCARD_LANGUAGES === '1';
await Promise.all(
  locales.map(async (file) => {
    const locale = file.slice(0, -5).replaceAll('-', '_');
    const dir = new URL(`${locale}/`, destination);
    const output = new URL('messages.json', dir);
    if (
      !nativeChromeLocales.has(locale) ||
      (!preview && locale !== 'en' && locale !== 'bn')
    ) {
      await unlink(output).catch((error: NodeJS.ErrnoException) => {
        if (error.code !== 'ENOENT') throw error;
      });
      await rmdir(dir).catch((error: NodeJS.ErrnoException) => {
        if (error.code !== 'ENOENT' && error.code !== 'ENOTEMPTY') throw error;
      });
      return;
    }
    const messages = JSON.parse(
      await readFile(new URL(file, source), 'utf8'),
    ) as Record<string, string>;
    await mkdir(dir, { recursive: true });
    await writeFile(
      output,
      JSON.stringify(chromeMessages(messages), null, 2) + '\n',
    );
  }),
);
