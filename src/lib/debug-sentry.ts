/**
 * Sentry forwarder: a bus subscriber that maps debug events onto the Sentry
 * SDK API. Runs locally against Sentry Spotlight (no account needed) and
 * automatically targets sentry.io once a real DSN is configured via
 * `PUBLIC_SENTRY_DSN` in `.env`.
 *
 * Mapping rationale (see docs/debugging-architecture.md, "Concept mapping"):
 *   info / warn      → addBreadcrumb({ level })
 *   error w/ Error   → captureException(err)
 *   error w/o Error  → captureMessage(msg, 'error')
 *   network          → addBreadcrumb({ category: 'fetch' | 'xhr' })
 *   perf             → addBreadcrumb({ category: 'measurement' }) for outliers
 */
import { subscribe, type DebugEventDetail } from './debug';

let installed = false;
const unsubs: (() => void)[] = [];

export async function installSentryForwarder(): Promise<void> {
  if (installed) return;
  installed = true;

  const Sentry = await import('@sentry/astro');

  unsubs.push(
    subscribe('log', (detail) => forwardLog(detail, Sentry)),
    subscribe('network', (detail) => forwardNetwork(detail, Sentry)),
    subscribe('perf', (detail) => forwardPerf(detail, Sentry)),
  );
}

export function uninstallSentryForwarder(): void {
  for (const unsub of unsubs) unsub();
  unsubs.length = 0;
  installed = false;
}

type SentryApi = typeof import('@sentry/astro');

function forwardLog(detail: DebugEventDetail, S: SentryApi): void {
  if (detail.type !== 'log') return;
  const { entry } = detail;

  if (entry.level === 'error') {
    if (entry.err instanceof Error) {
      S.captureException(entry.err, {
        tags: { ns: entry.ns },
        extra: { msg: entry.msg, args: entry.args },
      });
    } else {
      S.captureMessage(`${entry.msg} [${entry.ns}]`, 'error');
    }
    return;
  }

  S.addBreadcrumb({
    category: `debug:${entry.ns}`,
    message: entry.msg,
    level: entry.level === 'warn' ? 'warning' : entry.level === 'trace' ? 'debug' : 'info',
    data: entry.args.length > 0 ? { args: entry.args } : undefined,
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

function forwardPerf(detail: DebugEventDetail, S: SentryApi): void {
  if (detail.type !== 'perf') return;
  const { entry } = detail;
  if (entry.kind === 'fps' && entry.value > 30) return;
  S.addBreadcrumb({
    category: 'measurement',
    message: `${entry.kind}:${entry.name}`,
    level: 'info',
    data: { value: entry.value, ...entry.meta },
    timestamp: entry.ts / 1000,
  });
}
