import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { chromeMessages } from './chrome-messages.ts';

const source = new URL('../locales/', import.meta.url);
const destination = new URL(
  '../../../apps/extension/public/_locales/',
  import.meta.url,
);

const locales = (await readdir(source)).filter((file) =>
  file.endsWith('.json'),
);
await Promise.all(
  locales.map(async (file) => {
    const locale = file.slice(0, -5).replaceAll('-', '_');
    const dir = new URL(`${locale}/`, destination);
    const messages = JSON.parse(
      await readFile(new URL(file, source), 'utf8'),
    ) as Record<string, string>;
    await mkdir(dir, { recursive: true });
    await writeFile(
      new URL('messages.json', dir),
      JSON.stringify(chromeMessages(messages), null, 2) + '\n',
    );
  }),
);
