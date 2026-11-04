import Hero from '../components/Hero.astro';
import About from '../components/About.astro';
import Experience from '../components/Experience.astro';
import WorkProjects from '../components/WorkProjects.astro';
import Demos from '../components/Demos.astro';
import Education from '../components/Education.astro';
import Certifications from '../components/Certifications.astro';
import Skills from '../components/Skills.astro';
import Contact from '../components/Contact.astro';
import { VISIBLE_SECTION_META } from './section-ids';

/**
 * Single source of truth for the homepage sections.
 *
 * Joins the lightweight id/navKey/flag list from `section-ids.ts` with the
 * actual Astro component for each section. Astro consumers (pages, navbar,
 * tests) import this; pure-JS consumers (e.g. Playwright) import
 * `section-ids.ts` instead so they don't pull `.astro` files into a Node
 * context.
 *
 * To add, remove or reorder a section:
 *   1. Edit `section-ids.ts` (the order list + flags).
 *   2. Add/remove the matching component import here.
 *   3. Numbered section components read their `data-num` from the `num` prop,
 *      so renumbering is automatic when entries are reordered or flagged.
 */
const COMPONENTS = {
  hero: Hero,
  about: About,
  experience: Experience,
  work: WorkProjects,
  projects: Demos,
  education: Education,
  certifications: Certifications,
  skills: Skills,
  contact: Contact,
} as const;

export const sections = VISIBLE_SECTION_META.map(({ id, navKey, numbered, inNav }) => ({
  id,
  navKey,
  numbered,
  inNav,
  component: COMPONENTS[id],
}));

export {
  SECTION_META,
  VISIBLE_SECTION_META,
  SECTION_IDS,
  SECTION_IDS_WITH_HERO,
} from './section-ids';
export type { SectionId } from './section-ids';
