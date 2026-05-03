#!/usr/bin/env node
/**
 * Universal log relay (dev-only).
 *
 * Exposes per-slug SSE streams of stdout from every running Docker
 * container backing a demo. Browsers cannot run `docker logs` directly,
 * so the in-page subscriber consumes this relay instead.
 *
 * Endpoints:
 *   GET /health              — `{ ok: true, services: [...slugs] }`
 *   GET /services            — JSON list of available SSE streams
 *   GET /stream/<slug>       — text/event-stream tailing the container
 *
 * Reads `src/data/demo-services.json` so the registry is the single
 * source of truth. Picks up new demos with no code change here.
 *
 * Production note: this server is for `npm run dev` / `make dev-bare`
 * only. The portfolio is a static site in production; production logs
 * flow through Sentry.
 */

import http from 'node:http';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REGISTRY_PATH = resolve(__dirname, '..', '..', 'src', 'data', 'demo-services.json');

const ALLOWED_ORIGINS = [
  'http://localhost:4321',
  'http://127.0.0.1:4321',
];

const argv = process.argv.slice(2);
const portArgIdx = argv.indexOf('--port');
const PORT = portArgIdx >= 0 ? parseInt(argv[portArgIdx + 1], 10) : 9999;

function loadRegistry() {
  try {
    const raw = readFileSync(REGISTRY_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('[log-relay] failed to load registry:', err.message);
    return { services: [] };
  }
}

function backedSlugs() {
  const reg = loadRegistry();
  const out = [];
  for (const s of reg.services) {
    if (s.hasBackend && s.backend?.container) {
      out.push({ slug: s.slug, container: s.backend.container, stack: s.backend.stack });
    }
  }
  return out;
}

function applyCors(req, res) {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');
}

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function tryParseStructured(line) {
  if (!line.startsWith('{') || !line.endsWith('}')) return null;
  try {
    const obj = JSON.parse(line);
    if (typeof obj !== 'object' || obj === null) return null;
    const level = typeof obj.level === 'string' && ['trace', 'info', 'warn', 'error'].includes(obj.level)
      ? obj.level
      : 'info';
    const ns = typeof obj.ns === 'string' ? obj.ns : 'backend';
    const msg = typeof obj.msg === 'string' ? obj.msg : line;
    return { level, ns, msg };
  } catch {
    return null;
  }
}

function streamSse(req, res, slug) {
  const services = backedSlugs();
  const svc = services.find((s) => s.slug === slug);
  if (!svc) {
    sendJson(res, 404, { error: 'unknown slug', slug });
    return;
  }

  applyCors(req, res);
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  const child = spawn('docker', ['logs', '-fn', '100', '--since', '0s', svc.container], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const send = (line) => {
    if (!line) return;
    const parsed = tryParseStructured(line) ?? { level: 'info', ns: `demo:${slug}:backend`, msg: line };
    const payload = JSON.stringify({
      slug,
      stack: svc.stack,
      ...parsed,
      ts: Date.now(),
    });
    res.write(`data: ${payload}\n\n`);
  };

  let buf = '';
  const onChunk = (chunk) => {
    buf += chunk.toString('utf8');
    let idx;
    while ((idx = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, idx).replace(/\r$/, '');
      buf = buf.slice(idx + 1);
      if (line.length > 0) send(line);
    }
  };

  child.stdout.on('data', onChunk);
  child.stderr.on('data', onChunk);

  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 15000);

  const cleanup = () => {
    clearInterval(heartbeat);
    try { child.kill('SIGTERM'); } catch { /* noop */ }
  };

  child.on('exit', (code) => {
    res.write(`event: end\ndata: ${JSON.stringify({ code })}\n\n`);
    cleanup();
    res.end();
  });

  req.on('close', cleanup);
}

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    applyCors(req, res);
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== 'GET') {
    res.writeHead(405);
    res.end('method not allowed');
    return;
  }

  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/health') {
    applyCors(req, res);
    const slugs = backedSlugs().map((s) => s.slug);
    sendJson(res, 200, { ok: true, services: slugs, port: PORT });
    return;
  }
  if (url.pathname === '/services') {
    applyCors(req, res);
    sendJson(res, 200, backedSlugs());
    return;
  }
  if (url.pathname.startsWith('/stream/')) {
    const slug = decodeURIComponent(url.pathname.slice('/stream/'.length));
    streamSse(req, res, slug);
    return;
  }

  res.writeHead(404);
  res.end('not found');
});

server.listen(PORT, '127.0.0.1', () => {
  const slugs = backedSlugs().map((s) => s.slug);
  console.log(`[log-relay] listening on http://127.0.0.1:${PORT} (services: ${slugs.length})`);
});

const shutdown = () => {
  console.log('[log-relay] shutting down');
  server.close(() => process.exit(0));
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
