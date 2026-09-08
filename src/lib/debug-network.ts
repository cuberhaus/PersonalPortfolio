/**
 * Network tap: monkey-patches `window.fetch` and `XMLHttpRequest` to record
 * request metadata into the debug bus and inject the `X-Session-Id` header
 * on outbound requests to known demo backends.
 *
 * Idempotent (safe to call repeatedly) and only records when installed —
 * visitors who never enable debug pay nothing because `installNetworkTap()`
 * is itself loaded lazily by DebugInit.astro.
 *
 * Records metadata only (method, URL, status, duration, kind) — never bodies,
 * to avoid memory bloat.
 *
 * Session-id injection is gated by an allowlist (the `iframeUrl` origins
 * from the registry plus `location.origin`) so we never ship the id to
 * third-party endpoints. Cross-origin requests outside the allowlist pass
 * through untouched.
 *
 * TODO: capture from Web Workers (e.g. plate-worker.ts) via BroadcastChannel.
 */
import { emitNetwork, requireEnabled } from './debug';
import { getSessionId } from './debug-session';
import { listAllowedIframeOrigins } from '../data/demo-services';

const STATE_KEY = '__debugNetworkTapState';
const SESSION_HEADER = 'X-Session-Id';

interface NetworkTapState {
  uninstall: () => void;
}

interface NetworkTapWindow {
  [STATE_KEY]?: NetworkTapState;
}

let allowedOrigins: ReadonlySet<string> | null = null;

function getAllowedOrigins(): ReadonlySet<string> {
  if (allowedOrigins) return allowedOrigins;
  const set = new Set<string>(listAllowedIframeOrigins());
  if (typeof location !== 'undefined' && location.origin) {
    set.add(location.origin);
  }
  allowedOrigins = set;
  return set;
}

function shouldInjectSession(url: string): boolean {
  try {
    const origin = new URL(
      url,
      typeof location !== 'undefined' ? location.href : 'http://localhost'
    ).origin;
    return getAllowedOrigins().has(origin);
  } catch {
    return false;
  }
}

export function installNetworkTap(): () => void {
  if (typeof window === 'undefined' || !requireEnabled()) return () => {};
  const stateHolder = window as unknown as NetworkTapWindow;
  const existing = stateHolder[STATE_KEY];
  if (existing) return existing.uninstall;

  const restoreFetch = patchFetch();
  const restoreXhr = patchXhr();
  let active = true;
  const uninstall = () => {
    if (!active) return;
    active = false;
    restoreXhr();
    restoreFetch();
    if (stateHolder[STATE_KEY]?.uninstall === uninstall) delete stateHolder[STATE_KEY];
    allowedOrigins = null;
  };
  stateHolder[STATE_KEY] = { uninstall };
  return uninstall;
}

export function uninstallNetworkTap(): void {
  if (typeof window === 'undefined') return;
  (window as unknown as NetworkTapWindow)[STATE_KEY]?.uninstall();
}

function withSessionHeader(init: RequestInit | undefined, url: string): RequestInit | undefined {
  if (!shouldInjectSession(url)) return init;
  const headers = new Headers(init?.headers ?? undefined);
  if (!headers.has(SESSION_HEADER)) {
    headers.set(SESSION_HEADER, getSessionId());
  }
  return { ...(init ?? {}), headers };
}

function patchFetch(): () => void {
  if (typeof window.fetch !== 'function') return () => {};
  const original = window.fetch;

  const patchedFetch = async function patchedFetch(input: RequestInfo | URL, init?: RequestInit) {
    const startedAt = Date.now();
    const method = (
      init?.method ?? (input instanceof Request ? input.method : 'GET')
    ).toUpperCase();
    const url = input instanceof Request ? input.url : String(input);

    // For Request objects we cannot mutate headers without rebuilding the
    // request; passing init separately lets fetch merge it on top of the
    // Request body/method/etc. without clobbering them.
    const finalInit = withSessionHeader(init, url);

    try {
      const res = await original.call(window, input, finalInit);
      emitNetwork({
        method,
        url,
        status: res.status,
        ok: res.ok,
        durationMs: Date.now() - startedAt,
        startedAt,
        kind: 'fetch',
      });
      return res;
    } catch (err) {
      emitNetwork({
        method,
        url,
        status: 0,
        ok: false,
        durationMs: Date.now() - startedAt,
        startedAt,
        kind: 'fetch',
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  };
  window.fetch = patchedFetch;
  return () => {
    if (window.fetch === patchedFetch) window.fetch = original;
  };
}

type XhrWithMeta = XMLHttpRequest & {
  __debugMethod?: string;
  __debugUrl?: string;
  __debugStartedAt?: number;
  __debugCleanup?: () => void;
};

function patchXhr(): () => void {
  if (typeof XMLHttpRequest === 'undefined') return () => {};
  const proto = XMLHttpRequest.prototype;
  const originalOpen = proto.open;
  const originalSend = proto.send;
  const activeCleanups = new Set<() => void>();

  const patchedOpen = function patchedOpen(
    this: XhrWithMeta,
    method: string,
    url: string | URL,
    ...rest: unknown[]
  ) {
    this.__debugMethod = method.toUpperCase();
    this.__debugUrl = String(url);
    return (originalOpen as (...a: unknown[]) => void).call(this, method, url, ...rest);
  } as typeof proto.open;
  proto.open = patchedOpen;

  const patchedSend = function patchedSend(this: XhrWithMeta, ...args: unknown[]) {
    xhrCleanup(this);
    this.__debugStartedAt = Date.now();
    // eslint-disable-next-line @typescript-eslint/no-this-alias -- closure captures `this` for the addEventListener callbacks below
    const xhr = this;
    if (xhr.__debugUrl && shouldInjectSession(xhr.__debugUrl)) {
      try {
        xhr.setRequestHeader(SESSION_HEADER, getSessionId());
      } catch {
        // setRequestHeader throws if called after send() or with a forbidden
        // header name — the patch is best-effort.
      }
    }
    let finished = false;
    let cleanup = () => {};
    const finish = (status: number, ok: boolean, errorMsg?: string) => {
      if (finished) return;
      finished = true;
      cleanup();
      emitNetwork({
        method: xhr.__debugMethod ?? 'GET',
        url: xhr.__debugUrl ?? '',
        status,
        ok,
        durationMs: Date.now() - (xhr.__debugStartedAt ?? Date.now()),
        startedAt: xhr.__debugStartedAt ?? Date.now(),
        kind: 'xhr',
        error: errorMsg,
      });
    };
    const onLoad = () => finish(xhr.status, xhr.status >= 200 && xhr.status < 400);
    const onError = () => finish(0, false, 'network error');
    const onAbort = () => finish(0, false, 'aborted');
    cleanup = () => {
      xhr.removeEventListener('load', onLoad);
      xhr.removeEventListener('error', onError);
      xhr.removeEventListener('abort', onAbort);
      activeCleanups.delete(cleanup);
      if (xhr.__debugCleanup === cleanup) delete xhr.__debugCleanup;
    };
    xhr.__debugCleanup = cleanup;
    activeCleanups.add(cleanup);
    xhr.addEventListener('load', onLoad);
    xhr.addEventListener('error', onError);
    xhr.addEventListener('abort', onAbort);
    try {
      return (originalSend as (...a: unknown[]) => void).apply(xhr, args);
    } catch (error) {
      cleanup();
      throw error;
    }
  } as typeof proto.send;
  proto.send = patchedSend;

  return () => {
    for (const cleanup of activeCleanups) cleanup();
    if (proto.open === patchedOpen) proto.open = originalOpen;
    if (proto.send === patchedSend) proto.send = originalSend;
  };
}

function xhrCleanup(xhr: XhrWithMeta): void {
  xhr.__debugCleanup?.();
}
