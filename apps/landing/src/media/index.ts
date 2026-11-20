import englishSocial from './generated/social-en.jpg?url';
import type { InterfaceLanguage } from '@clipcard/i18n';

const social = import.meta.glob<string>('./generated/social-*.jpg', {
  eager: true,
  query: '?url',
  import: 'default',
});

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

export function socialImage(locale: InterfaceLanguage) {
  return social['./generated/social-' + locale + '.jpg'] ?? englishSocial;
}
