/**
 * In-page debug overlay.
 *
 * Bottom-right floating panel with four tabs (Logs / State / Perf / Network).
 * Subscribes to the bus on mount; dispose subscribers in cleanup so HMR
 * doesn't accumulate listeners (same trap that bit the Babylon arm earlier).
 *
 * z-index 99000 keeps it below the existing theme modal at 99999.
 *
 * Lazy-loads the network tap and Sentry forwarder once enabled.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  subscribe,
  getBuffer,
  clearBuffer,
  isEnabled,
  emitPerf,
  debug,
  type DebugLogEntry,
  type DebugNetworkEntry,
  type DebugPerfEntry,
  type DebugLevel,
  type DebugSource,
} from '../lib/debug';

type Tab = 'logs' | 'state' | 'perf' | 'network';

interface DebugOverlayProps {
  initiallyEnabled?: boolean;
}

interface PerfState {
  fps: number;
  memoryMb: number | null;
  navigation: { dns: number; ttfb: number; dcl: number; load: number } | null;
}

const LEVEL_COLORS: Record<DebugLevel, string> = {
  trace: 'var(--text-muted)',
  info: 'var(--accent-start)',
  warn: '#f59e0b',
  error: '#ef4444',
};

const SOURCE_BADGE: Record<DebugSource, { label: string; bg: string; fg: string }> = {
  browser: { label: 'B',  bg: 'rgba(99,102,241,0.18)',  fg: '#818cf8' },
  iframe:  { label: 'I',  bg: 'rgba(20,184,166,0.18)',  fg: '#2dd4bf' },
  backend: { label: 'BE', bg: 'rgba(244,114,182,0.18)', fg: '#f472b6' },
};

const SOURCES_ORDER: DebugSource[] = ['browser', 'iframe', 'backend'];

export default function DebugOverlay({ initiallyEnabled = false }: DebugOverlayProps) {
  // Mounted client-side only (DebugInit uses `client:only="react"`), so it's
  // safe to read window globals during the initial render.
  const [enabled, setEnabled] = useState(initiallyEnabled || Boolean(window.__DEBUG_ENABLED));
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('logs');
  const [logs, setLogs] = useState<DebugLogEntry[]>([]);
  const [network, setNetwork] = useState<DebugNetworkEntry[]>([]);
  const [perf, setPerf] = useState<PerfState>({ fps: 0, memoryMb: null, navigation: null });
  const [filterText, setFilterText] = useState('');
  const [minLevel, setMinLevelState] = useState<DebugLevel>('trace');
  const [sourceFilter, setSourceFilter] = useState<Set<DebugSource>>(
    () => new Set(SOURCES_ORDER),
  );
  const fpsFrameRef = useRef<number>(0);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ enabled: boolean }>).detail;
      setEnabled(detail.enabled);
    };
    document.addEventListener('debug:toggle', handler);
    return () => document.removeEventListener('debug:toggle', handler);
  }, []);

  // NOTE: keyboard handling lives entirely in the inline script in
  // `DebugInit.astro`. Adding a second keydown listener here would double-fire
  // on every keypress and immediately cancel the toggle. The `debug:toggle`
  // CustomEvent above is the single source of truth that updates this state.

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    void (async () => {
      const [{ installNetworkTap }, { installSentryForwarder }] = await Promise.all([
        import('../lib/debug-network'),
        import('../lib/debug-sentry'),
      ]);
      if (cancelled) return;
      installNetworkTap();
      void installSentryForwarder();
    })();
    return () => { cancelled = true; };
  }, [enabled]);

  useEffect(() => {
    setLogs(getBuffer('log'));
    setNetwork(getBuffer('network'));
    const u1 = subscribe('log', (d) => {
      if (d.type === 'log') setLogs((prev) => [...prev.slice(-499), d.entry]);
    });
    const u2 = subscribe('network', (d) => {
      if (d.type === 'network') setNetwork((prev) => [...prev.slice(-499), d.entry]);
    });
    return () => { u1(); u2(); };
  }, []);

  useEffect(() => {
    if (!open || tab !== 'perf') return;
    let frames = 0;
    let last = performance.now();
    const loop = () => {
      frames++;
      const now = performance.now();
      if (now - last >= 1000) {
        const fps = Math.round((frames * 1000) / (now - last));
        const mem = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
        const memoryMb = mem ? Math.round(mem.usedJSHeapSize / 1024 / 1024) : null;
        setPerf((prev) => ({ ...prev, fps, memoryMb }));
        emitPerf({ kind: 'fps', name: 'fps', value: fps, ts: Date.now() });
        frames = 0;
        last = now;
      }
      fpsFrameRef.current = requestAnimationFrame(loop);
    };
    fpsFrameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(fpsFrameRef.current);
  }, [open, tab]);

  useEffect(() => {
    if (!open || tab !== 'perf') return;
    const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    if (!navEntry) return;
    setPerf((prev) => ({
      ...prev,
      navigation: {
        dns: Math.round(navEntry.domainLookupEnd - navEntry.domainLookupStart),
        ttfb: Math.round(navEntry.responseStart - navEntry.requestStart),
        dcl: Math.round(navEntry.domContentLoadedEventEnd - navEntry.startTime),
        load: Math.round(navEntry.loadEventEnd - navEntry.startTime),
      },
    }));
  }, [open, tab]);

  const filteredLogs = useMemo(() => {
    const minIdx = ['trace', 'info', 'warn', 'error'].indexOf(minLevel);
    return logs.filter((l) => {
      const lvlIdx = ['trace', 'info', 'warn', 'error'].indexOf(l.level);
      if (lvlIdx < minIdx) return false;
      const src = l.source ?? 'browser';
      if (!sourceFilter.has(src)) return false;
      if (filterText && !l.ns.includes(filterText) && !l.msg.includes(filterText)) return false;
      return true;
    });
  }, [logs, filterText, minLevel, sourceFilter]);

  const toggleSource = useCallback((s: DebugSource) => {
    setSourceFilter((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  }, []);

  const copyLogs = useCallback(() => {
    const json = JSON.stringify(filteredLogs.map((l) => ({
      ts: new Date(l.ts).toISOString(),
      ns: l.ns,
      level: l.level,
      msg: l.msg,
      err: l.err?.stack,
    })), null, 2);
    void navigator.clipboard?.writeText(json);
    debug('debug:ui').trace('copy-logs', { count: filteredLogs.length });
  }, [filteredLogs]);

  if (!enabled) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="debug-overlay-trigger"
        aria-label={open ? 'Close debug overlay' : 'Open debug overlay'}
      >
        🐛{open ? ' ×' : ''}
      </button>
      {open && (
        <div className="debug-overlay-panel" role="dialog" aria-label="Debug overlay">
          <div className="debug-overlay-tabs">
            {(['logs', 'state', 'perf', 'network'] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                className={`debug-overlay-tab ${tab === t ? 'active' : ''}`}
                onClick={() => setTab(t)}
              >
                {t}
              </button>
            ))}
            <span style={{ flex: 1 }} />
            <button type="button" className="debug-overlay-tab" onClick={() => { clearBuffer(); setLogs([]); setNetwork([]); }}>clear</button>
            <button type="button" className="debug-overlay-tab" onClick={() => setOpen(false)}>×</button>
          </div>
          <div className="debug-overlay-body">
            {tab === 'logs' && (
              <LogsTab
                logs={filteredLogs}
                filterText={filterText}
                setFilterText={setFilterText}
                minLevel={minLevel}
                setMinLevel={setMinLevelState}
                copy={copyLogs}
                sourceFilter={sourceFilter}
                toggleSource={toggleSource}
              />
            )}
            {tab === 'state' && <StateTab />}
            {tab === 'perf' && <PerfTab perf={perf} />}
            {tab === 'network' && <NetworkTab requests={network} />}
          </div>
        </div>
      )}
      <style>{OVERLAY_STYLES}</style>
    </>
  );
}

interface LogsTabProps {
  logs: DebugLogEntry[];
  filterText: string;
  setFilterText: (s: string) => void;
  minLevel: DebugLevel;
  setMinLevel: (l: DebugLevel) => void;
  copy: () => void;
  sourceFilter: Set<DebugSource>;
  toggleSource: (s: DebugSource) => void;
}

function LogsTab({ logs, filterText, setFilterText, minLevel, setMinLevel, copy, sourceFilter, toggleSource }: LogsTabProps) {
  return (
    <>
      <div className="debug-overlay-controls">
        <input
          type="text"
          placeholder="filter ns/msg…"
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          className="debug-overlay-input"
        />
        <select
          value={minLevel}
          onChange={(e) => setMinLevel(e.target.value as DebugLevel)}
          className="debug-overlay-input"
        >
          <option value="trace">trace+</option>
          <option value="info">info+</option>
          <option value="warn">warn+</option>
          <option value="error">error</option>
        </select>
        <button type="button" onClick={copy} className="debug-overlay-tab">copy</button>
      </div>
      <div className="debug-overlay-source-filter" role="group" aria-label="Source filter">
        {SOURCES_ORDER.map((s) => {
          const badge = SOURCE_BADGE[s];
          const active = sourceFilter.has(s);
          return (
            <button
              key={s}
              type="button"
              className={`debug-overlay-source-pill ${active ? 'active' : 'muted'}`}
              onClick={() => toggleSource(s)}
              style={{
                background: active ? badge.bg : 'transparent',
                color: active ? badge.fg : 'var(--text-muted)',
                borderColor: active ? badge.fg : 'var(--border-color)',
              }}
            >
              <span className="debug-overlay-source-badge" style={{ background: badge.fg }}>
                {badge.label}
              </span>
              {s}
            </button>
          );
        })}
      </div>
      <div className="debug-overlay-list">
        {logs.length === 0 && <div className="debug-overlay-empty">no logs</div>}
        {logs.slice(-200).reverse().map((l, i) => {
          const src = (l.source ?? 'browser') as DebugSource;
          const badge = SOURCE_BADGE[src];
          const isRateLimitMarker = l.ns.endsWith(':backend') && l.msg === 'rate-limited';
          return (
            <div
              key={`${l.ts}-${i}`}
              className={`debug-overlay-row ${isRateLimitMarker ? 'is-aggregate' : ''}`}
            >
              <span className="debug-overlay-time">{new Date(l.ts).toISOString().slice(11, 23)}</span>
              <span
                className="debug-overlay-source-badge"
                style={{ background: badge.bg, color: badge.fg }}
                title={`${src}${l.origin ? `: ${l.origin}` : ''}`}
              >
                {badge.label}
              </span>
              <span className="debug-overlay-level" style={{ color: LEVEL_COLORS[l.level] }}>{l.level}</span>
              <span className="debug-overlay-ns">{l.ns}</span>
              <span className="debug-overlay-msg">{l.msg}</span>
            </div>
          );
        })}
      </div>
    </>
  );
}

function StateTab() {
  const [, forceTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);
  if (typeof document === 'undefined') return null;
  const html = document.documentElement;
  const rows: [string, string][] = [
    ['theme', html.getAttribute('data-theme') ?? 'unknown'],
    ['design', html.getAttribute('data-design') ?? 'unknown'],
    ['lang', html.getAttribute('lang') ?? 'unknown'],
    ['route', window.location.pathname + window.location.search],
    ['viewport', `${window.innerWidth}×${window.innerHeight}`],
    ['scroll', `${Math.round(window.scrollY)}px`],
    ['DPR', String(window.devicePixelRatio ?? 1)],
    ['user agent', navigator.userAgent.slice(0, 64)],
  ];
  return (
    <div className="debug-overlay-list">
      {rows.map(([k, v]) => (
        <div key={k} className="debug-overlay-row">
          <span className="debug-overlay-ns">{k}</span>
          <span className="debug-overlay-msg">{v}</span>
        </div>
      ))}
    </div>
  );
}

function PerfTab({ perf }: { perf: PerfState }) {
  const rows: [string, string][] = [
    ['FPS', String(perf.fps)],
    ['JS heap', perf.memoryMb !== null ? `${perf.memoryMb} MB` : 'n/a'],
    ['DNS', perf.navigation ? `${perf.navigation.dns} ms` : '—'],
    ['TTFB', perf.navigation ? `${perf.navigation.ttfb} ms` : '—'],
    ['DCL', perf.navigation ? `${perf.navigation.dcl} ms` : '—'],
    ['load', perf.navigation ? `${perf.navigation.load} ms` : '—'],
  ];
  return (
    <div className="debug-overlay-list">
      {rows.map(([k, v]) => (
        <div key={k} className="debug-overlay-row">
          <span className="debug-overlay-ns">{k}</span>
          <span className="debug-overlay-msg">{v}</span>
        </div>
      ))}
    </div>
  );
}

function NetworkTab({ requests }: { requests: DebugNetworkEntry[] }) {
  if (requests.length === 0) {
    return <div className="debug-overlay-empty">no requests recorded yet — fetch tap installs on first activation</div>;
  }
  return (
    <div className="debug-overlay-list">
      {requests.slice(-200).reverse().map((r, i) => (
        <div key={`${r.startedAt}-${i}`} className="debug-overlay-row">
          <span className="debug-overlay-time">{new Date(r.startedAt).toISOString().slice(11, 19)}</span>
          <span className="debug-overlay-level" style={{ color: r.ok ? 'var(--accent-start)' : '#ef4444' }}>{r.method}</span>
          <span className="debug-overlay-level" style={{ color: r.ok ? 'var(--text-secondary)' : '#ef4444' }}>{r.status || 'ERR'}</span>
          <span className="debug-overlay-ns">{r.durationMs}ms</span>
          <span className="debug-overlay-msg" title={r.url}>{r.url}</span>
        </div>
      ))}
    </div>
  );
}

const OVERLAY_STYLES = `
  .debug-overlay-trigger {
    position: fixed;
    /* Stacked above ScrollToTop (which sits at bottom: 2rem; right: 2rem,
       ~3rem tall) so neither widget overlaps. */
    bottom: 6rem;
    right: 2rem;
    z-index: 99000;
    padding: 0.35rem 0.55rem;
    border-radius: var(--radius-sm, 4px);
    background: var(--bg-card);
    color: var(--text-secondary);
    border: 1px solid var(--border-color);
    font-family: var(--font-mono, monospace);
    font-size: 0.95rem;
    line-height: 1;
    cursor: pointer;
    opacity: 0.6;
    transition: opacity 0.15s, color 0.15s, border-color 0.15s;
  }
  .debug-overlay-trigger:hover {
    opacity: 1;
    color: var(--accent-start);
    border-color: var(--accent-start);
  }
  .debug-overlay-panel {
    position: fixed;
    bottom: 9rem;
    right: 2rem;
    z-index: 99000;
    width: min(560px, calc(100vw - 2rem));
    height: min(420px, calc(100vh - 6rem));
    background: var(--bg-card);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md, 6px);
    display: flex;
    flex-direction: column;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
    font-family: var(--font-mono, monospace);
    font-size: 0.72rem;
  }
  .debug-overlay-tabs {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.4rem;
    border-bottom: 1px solid var(--border-color);
    background: var(--bg-secondary);
    border-radius: var(--radius-md, 6px) var(--radius-md, 6px) 0 0;
  }
  .debug-overlay-tab {
    padding: 0.2rem 0.5rem;
    border-radius: var(--radius-sm, 4px);
    background: transparent;
    color: var(--text-secondary);
    border: 1px solid transparent;
    font-family: inherit;
    font-size: inherit;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    cursor: pointer;
    transition: color 0.15s, background 0.15s, border-color 0.15s;
  }
  .debug-overlay-tab:hover {
    color: var(--text-primary);
    background: var(--bg-card-hover, var(--bg-card));
  }
  .debug-overlay-tab.active {
    color: var(--accent-start);
    border-color: var(--accent-start);
  }
  .debug-overlay-controls {
    display: flex;
    gap: 0.4rem;
    padding: 0.4rem;
    border-bottom: 1px solid var(--border-color);
  }
  .debug-overlay-input {
    flex: 1;
    min-width: 0;
    padding: 0.2rem 0.4rem;
    background: var(--bg-secondary);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm, 4px);
    font-family: inherit;
    font-size: inherit;
  }
  .debug-overlay-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .debug-overlay-list {
    flex: 1;
    overflow: auto;
    padding: 0.25rem;
  }
  .debug-overlay-row {
    display: grid;
    grid-template-columns: auto auto auto auto 1fr;
    gap: 0.5rem;
    padding: 0.15rem 0.4rem;
    border-radius: var(--radius-sm, 4px);
    align-items: baseline;
  }
  .debug-overlay-row:hover {
    background: var(--bg-secondary);
  }
  .debug-overlay-row.is-aggregate {
    font-style: italic;
    border-top: 1px dashed var(--border-color);
    border-bottom: 1px dashed var(--border-color);
    color: var(--text-muted);
  }
  .debug-overlay-source-filter {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
    padding: 0.4rem;
    border-bottom: 1px solid var(--border-color);
    background: var(--bg-secondary);
  }
  .debug-overlay-source-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.15rem 0.5rem 0.15rem 0.3rem;
    border-radius: 999px;
    border: 1px solid;
    cursor: pointer;
    font-family: inherit;
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    transition: background 0.15s, color 0.15s, border-color 0.15s, opacity 0.15s;
  }
  .debug-overlay-source-pill.muted {
    opacity: 0.55;
  }
  .debug-overlay-source-pill:hover {
    opacity: 1;
  }
  .debug-overlay-source-badge {
    display: inline-block;
    min-width: 1.3em;
    text-align: center;
    padding: 0 0.35em;
    border-radius: 3px;
    font-size: 0.6rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  .debug-overlay-time {
    color: var(--text-muted);
    font-size: 0.65rem;
  }
  .debug-overlay-level {
    font-weight: 700;
    text-transform: uppercase;
    font-size: 0.65rem;
    letter-spacing: 0.05em;
  }
  .debug-overlay-ns {
    color: var(--text-secondary);
    font-weight: 600;
  }
  .debug-overlay-msg {
    color: var(--text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }
  .debug-overlay-empty {
    padding: 1rem;
    text-align: center;
    color: var(--text-muted);
    font-style: italic;
  }
`;
