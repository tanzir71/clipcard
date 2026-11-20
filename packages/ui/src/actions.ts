import type { CardModel, CardOptions } from '@clipcard/cards';

export function renderPng(model: CardModel, options: CardOptions) {
  return import('@clipcard/cards/export').then(({ renderCard }) =>
    renderCard(model, options),
  );
}

export function fileName(headline: string) {
  const name = headline
    .normalize('NFC')
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Mark}\p{Number}]+/gu, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 75)
    .replace(/-$/g, '');
  return (name ? 'clipcard-' + name : 'clipcard') + '.png';
}

export function copyPng(png: Promise<Blob>) {
  return navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]);
}

export function downloadPng(png: Blob, title: string) {
  const url = URL.createObjectURL(png);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName(title);
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

export function shareFile(png: Blob, title: string, text?: string) {
  const file = new File([png], fileName(title), { type: 'image/png' });
  const payload = { files: [file], title, text };
  if (!navigator.canShare?.(payload) || !navigator.share) return null;
  return navigator.share(payload);
}
