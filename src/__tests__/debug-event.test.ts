import { describe, expect, it } from 'vitest';
import { normalizeDebugEvent } from '../lib/debug-event.mjs';

describe('debug ingress normalization', () => {
  it('normalizes iframe envelopes with source, namespace, and timestamp', () => {
    expect(
      normalizeDebugEvent(
        {
          type: 'debug:log',
          level: 'warn',
          ns: 'worker',
          msg: 'started',
          args: [{ id: 1 }],
          ts: 1234,
        },
        {
          source: 'iframe',
          origin: 'http://localhost:8888',
          namespacePrefix: 'iframe',
          defaultNamespace: 'iframe',
          expectedType: 'debug:log',
          requireLevel: true,
          requireNamespace: true,
          requireMessage: true,
          requireArgsArray: true,
        }
      )
    ).toEqual({
      source: 'iframe',
      origin: 'http://localhost:8888',
      level: 'warn',
      ns: 'iframe:worker',
      msg: 'started',
      args: [{ id: 1 }],
      ts: 1234,
    });
  });

  it('gives relay events one backend namespace and accepts raw log lines only there', () => {
    const options = {
      source: 'backend' as const,
      origin: 'tenda',
      namespacePrefix: 'demo:tenda:backend',
      defaultNamespace: 'demo:tenda:backend',
      now: () => 42,
      allowPlainText: true,
    };

    expect(normalizeDebugEvent('plain log line', options)).toMatchObject({
      level: 'info',
      ns: 'demo:tenda:backend',
      msg: 'plain log line',
      ts: 42,
    });
    expect(
      normalizeDebugEvent(JSON.stringify({ ns: 'worker', msg: 'ready' }), options)
    ).toMatchObject({
      level: 'info',
      ns: 'demo:tenda:backend:worker',
      msg: 'ready',
      ts: 42,
    });
    expect(normalizeDebugEvent('{"ns":"worker"}', options)).toBeNull();
  });

  it('rejects malformed browser envelopes instead of inventing fields', () => {
    expect(
      normalizeDebugEvent(
        { type: 'debug:log', level: 'warn' },
        {
          source: 'iframe',
          origin: 'http://localhost:8888',
          namespacePrefix: 'iframe',
          defaultNamespace: 'iframe',
          expectedType: 'debug:log',
          requireLevel: true,
          requireNamespace: true,
          requireMessage: true,
        }
      )
    ).toBeNull();
  });
});
