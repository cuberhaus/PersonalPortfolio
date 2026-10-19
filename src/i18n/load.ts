import type { Locale } from '../config/locales';

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
 * into the `{...identity, ...copy}` shape that components expect.
 */
export function flattenForLocale<Flat>(
  entries: readonly Record<string, unknown>[],
  _lang: Locale,
  translations: Record<string, Record<string, unknown>>
): Flat[] {
  return entries.map((entry, index) => {
    const copy = normalizeJsonArrays(translations[String(index)] ?? {}) as Record<string, unknown>;
    return { ...entry, ...copy } as unknown as Flat;
  });
}
