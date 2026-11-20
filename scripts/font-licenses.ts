import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';

const cards = new URL('../packages/cards/', import.meta.url);
const manifest = JSON.parse(
  await readFile(new URL('package.json', cards), 'utf8'),
) as { dependencies: Record<string, string> };
const licenses = Object.keys(manifest.dependencies)
  .filter((name) => name.startsWith('@fontsource'))
  .map((name) => [name, 'LICENSE', name.split('/').at(-1) + '.txt'] as const);
const entries = [
  ...licenses,
  ['myanmar-tools', 'LICENSE.md', 'myanmar-tools.txt'] as const,
];

for (const app of ['extension', 'lite']) {
  const directory = new URL(
    '../apps/' + app + '/public/licenses/',
    import.meta.url,
  );
  await mkdir(directory, { recursive: true });
  await Promise.all(
    entries.map(([pkg, license, output]) =>
      copyFile(
        new URL('node_modules/' + pkg + '/' + license, cards),
        new URL(output, directory),
      ),
    ),
  );
}

const videoPackage = new URL(
  '../packages/ui/node_modules/mediabunny/',
  import.meta.url,
);
const videoVersion = (
  JSON.parse(await readFile(new URL('package.json', videoPackage), 'utf8')) as {
    version: string;
  }
).version;
for (const app of ['extension', 'lite']) {
  const directory = new URL(
    '../apps/' + app + '/public/licenses/',
    import.meta.url,
  );
  await Promise.all([
    copyFile(
      new URL('LICENSE', videoPackage),
      new URL('mediabunny.txt', directory),
    ),
    writeFile(
      new URL('mediabunny-source.txt', directory),
      'Mediabunny ' +
        videoVersion +
        ' is licensed under MPL-2.0.\n' +
        'Source: https://www.npmjs.com/package/mediabunny/v/' +
        videoVersion +
        '\n',
    ),
  ]);
}
