import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  decideLiveAppHosting,
  getHostedAnnouncementKey,
  getLiveAppOrigin,
  HOSTED_POLL_INTERVAL_MS,
  HOSTED_REQUEST_TIMEOUT_MS,
  HOSTED_WAKE_TIMEOUT_MS,
  isLoopbackHost,
  resolveLiveApp,
  resolveLiveAppHosting,
  startHostedWake,
  startLiveAppProbe,
} from '../lib/live-app-embed';

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

describe('isLoopbackHost', () => {
  it.each(['localhost', 'LOCALHOST', 'demo.localhost', '127.0.0.1', '127.1.2.3', '::1', '[::1]'])(
    "treats %s as the visitor's own machine",
    (hostname) => {
      expect(isLoopbackHost(hostname)).toBe(true);
    }
  );

  it.each([
    'cuberhaus.github.io',
    'example.com',
    '192.168.1.20',
    '10.0.0.5',
    '0.0.0.0',
    '127.0.0.1.evil.example',
    'localhost.evil.example',
    'notlocalhost',
    '127.300.0.1',
    '',
  ])('treats %j as a public host', (hostname) => {
    expect(isLoopbackHost(hostname)).toBe(false);
  });
});

describe('decideLiveAppHosting', () => {
  const live = { url: 'https://pilot.example.com', enabled: true };

  it('keeps the local demo service on a loopback page, whatever the registry says', () => {
    expect(decideLiveAppHosting({ hostname: 'localhost', hosted: live })).toEqual({
      mode: 'local',
    });
    expect(
      decideLiveAppHosting({ hostname: '127.0.0.1', hosted: { url: null, enabled: false } })
    ).toEqual({ mode: 'local' });
  });

  it('leaves demos without a hosted live app on the local behaviour, even on a public host', () => {
    expect(decideLiveAppHosting({ hostname: 'cuberhaus.github.io', hosted: null })).toEqual({
      mode: 'local',
    });
  });

  it('switches to hosted mode on a public host and derives /health from the origin', () => {
    expect(decideLiveAppHosting({ hostname: 'cuberhaus.github.io', hosted: live })).toEqual({
      mode: 'hosted',
      enabled: true,
      url: 'https://pilot.example.com',
      healthUrl: 'https://pilot.example.com/health',
    });
    expect(
      decideLiveAppHosting({
        hostname: 'cuberhaus.github.io',
        hosted: { url: 'https://pilot.example.com/app/', enabled: true },
      })
    ).toMatchObject({ healthUrl: 'https://pilot.example.com/health' });
  });

  it('reports a switched-off hosted live app without a URL to poll', () => {
    const off = { mode: 'hosted', enabled: false };

    expect(
      decideLiveAppHosting({
        hostname: 'cuberhaus.github.io',
        hosted: { url: 'https://pilot.example.com', enabled: false },
      })
    ).toEqual(off);
    expect(
      decideLiveAppHosting({
        hostname: 'cuberhaus.github.io',
        hosted: { url: null, enabled: false },
      })
    ).toEqual(off);
    // The contract forbids this shape; stay safe if a stale value slips through.
    expect(
      decideLiveAppHosting({
        hostname: 'cuberhaus.github.io',
        hosted: { url: null, enabled: true },
      })
    ).toEqual(off);
  });

  it('lets an explicit URL override opt out of hosted mode', () => {
    expect(
      decideLiveAppHosting({
        hostname: 'cuberhaus.github.io',
        explicitUrl: 'http://localhost:9999',
        hosted: live,
      })
    ).toEqual({ mode: 'local' });
  });
});

describe('resolveLiveAppHosting', () => {
  it('reads the registry: the pilot is hosted on a public host and local on loopback', () => {
    expect(resolveLiveAppHosting({ slug: 'sbc-ia', hostname: 'cuberhaus.github.io' }).mode).toBe(
      'hosted'
    );
    expect(resolveLiveAppHosting({ slug: 'sbc-ia', hostname: '127.0.0.1' }).mode).toBe('local');
  });

  it('keeps every demo without a hosted block local, and unknown or missing slugs too', () => {
    expect(resolveLiveAppHosting({ slug: 'tenda', hostname: 'cuberhaus.github.io' })).toEqual({
      mode: 'local',
    });
    expect(
      resolveLiveAppHosting({ slug: 'missing-demo', hostname: 'cuberhaus.github.io' })
    ).toEqual({
      mode: 'local',
    });
    expect(resolveLiveAppHosting({ hostname: 'cuberhaus.github.io' })).toEqual({ mode: 'local' });
  });
});

describe('startHostedWake', () => {
  const healthUrl = 'https://pilot.example.com/health';
  const healthy = () => new Response('{"status":"ok"}', { status: 200 });
  const waking = () => new Response('waking', { status: 503 });

  /** A request that never answers and rejects the way fetch does when aborted. */
  const hangsUntilAborted = (_url: string, init?: RequestInit) =>
    new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () =>
        reject(new DOMException('Aborted', 'AbortError'))
      );
    });

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('waits longer than the documented wake time of about a minute, in bounded steps', () => {
    expect(HOSTED_WAKE_TIMEOUT_MS).toBeGreaterThan(60_000);
    expect(HOSTED_REQUEST_TIMEOUT_MS).toBeLessThan(HOSTED_WAKE_TIMEOUT_MS);
    expect(HOSTED_POLL_INTERVAL_MS).toBeLessThan(HOSTED_REQUEST_TIMEOUT_MS);
  });

  it('resolves ready on the first healthy answer and stops polling', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(healthy());
    const wake = startHostedWake({ healthUrl, fetchImpl });

    await expect(wake.promise).resolves.toBe('ready');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('asks with a simple CORS request, so the browser never preflights the poll', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(healthy());
    await startHostedWake({ healthUrl, fetchImpl }).promise;

    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(healthUrl);
    expect(init).toMatchObject({ mode: 'cors', cache: 'no-store', credentials: 'omit' });
    expect(init.signal).toBeInstanceOf(AbortSignal);
    // Any custom header (X-Session-Id, sentry-trace) would force a preflight.
    expect(init.headers).toBeUndefined();
    expect(init.method ?? 'GET').toBe('GET');
  });

  it('keeps polling through network errors and unhealthy answers while the service wakes', async () => {
    const fetchImpl = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(waking())
      .mockResolvedValueOnce(healthy());
    const wake = startHostedWake({ healthUrl, fetchImpl, pollIntervalMs: 3_000 });

    await vi.advanceTimersByTimeAsync(0);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(2_999);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(3_000);

    await expect(wake.promise).resolves.toBe('ready');
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it('gives up once the wake timeout passes and aborts the attempt in flight', async () => {
    const signals: AbortSignal[] = [];
    const fetchImpl = vi.fn((url: string, init?: RequestInit) => {
      if (init?.signal) signals.push(init.signal);
      return hangsUntilAborted(url, init);
    });
    const wake = startHostedWake({
      healthUrl,
      fetchImpl: fetchImpl as typeof fetch,
      wakeTimeoutMs: 10_000,
      requestTimeoutMs: 30_000,
      pollIntervalMs: 1_000,
    });

    await vi.advanceTimersByTimeAsync(10_000);

    await expect(wake.promise).resolves.toBe('timeout');
    expect(signals.at(-1)?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('aborts an attempt that outlives the request timeout, then tries again', async () => {
    const fetchImpl = vi
      .fn()
      .mockImplementationOnce(hangsUntilAborted)
      .mockResolvedValueOnce(healthy());
    const wake = startHostedWake({
      healthUrl,
      fetchImpl: fetchImpl as typeof fetch,
      requestTimeoutMs: 1_000,
      pollIntervalMs: 500,
    });

    await vi.advanceTimersByTimeAsync(1_000);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(500);

    await expect(wake.promise).resolves.toBe('ready');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('stops cleanly when cancelled, leaving no timers or requests behind', async () => {
    let signal: AbortSignal | undefined;
    const fetchImpl = vi.fn((_url: string, init?: RequestInit) => {
      signal = init?.signal ?? undefined;
      return new Promise<Response>(() => {});
    });
    const wake = startHostedWake({ healthUrl, fetchImpl: fetchImpl as typeof fetch });

    wake.cancel();

    await expect(wake.promise).resolves.toBe('cancelled');
    expect(signal?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(300_000);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('treats a fetch that throws synchronously like any other failed attempt', async () => {
    const fetchImpl = vi
      .fn()
      .mockImplementationOnce(() => {
        throw new TypeError('blocked');
      })
      .mockResolvedValueOnce(healthy());
    const wake = startHostedWake({ healthUrl, fetchImpl, pollIntervalMs: 1_000 });

    await vi.advanceTimersByTimeAsync(1_000);

    await expect(wake.promise).resolves.toBe('ready');
  });

  it('reports each step so the debug log can show what the wake is doing', async () => {
    const events: string[] = [];
    const fetchImpl = vi.fn().mockResolvedValueOnce(waking()).mockResolvedValueOnce(healthy());
    const wake = startHostedWake({
      healthUrl,
      fetchImpl,
      pollIntervalMs: 1_000,
      onEvent: (event) => events.push(`${event.type}#${event.attempt}`),
    });

    await vi.advanceTimersByTimeAsync(1_000);
    await wake.promise;

    expect(events).toEqual(['attempt#1', 'retry#1', 'attempt#2', 'ready#2']);
  });
});

describe('getHostedAnnouncementKey', () => {
  it('stays quiet on load and while the visitor has not started the live app', () => {
    expect(getHostedAnnouncementKey('checking', true)).toBeNull();
    expect(getHostedAnnouncementKey('idle', true)).toBeNull();
  });

  it('announces the wake, its success and its timeout', () => {
    expect(getHostedAnnouncementKey('waking', true)).toBe('hostedWakingTitle');
    expect(getHostedAnnouncementKey('online', true)).toBe('hostedLive');
    expect(getHostedAnnouncementKey('unavailable', true)).toBe('hostedUnavailableTitle');
  });

  it('does not announce a switched-off hosted live app, which is static copy', () => {
    expect(getHostedAnnouncementKey('unavailable', false)).toBeNull();
  });

  it('never speaks for a local probe result', () => {
    expect(getHostedAnnouncementKey('offline', true)).toBeNull();
  });
});
