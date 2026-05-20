/**
 * Single source of truth for the supported locales.
 *
 * Automatically consumed (no edits needed) by:
 *   - astro.config.mjs (locales array)
 *   - src/i18n/utils.ts (lang detection)
 *   - src/pages/[lang]/index.astro and src/pages/[lang]/demos/[demo].astro (getStaticPaths)
 *   - src/layouts/Layout.astro & DemoLayout.astro (hreflang alternates)
 *   - src/i18n/demo.ts (locale validation)
 *   - src/components/About.astro (CV PDF per locale)
 *   - tests (live-app-embed, content-parity, etc.)
 *
 * Adding a new locale (e.g. 'fr'):
 *   1. Add 'fr' to the LOCALES array below.
 *   2. Create all locales/fr/*.json files (copy from en/ and translate).
 *   3. Add static imports in these files (TypeScript can't dynamic-import):
 *      - src/i18n/ui.ts         → import frUi + languages.fr label
 *      - src/i18n/i18next.ts    → import frUi + resources.fr entry
 *      - src/data/loaders.ts    → import 5 fr translation JSONs + map entries
 *      - src/i18n/demo.ts       → import demosFr + demosTranslations.fr
 *      - src/i18n/demos/*.ts    → import fr + add to export object (each file)
 *   4. Add 'fr' to project.inlang/settings.json locales array.
 *   5. Add cv-by-lang entry + deploy workflow curl line (upstream CV filenames).
 *
 * The Record<Locale, ...> type annotations in the above files will produce
 * TypeScript compile errors until the new locale is added to each map,
 * providing compile-time SSOT enforcement.
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
