import {
  cleanUrl,
  extract,
  imageUrl,
  limitHeadline,
  parseWebUrl,
  unwrapUrl,
} from '@clipcard/core';
import type { Hints } from './messages.ts';

function linkFor(element: EventTarget | null) {
  return element instanceof Element
    ? element.closest<HTMLAnchorElement>('a[href]')
    : null;
}

function cleaned(input: string) {
  const web = parseWebUrl(input);
  return web && cleanUrl(unwrapUrl(web.href)).url;
}

function previewFor(link: HTMLAnchorElement | null) {
  let title = '';
  let image: string | null = null;
  let imageWidth = 0;
  if (!link) return { title, image, imageWidth };

  let container: HTMLElement | null = link;
  for (
    let level = 0;
    container && level <= 6 && container !== document.body;
    level++
  ) {
    const bounds = container.getBoundingClientRect();
    if (bounds.height > 750 || bounds.width > 1400) break;
    if (!title) {
      const heading = container.querySelector('h1,h2,h3,h4,[role="heading"]');
      title = limitHeadline(heading?.textContent?.trim() ?? '');
    }
    for (const candidate of container.querySelectorAll('img')) {
      const visual = candidate.getBoundingClientRect();
      if (visual.width < 80 || visual.height < 45) continue;
      const width = candidate.naturalWidth || visual.width;
      if (width <= imageWidth) continue;
      const url = imageUrl(
        candidate.currentSrc || candidate.getAttribute('src'),
        location.href,
      );
      if (!url) continue;
      image = url;
      imageWidth = width;
    }
    if (title && image) break;
    container = container.parentElement;
  }
  title ||= limitHeadline(link.innerText.trim());
  return { title, image, imageWidth };
}

export function trackPage() {
  let contextTarget: HTMLAnchorElement | null = null;
  let pointer: HTMLAnchorElement | null = null;
  document.addEventListener(
    'contextmenu',
    (event) => {
      contextTarget = linkFor(event.target);
    },
    true,
  );
  document.addEventListener(
    'pointerover',
    (event) => {
      pointer = linkFor(event.target);
    },
    true,
  );

  return (address?: string): Hints => {
    const page = parseWebUrl(location.href);
    const active = pointer?.matches(':hover')
      ? pointer
      : document.querySelector<HTMLAnchorElement>('a[href]:hover');
    const target = address ? cleaned(address) : null;
    const targetLink = target
      ? contextTarget?.isConnected && cleaned(contextTarget.href) === target
        ? contextTarget
        : (Array.from(
            document.querySelectorAll<HTMLAnchorElement>('a[href]'),
          ).find((link) => cleaned(link.href) === target) ?? null)
      : null;
    const source =
      page && (!target || target === cleaned(page.href))
        ? extract(document, page.href)
        : null;
    return {
      source,
      ...previewFor(targetLink),
      selection: window.getSelection()?.toString().trim().slice(0, 500) ?? '',
      address: page?.href ?? '',
      referrer: document.referrer,
      hoveredLink: parseWebUrl(active?.href ?? '')?.href ?? null,
    };
  };
}
