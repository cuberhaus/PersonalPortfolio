import demosEn from '../data/demos.json';
import demosEs from '../data/demos.es.json';
import demosCa from '../data/demos.ca.json';

export type DemoLang = 'en' | 'es' | 'ca';

export interface Demo {
  slug: string;
  title: string;
  description: string;
  tags: string[];
  icon: string;
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

const sources: Record<DemoLang, Demo[]> = {
  en: demosEn as Demo[],
  es: demosEs as Demo[],
  ca: demosCa as Demo[],
};

/** Look up a demo entry by slug for a given locale, falling back to English. */
export function getDemo(slug: string, lang: string): Demo {
  const locale = (lang in sources ? lang : 'en') as DemoLang;
  const entry = sources[locale].find((d) => d.slug === slug)
    ?? sources.en.find((d) => d.slug === slug);
  if (!entry) {
    throw new Error(`getDemo: unknown slug "${slug}"`);
  }
  return entry;
}
