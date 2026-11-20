import { encode } from 'uqr';
import { tokens } from './tokens.ts';

export function qrGeometry(
  url: string,
  baseSize: number,
  minModulePx: number = tokens.card.qr.minModulePx,
) {
  const qr = encode(url, { ecc: 'M', boostEcc: false, border: 0 });
  const { padding } = tokens.card.qr;
  const possible = baseSize + 48;
  const size = Math.min(
    possible,
    Math.max(baseSize, Math.ceil(qr.size * minModulePx) + padding * 2),
  );
  const step = (size - padding * 2) / qr.size;
  const module = Math.floor(step * 1000) / 1000;
  const start = (size - qr.size * module) / 2;
  const round = (value: number) => value.toFixed(2);
  const path: string[] = [];
  for (const [y, row] of qr.data.entries()) {
    let x = 0;
    while (x < qr.size) {
      if (!row[x]) {
        x++;
        continue;
      }
      const from = x;
      while (row[x]) x++;
      const length = (x - from) * module;
      path.push(
        'M' +
          round(start + from * module) +
          ' ' +
          round(start + y * module) +
          'h' +
          round(length) +
          'v' +
          round(module) +
          'h-' +
          round(length) +
          'z',
      );
    }
  }
  return { path: path.join(''), size, module };
}
