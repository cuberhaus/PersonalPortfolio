/**
 * Unit tests for the producer-side sampling layer in `debug-sentry.ts`.
 *
 * Covers:
 *  - FPS / memory samples coalesce into one aggregated breadcrumb per
 *    1-second window per `kind:name` key
 *  - The bucket carries min/avg/max/count
 *  - Multiple distinct `kind:name` keys flush as separate breadcrumbs
 *  - Empty bucket → flush is a no-op (no spurious breadcrumb)
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  __flushPerfBucketsForTesting,
  __getPerfBucketCountForTesting,
  __ingestPerfForTesting,
  __resetPerfBucketsForTesting,
} from '../lib/debug-sentry';

interface BreadcrumbCall {
  category?: string;
  message?: string;
  level?: string;
  data?: Record<string, unknown>;
  timestamp?: number;
}

interface SentryStub {
  addBreadcrumb: ReturnType<typeof vi.fn<(b: BreadcrumbCall) => void>>;
}

function makeSentryStub(): SentryStub {
  return { addBreadcrumb: vi.fn() };
}

beforeEach(() => {
  __resetPerfBucketsForTesting();
});

describe('debug-sentry perf coalescing', () => {
  it('aggregates FPS samples into one breadcrumb with min/avg/max/count', () => {
    const t0 = 1000;
    __ingestPerfForTesting({ kind: 'fps', name: 'render', value: 30, ts: t0 });
    __ingestPerfForTesting({ kind: 'fps', name: 'render', value: 60, ts: t0 + 100 });
    __ingestPerfForTesting({ kind: 'fps', name: 'render', value: 45, ts: t0 + 200 });
    __ingestPerfForTesting({ kind: 'fps', name: 'render', value: 50, ts: t0 + 300 });
    __ingestPerfForTesting({ kind: 'fps', name: 'render', value: 55, ts: t0 + 400 });

    expect(__getPerfBucketCountForTesting()).toBe(1);

    const stub = makeSentryStub();
    __flushPerfBucketsForTesting(stub as unknown as Parameters<
      typeof __flushPerfBucketsForTesting
    >[0]);

    expect(stub.addBreadcrumb).toHaveBeenCalledTimes(1);
    const call = stub.addBreadcrumb.mock.calls[0][0];
    expect(call.category).toBe('measurement');
    expect(call.message).toContain('fps:render');
    expect(call.message).toContain('n=5');
    expect(call.data).toMatchObject({
      kind: 'fps',
      name: 'render',
      count: 5,
      min: 30,
      max: 60,
      avg: 48,
    });
    expect(__getPerfBucketCountForTesting()).toBe(0);
  });

  it('separates distinct kind:name keys into independent buckets', () => {
    const t = 2000;
    __ingestPerfForTesting({ kind: 'fps', name: 'render', value: 60, ts: t });
    __ingestPerfForTesting({ kind: 'fps', name: 'simulation', value: 30, ts: t });
    __ingestPerfForTesting({ kind: 'memory', name: 'js-heap', value: 1024, ts: t });

    expect(__getPerfBucketCountForTesting()).toBe(3);

    const stub = makeSentryStub();
    __flushPerfBucketsForTesting(stub as unknown as Parameters<
      typeof __flushPerfBucketsForTesting
    >[0]);

    expect(stub.addBreadcrumb).toHaveBeenCalledTimes(3);
    const messages = stub.addBreadcrumb.mock.calls.map((c) => c[0].message);
    expect(messages).toEqual(
      expect.arrayContaining([
        expect.stringContaining('fps:render'),
        expect.stringContaining('fps:simulation'),
        expect.stringContaining('memory:js-heap'),
      ]),
    );
  });

  it('flushing an empty bucket is a no-op', () => {
    const stub = makeSentryStub();
    __flushPerfBucketsForTesting(stub as unknown as Parameters<
      typeof __flushPerfBucketsForTesting
    >[0]);
    expect(stub.addBreadcrumb).not.toHaveBeenCalled();
  });

  it('records the window duration on the aggregated breadcrumb', () => {
    const t0 = 5000;
    __ingestPerfForTesting({ kind: 'fps', name: 'idle', value: 60, ts: t0 });
    __ingestPerfForTesting({ kind: 'fps', name: 'idle', value: 58, ts: t0 + 800 });

    const stub = makeSentryStub();
    __flushPerfBucketsForTesting(stub as unknown as Parameters<
      typeof __flushPerfBucketsForTesting
    >[0]);

    const data = stub.addBreadcrumb.mock.calls[0][0].data;
    expect(data?.windowMs).toBe(800);
  });
});
