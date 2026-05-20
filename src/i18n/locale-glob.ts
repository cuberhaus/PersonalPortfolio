/**
 * Glob-based locale loader — loads all JSON files under `locales/` at build
 * time via Vite's `import.meta.glob`. Adding a new locale only requires
 * creating the `locales/<lang>/` directory and JSON files; no import
 * statements need to be added anywhere.
 *
 * This module is the backbone of the SSOT locale system.
 */
import { LOCALES, DEFAULT_LOCALE, type Locale } from '../config/locales';

// Eagerly import every JSON file under locales/ at build time.
// Vite resolves this at compile time — the glob pattern must be a string literal.
const allModules = import.meta.glob<Record<string, unknown>>('../../locales/**/*.json', {
  eager: true,
  import: 'default',
});

/**
 * Build a path key matching the glob output format.
 * Vite keys look like: `../../locales/en/ui.json`
 */
function key(locale: string, namespace: string): string {
  return `../../locales/${locale}/${namespace}.json`;
}

/** Get a single namespace's translations for one locale. */
export function getLocaleNamespace(locale: Locale, namespace: string): Record<string, unknown> {
  return (allModules[key(locale, namespace)] as Record<string, unknown>) ?? {};
}

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

/** Get a namespace's translations for all locales as a Record<Locale, ...>. */
export function getAllLocalesForNamespace<T = Record<string, any>>(
  namespace: string
): Record<Locale, T> {
  const result = {} as Record<Locale, T>;
  for (const locale of LOCALES) {
    result[locale] = (allModules[key(locale, namespace)] ?? {}) as T;
  }
  return result;
}

/**
 * Get the UI namespace for all locales, shaped for i18next resources.
 * Returns `{ en: { ui: {...} }, es: { ui: {...} }, ... }`
 */
export function getI18nextResources(): Record<Locale, { ui: Record<string, unknown> }> {
  const result = {} as Record<Locale, { ui: Record<string, unknown> }>;
  for (const locale of LOCALES) {
    result[locale] = { ui: flattenDottedKeys(getLocaleNamespace(locale, 'ui')) };
  }
  return result;
}

/**
 * Get translations for a data file (skills, experience, etc.) for one locale.
 * Returns the numeric-indexed object `{ "0": {...}, "1": {...} }`.
 */
export function getDataTranslations(
  file: string,
  locale: Locale
): Record<string, Record<string, unknown>> {
  return getLocaleNamespace(locale, file) as Record<string, Record<string, unknown>>;
}

/**
 * Get a demo-specific namespace for a given locale, with fallback to default.
 * Used by React demo components: `const t = getDemoT('tfg-polyp-demo', lang);`
 */
export function getDemoT<T = Record<string, any>>(namespace: string, lang: string): T {
  const locale = (LOCALES as readonly string[]).includes(lang) ? (lang as Locale) : DEFAULT_LOCALE;
  return (getLocaleNamespace(locale, namespace) ||
    getLocaleNamespace(DEFAULT_LOCALE, namespace)) as T;
}

/**
 * Get all locale variants for a demo namespace.
 * Replaces the old per-demo `{ en, es, ca }` export objects.
 */
export function getDemoTranslations<T = Record<string, any>>(namespace: string): Record<Locale, T> {
  return getAllLocalesForNamespace<T>(namespace);
}
