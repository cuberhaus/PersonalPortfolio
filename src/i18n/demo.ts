import demosData from '../data/demos.json' with { type: 'json' };
import { flattenForLocale } from './load';
import { LOCALES, DEFAULT_LOCALE, type Locale } from '../config/locales';
import { getDataTranslations } from './locale-glob';

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

const cache = new Map<DemoLang, Demo[]>();

/** Flat, legacy-shape demo array for a given locale (cached). */
export function listDemos(lang: string): Demo[] {
  const locale = (LOCALES as readonly string[]).includes(lang)
    ? (lang as DemoLang)
    : DEFAULT_LOCALE;
  const cached = cache.get(locale);
  if (cached) return cached;
  const flat = flattenForLocale<Demo>(
    demosData as Record<string, unknown>[],
    locale,
    getDataTranslations('demos', locale)
  );
  cache.set(locale, flat);
  return flat;
}

/** Look up a demo entry by slug for a given locale, falling back to English. */
export function getDemo(slug: string, lang: string): Demo {
  const entry =
    listDemos(lang).find((d) => d.slug === slug) ??
    listDemos(DEFAULT_LOCALE).find((d) => d.slug === slug);
  if (!entry) {
    throw new Error(`getDemo: unknown slug "${slug}"`);
  }
  return entry;
}
