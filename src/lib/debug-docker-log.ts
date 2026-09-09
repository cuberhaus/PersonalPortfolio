import { emitFrom, type DebugLevel } from './debug';

const VALID_LEVELS: ReadonlySet<DebugLevel> = new Set<DebugLevel>([
  'trace',
  'info',
  'warn',
  'error',
]);

const DEFAULT_RATE_LIMIT = 100;

interface RelayPayload {
  level: DebugLevel;
  ns: string;
  msg: string;
}

export interface BackendLogProcessor {
  handle: (data: unknown) => void;
  flush: () => void;
}

export interface BackendLogProcessorOptions {
  slug: string;
  limit?: number;
  now?: () => number;
  emit?: typeof emitFrom;
}

function parseRelayPayload(data: unknown): RelayPayload | null {
  let value: unknown = data;
  if (typeof data === 'string') {
    try {
      value = JSON.parse(data);
    } catch {
      return null;
    }
  }
  if (typeof value !== 'object' || value === null) return null;

  const payload = value as Record<string, unknown>;
  const level =
    typeof payload.level === 'string' && VALID_LEVELS.has(payload.level as DebugLevel)
      ? (payload.level as DebugLevel)
      : 'info';
  const ns = typeof payload.ns === 'string' ? payload.ns : '';
  const msg = typeof payload.msg === 'string' ? payload.msg : '';
  return { level, ns, msg };
}

export function createBackendLogProcessor({
  slug,
  limit = DEFAULT_RATE_LIMIT,
  now = Date.now,
  emit = emitFrom,
}: BackendLogProcessorOptions): BackendLogProcessor {
  let remaining = limit;
  let resetAt = now() + 1000;
  let dropped = 0;

  const resetBucketIfNeeded = (timestamp: number) => {
    if (timestamp < resetAt) return;
    remaining = limit;
    resetAt = timestamp + 1000;
  };

  const flush = () => {
    if (dropped <= 0) return;
    emit('backend', slug, 'warn', `demo:${slug}:backend`, 'rate-limited', [{ dropped }]);
    dropped = 0;
  };

  const handle = (data: unknown) => {
    const payload = parseRelayPayload(data);
    if (!payload) return;

    const timestamp = now();
    resetBucketIfNeeded(timestamp);
    if (remaining <= 0) {
      dropped++;
      return;
    }
    remaining--;

    const ns =
      payload.ns.length > 0
        ? payload.ns.startsWith('demo:')
          ? payload.ns
          : `demo:${slug}:backend:${payload.ns}`
        : `demo:${slug}:backend`;
    emit('backend', slug, payload.level, ns, payload.msg, []);
  };

  return { handle, flush };
}
