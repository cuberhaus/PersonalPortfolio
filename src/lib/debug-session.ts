/**
 * Stable per-browser session identifier used to correlate frontend and
 * backend telemetry across the boundary.
 *
 * Architectural intent (see docs/observability.md "Cross-service session
 * correlation"): one UUID is minted on first visit, persisted in
 * localStorage, stamped as a Sentry tag (`session_id`) on every event,
 * and forwarded to backends as the `X-Session-Id` HTTP header by
 * `debug-network.ts`. Each backend's observability hook then sets the
 * same tag on its own events, so a single Sentry filter
 * (`session_id:<uuid>`) joins the entire stack for that user.
 *
 * Why localStorage and not sessionStorage:
 *   - We want correlation to survive tab reloads and brief offline
 *     periods (a user who's actively debugging one demo).
 *   - We do NOT want it to persist across explicit "clear site data"
 *     or browser-data wipes — localStorage honours both.
 *
 * Why not Sentry's own session tracking:
 *   - Sentry's session-replay session ID is internal to the SDK and
 *     not exposed to backends.
 *   - The `X-Session-Id` header works even when traces are sampled out
 *     (no `sentry-trace` propagation), so standalone backend errors
 *     still get joined to the frontend session.
 *
 * Privacy: this is a random UUID, not a tracking identifier — it carries
 * no PII and can't be cross-referenced to a real user. It exists only to
 * stitch debug telemetry together.
 */

const STORAGE_KEY = 'debug.session_id';
const FALLBACK_PREFIX = 'sess_';

let cached: string | null = null;

function generateUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
  }
  return FALLBACK_PREFIX + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/**
 * Get (or mint, on first call) the stable session id. Safe to call from
 * any context: in SSR or non-browser environments it returns a process-
 * local UUID that's never persisted, which keeps the API total without
 * leaking server-side identifiers.
 */
export function getSessionId(): string {
  if (cached) return cached;

  if (typeof window === 'undefined') {
    cached = generateUuid();
    return cached;
  }

  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing && existing.length > 0) {
      cached = existing;
      return existing;
    }
  } catch {
    // localStorage may be blocked (private mode, third-party iframe). Mint
    // a session-only id and skip persistence.
  }

  const fresh = generateUuid();
  try {
    window.localStorage.setItem(STORAGE_KEY, fresh);
  } catch {
  }
  cached = fresh;
  return fresh;
}

/**
 * Test-only escape hatch. Clears the cached id and the localStorage entry
 * so each test sees a fresh session.
 */
export function __resetSessionForTesting(): void {
  cached = null;
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
  }
}
