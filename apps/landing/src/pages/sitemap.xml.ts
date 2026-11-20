import { sitePath } from '../site';
import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site }) => {
  const urls = ['', 'privacy/', 'changelog/'].map((path) => {
    const url = new URL(sitePath(path), site);
    return `  <url><loc>${url}</loc><xhtml:link rel="alternate" hreflang="en" href="${url}" /><xhtml:link rel="alternate" hreflang="x-default" href="${url}" /></url>`;
  });

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`,
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } },
  );
};
