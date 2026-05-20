import type { Locale } from '../config/locales';
import { DEFAULT_LOCALE } from '../config/locales';

/**
 * Canonical shape for a localized content row: identity fields shared across
 * all locales live under `identity`, translatable fields under `copy[<lang>]`.
 *
 * @deprecated Data files are now identity-only arrays with translations in
 * locales/{locale}/{file}.json. Kept for test compatibility.
 */
export interface Localized<Identity extends object, Copy extends object> {
  identity: Identity;
  copy: Partial<Record<Locale, Copy>> & { [DEFAULT_LOCALE]: Copy };
}

/**
 * Schema-agnostic shape used by parity / integrity tests that don't care
 * about the concrete identity / copy field set — just that both blocks exist
 * with string-keyed record values. Lives here so the three test suites that
 * need it stay in sync.
 */
export type AnyLocalized = Localized<Record<string, unknown>, Record<string, unknown>>;

function isNumericKeyedObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const keys = Object.keys(value);
  return keys.length > 0 && keys.every((k) => /^\d+$/.test(k));
}

function normalizeJsonArrays(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeJsonArrays(item));
  }
  if (isNumericKeyedObject(value)) {
    // Crowdin/other tooling may serialize arrays as {"0": ..., "1": ...}.
    return Object.keys(value)
      .sort((a, b) => Number(a) - Number(b))
      .map((k) => normalizeJsonArrays(value[k]));
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = normalizeJsonArrays(v);
    return out;
  }
  return value;
}

/**
 * Flatten an identity-only array with a separate locale translation object
 * into the legacy `{...identity, ...copy}` shape that components expect.
 */
export function flattenForLocale<Flat>(
  entries: readonly Record<string, unknown>[],
  lang: Locale,
  translations?: Record<string, Record<string, unknown>>
): Flat[] {
  return entries.map((entry, index) => {
    // New format: identity-only array + separate translations object
    if (translations) {
      const copy = normalizeJsonArrays(translations[String(index)] ?? {}) as Record<
        string,
        unknown
      >;
      return { ...entry, ...copy } as unknown as Flat;
    }
    // Legacy format: {identity, copy} shape (backward compat for tests)
    const legacy = entry as { identity?: Record<string, unknown>; copy?: Record<string, unknown> };
    if (legacy.identity && legacy.copy) {
      const copy = normalizeJsonArrays(
        (legacy.copy as Record<string, Record<string, unknown>>)[lang] ??
          (legacy.copy as Record<string, Record<string, unknown>>)[DEFAULT_LOCALE]
      ) as Record<string, unknown>;
      return { ...legacy.identity, ...copy } as unknown as Flat;
    }
    return entry as unknown as Flat;
  });
}
