import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getLiveAppOrigin, resolveLiveApp, startLiveAppProbe } from '../lib/live-app-embed';

describe('live-app orchestration', () => {
  it('resolves a registered demo into one live-app definition', () => {
    expect(resolveLiveApp({ slug: 'tenda' })).toMatchObject({
      slug: 'tenda',
      url: 'http://localhost:8888',
      dockerCmd: 'cd tenda_online && docker compose up -d && ./start.sh',
    });
  });

  it('allows an explicit URL and run hints to override registry values', () => {
    expect(
      resolveLiveApp({
        slug: 'tenda',
        explicitUrl: 'http://localhost:9999',
        dockerCmd: 'docker compose up',
        devCmd: 'npm run dev',
      })
    ).toEqual({
      slug: 'tenda',
      url: 'http://localhost:9999',
      dockerCmd: 'docker compose up',
      devCmd: 'npm run dev',
    });
  });

  it('returns an offline definition for an unknown slug', () => {
    expect(resolveLiveApp({ slug: 'missing-demo' })).toMatchObject({
      slug: 'missing-demo',
      url: '',
    });
  });

  it('extracts an iframe origin without making the component parse URLs', () => {
    expect(getLiveAppOrigin('http://localhost:8888/path')).toBe('http://localhost:8888');
    expect(getLiveAppOrigin('not-a-url')).toBeNull();
  });
});

describe('startLiveAppProbe', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('reports online when the fetch adapter resolves', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response());
    const probe = startLiveAppProbe({ url: 'http://localhost:8888', fetchImpl });

    await expect(probe.promise).resolves.toBe('online');
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://localhost:8888',
      expect.objectContaining({ mode: 'no-cors', signal: expect.any(AbortSignal) })
    );
  });

  it('reports offline when the fetch adapter rejects', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    const probe = startLiveAppProbe({ url: 'http://localhost:8888', fetchImpl });

    await expect(probe.promise).resolves.toBe('offline');
  });

  it('reports offline when the timeout aborts the fetch adapter', async () => {
    const fetchImpl = vi.fn((_url: string, init?: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () =>
          reject(new DOMException('Aborted', 'AbortError'))
        );
      });
    });
    const probe = startLiveAppProbe({
      url: 'http://localhost:9999',
      fetchImpl: fetchImpl as typeof fetch,
    });

    await vi.advanceTimersByTimeAsync(2000);
    await expect(probe.promise).resolves.toBe('offline');
  });

  it('cancels an in-flight probe without leaving its timer behind', async () => {
    const fetchImpl = vi.fn((_url: string, init?: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () =>
          reject(new DOMException('Aborted', 'AbortError'))
        );
      });
    });
    const probe = startLiveAppProbe({
      url: 'http://localhost:9999',
      fetchImpl: fetchImpl as typeof fetch,
    });

    probe.cancel();
    await expect(probe.promise).resolves.toBe('offline');
    expect(vi.getTimerCount()).toBe(0);
  });
});
