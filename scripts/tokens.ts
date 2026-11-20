import { mkdir, readFile, writeFile } from 'node:fs/promises';

type Token =
  string | number | boolean | null | Token[] | { [key: string]: Token };
type Group = { [key: string]: Token };
type Design = {
  ui: Group & { color: { light: Group; dark: Group } };
  card: Group;
  video: Group;
};

function cssNames(parts: string[]): string {
  return parts
    .join('-')
    .replace(/([a-z\d])([A-Z])/g, '$1-$2')
    .replace(/[^a-z\d-]+/gi, '-')
    .toLowerCase();
}

function variables(group: Group, prefix: string[]): string[] {
  return Object.entries(group).flatMap(([key, value]) => {
    const path = [...prefix, key];
    if (value === null || typeof value === 'boolean') return [];
    if (typeof value === 'string' || typeof value === 'number') {
      return ['  --pc-' + cssNames(path) + ': ' + value + ';'];
    }
    return variables(value as Group, path);
  });
}

const design = JSON.parse(
  await readFile(new URL('../design/tokens.json', import.meta.url), 'utf8'),
) as Design;
const { color, ...ui } = design.ui;
const out = new URL('../packages/cards/src/', import.meta.url);
await mkdir(out, { recursive: true });

await Promise.all([
  writeFile(
    new URL('tokens.ts', out),
    '// Generated from design/tokens.json by scripts/tokens.ts.\nexport const tokens = ' +
      JSON.stringify(design, null, 2) +
      ' as const;\n',
  ),
  writeFile(
    new URL('tokens.css', out),
    [
      '/* Generated from design/tokens.json by scripts/tokens.ts. */',
      ':root {',
      ...variables(color.light, ['ui', 'color']),
      ...variables(ui, ['ui']),
      ...variables(design.card, ['card']),
      ...variables(design.video, ['video']),
      '}',
      '[data-theme="dark"] {',
      ...variables(color.dark, ['ui', 'color']),
      '}',
      '',
    ].join('\n'),
  ),
]);
