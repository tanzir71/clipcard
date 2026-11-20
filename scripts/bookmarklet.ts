import { readFile } from 'node:fs/promises';
import { transform } from 'esbuild';

export async function buildBookmarklet(appUrl: string, source?: string) {
  const code =
    source ??
    (await readFile(
      new URL('../apps/lite/bookmarklet.ts', import.meta.url),
      'utf8',
    ));
  const { code: minified } = await transform(code, {
    loader: 'ts',
    format: 'iife',
    target: 'es2022',
    minify: true,
    define: { __CLIPCARD_BOOKMARK_APP__: JSON.stringify(new URL(appUrl).href) },
  });
  // Keep URI delimiters escaped. Editors and browsers preserve these escapes
  // when dragging a bookmark link to a bookmarks bar.
  const href =
    'javascript:' +
    encodeURI(minified.trim()).replaceAll('#', '%23').replaceAll('?', '%3F');
  if (Buffer.byteLength(href) > 4096)
    throw new Error('Clipcard bookmark exceeds 4 KB');
  return href;
}
