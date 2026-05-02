/**
 * Centralized debugging event bus.
 *
 * Single producer surface (`debug(namespace).info/warn/error/trace(...)`) used
 * across Astro components and React island demos. The bus emits CustomEvents
 * on a window-scoped EventTarget; consumers (overlay, console mirror, Sentry
 * forwarder, network tap) subscribe independently.
 *
 * Architecture rationale: see PersonalPortfolio/docs/debugging-architecture.md
 *
 * Design choices:
 *   - Singleton module-level state. Reset via `__resetBusForTesting()`.
 *   - Ring buffer of last 500 entries so the overlay can render history on
 *     mount even when subscribers attach late.
 *   - Namespace filtering with `*` glob support (e.g. `'demo:*'`).
 *   - Levels: trace < info < warn < error. Default minimum is `'info'`.
 *   - `enabled` is read from `window.__DEBUG_ENABLED`, set by DebugInit.astro.
 *     Always-on in `import.meta.env.DEV`. Disabled state is a no-op except
 *     for buffering errors (so they're available when the overlay opens).
 */

export type DebugLevel = 'trace' | 'info' | 'warn' | 'error';

export interface DebugLogEntry {
  ns: string;
  level: DebugLevel;
  msg: string;
  args: unknown[];
  ts: number;
  err?: Error;
}

export interface DebugNetworkEntry {
  method: string;
  url: string;
  status: number;
  ok: boolean;
  durationMs: number;
  startedAt: number;
  kind: 'fetch' | 'xhr';
  error?: string;
}

export interface DebugPerfEntry {
  kind: 'fps' | 'memory' | 'navigation' | 'webvital';
  name: string;
  value: number;
  ts: number;
  meta?: Record<string, unknown>;
}

export type DebugEventDetail =
  | { type: 'log'; entry: DebugLogEntry }
  | { type: 'network'; entry: DebugNetworkEntry }
  | { type: 'perf'; entry: DebugPerfEntry };

const LEVEL_ORDER: Record<DebugLevel, number> = { trace: 0, info: 1, warn: 2, error: 3 };

const RING_BUFFER_LIMIT = 500;

const isBrowser = typeof window !== 'undefined';

/**
 * Module-level singleton state. The EventTarget is window-scoped when in the
 * browser so multiple modules importing this file share the same bus.
 */
interface BusState {
  target: EventTarget;
  logs: DebugLogEntry[];
  network: DebugNetworkEntry[];
  perf: DebugPerfEntry[];
  filterNs: string | null;
  minLevel: DebugLevel;
}

declare global {
  interface Window {
    __DEBUG_ENABLED?: boolean;
    __debugBusState?: BusState;
    __debug?: {
      log: (level: DebugLevel, ns: string, msg: string, ...args: unknown[]) => void;
      enable: () => void;
      disable: () => void;
    };
  }
}

type StateHolder = { __debugBusState?: BusState };

function getStateHolder(): StateHolder {
  return (isBrowser ? window : globalThis) as unknown as StateHolder;
}

function getState(): BusState {
  const holder = getStateHolder();
  if (holder.__debugBusState) return holder.__debugBusState;
  const state: BusState = {
    target: typeof EventTarget !== 'undefined'
      ? new EventTarget()
      : ({ addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; } } as unknown as EventTarget),
    logs: [],
    network: [],
    perf: [],
    filterNs: null,
    minLevel: 'info',
  };
  holder.__debugBusState = state;
  return state;
}

/**
 * Whether auto-subscribers (network tap, Sentry forwarder, overlay) should
 * install themselves on first activation. The bus itself always broadcasts —
 * this only gates the default consumer set.
 */
export function isEnabled(): boolean {
  if (import.meta.env.DEV) return true;
  return isBrowser ? Boolean(window.__DEBUG_ENABLED) : false;
}

/**
 * Match a namespace against a glob pattern with `*` wildcards.
 * `'demo:rob:fk'` matches `'demo:*'` and `'demo:rob:*'` but not `'theme:*'`.
 */
function namespaceMatches(ns: string, pattern: string | null): boolean {
  if (!pattern) return true;
  if (pattern === ns) return true;
  if (!pattern.includes('*')) return false;
  const re = new RegExp('^' + pattern.split('*').map(escapeRegex).join('.*') + '$');
  return re.test(ns);
}

function escapeRegex(s: string): string {
  return s.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
}

function pushBuffer<T>(buf: T[], entry: T): void {
  buf.push(entry);
  if (buf.length > RING_BUFFER_LIMIT) buf.splice(0, buf.length - RING_BUFFER_LIMIT);
}

function dispatchDetail(detail: DebugEventDetail): void {
  const state = getState();
  const eventName = `debug:${detail.type}`;
  state.target.dispatchEvent(new CustomEvent(eventName, { detail }));
}

/**
 * Public namespaced logger factory.
 * Usage: `const log = debug('demo:rob'); log.info('mounted', { joints: 6 });`
 */
export function debug(ns: string) {
  return {
    trace: (msg: string, ...args: unknown[]) => emit('trace', ns, msg, args),
    info: (msg: string, ...args: unknown[]) => emit('info', ns, msg, args),
    warn: (msg: string, ...args: unknown[]) => emit('warn', ns, msg, args),
    error: (msg: string, ...args: unknown[]) => emit('error', ns, msg, args),
  };
}

function emit(level: DebugLevel, ns: string, msg: string, args: unknown[]): void {
  const state = getState();

  if (LEVEL_ORDER[level] < LEVEL_ORDER[state.minLevel]) return;
  if (!namespaceMatches(ns, state.filterNs)) return;

  const errArg = args.find((a): a is Error => a instanceof Error);
  const entry: DebugLogEntry = {
    ns,
    level,
    msg,
    args,
    ts: Date.now(),
    err: errArg,
  };

  pushBuffer(state.logs, entry);

  if (import.meta.env.DEV) {
    const fn = level === 'trace' ? console.debug
      : level === 'info' ? console.info
      : level === 'warn' ? console.warn
      : console.error;
    fn(`[${ns}]`, msg, ...args);
  }

  dispatchDetail({ type: 'log', entry });
}

export function emitNetwork(entry: DebugNetworkEntry): void {
  pushBuffer(getState().network, entry);
  dispatchDetail({ type: 'network', entry });
}

export function emitPerf(entry: DebugPerfEntry): void {
  pushBuffer(getState().perf, entry);
  dispatchDetail({ type: 'perf', entry });
}

/** Subscribe to a single channel. Returns an unsubscribe function. */
export function subscribe(
  channel: 'log' | 'network' | 'perf',
  handler: (detail: DebugEventDetail) => void,
): () => void {
  const state = getState();
  const eventName = `debug:${channel}`;
  const listener = (e: Event) => handler((e as CustomEvent<DebugEventDetail>).detail);
  state.target.addEventListener(eventName, listener);
  return () => state.target.removeEventListener(eventName, listener);
}

export function getBuffer(channel: 'log'): DebugLogEntry[];
export function getBuffer(channel: 'network'): DebugNetworkEntry[];
export function getBuffer(channel: 'perf'): DebugPerfEntry[];
export function getBuffer(channel: 'log' | 'network' | 'perf'): unknown[] {
  const state = getState();
  if (channel === 'log') return state.logs.slice();
  if (channel === 'network') return state.network.slice();
  return state.perf.slice();
}

export function clearBuffer(channel?: 'log' | 'network' | 'perf'): void {
  const state = getState();
  if (!channel || channel === 'log') state.logs.length = 0;
  if (!channel || channel === 'network') state.network.length = 0;
  if (!channel || channel === 'perf') state.perf.length = 0;
}

export function setFilter(ns: string | null): void {
  getState().filterNs = ns;
}

export function setMinLevel(level: DebugLevel): void {
  getState().minLevel = level;
}

/**
 * Test-only escape hatch. Replaces the singleton state so each test starts
 * with a fresh bus. Use in `beforeEach`.
 */
export function __resetBusForTesting(): void {
  delete getStateHolder().__debugBusState;
}

/**
 * Install a tiny global so inline scripts in DebugInit.astro can push errors
 * into the bus before lib/debug.ts is loaded as a module.
 */
if (isBrowser) {
  window.__debug = {
    log: (level, ns, msg, ...args) => emit(level, ns, msg, args),
    enable: () => { window.__DEBUG_ENABLED = true; },
    disable: () => { window.__DEBUG_ENABLED = false; },
  };
}
