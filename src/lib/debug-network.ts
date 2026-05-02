/**
 * Network tap: monkey-patches `window.fetch` and `XMLHttpRequest` to record
 * request metadata into the debug bus. Idempotent (safe to call repeatedly)
 * and only records when installed — visitors who never enable debug pay
 * nothing because `installNetworkTap()` is itself loaded lazily by
 * DebugInit.astro.
 *
 * Records metadata only (method, URL, status, duration, kind) — never bodies,
 * to avoid memory bloat.
 *
 * TODO: capture from Web Workers (e.g. plate-worker.ts) via BroadcastChannel.
 */
import { emitNetwork, requireEnabled } from './debug';

const INSTALLED_KEY = '__debugNetworkTapInstalled';

interface InstallFlag {
  [INSTALLED_KEY]?: boolean;
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

function patchFetch(): void {
  if (typeof window.fetch !== 'function') return;
  const original = window.fetch.bind(window);

  window.fetch = async function patchedFetch(input, init) {
    const startedAt = Date.now();
    const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
    const url = input instanceof Request ? input.url : String(input);

    try {
      const res = await original(input as RequestInfo, init);
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
