import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, isAbsolute, relative, resolve } from 'node:path';
import { createGzip } from 'node:zlib';

const [, , port, directory = '.', prefix = '/'] = process.argv;
const root = resolve(directory);
const fixturePages = root === resolve('fixtures/pages');
const mime = new Map([
  ['.mp4', 'video/mp4'],
  ['.vtt', 'text/vtt'],
  ['.css', 'text/css'],
  ['.html', 'text/html; charset=utf-8'],
  ['.jpg', 'image/jpeg'],
  ['.js', 'text/javascript'],
  ['.json', 'application/json'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.webmanifest', 'application/manifest+json'],
  ['.webp', 'image/webp'],
  ['.woff2', 'font/woff2'],
  ['.xml', 'application/xml'],
]);

createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(
      new URL(request.url ?? '/', 'http://localhost').pathname,
    );
    if (!pathname.startsWith(prefix)) return response.writeHead(404).end();
    if (fixturePages && pathname === prefix + 'feed-redirect') {
      return response
        .writeHead(302, {
          Location: prefix + 'feed-story.html?utm_source=redirect',
        })
        .end();
    }
    const initialPath = resolve(root, pathname.slice(prefix.length));
    const subpath = relative(root, initialPath);
    if (subpath.startsWith('..') || isAbsolute(subpath))
      return response.writeHead(404).end();

    const file = (await stat(initialPath)).isDirectory()
      ? resolve(initialPath, 'index.html')
      : initialPath;
    const { size } = await stat(file);
    const type = mime.get(extname(file)) ?? 'application/octet-stream';
    const range =
      type.startsWith('video/') &&
      /^bytes=(\d+)-(\d*)$/.exec(request.headers.range ?? '');
    if (range) {
      const start = Number(range[1]);
      const end = Math.min(size - 1, range[2] ? Number(range[2]) : size - 1);
      if (start >= size || end < start)
        return response
          .writeHead(416, { 'Content-Range': 'bytes */' + size })
          .end();
      response.writeHead(206, {
        'Content-Type': type,
        'Content-Length': end - start + 1,
        'Content-Range': 'bytes ' + start + '-' + end + '/' + size,
        'Accept-Ranges': 'bytes',
      });
      if (request.method === 'HEAD') return response.end();
      return createReadStream(file, { start, end })
        .on('error', () => response.destroy())
        .pipe(response);
    }
    const gzip =
      /^(text\/|application\/(json|xml))/.test(type) &&
      /(?:^|,\s*)gzip(?:,|$)/.test(request.headers['accept-encoding'] ?? '');
    response.writeHead(200, {
      'Content-Type': type,
      Vary: 'Accept-Encoding',
      ...(gzip ? { 'Content-Encoding': 'gzip' } : { 'Content-Length': size }),
    });
    if (request.method === 'HEAD') return response.end();
    const source = createReadStream(file).on('error', () => response.destroy());
    if (gzip) source.pipe(createGzip()).pipe(response);
    else source.pipe(response);
  } catch {
    response.writeHead(404).end();
  }
}).listen(Number(port), '127.0.0.1');
