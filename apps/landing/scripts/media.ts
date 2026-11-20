import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { CARD_LANGUAGES_RELEASED } from '../../../packages/core/flags.ts';

const localized =
  CARD_LANGUAGES_RELEASED || process.env.VITE_CLIPCARD_LANGUAGES === '1';

const design = new URL('../../../design/', import.meta.url);
const output = new URL('../src/media/generated/', import.meta.url);
await mkdir(output, { recursive: true });

const cardNames = [
  'split-4x5',
  'overlay-4x5',
  'duotone-4x5',
  'header-4x5',
  'quote-4x5',
  'caps-4x5',
  'solid-4x5',
  'header-4x5-bn',
  'header-4x5-hi',
  'split-4x5-ur-rtl',
];
const widths = [240, 420, 840];
const landingMock = fileURLToPath(
  new URL('screens/L1-landing-desktop.png', design),
);
const imagePath = (name: string) => fileURLToPath(new URL(name, output));

// The landing design has six standalone 384×280 illustrations.
const features = [
  'cards',
  'clips',
  'videoClips',
  'videoJoin',
  'gifs',
  'drafts',
];

await Promise.all([
  ...cardNames.flatMap((name) => {
    const original = fileURLToPath(new URL(`cards/${name}.png`, design));
    return widths.map((width) =>
      sharp(original)
        .resize({ width })
        .webp({ quality: 86 })
        .toFile(imagePath(`${name}-${width}.webp`)),
    );
  }),
  ...features.map((name, i) =>
    sharp(landingMock)
      .extract({
        left: 120 + (i % 3) * 408,
        top: i < 3 ? 1821 : 2231,
        width: 384,
        height: 280,
      })
      .webp({ quality: 88 })
      .toFile(imagePath(`feature-${name}.webp`)),
  ),
  ...(localized
    ? []
    : [
        sharp(fileURLToPath(new URL('cards/split-16x9.png', design)))
          .resize({ width: 1200, height: 630 })
          .jpeg({ quality: 88, mozjpeg: true })
          .toFile(imagePath('social-en.jpg')),
      ]),
]);

if (localized) {
  const { renderSocialImages } = await import('./social.ts');
  await renderSocialImages(output);
}
