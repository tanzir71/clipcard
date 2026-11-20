import { limitHeadline, outletFromHost } from './title.ts';
import { parseWebUrl } from './url.ts';

const stopwords = new Set([
  'a',
  'an',
  'and',
  'at',
  'by',
  'for',
  'in',
  'of',
  'on',
  'or',
  'the',
  'to',
  'with',
]);
const structural = /^(?:amp|index(?:\.html?)?|\d+|[a-f\d]{8,})$/i;

export function slugHeadline(input: string): string | null {
  const url = parseWebUrl(input);
  if (!url) return null;
  const path = url.pathname
    .split('/')
    .filter((part) => part && !structural.test(part))
    .at(-1);
  if (!path) return outletFromHost(url.hostname);

  let slug = path;
  try {
    slug = decodeURIComponent(path);
  } catch {
    // Use the visible path when the publisher left an invalid escape.
  }
  const words = slug
    .replace(/\.(?:html?|aspx?|php)$/i, '')
    .replace(/\b\d{4}-\d{2}-\d{2}\b/g, ' ')
    .split(/[-_\s]+/u)
    .filter((word) => /\p{Letter}/u.test(word) && !structural.test(word));
  const headline = words
    .map((word, index) => {
      const lower = word.toLowerCase();
      if (index && stopwords.has(lower)) return lower;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
  return limitHeadline(headline) || outletFromHost(url.hostname);
}
