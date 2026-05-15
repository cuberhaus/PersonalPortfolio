import demosData from '../data/demos.json' with { type: 'json' };
import { flattenForLocale } from './load';
import type { Locale } from '../config/locales';
import { DemosFileSchema } from './demo-schema';

export type DemoLang = Locale;

export interface Demo {
  slug: string;
  title: string;
  description: string;
  tags: string[];
  icon: string;
  /** Brand accent for the demo page header, sourced from demos.json identity. */
  accent?: { from: string; to: string };
  github?: string | string[];
  image: string;
  lead: string;
  badge: string;
  metaDescription: string;
  metaTitle?: string;
  aboutTitle?: string;
  aboutDescription?: string;
  hints?: string[];
}

// Validate demos.json against the canonical schema at module-load time. A
// malformed entry is a build-time error rather than a silent runtime drift.
const validatedDemos = DemosFileSchema.parse(demosData);

const cache = new Map<DemoLang, Demo[]>();

/** Flat, legacy-shape demo array for a given locale (cached). */
export function listDemos(lang: string): Demo[] {
  const locale = (['en', 'es', 'ca'] as const).includes(lang as DemoLang)
    ? (lang as DemoLang)
    : 'en';
  const cached = cache.get(locale);
  if (cached) return cached;
  const flat = flattenForLocale<Demo>(
    validatedDemos as unknown as Parameters<typeof flattenForLocale>[0],
    locale
  );
  cache.set(locale, flat);
  return flat;
}

/** Look up a demo entry by slug for a given locale, falling back to English. */
export function getDemo(slug: string, lang: string): Demo {
  const entry =
    listDemos(lang).find((d) => d.slug === slug) ?? listDemos('en').find((d) => d.slug === slug);
  if (!entry) {
    throw new Error(`getDemo: unknown slug "${slug}"`);
  }
  return entry;
}
