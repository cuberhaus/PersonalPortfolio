/**
 * Iframe → parent debug log forwarder.
 *
 * Listens for `postMessage` events from same-origin-checked iframes embedded
 * via `<LiveAppEmbed />` and republishes them onto the central bus tagged
 * with `source: 'iframe'`. Embedded apps voluntarily emit messages via the
 * tiny `debug-iframe-emitter` snippet (see `docs/guides/adding-a-demo.md`).
 *
 * Envelope shape:
 *   { type: 'debug:log', level, ns, msg, args?, ts? }
 *
 * Security: every message is validated against the configured
 * `allowedOrigins` list. Origins are derived from
 * `src/data/demo-services.json` so the registry is the single source of
 * truth — a new demo can never accidentally bypass the allowlist by
 * forgetting to update this file.
 */

import { emitFrom, requireEnabled } from './debug';
import { listAllowedIframeOrigins } from '../data/demo-services';
import { normalizeIframeDebugEvent } from './debug-event.mjs';

let installedListener: ((e: MessageEvent) => void) | null = null;
const allowed = new Set<string>();

export interface InstallIframeForwarderOptions {
  /**
   * Origins permitted to post into the bus. When omitted, derived from
   * `listAllowedIframeOrigins()` (registry).
   */
  allowedOrigins?: readonly string[];
}

export function installIframeForwarder(opts: InstallIframeForwarderOptions = {}): void {
  if (typeof window === 'undefined') return;
  if (!requireEnabled()) return;

  const origins = opts.allowedOrigins ?? listAllowedIframeOrigins();
  for (const o of origins) allowed.add(o);

  if (installedListener) return;

  installedListener = (e: MessageEvent) => {
    if (!allowed.has(e.origin)) return;
    const event = normalizeIframeDebugEvent(e.data, e.origin);
    if (!event) return;
    emitFrom(event.source, event.origin, event.level, event.ns, event.msg, event.args, event.ts);
  };

  window.addEventListener('message', installedListener);
}

export function uninstallIframeForwarder(): void {
  if (typeof window === 'undefined') return;
  if (!installedListener) return;
  window.removeEventListener('message', installedListener);
  installedListener = null;
  allowed.clear();
}

/** Test-only escape hatch. */
export function __resetIframeForwarderForTesting(): void {
  uninstallIframeForwarder();
}
