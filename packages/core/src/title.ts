const separator = /\s+[|–—-]\s+|\s*:\s+/gu;

function compact(text: string) {
  return text
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}\p{Mark}]/gu, '');
}

export function limitHeadline(text: string) {
  const normalized = text.replace(/\s+/gu, ' ').trim();
  const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
  let count = 0;
  for (const { index } of segmenter.segment(normalized)) {
    if (count++ === 140) return normalized.slice(0, index).trimEnd();
  }
  return normalized;
}

export function cleanTitle(
  title: string,
  siteName: string | null,
  host: string,
): string {
  const name = compact(siteName ?? '');
  const domain = compact(host.replace(/^www\d*\./i, '').split('.')[0] ?? '');
  const isSite = (candidate: string) => {
    const label = compact(candidate);
    return (
      label !== '' &&
      (label === name || label === domain || label === compact(host))
    );
  };
  let result = title.replace(/\s+/gu, ' ').trim();
  const parts = [...result.matchAll(separator)];
  const last = parts.at(-1);
  if (last && isSite(result.slice(last.index + last[0].length))) {
    const prefix = result.slice(0, last.index).trim();
    if (prefix) result = prefix;
  }
  const first = parts[0];
  if (first && isSite(result.slice(0, first.index))) {
    const suffix = result.slice(first.index + first[0].length).trim();
    if (suffix) result = suffix;
  }
  return limitHeadline(result);
}

export function outletFromHost(host: string): string {
  const name = host.replace(/^www\d*\./i, '').split('.')[0] ?? host;
  return name.charAt(0).toUpperCase() + name.slice(1);
}
