import demosData from '../data/demos.json' with { type: 'json' };
import { visibleEntries } from '../data/visibility';
import { flattenForLocale } from './load';
import { LOCALES, DEFAULT_LOCALE, type Locale } from '../config/locales';
import { getDataTranslations } from './locale-glob';

export type DemoLang = Locale;

export interface Demo {
  slug: string;
  category: string;
  hidden?: boolean;
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
const visibleCache = new Map<DemoLang, Demo[]>();

type ListDemosOptions = {
  includeHidden?: boolean;
};

function normalizeLocale(lang: string): DemoLang {
  return (LOCALES as readonly string[]).includes(lang) ? (lang as DemoLang) : DEFAULT_LOCALE;
}

/** Flat, legacy-shape demo array for a given locale (cached), including hidden demos. */
function listAllDemos(lang: string): Demo[] {
  const locale = normalizeLocale(lang);
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

/** Flat, legacy-shape demo array for a given locale (cached). */
export function listDemos(lang: string, options: ListDemosOptions = {}): Demo[] {
  const locale = normalizeLocale(lang);
  if (options.includeHidden) return listAllDemos(locale);

  const cached = visibleCache.get(locale);
  if (cached) return cached;

  const visible = visibleEntries(listAllDemos(locale));
  visibleCache.set(locale, visible);
  return visible;
}

/** Look up a demo entry by slug for a given locale, falling back to English. */
export function getDemo(slug: string, lang: string): Demo {
  const entry =
    listDemos(lang, { includeHidden: true }).find((d) => d.slug === slug) ??
    listDemos(DEFAULT_LOCALE, { includeHidden: true }).find((d) => d.slug === slug);
  if (!entry) {
    throw new Error(`getDemo: unknown slug "${slug}"`);
  }
  return entry;
}
