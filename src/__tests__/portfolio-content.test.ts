import { describe, it, expect } from 'vitest';

import experience from '../data/experience.json';
import { skills, workProjects, education, certifications, getTranslations } from '../data/loaders';

import { flattenForLocale } from '../i18n/load';
import { visibleSkillItems, type SkillItem } from '../data/visibility';
import { LOCALES, type Locale } from '../config/locales';

// Locale translation files for experience (not exported from loaders for direct use)
import experienceEn from '../../locales/en/experience.json';
import experienceEs from '../../locales/es/experience.json';
import experienceCa from '../../locales/ca/experience.json';

const experienceTranslations: Record<Locale, Record<string, Record<string, unknown>>> = {
  en: experienceEn,
  es: experienceEs,
  ca: experienceCa,
};

/**
 * After the i18next migration, identity fields live in src/data/<file>.json
 * and translations live in locales/{locale}/<file>.json. Per-entry shape
 * (icon enum, https URLs, tag minimums) is enforced by Zod via
 * src/i18n/content-schemas.ts. The tests below cover cross-cutting properties
 * Zod can't express on a single entry (uniqueness, content quality, parity).
 */

// ─── Skills content quality ───────────────────────────────────

describe('skills content quality', () => {
  it('has no duplicate skill labels within a category, in every locale', () => {
    for (const locale of LOCALES) {
      const flat = flattenForLocale(skills, locale, getTranslations('skills', locale)) as Array<{
        category: string;
        items: SkillItem[];
      }>;
      for (const group of flat) {
        const trimmed = visibleSkillItems(group.items).map((item) => item.trim());
        expect(new Set(trimmed).size, `${locale}.${group.category} has duplicate skills`).toBe(
          trimmed.length
        );
      }
    }
  });
});

// ─── Experience content quality ───────────────────────────────

describe('experience content quality', () => {
  it('has no empty bullet text, in every locale', () => {
    const data = experience as Record<string, unknown>[];
    for (const locale of LOCALES) {
      const flat = flattenForLocale(data, locale, experienceTranslations[locale]) as Array<{
        company: string;
        bullets: string[];
      }>;
      for (const entry of flat) {
        for (const bullet of entry.bullets) {
          expect(
            bullet.trim().length,
            `${locale}.${entry.company} has an empty bullet`
          ).toBeGreaterThan(0);
        }
      }
    }
  });
});

// ─── Education content quality ────────────────────────────────

describe('education content quality', () => {
  it('has unique links across entries', () => {
    const links = education.map((e) => e.link as string);
    expect(new Set(links).size, 'education has duplicate links').toBe(links.length);
  });
});

// ─── Work projects content quality ────────────────────────────

describe('work projects content quality', () => {
  it('has unique tags within each project, in every locale', () => {
    for (const locale of LOCALES) {
      const flat = flattenForLocale(
        workProjects,
        locale,
        getTranslations('workProjects', locale)
      ) as Array<{
        title: string;
        tags: string[];
      }>;
      for (const project of flat) {
        const trimmed = project.tags.map((t) => t.trim());
        expect(new Set(trimmed).size, `${locale}.${project.title} has duplicate tags`).toBe(
          trimmed.length
        );
      }
    }
  });

  it('has unique link URLs across projects', () => {
    const links = workProjects
      .map((e) => e.link as string | undefined)
      .filter((l): l is string => Boolean(l) && l !== '');
    expect(new Set(links).size, 'work projects have duplicate links').toBe(links.length);
  });
});

// ─── Certifications content quality ───────────────────────────

describe('certifications content quality', () => {
  it('has unique cert names across entries', () => {
    const names = certifications.map((e) => e.name as string);
    expect(new Set(names).size, 'certifications have duplicate names').toBe(names.length);
  });
});
