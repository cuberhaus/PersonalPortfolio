/**
 * Content parity: do the locale translation files for each data category
 * have the same shape across all languages?
 *
 * After the i18next migration, identity fields live in src/data/<file>.json
 * (shared across locales) and translations live in locales/{locale}/<file>.json.
 * These tests verify:
 *   - every locale file has the same entry indices,
 *   - the keys present in each entry match across locales,
 *   - flattening for each locale yields the expected fields populated.
 */
import { describe, it, expect } from 'vitest';

import skills from '../data/skills.json';
import experience from '../data/experience.json';
import education from '../data/education.json';
import workProjects from '../data/work_projects.json';
import certifications from '../data/certifications.json';
import demos from '../data/demos.json';

// Locale translation files
import skillsEn from '../../locales/en/skills.json';
import skillsEs from '../../locales/es/skills.json';
import skillsCa from '../../locales/ca/skills.json';
import experienceEn from '../../locales/en/experience.json';
import experienceEs from '../../locales/es/experience.json';
import experienceCa from '../../locales/ca/experience.json';
import educationEn from '../../locales/en/education.json';
import educationEs from '../../locales/es/education.json';
import educationCa from '../../locales/ca/education.json';
import workProjectsEn from '../../locales/en/work_projects.json';
import workProjectsEs from '../../locales/es/work_projects.json';
import workProjectsCa from '../../locales/ca/work_projects.json';
import certificationsEn from '../../locales/en/certifications.json';
import certificationsEs from '../../locales/es/certifications.json';
import certificationsCa from '../../locales/ca/certifications.json';
import demosEn from '../../locales/en/demos.json';
import demosEs from '../../locales/es/demos.json';
import demosCa from '../../locales/ca/demos.json';

import { ISSUER_ICON_PATHS } from '../lib/issuer-icons';
import { LOCALES } from '../config/locales';
import { flattenForLocale } from '../i18n/load';

type TranslationMap = Record<string, Record<string, unknown>>;

function assertLocaleParity(
  label: string,
  identityData: Record<string, unknown>[],
  translations: Record<string, TranslationMap>
) {
  const locales = Object.keys(translations);
  const refLocale = locales[0];
  const refKeys = Object.keys(translations[refLocale]);

  // All locales should have the same indices
  for (const locale of locales) {
    const keys = Object.keys(translations[locale]);
    expect(keys, `${label} locale ${locale} has different indices than ${refLocale}`).toEqual(
      refKeys
    );
  }

  // Entry count should match the identity data array
  expect(refKeys.length, `${label} translation count doesn't match data array`).toBe(
    identityData.length
  );

  // All locales should expose the same keys at each index
  for (const idx of refKeys) {
    const refEntryKeys = Object.keys(translations[refLocale][idx]).sort();
    for (const locale of locales) {
      const entryKeys = Object.keys(translations[locale][idx]).sort();
      expect(entryKeys, `${label}[${idx}] locale ${locale} keys differ from ${refLocale}`).toEqual(
        refEntryKeys
      );
    }
  }
}

// ─── Skills ─────────────────────────────────────────────────────

describe('Skills data', () => {
  const data = skills as Record<string, unknown>[];
  const translations = { en: skillsEn, es: skillsEs, ca: skillsCa };

  it('has at least one category', () => {
    expect(data.length).toBeGreaterThan(0);
  });

  it('exposes the same keys in every locale', () => {
    assertLocaleParity('skills', data, translations);
  });

  it('every category has a non-empty category name in every locale and at least one item', () => {
    for (const locale of LOCALES) {
      const flat = flattenForLocale(data, locale, translations[locale]) as Array<{
        category: string;
        items: string[];
      }>;
      for (const group of flat) {
        expect(group.category.trim().length).toBeGreaterThan(0);
        expect(group.items.length).toBeGreaterThanOrEqual(1);
      }
    }
  });
});

// ─── Experience ─────────────────────────────────────────────────

describe('Experience data', () => {
  const data = experience as Record<string, unknown>[];
  const translations = { en: experienceEn, es: experienceEs, ca: experienceCa };

  it('locales match', () => {
    assertLocaleParity('experience', data, translations);
  });

  it('every entry has role, period and at least one bullet per locale', () => {
    for (const locale of LOCALES) {
      const flat = flattenForLocale(data, locale, translations[locale]) as Array<{
        role: string;
        company: string;
        period: string;
        bullets: string[];
        link?: string;
      }>;
      for (const entry of flat) {
        expect(entry.role.trim().length).toBeGreaterThan(0);
        expect(entry.company.trim().length).toBeGreaterThan(0);
        expect(entry.period.trim().length).toBeGreaterThan(0);
        expect(entry.bullets.length).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('every link in identity is a valid HTTPS URL', () => {
    for (const entry of data) {
      const link = entry.link as string | undefined;
      if (link) {
        expect(() => new URL(link)).not.toThrow();
        expect(link).toMatch(/^https:\/\//);
      }
    }
  });
});

// ─── Education ──────────────────────────────────────────────────

describe('Education data', () => {
  const data = education as Record<string, unknown>[];
  const translations = { en: educationEn, es: educationEs, ca: educationCa };

  it('locales match', () => {
    assertLocaleParity('education', data, translations);
  });

  it('every entry has degree, institution, period per locale', () => {
    for (const locale of LOCALES) {
      const flat = flattenForLocale(data, locale, translations[locale]) as Array<{
        degree: string;
        institution: string;
        period: string;
        link: string;
      }>;
      for (const entry of flat) {
        expect(entry.degree.trim().length).toBeGreaterThan(0);
        expect(entry.institution.trim().length).toBeGreaterThan(0);
        expect(entry.period.trim().length).toBeGreaterThan(0);
        expect(entry.link.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('every link is a valid HTTPS URL', () => {
    for (const entry of data) {
      const link = entry.link as string;
      if (link) {
        expect(() => new URL(link)).not.toThrow();
        expect(link).toMatch(/^https:\/\//);
      }
    }
  });
});

// ─── Work Projects ──────────────────────────────────────────────

describe('Work projects data', () => {
  const data = workProjects as Record<string, unknown>[];
  const translations = { en: workProjectsEn, es: workProjectsEs, ca: workProjectsCa };

  it('locales match', () => {
    assertLocaleParity('work_projects', data, translations);
  });

  it('every project has title, company, description and tags per locale', () => {
    for (const locale of LOCALES) {
      const flat = flattenForLocale(data, locale, translations[locale]) as Array<{
        title: string;
        company: string;
        description: string;
        tags: string[];
        icon: string;
      }>;
      for (const project of flat) {
        expect(project.title.trim().length).toBeGreaterThan(0);
        expect(project.company.trim().length).toBeGreaterThan(0);
        expect(project.description.trim().length).toBeGreaterThan(0);
        expect(project.tags.length).toBeGreaterThanOrEqual(1);
        expect(project.icon.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('every link in identity is a valid HTTPS URL', () => {
    for (const entry of data) {
      const link = entry.link as string | undefined;
      if (link) {
        expect(() => new URL(link)).not.toThrow();
        expect(link).toMatch(/^https:\/\//);
      }
    }
  });
});

// ─── Certifications ─────────────────────────────────────────────

describe('Certifications data', () => {
  const data = certifications as Record<string, unknown>[];
  const translations = { en: certificationsEn, es: certificationsEs, ca: certificationsCa };

  it('locales match', () => {
    assertLocaleParity('certifications', data, translations);
  });

  it('every entry has name + issuer + issuerIcon in identity', () => {
    for (const entry of data) {
      const id = entry as { name?: string; issuer?: string; issuerIcon?: string };
      expect((id.name ?? '').trim().length).toBeGreaterThan(0);
      expect((id.issuer ?? '').trim().length).toBeGreaterThan(0);
      expect((id.issuerIcon ?? '').trim().length).toBeGreaterThan(0);
    }
  });

  it('every non-empty link is a valid HTTPS URL', () => {
    for (const entry of data) {
      const link = (entry.link as string | undefined) ?? '';
      if (link) {
        expect(() => new URL(link)).not.toThrow();
        expect(link).toMatch(/^https:\/\//);
      }
    }
  });

  it('credential URLs do not carry LinkedIn tracking params', () => {
    for (const entry of data) {
      const link = (entry.link as string | undefined) ?? '';
      if (link) {
        expect(link).not.toMatch(/[?&]trk=/);
      }
    }
  });

  it('every issuerIcon slug exists in issuer-icons.ts', () => {
    const registered = new Set(Object.keys(ISSUER_ICON_PATHS));
    for (const entry of data) {
      const slug = entry.issuerIcon as string;
      expect(registered, `issuer-icons.ts missing slug "${slug}"`).toContain(slug);
    }
  });
});

// ─── Demos ──────────────────────────────────────────────────────

describe('Demos data', () => {
  const data = demos as Record<string, unknown>[];
  const translations = { en: demosEn, es: demosEs, ca: demosCa };

  it('locales match', () => {
    assertLocaleParity('demos', data, translations);
  });

  it('every demo has a unique slug in identity', () => {
    const slugs = data.map((e) => e.slug as string);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) {
      expect(slug.trim().length).toBeGreaterThan(0);
    }
  });

  it('every demo has a non-empty icon in identity', () => {
    for (const entry of data) {
      expect((entry.icon as string).trim().length).toBeGreaterThan(0);
    }
  });

  it('every demo flattens to at least one tag in every locale', () => {
    for (const locale of LOCALES) {
      const flat = flattenForLocale(data, locale, translations[locale]) as Array<{
        slug: string;
        tags: string[];
      }>;
      for (const d of flat) {
        expect(Array.isArray(d.tags), `${locale}.${d.slug} has no tags array`).toBe(true);
        expect(d.tags.length, `${locale}.${d.slug} has zero tags`).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('every demo flattens to legacy shape with title/description in every locale', () => {
    for (const locale of LOCALES) {
      const flat = flattenForLocale(data, locale, translations[locale]) as Array<{
        slug: string;
        title: string;
        description: string;
      }>;
      for (const d of flat) {
        expect(d.title.trim().length, `${locale}.${d.slug} has empty title`).toBeGreaterThan(0);
        expect(
          d.description.trim().length,
          `${locale}.${d.slug} has empty description`
        ).toBeGreaterThan(0);
      }
    }
  });
});
