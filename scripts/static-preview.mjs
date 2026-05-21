#!/usr/bin/env node
import { createReadStream, existsSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';

const args = process.argv.slice(2);
const rootArg = args.find((arg) => !arg.startsWith('--')) ?? 'dist';
const host = readArg('--host') ?? process.env.HOST ?? '127.0.0.1';
const port = Number(readArg('--port') ?? process.env.PORT ?? 4321);
const root = resolve(process.cwd(), rootArg);

const MIME_TYPES = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.gif', 'image/gif'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.map', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml; charset=utf-8'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.webp', 'image/webp'],
  ['.woff2', 'font/woff2'],
  ['.xml', 'application/xml; charset=utf-8'],
]);

function readArg(name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function insideRoot(filePath) {
  const relative = normalize(filePath).slice(root.length);
  return relative === '' || relative.startsWith(sep);
}

async function resolveFile(pathname) {
  const decoded = decodeURIComponent(pathname);
  const requested = resolve(root, `.${decoded}`);
  if (!insideRoot(requested)) return undefined;

  const candidates = [];
  if (decoded.endsWith('/')) {
    candidates.push(join(requested, 'index.html'));
  } else {
    candidates.push(requested);
    candidates.push(join(requested, 'index.html'));
  }

  for (const candidate of candidates) {
    try {
      const info = await stat(candidate);
      if (info.isFile()) return candidate;
    } catch {
      // try the next candidate
    }
  }
  return existsSync(join(root, '404.html')) ? join(root, '404.html') : undefined;
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? '/', `http://${host}:${port}`);
    const filePath = await resolveFile(url.pathname);
    if (!filePath) {
      response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('Not found');
      return;
    }

    const status = filePath.endsWith(`${sep}404.html`) ? 404 : 200;
    response.writeHead(status, {
      'cache-control': 'no-store',
      'content-type': MIME_TYPES.get(extname(filePath)) ?? 'application/octet-stream',
    });
    createReadStream(filePath).pipe(response);
  } catch (error) {
    response.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
    response.end(error instanceof Error ? error.message : 'Internal server error');
  }
});

server.listen(port, host, () => {
  console.info(`[static-preview] serving ${root} at http://${host}:${port}`);
});
