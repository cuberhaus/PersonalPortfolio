/**
 * Single source of truth for the supported locales.
 *
 * Consumed by:
 *   - astro.config.mjs (locales array)
 *   - src/i18n/utils.ts (lang detection)
 *   - src/pages/[lang]/index.astro and src/pages/[lang]/demos/[demo].astro (getStaticPaths)
 *   - src/layouts/Layout.astro (hreflang alternates)
 *   - src/components/About.astro (CV PDF per locale)
 *   - tests
 *
 * To add or remove a locale, edit this file. The cv-by-lang map and the deploy
 * workflow's `curl` lines still need a per-locale filename adjustment because
 * the upstream CV repo names them by full English language name.
 */
export const LOCALES = ['en', 'es', 'ca'] as const;

export type Locale = typeof LOCALES[number];

// Derived from `LOCALES[0]` so its TS type narrows to the actual literal
// (`'en'`) rather than widening to `Locale`. Downstream helpers can rely on
// `Exclude<Locale, typeof DEFAULT_LOCALE>` to mean "non-default locales".
export const DEFAULT_LOCALE = LOCALES[0];

/** Locales that get a `/<lang>/...` URL prefix (i.e. all non-default locales). */
export const PREFIXED_LOCALES: readonly Locale[] = LOCALES.filter(
  (l): l is Exclude<Locale, typeof DEFAULT_LOCALE> => l !== DEFAULT_LOCALE,
);
