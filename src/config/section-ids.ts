/**
 * Lightweight, side-effect-free section metadata list.
 *
 * Importable from any context — including plain Node and Playwright specs —
 * without pulling in Astro components. The full `sections` array (which
 * additionally carries the component reference for the homepage) lives in
 * `./sections.ts` and re-exports the same id/navKey/flags from here.
 *
 * SSOT for: homepage section order, navbar anchor order, scroll-spy targets.
 *
 * Flags per entry:
 *   - `numbered`: true if the section renders a `data-num="NN"` numeral
 *     (Swiss-style design uses these). Defaults to true.
 *   - `inNav`: true if the section appears as a primary anchor in the navbar.
 *     The hero is the only section currently marked `false`; its scroll
 *     target is the logo (`<a href="#hero">`) instead.
 */
export const SECTION_META = [
  { id: 'hero', navKey: 'nav.about', numbered: false, inNav: false },
  { id: 'about', navKey: 'nav.about', numbered: true, inNav: true },
  { id: 'experience', navKey: 'nav.experience', numbered: true, inNav: true },
  { id: 'work', navKey: 'nav.work', numbered: true, inNav: true },
  { id: 'projects', navKey: 'nav.projects', numbered: true, inNav: true },
  { id: 'education', navKey: 'nav.education', numbered: true, inNav: true },
  { id: 'certifications', navKey: 'nav.certifications', numbered: true, inNav: true },
  { id: 'skills', navKey: 'nav.skills', numbered: true, inNav: true },
  { id: 'contact', navKey: 'nav.contact', numbered: true, inNav: true },
] as const;

export type SectionId = (typeof SECTION_META)[number]['id'];

/** All section IDs in homepage order, including the hero. */
export const SECTION_IDS_WITH_HERO: readonly SectionId[] = SECTION_META.map((s) => s.id);

/** Section IDs in navbar/homepage order, excluding the hero. */
export const SECTION_IDS: readonly SectionId[] = SECTION_META.filter((s) => s.id !== 'hero').map(
  (s) => s.id
);
