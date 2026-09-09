import { emitFrom } from './debug';
import { normalizeBackendDebugEvent } from './debug-event.mjs';

const DEFAULT_RATE_LIMIT = 100;

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
    const event = normalizeBackendDebugEvent(data, slug, { now });
    if (!event) return;

    const timestamp = now();
    resetBucketIfNeeded(timestamp);
    if (remaining <= 0) {
      dropped++;
      return;
    }
    remaining--;

    emit(event.source, event.origin, event.level, event.ns, event.msg, event.args, event.ts);
  };

  return { handle, flush };
}
