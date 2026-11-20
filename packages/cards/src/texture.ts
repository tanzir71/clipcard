import { inkGradient } from './color.ts';
import { tokens } from './tokens.ts';

const tile = tokens.card.texture.grain.tile;
const svg =
  '<svg xmlns="http://www.w3.org/2000/svg" width="' +
  tile +
  '" height="' +
  tile +
  '"><filter id="f" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise"' +
  ' baseFrequency=".9" numOctaves="2" seed="7" stitchTiles="stitch"/>' +
  '<feColorMatrix type="saturate" values="0"/></filter><path d="M0 0h256v256H0z" filter="url(#f)"/></svg>';

let grainPromise: Promise<string> | undefined;
export function prepareGrain() {
  grainPromise ??= (async () => {
    const image = new Image();
    image.src = 'data:image/svg+xml,' + encodeURIComponent(svg);
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = tile;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas is unavailable');
    context.drawImage(image, 0, 0);
    return canvas.toDataURL('image/png');
  })();
  return grainPromise;
}

export function smootherstep(value: number) {
  const x = Math.min(1, Math.max(0, value));
  return x * x * x * (x * (x * 6 - 15) + 10);
}

export function fade(
  color: string,
  alpha: number,
  direction: string,
  hold = 0,
) {
  const count = tokens.card.gradient.stops;
  const stops = Array.from({ length: count }, (_, index) => {
    const t = index / (count - 1);
    const percent = 100 * (hold + (1 - hold) * t);
    return (
      inkGradient(color, alpha * (1 - smootherstep(t))) +
      ' ' +
      percent.toFixed(3) +
      '%'
    );
  });
  return 'linear-gradient(' + direction + ', ' + stops.join(', ') + ')';
}

const patterns = new Map<string, string>();
export function halftone(
  width: number,
  height: number,
  axis: 'down' | 'toward-start' | 'right',
) {
  const key = width + '-' + height + '-' + axis;
  const cached = patterns.get(key);
  if (cached) return cached;
  const pitch = tokens.card.texture.halftone.pitch;
  const alpha =
    axis === 'toward-start' ? 0.045 : tokens.card.texture.halftone.opacity;
  const circles: string[] = [];
  for (let y = pitch / 2; y < height; y += pitch) {
    for (let x = pitch / 2; x < width; x += pitch) {
      const falloff =
        axis === 'down'
          ? y / height
          : axis === 'right'
            ? x / width
            : (width - x) / width;
      const opacity = (1 - smootherstep(falloff)) * alpha;
      if (opacity < 0.002) continue;
      const r = Math.max(0.6, 3.65 * (1 - smootherstep(falloff)));
      circles.push(
        '<circle cx="' +
          x +
          '" cy="' +
          y +
          '" r="' +
          r.toFixed(2) +
          '" opacity="' +
          opacity.toFixed(3) +
          '"/>',
      );
    }
  }
  const data =
    'data:image/svg+xml,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="' +
        width +
        '" height="' +
        height +
        '" fill="white">' +
        circles.join('') +
        '</svg>',
    );
  patterns.set(key, data);
  return data;
}
