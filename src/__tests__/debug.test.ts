/**
 * Unit tests for the centralized debugging event bus.
 *
 * Covers:
 *  - level gating (info < warn < error)
 *  - namespace filtering with `*` glob support
 *  - ring-buffer eviction past 500 entries
 *  - subscribers fire in registration order
 *  - error entries are buffered even when bus is disabled
 *  - emitNetwork / emitPerf round-trip through the bus
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

import {
  debug,
  emitFrom,
  emitNetwork,
  emitPerf,
  isEnabled,
  requireEnabled,
  subscribe,
  getBuffer,
  clearBuffer,
  setFilter,
  setMinLevel,
  __resetBusForTesting,
  type DebugEventDetail,
  type DebugLogEntry,
} from '../lib/debug';

beforeEach(() => {
  __resetBusForTesting();
  setFilter(null);
  setMinLevel('info');
  clearBuffer();
});

describe('namespace filtering', () => {
  it('matches exact namespaces', () => {
    setFilter('demo:rob');
    const seen: string[] = [];
    subscribe('log', (d) => {
      if (d.type === 'log') seen.push(d.entry.ns);
    });
    debug('demo:rob').info('a');
    debug('demo:other').info('b');
    expect(seen).toEqual(['demo:rob']);
  });

  it('matches single-segment glob', () => {
    setFilter('demo:*');
    const seen: string[] = [];
    subscribe('log', (d) => {
      if (d.type === 'log') seen.push(d.entry.ns);
    });
    debug('demo:rob').info('a');
    debug('demo:rob:fk').info('b');
    debug('theme').info('c');
    expect(seen).toEqual(['demo:rob', 'demo:rob:fk']);
  });

  it('rejects non-matching patterns', () => {
    setFilter('theme:*');
    const seen: string[] = [];
    subscribe('log', () => seen.push('hit'));
    debug('demo:rob').info('a');
    expect(seen).toEqual([]);
  });
});

describe('level gating', () => {
  it('drops entries below minLevel', () => {
    setMinLevel('warn');
    const seen: DebugLogEntry[] = [];
    subscribe('log', (d) => {
      if (d.type === 'log') seen.push(d.entry);
    });
    const log = debug('test');
    log.trace('t');
    log.info('i');
    log.warn('w');
    log.error('e');
    expect(seen.map((e) => e.level)).toEqual(['warn', 'error']);
  });

  it('respects ordering trace < info < warn < error', () => {
    setMinLevel('trace');
    const seen: string[] = [];
    subscribe('log', (d) => {
      if (d.type === 'log') seen.push(d.entry.level);
    });
    const log = debug('test');
    log.trace('a');
    log.info('b');
    log.warn('c');
    log.error('d');
    expect(seen).toEqual(['trace', 'info', 'warn', 'error']);
  });
});

describe('ring-buffer eviction', () => {
  it('caps the log buffer at 500 entries', () => {
    const log = debug('test');
    for (let i = 0; i < 600; i++) log.info(`msg-${i}`);
    const buf = getBuffer('log');
    expect(buf).toHaveLength(500);
    expect(buf[0].msg).toBe('msg-100');
    expect(buf[buf.length - 1].msg).toBe('msg-599');
  });

  it('caps the network buffer at 500 entries', () => {
    for (let i = 0; i < 600; i++) {
      emitNetwork({
        method: 'GET',
        url: `/x/${i}`,
        status: 200,
        ok: true,
        durationMs: 1,
        startedAt: Date.now(),
        kind: 'fetch',
      });
    }
    expect(getBuffer('network')).toHaveLength(500);
  });
});

describe('subscriber ordering', () => {
  it('fires subscribers in registration order', () => {
    const order: number[] = [];
    subscribe('log', () => order.push(1));
    subscribe('log', () => order.push(2));
    subscribe('log', () => order.push(3));
    debug('test').info('hi');
    expect(order).toEqual([1, 2, 3]);
  });

  it('returns an unsubscribe function', () => {
    const seen: string[] = [];
    const unsub = subscribe('log', (d) => {
      if (d.type === 'log') seen.push(d.entry.msg);
    });
    debug('test').info('first');
    unsub();
    debug('test').info('second');
    expect(seen).toEqual(['first']);
  });
});

describe('error buffering when disabled', () => {
  it('buffers error entries even with no subscribers / disabled bus', () => {
    const log = debug('test');
    log.error('boom', new Error('detail'));
    const buf = getBuffer('log');
    expect(buf).toHaveLength(1);
    expect(buf[0].level).toBe('error');
    expect(buf[0].err).toBeInstanceOf(Error);
  });
});

describe('non-log channels', () => {
  it('round-trips network events', () => {
    const seen: DebugEventDetail[] = [];
    subscribe('network', (d) => seen.push(d));
    emitNetwork({
      method: 'POST',
      url: '/api/x',
      status: 201,
      ok: true,
      durationMs: 42,
      startedAt: Date.now(),
      kind: 'fetch',
    });
    expect(seen).toHaveLength(1);
    expect(seen[0].type).toBe('network');
  });

  it('round-trips perf events', () => {
    const seen: DebugEventDetail[] = [];
    subscribe('perf', (d) => seen.push(d));
    emitPerf({ kind: 'fps', name: 'fps', value: 60, ts: Date.now() });
    expect(seen).toHaveLength(1);
    expect(seen[0].type).toBe('perf');
  });
});

describe('clearBuffer', () => {
  it('clears all channels when called without arg', () => {
    debug('a').info('x');
    emitNetwork({
      method: 'GET',
      url: '/',
      status: 200,
      ok: true,
      durationMs: 1,
      startedAt: 0,
      kind: 'fetch',
    });
    emitPerf({ kind: 'fps', name: 'fps', value: 60, ts: 0 });
    clearBuffer();
    expect(getBuffer('log')).toHaveLength(0);
    expect(getBuffer('network')).toHaveLength(0);
    expect(getBuffer('perf')).toHaveLength(0);
  });
});

describe('console mirror in dev', () => {
  it('writes to console.info for info level', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
    debug('test').info('hello', { meta: 1 });
    expect(spy).toHaveBeenCalledWith('[test]', 'hello', { meta: 1 });
    spy.mockRestore();
  });

  it('prefixes non-browser sources with the source tag', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
    emitFrom('backend', 'tfg-polyps', 'info', 'demo:tfg-polyps:backend', 'served', []);
    expect(spy).toHaveBeenCalledWith('[backend:demo:tfg-polyps:backend]', 'served');
    spy.mockRestore();
  });
});

describe('source / origin attribution (Phase 13)', () => {
  it('defaults source to "browser" for `debug(ns).<level>(...)` calls', () => {
    const seen: DebugLogEntry[] = [];
    subscribe('log', (d) => {
      if (d.type === 'log') seen.push(d.entry);
    });
    debug('demo:rob').info('mount');
    expect(seen).toHaveLength(1);
    expect(seen[0].source).toBe('browser');
    expect(seen[0].origin).toBeUndefined();
  });

  it('emitFrom("iframe", origin, ...) tags the entry with iframe + origin', () => {
    const seen: DebugLogEntry[] = [];
    subscribe('log', (d) => {
      if (d.type === 'log') seen.push(d.entry);
    });
    emitFrom('iframe', 'http://localhost:8092', 'info', 'iframe:demo:rob', 'frame-load', []);
    expect(seen).toHaveLength(1);
    expect(seen[0].source).toBe('iframe');
    expect(seen[0].origin).toBe('http://localhost:8092');
    expect(seen[0].ns).toBe('iframe:demo:rob');
  });

  it('emitFrom("backend", slug, ...) tags the entry with backend + slug', () => {
    const seen: DebugLogEntry[] = [];
    subscribe('log', (d) => {
      if (d.type === 'log') seen.push(d.entry);
    });
    emitFrom('backend', 'tfg-polyps', 'warn', 'demo:tfg-polyps:backend', 'slow query', [{ ms: 4200 }]);
    expect(seen).toHaveLength(1);
    expect(seen[0].source).toBe('backend');
    expect(seen[0].origin).toBe('tfg-polyps');
    expect(seen[0].level).toBe('warn');
  });

  it('respects level/namespace gating for emitFrom too', () => {
    setMinLevel('warn');
    const seen: DebugLogEntry[] = [];
    subscribe('log', (d) => {
      if (d.type === 'log') seen.push(d.entry);
    });
    emitFrom('backend', 'x', 'info', 'demo:x:backend', 'ignored', []);
    emitFrom('backend', 'x', 'error', 'demo:x:backend', 'kept', []);
    expect(seen.map((e) => e.level)).toEqual(['error']);
  });
});

describe('requireEnabled() helper', () => {
  it('returns true in import.meta.env.DEV (vitest default)', () => {
    expect(requireEnabled()).toBe(true);
    expect(isEnabled()).toBe(true);
  });
});
