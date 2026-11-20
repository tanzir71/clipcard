import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, isAbsolute, relative, resolve } from 'node:path';
import { createGzip } from 'node:zlib';

const [, , port, directory = '.', prefix = '/'] = process.argv;
const root = resolve(directory);
const mime = new Map([
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
    const initialPath = resolve(root, pathname.slice(prefix.length));
    const subpath = relative(root, initialPath);
    if (subpath.startsWith('..') || isAbsolute(subpath))
      return response.writeHead(404).end();

    const file = (await stat(initialPath)).isDirectory()
      ? resolve(initialPath, 'index.html')
      : initialPath;
    const { size } = await stat(file);
    const type = mime.get(extname(file)) ?? 'application/octet-stream';
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
