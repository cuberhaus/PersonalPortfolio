import type { Locale } from '../config/locales';
import { DEFAULT_LOCALE } from '../config/locales';

/**
 * Canonical shape for a localized content row: identity fields shared across
 * all locales live under `identity`, translatable fields under `copy[<lang>]`.
 */
export interface Localized<Identity extends object, Copy extends object> {
  identity: Identity;
  copy: Partial<Record<Locale, Copy>> & { [DEFAULT_LOCALE]: Copy };
}

/**
 * Flatten a localized list for a target locale into the legacy
 * `{...identity, ...copy}` shape that components expect. Falls back to the
 * default locale's copy entry whenever the requested locale is missing it.
 *
 * The generic parameter `Flat` declares the resulting per-entry shape;
 * callers are responsible for asserting that the entry's identity ∪ copy
 * actually matches `Flat`.
 */
export function flattenForLocale<Flat>(
  entries: readonly Localized<Record<string, unknown>, Record<string, unknown>>[],
  lang: Locale,
): Flat[] {
  return entries.map((entry) => {
    const copy = entry.copy[lang] ?? entry.copy[DEFAULT_LOCALE];
    return { ...entry.identity, ...copy } as unknown as Flat;
  });
}
