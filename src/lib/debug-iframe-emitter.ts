/**
 * Tiny client-side snippet for embedded iframe demos.
 *
 * Copy this file (or its contents) into the embedded app's bootstrap so
 * the parent portfolio's debug overlay can capture its logs. The parent
 * must whitelist the iframe's origin in
 * `src/data/demo-services.json` (`backend.iframeUrl`).
 *
 * Usage in the embedded app:
 *
 *   import { installEmbedDebug } from './debug-iframe-emitter';
 *   installEmbedDebug();
 *   __embed_debug.info('demo:tfg-polyps', 'mounted', { build: '0.1.2' });
 *
 * After installation, `console.log` / `console.warn` / `console.error`
 * are also forwarded automatically (with `ns: 'console'`).
 */

export type EmbedLogLevel = 'trace' | 'info' | 'warn' | 'error';

declare global {
  interface Window {
    __embed_debug?: {
      trace: (ns: string, msg: string, ...args: unknown[]) => void;
      info: (ns: string, msg: string, ...args: unknown[]) => void;
      warn: (ns: string, msg: string, ...args: unknown[]) => void;
      error: (ns: string, msg: string, ...args: unknown[]) => void;
    };
  }
}

function send(level: EmbedLogLevel, ns: string, msg: string, args: unknown[]): void {
  if (typeof window === 'undefined') return;
  if (!window.parent || window.parent === window) return;
  try {
    const safeArgs = args.map((a) => {
      try {
        JSON.stringify(a);
        return a;
      } catch {
        return String(a);
      }
    });
    window.parent.postMessage(
      { type: 'debug:log', level, ns, msg, args: safeArgs, ts: Date.now() },
      '*',
    );
  } catch {
  }
}

export interface InstallEmbedDebugOptions {
  /** Mirror `console.log/warn/error` into the parent. Default `true`. */
  mirrorConsole?: boolean;
}

export function installEmbedDebug(opts: InstallEmbedDebugOptions = {}): void {
  if (typeof window === 'undefined') return;
  if (window.__embed_debug) return;

  window.__embed_debug = {
    trace: (ns, msg, ...args) => send('trace', ns, msg, args),
    info: (ns, msg, ...args) => send('info', ns, msg, args),
    warn: (ns, msg, ...args) => send('warn', ns, msg, args),
    error: (ns, msg, ...args) => send('error', ns, msg, args),
  };

  if (opts.mirrorConsole !== false) {
    const orig = {
      log: console.log.bind(console),
      info: console.info.bind(console),
      warn: console.warn.bind(console),
      error: console.error.bind(console),
    };
    console.log = (...a: unknown[]) => {
      orig.log(...a);
      send('info', 'console', String(a[0] ?? ''), a.slice(1));
    };
    console.info = (...a: unknown[]) => {
      orig.info(...a);
      send('info', 'console', String(a[0] ?? ''), a.slice(1));
    };
    console.warn = (...a: unknown[]) => {
      orig.warn(...a);
      send('warn', 'console', String(a[0] ?? ''), a.slice(1));
    };
    console.error = (...a: unknown[]) => {
      orig.error(...a);
      send('error', 'console', String(a[0] ?? ''), a.slice(1));
    };
  }

  window.addEventListener('error', (ev) => {
    send('error', 'window', ev.message, [{ filename: ev.filename, lineno: ev.lineno, colno: ev.colno }]);
  });
  window.addEventListener('unhandledrejection', (ev) => {
    send('error', 'window', 'unhandled-rejection', [String(ev.reason)]);
  });
}
