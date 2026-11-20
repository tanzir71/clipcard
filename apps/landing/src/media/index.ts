import socialImage from './generated/social-en.jpg?url';

const media = import.meta.glob<string>('./generated/*.webp', {
  eager: true,
  query: '?url',
  import: 'default',
});

export function previewImage(name: string) {
  const image = media[`./generated/${name}.webp`];
  if (!image) throw new Error(`Missing landing image: ${name}`);
  return image;
}

export { socialImage };
