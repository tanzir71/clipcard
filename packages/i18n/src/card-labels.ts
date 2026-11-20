import en from '../locales/en.json';
import cardCopy from '../locales/cards/labels.json';

const labels: Readonly<Record<string, (typeof cardCopy)['bn']>> = cardCopy;

const english = {
  source: en['card.source'],
  quoted: en['card.quote'],
  via: en['card.via'],
};

export function cardLabels(lang: string) {
  const language = lang.toLowerCase().split(/[-_]/)[0] ?? '';
  return labels[language] ?? english;
}
