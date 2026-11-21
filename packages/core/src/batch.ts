import { cleanUrl, parseWebUrl, unwrapUrl } from './url.ts';

export const maxBatchLinks = 40;
export interface BatchLink {
  address: string;
  title?: string;
}

export function cleanBatchLinks(links: readonly BatchLink[]) {
  const accepted = new Map<string, BatchLink>();
  for (const { address, title } of links) {
    if (address.length > 2200 || !parseWebUrl(address)) continue;
    const canonical = cleanUrl(unwrapUrl(address)).url;
    const previous = accepted.get(canonical);
    if (!previous || (!previous.title && title))
      accepted.set(canonical, {
        address: canonical,
        title: title?.trim().slice(0, 400) || undefined,
      });
  }
  return [...accepted.values()];
}

export function pastedBatchLinks(input: string): BatchLink[] | null {
  const lines = input
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
  if (lines.length < 2) return null;
  const links: BatchLink[] = [];
  for (const line of lines) {
    const candidate = line.replace(/^<|>$/g, '');
    if (/\s/.test(candidate)) return null;
    const address = /^(?:https?):\/\//i.test(candidate)
      ? candidate
      : /^(?:www\.)?[\p{L}\d-]+(?:\.[\p{L}\d-]+)+(?::\d+)?(?:[/?#].*)?$/iu.test(
            candidate,
          )
        ? 'https://' + candidate
        : '';
    if (!parseWebUrl(address)) return null;
    links.push({ address });
  }
  return cleanBatchLinks(links);
}
