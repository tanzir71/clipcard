import type { TextRange } from '@clipcard/core';

const separators = new Set([
  'a',
  'about',
  'across',
  'after',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'before',
  'by',
  'cut',
  'cuts',
  'during',
  'for',
  'from',
  'has',
  'have',
  'in',
  'into',
  'is',
  'launch',
  'launches',
  'near',
  'of',
  'on',
  'open',
  'over',
  'through',
  'until',
  'opens',
  'or',
  'said',
  'says',
  'the',
  'to',
  'was',
  'were',
  'will',
  'with',
]);

export function capsPhrases(headline: string): TextRange[] {
  const parts: { start: number; end: number; proper: number; words: number }[] =
    [];
  let current: (typeof parts)[number] | undefined;
  for (const word of headline.matchAll(/\p{L}[\p{L}\p{M}\p{N}'’‐-]*/gu)) {
    const [value] = word;
    const start = word.index;
    if (separators.has(value.toLowerCase())) {
      current = undefined;
      continue;
    }
    const proper = Number(/^\p{Lu}/u.test(value) && start > 0);
    const end = start + value.length;
    if (
      !current ||
      current.words === 4 ||
      /\S/u.test(headline.slice(current.end, start))
    ) {
      current = { start, end, proper, words: 1 };
      parts.push(current);
    } else {
      current.end = end;
      current.proper += proper;
      current.words++;
    }
  }
  return parts
    .sort(
      (first, second) =>
        second.proper - first.proper || second.words - first.words,
    )
    .slice(0, 2)
    .sort((first, second) => first.start - second.start)
    .map(({ start, end }) => [start, end]);
}
