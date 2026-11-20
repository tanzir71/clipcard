import { sitePath } from '../site';
import { RELEASED } from '../config';
import { alternates, landingLocales, localizedPath } from '../languages';
import type { LocalizedPage } from '../languages';
import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site }) => {
  const pages: LocalizedPage[] = ['home', 'privacy'];
  const paths = ['changelog/'];
  if (RELEASED.app) paths.push('app/');
  const entry = (url: URL, links: { lang: string; url: URL }[]) =>
    `  <url><loc>${url}</loc>${links.map(({ lang, url }) => `<xhtml:link rel="alternate" hreflang="${lang}" href="${url}" />`).join('')}</url>`;
  const urls = [
    ...pages.flatMap((page) => {
      const links = alternates(page, site);
      return landingLocales.map((locale) =>
        entry(new URL(localizedPath(locale, page), site), links),
      );
    }),
    ...paths.map((path) => {
      const url = new URL(sitePath(path), site);
      return entry(url, [
        { lang: 'en', url },
        { lang: 'x-default', url },
      ]);
    }),
  ];

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`,
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } },
  );
};
