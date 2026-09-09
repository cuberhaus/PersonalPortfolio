/**
 * Browser-side subscriber for the Docker log relay.
 *
 * When a demo page mounts AND the demo is visible AND debug is enabled,
 * open an SSE connection to `scripts/log-relay/` and pipe the backend's
 * stdout into the bus tagged with `source: 'backend'` and the slug as
 * `origin`. Idle demos stay quiet via an IntersectionObserver.
 *
 * Rate limiter: each slug is capped at 100 lines/sec; over-budget lines
 * are coalesced into a single `warn('rate-limited', { dropped: N })`
 * summary every second so a runaway backend can't drown the 500-entry
 * ring buffer.
 */

import { emitFrom, requireEnabled } from './debug';
import { createBackendLogProcessor, type BackendLogProcessor } from './debug-docker-log';

const DEFAULT_RELAY = 'http://127.0.0.1:9999';
const RATE_LIMIT_PER_SEC = 100;

interface SlugSubscription {
  source: EventSource;
  processor: BackendLogProcessor;
  flushTimer: ReturnType<typeof setInterval> | null;
}

const subscriptions = new Map<string, SlugSubscription>();

function getRelayBase(): string {
  if (typeof window !== 'undefined') {
    const w = window as unknown as { __DEBUG_LOG_RELAY_URL?: string };
    if (w.__DEBUG_LOG_RELAY_URL) return w.__DEBUG_LOG_RELAY_URL;
  }
  return DEFAULT_RELAY;
}

export function subscribeBackend(slug: string): () => void {
  if (typeof window === 'undefined') return () => {};
  if (!requireEnabled()) return () => {};
  if (subscriptions.has(slug)) {
    return () => unsubscribeBackend(slug);
  }

  const url = `${getRelayBase()}/stream/${encodeURIComponent(slug)}`;
  let source: EventSource;
  try {
    source = new EventSource(url);
  } catch (err) {
    emitFrom('backend', slug, 'warn', `demo:${slug}:backend`, 'subscribe-failed', [
      { err: String(err) },
    ]);
    return () => {};
  }

  const sub: SlugSubscription = {
    source,
    processor: createBackendLogProcessor({ slug, limit: RATE_LIMIT_PER_SEC }),
    flushTimer: null,
  };

  source.onmessage = (e) => sub.processor.handle(e.data);
  source.onerror = () => {};
  source.addEventListener('end', () => {
    unsubscribeBackend(slug);
  });

  sub.flushTimer = setInterval(() => sub.processor.flush(), 1000);
  subscriptions.set(slug, sub);

  emitFrom('backend', slug, 'info', `demo:${slug}:backend`, 'subscribed', [{ url }]);

  return () => unsubscribeBackend(slug);
}

export function unsubscribeBackend(slug: string): void {
  const sub = subscriptions.get(slug);
  if (!sub) return;
  if (sub.flushTimer) clearInterval(sub.flushTimer);
  sub.processor.flush();
  try {
    sub.source.close();
  } catch {
    /* noop */
  }
  subscriptions.delete(slug);
  emitFrom('backend', slug, 'info', `demo:${slug}:backend`, 'unsubscribed', []);
}

let visibilityObserver: IntersectionObserver | null = null;
const observed = new WeakMap<Element, string>();

export function subscribeAllVisible(root: Element | null = null): () => void {
  if (typeof window === 'undefined') return () => {};
  if (typeof IntersectionObserver === 'undefined') return () => {};
  if (!requireEnabled()) return () => {};

  const scope: ParentNode = root ?? document;

  if (!visibilityObserver) {
    visibilityObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const slug = observed.get(entry.target);
          if (!slug) continue;
          if (entry.isIntersecting) subscribeBackend(slug);
          else unsubscribeBackend(slug);
        }
      },
      { threshold: 0.05 }
    );
  }

  const targets = scope.querySelectorAll<HTMLElement>('[data-demo-slug]');
  for (const el of Array.from(targets)) {
    const slug = el.dataset.demoSlug;
    if (!slug) continue;
    observed.set(el, slug);
    visibilityObserver.observe(el);
  }

  return () => {
    if (!visibilityObserver) return;
    for (const el of Array.from(targets)) visibilityObserver.unobserve(el);
  };
}

export function unsubscribeAll(): void {
  for (const slug of Array.from(subscriptions.keys())) unsubscribeBackend(slug);
  if (visibilityObserver) {
    visibilityObserver.disconnect();
    visibilityObserver = null;
  }
}
