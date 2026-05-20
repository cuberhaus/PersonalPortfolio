import demosData from '../data/demos.json' with { type: 'json' };
import { flattenForLocale } from './load';
import { LOCALES, type Locale } from '../config/locales';

// Locale translation files for demos
import demosEn from '../../locales/en/demos.json';
import demosEs from '../../locales/es/demos.json';
import demosCa from '../../locales/ca/demos.json';

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

const demosTranslations: Record<Locale, Record<string, Record<string, unknown>>> = {
  en: demosEn,
  es: demosEs,
  ca: demosCa,
};

const cache = new Map<DemoLang, Demo[]>();

/** Flat, legacy-shape demo array for a given locale (cached). */
export function listDemos(lang: string): Demo[] {
  const locale = (LOCALES as readonly string[]).includes(lang) ? (lang as DemoLang) : 'en';
  const cached = cache.get(locale);
  if (cached) return cached;
  const flat = flattenForLocale<Demo>(
    demosData as Record<string, unknown>[],
    locale,
    demosTranslations[locale]
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
