import { normalizeBackendDebugEvent } from '../../src/lib/debug-event.mjs';

export function normalizeRelayLine(line, slug) {
  return normalizeBackendDebugEvent(line, slug, { allowPlainText: true });
}
