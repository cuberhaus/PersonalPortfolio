/**
 * Iframe → parent debug log forwarder.
 *
 * Listens for `postMessage` events from same-origin-checked iframes embedded
 * via `<LiveAppEmbed />` and republishes them onto the central bus tagged
 * with `source: 'iframe'`. Embedded apps voluntarily emit messages via the
 * tiny `debug-iframe-emitter` snippet (see `docs/adding-a-demo.md`).
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

import { emitFrom, requireEnabled, type DebugLevel } from './debug';
import { listAllowedIframeOrigins } from '../data/demo-services';

interface DebugLogEnvelope {
  type: 'debug:log';
  level: DebugLevel;
  ns: string;
  msg: string;
  args?: unknown[];
  ts?: number;
}

const VALID_LEVELS: ReadonlySet<DebugLevel> = new Set<DebugLevel>(['trace', 'info', 'warn', 'error']);

let installedListener: ((e: MessageEvent) => void) | null = null;
const allowed = new Set<string>();

function isLogEnvelope(data: unknown): data is DebugLogEnvelope {
  if (typeof data !== 'object' || data === null) return false;
  const o = data as Record<string, unknown>;
  if (o.type !== 'debug:log') return false;
  if (typeof o.level !== 'string') return false;
  if (!VALID_LEVELS.has(o.level as DebugLevel)) return false;
  if (typeof o.ns !== 'string') return false;
  if (typeof o.msg !== 'string') return false;
  if (o.args !== undefined && !Array.isArray(o.args)) return false;
  return true;
}

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
    if (!isLogEnvelope(e.data)) return;

    const { level, ns, msg } = e.data;
    const args = e.data.args ?? [];
    const prefixedNs = ns.startsWith('iframe:') ? ns : `iframe:${ns}`;
    emitFrom('iframe', e.origin, level, prefixedNs, msg, args);
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
