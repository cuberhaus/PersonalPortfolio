import { LOCALES, DEFAULT_LOCALE, type Locale } from '../config/locales';

export function flattenDottedKeys(
  value: Record<string, unknown>,
  prefix = '',
  result: Record<string, unknown> = {}
): Record<string, unknown> {
  for (const [entryKey, entryValue] of Object.entries(value)) {
    const dottedKey = prefix ? `${prefix}.${entryKey}` : entryKey;
    if (entryValue && typeof entryValue === 'object' && !Array.isArray(entryValue)) {
      flattenDottedKeys(entryValue as Record<string, unknown>, dottedKey, result);
    } else {
      result[dottedKey] = entryValue;
    }
  }
  return result;
}

/**
 * Build a `Record<Locale, T>` from a Vite `import.meta.glob` map of
 * `locales/<locale>/<namespace>.json` files, with fallback to `DEFAULT_LOCALE`.
 */
export function fromLocaleGlob<T = Record<string, any>>(
  modules: Record<string, unknown>
): Record<Locale, T> {
  const byLocale: Partial<Record<Locale, T>> = {};
  for (const [path, mod] of Object.entries(modules)) {
    const match = path.match(/(?:^|\/)locales\/([^/]+)\/[^/]+\.json$/);
    if (match) {
      byLocale[match[1] as Locale] = mod as T;
    }
  }
  const result = {} as Record<Locale, T>;
  for (const locale of LOCALES) {
    result[locale] = (byLocale[locale] ?? byLocale[DEFAULT_LOCALE] ?? {}) as T;
  }
  return result;
}

export function pickLocaleFromMap<T = Record<string, any>>(
  bundle: Record<Locale, T>,
  lang: string
): T {
  const locale = (LOCALES as readonly string[]).includes(lang) ? (lang as Locale) : DEFAULT_LOCALE;
  return bundle[locale] ?? bundle[DEFAULT_LOCALE];
}
