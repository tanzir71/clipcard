import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { Resvg } from '@resvg/resvg-js';

const mark = await readFile(
  new URL('../design/brand/mark.svg', import.meta.url),
);
const output = new URL('../apps/extension/public/icon/', import.meta.url);
await mkdir(output, { recursive: true });

await Promise.all(
  [16, 32, 48, 128].map((size) =>
    writeFile(
      new URL(`${size}.png`, output),
      new Resvg(mark, { fitTo: { mode: 'width', value: size } })
        .render()
        .asPng(),
    ),
  ),
);
