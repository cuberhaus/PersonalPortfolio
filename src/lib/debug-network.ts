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

const INSTALLED_KEY = '__debugNetworkTapInstalled';
const SESSION_HEADER = 'X-Session-Id';

interface InstallFlag {
  [INSTALLED_KEY]?: boolean;
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
    const origin = new URL(url, typeof location !== 'undefined' ? location.href : 'http://localhost').origin;
    return getAllowedOrigins().has(origin);
  } catch {
    return false;
  }
}

export function installNetworkTap(): void {
  if (typeof window === 'undefined') return;
  if (!requireEnabled()) return;
  const flagHolder = window as unknown as InstallFlag;
  if (flagHolder[INSTALLED_KEY]) return;
  flagHolder[INSTALLED_KEY] = true;

  patchFetch();
  patchXhr();
}

function withSessionHeader(init: RequestInit | undefined, url: string): RequestInit | undefined {
  if (!shouldInjectSession(url)) return init;
  const headers = new Headers(init?.headers ?? undefined);
  if (!headers.has(SESSION_HEADER)) {
    headers.set(SESSION_HEADER, getSessionId());
  }
  return { ...(init ?? {}), headers };
}

function patchFetch(): void {
  if (typeof window.fetch !== 'function') return;
  const original = window.fetch.bind(window);

  window.fetch = async function patchedFetch(input, init) {
    const startedAt = Date.now();
    const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
    const url = input instanceof Request ? input.url : String(input);

    // For Request objects we cannot mutate headers without rebuilding the
    // request; passing init separately lets fetch merge it on top of the
    // Request body/method/etc. without clobbering them.
    const finalInit = withSessionHeader(init, url);

    try {
      const res = await original(input as RequestInfo, finalInit);
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
}

type XhrWithMeta = XMLHttpRequest & {
  __debugMethod?: string;
  __debugUrl?: string;
  __debugStartedAt?: number;
};

function patchXhr(): void {
  if (typeof XMLHttpRequest === 'undefined') return;
  const proto = XMLHttpRequest.prototype;
  const originalOpen = proto.open;
  const originalSend = proto.send;

  proto.open = function patchedOpen(this: XhrWithMeta, method: string, url: string | URL, ...rest: unknown[]) {
    this.__debugMethod = method.toUpperCase();
    this.__debugUrl = String(url);
    return (originalOpen as (...a: unknown[]) => void).call(this, method, url, ...rest);
  } as typeof proto.open;

  proto.send = function patchedSend(this: XhrWithMeta, ...args: unknown[]) {
    this.__debugStartedAt = Date.now();
    const xhr = this;
    if (xhr.__debugUrl && shouldInjectSession(xhr.__debugUrl)) {
      try {
        xhr.setRequestHeader(SESSION_HEADER, getSessionId());
      } catch {
        // setRequestHeader throws if called after send() or with a forbidden
        // header name — the patch is best-effort.
      }
    }
    const finish = (status: number, ok: boolean, errorMsg?: string) => {
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
    xhr.addEventListener('load', () => finish(xhr.status, xhr.status >= 200 && xhr.status < 400));
    xhr.addEventListener('error', () => finish(0, false, 'network error'));
    xhr.addEventListener('abort', () => finish(0, false, 'aborted'));
    return (originalSend as (...a: unknown[]) => void).apply(xhr, args);
  } as typeof proto.send;
}
