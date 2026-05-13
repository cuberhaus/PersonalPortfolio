/**
 * Lightweight, side-effect-free section ID list.
 *
 * Importable from any context — including plain Node and Playwright specs —
 * without pulling in Astro components. The full `sections` array (which
 * additionally carries the component reference for the homepage) lives in
 * `./sections.ts` and re-exports the same id/navKey pairs from here.
 *
 * SSOT for: homepage section order, navbar anchor order, scroll-spy targets.
 */
export const SECTION_META = [
  { id: 'about',          navKey: 'nav.about' },
  { id: 'experience',     navKey: 'nav.experience' },
  { id: 'work',           navKey: 'nav.work' },
  { id: 'projects',       navKey: 'nav.projects' },
  { id: 'education',      navKey: 'nav.education' },
  { id: 'certifications', navKey: 'nav.certifications' },
  { id: 'skills',         navKey: 'nav.skills' },
  { id: 'contact',        navKey: 'nav.contact' },
] as const;

export type SectionId = typeof SECTION_META[number]['id'];

export const SECTION_IDS: readonly SectionId[] = SECTION_META.map(s => s.id);

export const SECTION_IDS_WITH_HERO = ['hero', ...SECTION_IDS] as const;
