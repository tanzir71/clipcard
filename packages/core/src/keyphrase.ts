import { detectScript } from './script.ts';

export type TextRange = readonly [start: number, end: number];

const verbs = new Set([
  'are',
  'is',
  'was',
  'were',
  'be',
  'have',
  'has',
  'had',
  'cut',
  'quit',
  'set',
  'plan',
  'win',
  'lose',
  'pass',
  'fail',
  'rise',
  'fall',
  'slip',
  'lead',
  'reach',
  'face',
  'seek',
  'back',
  'hit',
  'keep',
  'clear',
  'approve',
  'open',
  'end',
  'ban',
  'vote',
  'stall',
  'reject',
  'urge',
  'halve',
  'double',
  'arrive',
]);
const prepositions = /^(in|at|on|with|after|amid|over|for)$/i;

export function keyphrase(headline: string): TextRange | null {
  const start = /^\s*["“‘«]?/u.exec(headline)?.[0].length ?? 0;
  const text = headline.slice(start);
  if (detectScript(text) !== 'latin') {
    const boundary = /[,،，—]/u.exec(text)?.index;
    const end =
      boundary === undefined ? 0 : text.slice(0, boundary).trimEnd().length;
    return end ? [start, start + end] : null;
  }

  const words = [
    ...text.matchAll(
      /[\p{Letter}\p{Number}]+(?:['’-][\p{Letter}\p{Number}]+)*/gu,
    ),
  ];
  const maxWords = Math.min(9, Math.floor(words.length * 0.6));
  if (maxWords < 3) return null;

  const firstClause = /[,;:”“»]|\s+says\b/iu.exec(text)?.index ?? Infinity;
  let seenVerb = false;
  let last: (typeof words)[number] | undefined;
  for (const word of words.slice(0, maxWords)) {
    const value = word[0].toLowerCase();
    if (word.index >= firstClause || (seenVerb && prepositions.test(value)))
      break;
    last = word;
    seenVerb ||=
      verbs.has(value) ||
      verbs.has(value.replace(/s$/, '')) ||
      /(?:ed|ing)$/.test(value);
  }
  if (!last || words.indexOf(last) < 2) return null;
  return [start, start + last.index + last[0].length];
}
