import { useEffect, useMemo } from 'react';
import { debug } from './debug';

/**
 * React hook returning a memoized namespaced logger for use inside `.tsx`
 * demos. The underlying bus is a module-level singleton, so every caller
 * with the same namespace shares state through it.
 *
 * Usage:
 *   const log = useDebug('demo:phase-transitions');
 *   useEffect(() => { log.trace('mounted'); }, [log]);
 */
export function useDebug(ns: string) {
  return useMemo(() => debug(ns), [ns]);
}

/**
 * Sugared lifecycle helper for demo islands. Emits one `info` on mount
 * (with optional `extra` payload), an `i18n.trace('lang', ...)` so the
 * resolved language is visible in the overlay, and a `trace('unmount')`
 * on cleanup. Returns the namespaced logger so the caller can keep
 * emitting their own events without rewiring `useDebug` separately.
 *
 * Usage:
 *   const log = useDemoLifecycle('demo:rob', { lang });
 *   const onClick = () => log.info('start-fk');
 */
export function useDemoLifecycle(
  ns: string,
  meta: { lang?: string; extra?: Record<string, unknown> } = {},
) {
  const log = useDebug(ns);
  const i18nLog = useDebug('i18n');
  useEffect(() => {
    log.info('mount', meta.extra);
    if (meta.lang) i18nLog.trace('lang', { ns, lang: meta.lang });
    return () => {
      log.trace('unmount');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ns]);
  return log;
}
