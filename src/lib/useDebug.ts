import { useMemo } from 'react';
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
