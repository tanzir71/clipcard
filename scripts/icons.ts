import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { Resvg } from '@resvg/resvg-js';

const mark = await readFile(
  new URL('../design/brand/mark.svg', import.meta.url),
);
const output = new URL('../apps/extension/public/icon/', import.meta.url);
const liteOutput = new URL('../apps/lite/public/icon/', import.meta.url);
await Promise.all([
  mkdir(output, { recursive: true }),
  mkdir(liteOutput, { recursive: true }),
]);

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

const maskable =
  '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 24 24">' +
  '<rect width="24" height="24" fill="#0a0a0a"/><rect x="4" y="4" width="16" height="16" rx="3.5" fill="white"/>' +
  '<rect x="7.4" y="7.4" width="9.2" height="5.5" rx=".75" fill="#0a0a0a"/>' +
  '<rect x="7.4" y="14.3" width="5.5" height="1.35" rx=".4" fill="#0a0a0a"/>' +
  '<rect x="14" y="14" width="2.6" height="2.6" rx=".4" fill="#a9bcdf"/></svg>';

await Promise.all(
  [192, 512].map((size) =>
    writeFile(
      new URL(size + '.png', liteOutput),
      new Resvg(maskable, { fitTo: { mode: 'width', value: size } })
        .render()
        .asPng(),
    ),
  ),
);
