export const DEBUG_LEVELS = ['trace', 'info', 'warn', 'error'];

const VALID_LEVELS = new Set(DEBUG_LEVELS);

function parseValue(value) {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function normalizeLevel(value, fallback) {
  return typeof value === 'string' && VALID_LEVELS.has(value) ? value : fallback;
}

function normalizeTimestamp(value, now) {
  return typeof value === 'number' && Number.isFinite(value) ? value : now();
}

function normalizeNamespace(value, namespacePrefix, defaultNamespace) {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw) return defaultNamespace;
  if (raw === namespacePrefix || raw.startsWith(`${namespacePrefix}:`)) return raw;
  return `${namespacePrefix}:${raw}`;
}

export function normalizeIframeDebugEvent(value, origin, options = {}) {
  return normalizeDebugEvent(value, {
    source: 'iframe',
    origin,
    namespacePrefix: 'iframe',
    defaultNamespace: 'iframe',
    expectedType: 'debug:log',
    requireLevel: true,
    requireNamespace: true,
    requireMessage: true,
    requireArgsArray: true,
    now: options.now,
  });
}

export function normalizeBackendDebugEvent(value, slug, options = {}) {
  const namespace = `demo:${slug}:backend`;
  return normalizeDebugEvent(value, {
    source: 'backend',
    origin: slug,
    namespacePrefix: namespace,
    defaultNamespace: namespace,
    allowPlainText: options.allowPlainText ?? false,
    now: options.now,
  });
}

/**
 * Convert an iframe envelope or relay payload into one canonical ingress event.
 * Plain text is accepted only by the relay, where a raw Docker log line is a
 * valid message; browser envelopes must be structured objects.
 */
export function normalizeDebugEvent(value, options) {
  const now = options.now ?? Date.now;
  const parsed = parseValue(value);
  if (parsed === null || typeof parsed !== 'object') {
    if (!options.allowPlainText || typeof value !== 'string' || value.length === 0) return null;
    return {
      source: options.source,
      origin: options.origin,
      level: options.defaultLevel ?? 'info',
      ns: options.defaultNamespace,
      msg: value,
      args: [],
      ts: now(),
    };
  }

  const payload = parsed;
  if (options.expectedType && payload.type !== options.expectedType) return null;
  if (options.requireLevel && typeof payload.level !== 'string') return null;
  if (options.requireNamespace && typeof payload.ns !== 'string') return null;
  if (options.requireMessage && typeof payload.msg !== 'string') return null;
  if (options.requireArgsArray && payload.args !== undefined && !Array.isArray(payload.args)) {
    return null;
  }

  if (typeof payload.msg !== 'string' && options.fallbackMessage === undefined) return null;
  const message = typeof payload.msg === 'string' ? payload.msg : (options.fallbackMessage ?? '');
  return {
    source: options.source,
    origin: options.origin,
    level: normalizeLevel(payload.level, options.defaultLevel ?? 'info'),
    ns: normalizeNamespace(payload.ns, options.namespacePrefix, options.defaultNamespace),
    msg: message,
    args: Array.isArray(payload.args) ? payload.args : [],
    ts: normalizeTimestamp(payload.ts, now),
  };
}
