/**
 * Sentry forwarder: a bus subscriber that maps debug events onto the Sentry
 * SDK API. Runs locally against Sentry Spotlight (no account needed) and
 * automatically targets sentry.io once a real DSN is configured via
 * `PUBLIC_SENTRY_DSN` in `.env`.
 *
 * Mapping rationale (see docs/decisions.md, "Concept mapping cheat sheet"):
 *   info / warn      → addBreadcrumb({ level })
 *   error w/ Error   → captureException(err)
 *   error w/o Error  → captureMessage(msg, 'error')
 *   network          → addBreadcrumb({ category: 'fetch' | 'xhr' })
 *   perf             → addBreadcrumb({ category: 'measurement' }) for outliers
 *
 * Producer-side sampling: WebGL / Canvas demos emit FPS samples at up to
 * 60 Hz, and forwarding each one as its own breadcrumb fills Sentry's
 * 100-breadcrumbs-per-event ring before a real error fires (so the
 * breadcrumbs that would have explained the error get evicted before the
 * envelope leaves the page). Instead, we bucket FPS / memory / measurement
 * samples into one-second windows and emit a single aggregated breadcrumb
 * per window per `kind:name` key — log-volume drops by ~60× with no loss
 * of information that wasn't already statistical (min/avg/max/count).
 *
 * Network breadcrumbs are passed through unchanged: their natural rate is
 * orders of magnitude lower and individual request status codes carry
 * information that aggregation would erase.
 */
import { subscribe, type DebugEventDetail, type DebugPerfEntry } from './debug';

const PERF_FLUSH_INTERVAL_MS = 1000;

let installed = false;
const unsubs: (() => void)[] = [];
let perfFlushTimer: ReturnType<typeof setInterval> | null = null;

interface PerfBucket {
  kind: DebugPerfEntry['kind'];
  name: string;
  min: number;
  max: number;
  sum: number;
  count: number;
  firstTs: number;
  lastTs: number;
  meta?: Record<string, unknown>;
}

const perfBuckets = new Map<string, PerfBucket>();

function bucketKey(entry: DebugPerfEntry): string {
  return `${entry.kind}:${entry.name}`;
}

function ingestPerf(entry: DebugPerfEntry): void {
  const key = bucketKey(entry);
  const existing = perfBuckets.get(key);
  if (existing) {
    existing.min = Math.min(existing.min, entry.value);
    existing.max = Math.max(existing.max, entry.value);
    existing.sum += entry.value;
    existing.count += 1;
    existing.lastTs = entry.ts;
    return;
  }
  perfBuckets.set(key, {
    kind: entry.kind,
    name: entry.name,
    min: entry.value,
    max: entry.value,
    sum: entry.value,
    count: 1,
    firstTs: entry.ts,
    lastTs: entry.ts,
    meta: entry.meta,
  });
}

function flushPerfBuckets(S: SentryApi): void {
  if (perfBuckets.size === 0) return;
  for (const [key, b] of perfBuckets) {
    const avg = b.count > 0 ? b.sum / b.count : 0;
    S.addBreadcrumb({
      category: 'measurement',
      message: `${key} (n=${b.count})`,
      level: 'info',
      data: {
        kind: b.kind,
        name: b.name,
        count: b.count,
        min: b.min,
        avg,
        max: b.max,
        windowMs: b.lastTs - b.firstTs,
        ...(b.meta ?? {}),
      },
      timestamp: b.lastTs / 1000,
    });
  }
  perfBuckets.clear();
}

function ensurePerfFlushTimer(S: SentryApi): void {
  if (perfFlushTimer || typeof window === 'undefined') return;
  perfFlushTimer = setInterval(() => flushPerfBuckets(S), PERF_FLUSH_INTERVAL_MS);
}

export async function installSentryForwarder(): Promise<void> {
  if (installed) return;
  installed = true;

  const Sentry = await import('@sentry/astro');

  unsubs.push(
    subscribe('log', (detail) => forwardLog(detail, Sentry)),
    subscribe('network', (detail) => forwardNetwork(detail, Sentry)),
    subscribe('perf', (detail) => forwardPerf(detail, Sentry)),
  );

  ensurePerfFlushTimer(Sentry);
}

export function uninstallSentryForwarder(): void {
  for (const unsub of unsubs) unsub();
  unsubs.length = 0;
  if (perfFlushTimer !== null) {
    clearInterval(perfFlushTimer);
    perfFlushTimer = null;
  }
  perfBuckets.clear();
  installed = false;
}

/** Test-only escape hatch. */
export function __flushPerfBucketsForTesting(S: SentryApi): void {
  flushPerfBuckets(S);
}

/** Test-only escape hatch. */
export function __getPerfBucketCountForTesting(): number {
  return perfBuckets.size;
}

/**
 * Test-only: drive the bucket directly without going through the
 * `await import('@sentry/astro')` boundary.
 */
export function __ingestPerfForTesting(entry: DebugPerfEntry): void {
  ingestPerf(entry);
}

/** Test-only escape hatch: clear the bucket without flushing. */
export function __resetPerfBucketsForTesting(): void {
  perfBuckets.clear();
}

type SentryApi = typeof import('@sentry/astro');

function forwardLog(detail: DebugEventDetail, S: SentryApi): void {
  if (detail.type !== 'log') return;
  const { entry } = detail;
  const sourceTag = { source: entry.source, origin: entry.origin ?? '' };

  if (entry.level === 'error') {
    if (entry.err instanceof Error && entry.source === 'browser') {
      S.captureException(entry.err, {
        tags: { ns: entry.ns, ...sourceTag },
        extra: { msg: entry.msg, args: entry.args },
      });
    } else {
      // Iframe / backend errors lack a JS stack on the parent side, so a
      // captureMessage is more useful than a synthetic exception.
      S.captureMessage(`${entry.msg} [${entry.ns}]`, 'error');
      S.setContext('debug-error', {
        ns: entry.ns,
        source: entry.source,
        origin: entry.origin,
        args: entry.args,
      });
    }
    return;
  }

  S.addBreadcrumb({
    category: `debug:${entry.ns}`,
    message: entry.msg,
    level: entry.level === 'warn' ? 'warning' : entry.level === 'trace' ? 'debug' : 'info',
    data: {
      source: entry.source,
      ...(entry.origin ? { origin: entry.origin } : {}),
      ...(entry.args.length > 0 ? { args: entry.args } : {}),
    },
    timestamp: entry.ts / 1000,
  });
}

function forwardNetwork(detail: DebugEventDetail, S: SentryApi): void {
  if (detail.type !== 'network') return;
  const { entry } = detail;
  S.addBreadcrumb({
    category: entry.kind,
    type: 'http',
    level: entry.ok ? 'info' : 'error',
    data: {
      url: entry.url,
      method: entry.method,
      status_code: entry.status,
      duration_ms: entry.durationMs,
    },
    timestamp: entry.startedAt / 1000,
  });
}

function forwardPerf(detail: DebugEventDetail, _S: SentryApi): void {
  if (detail.type !== 'perf') return;
  const { entry } = detail;

  // Web-vital and navigation samples fire at most a handful of times per
  // pageload — let those through with no aggregation so the actual values
  // (LCP, INP, CLS, etc.) appear as individual breadcrumbs.
  if (entry.kind === 'webvital' || entry.kind === 'navigation') {
    _S.addBreadcrumb({
      category: 'measurement',
      message: `${entry.kind}:${entry.name}`,
      level: 'info',
      data: { value: entry.value, ...entry.meta },
      timestamp: entry.ts / 1000,
    });
    return;
  }

  // FPS / memory samples fire at high cadence — aggregate into 1 s windows.
  ingestPerf(entry);
}
