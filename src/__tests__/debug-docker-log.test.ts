import { describe, expect, it, vi } from 'vitest';
import { createBackendLogProcessor } from '../lib/debug-docker-log';

function createProcessor(limit = 2) {
  let now = 0;
  const emit = vi.fn();
  const processor = createBackendLogProcessor({
    slug: 'tenda',
    limit,
    now: () => now,
    emit,
  });
  return {
    emit,
    processor,
    advance(milliseconds: number) {
      now += milliseconds;
    },
  };
}

describe('backend log processor', () => {
  it('normalizes relay namespaces and ignores malformed messages', () => {
    const { emit, processor } = createProcessor();

    processor.handle(JSON.stringify({ level: 'warn', ns: 'worker', msg: 'started' }));
    processor.handle(
      JSON.stringify({ level: 'error', ns: 'demo:tenda:backend:db', msg: 'failed' })
    );
    processor.handle('not-json');
    processor.handle(null);

    expect(emit).toHaveBeenNthCalledWith(
      1,
      'backend',
      'tenda',
      'warn',
      'demo:tenda:backend:worker',
      'started',
      [],
      0
    );
    expect(emit).toHaveBeenNthCalledWith(
      2,
      'backend',
      'tenda',
      'error',
      'demo:tenda:backend:db',
      'failed',
      [],
      0
    );
    expect(emit).toHaveBeenCalledTimes(2);
  });

  it('coalesces rate-limited lines and resets the bucket after one second', () => {
    const { emit, processor, advance } = createProcessor(2);

    processor.handle(JSON.stringify({ level: 'info', ns: 'worker', msg: 'one' }));
    processor.handle(JSON.stringify({ level: 'info', ns: 'worker', msg: 'two' }));
    processor.handle(JSON.stringify({ level: 'info', ns: 'worker', msg: 'three' }));
    processor.flush();

    expect(emit).toHaveBeenCalledTimes(3);
    expect(emit).toHaveBeenLastCalledWith(
      'backend',
      'tenda',
      'warn',
      'demo:tenda:backend',
      'rate-limited',
      [{ dropped: 1 }]
    );

    advance(1000);
    processor.handle(JSON.stringify({ level: 'info', ns: 'worker', msg: 'after-reset' }));
    expect(emit).toHaveBeenLastCalledWith(
      'backend',
      'tenda',
      'info',
      'demo:tenda:backend:worker',
      'after-reset',
      [],
      1000
    );
  });
});
