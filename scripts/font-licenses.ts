import { copyFile, mkdir, readFile } from 'node:fs/promises';

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
