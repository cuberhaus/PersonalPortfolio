/**
 * Single source of truth for the supported locales.
 *
 * All locale-dependent code reads from this array via `src/i18n/locale-glob.ts`
 * (Vite import.meta.glob). No per-locale static imports exist anywhere — adding
 * a locale requires NO TypeScript file edits beyond this one.
 *
 * Adding a new locale (e.g. 'fr'):
 *   1. Add 'fr' to the LOCALES array below.
 *   2. Create all locales/fr/*.json files (copy from en/ and translate).
 *   3. Add 'fr: "Français"' to `languages` in src/i18n/ui.ts.
 *   4. Add 'fr' to project.inlang/settings.json locales array.
 *   5. (Optional) Add cv-by-lang entry + deploy workflow curl line.
 *
 * That's it. Everything else (i18next, loaders, demos) picks up the new
 * locale automatically via the glob loader.
 */
export const LOCALES = ['en', 'es', 'ca'] as const;

export type Locale = (typeof LOCALES)[number];

// Derived from `LOCALES[0]` so its TS type narrows to the actual literal
// (`'en'`) rather than widening to `Locale`. Downstream helpers can rely on
// `Exclude<Locale, typeof DEFAULT_LOCALE>` to mean "non-default locales".
export const DEFAULT_LOCALE = LOCALES[0];

/** Locales that get a `/<lang>/...` URL prefix (i.e. all non-default locales). */
export const PREFIXED_LOCALES: readonly Locale[] = LOCALES.filter(
  (l): l is Exclude<Locale, typeof DEFAULT_LOCALE> => l !== DEFAULT_LOCALE
);
