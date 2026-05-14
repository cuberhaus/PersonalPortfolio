/**
 * Content parity: do the nested-locale content JSON files have the same shape
 * across languages?
 *
 * After the SSOT refactor every entity lives in ONE file with the
 * `[{identity, copy:{en,es,ca}}]` shape. These tests verify:
 *   - every entry has all three copy locales populated,
 *   - the keys present in each locale's copy block match (no fields silently
 *     missing from one locale),
 *   - identity-typed fields (links, icons, slugs) look valid,
 *   - flattening for each locale yields the legacy shape with the right
 *     fields populated.
 */
import { describe, it, expect } from 'vitest';

import skills from '../data/skills.json';
import experience from '../data/experience.json';
import education from '../data/education.json';
import workProjects from '../data/work_projects.json';
import certifications from '../data/certifications.json';
import demos from '../data/demos.json';

import { ISSUER_ICON_PATHS } from '../lib/issuer-icons';
import { LOCALES } from '../config/locales';
import { flattenForLocale } from '../i18n/load';

type LocalizedEntry = {
  identity: Record<string, unknown>;
  copy: Record<string, Record<string, unknown>>;
};

function assertLocaleParity(label: string, entries: LocalizedEntry[]) {
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const present = Object.keys(entry.copy);
    for (const locale of LOCALES) {
      expect(present, `${label}[${i}] missing copy.${locale}`).toContain(locale);
    }
    // All copy locales should expose the same keys.
    const refKeys = Object.keys(entry.copy[LOCALES[0]]).sort();
    for (const locale of LOCALES) {
      const localeKeys = Object.keys(entry.copy[locale]).sort();
      expect(
        localeKeys,
        `${label}[${i}] copy.${locale} keys differ from copy.${LOCALES[0]}`,
      ).toEqual(refKeys);
    }
  }
}

function assertNonEmptyEntries(label: string, entries: LocalizedEntry[]) {
  expect(entries.length, `${label} is empty`).toBeGreaterThan(0);
  for (let i = 0; i < entries.length; i++) {
    expect(entries[i].identity, `${label}[${i}] missing identity`).toBeDefined();
    expect(entries[i].copy, `${label}[${i}] missing copy`).toBeDefined();
  }
}

// ─── Skills ─────────────────────────────────────────────────────

describe('Skills data', () => {
  const data = skills as LocalizedEntry[];

  it('has at least one category', () => {
    expect(data.length).toBeGreaterThan(0);
  });

  it('exposes the same keys in every locale', () => {
    assertNonEmptyEntries('skills', data);
    assertLocaleParity('skills', data);
  });

  it('every category has a non-empty category name in every locale and at least one item', () => {
    for (const locale of LOCALES) {
      const flat = flattenForLocale(data, locale) as Array<{ category: string; items: string[] }>;
      for (const group of flat) {
        expect(group.category.trim().length).toBeGreaterThan(0);
        expect(group.items.length).toBeGreaterThanOrEqual(1);
      }
    }
  });
});

// ─── Experience ─────────────────────────────────────────────────

describe('Experience data', () => {
  const data = experience as LocalizedEntry[];

  it('locales match', () => {
    assertNonEmptyEntries('experience', data);
    assertLocaleParity('experience', data);
  });

  it('every entry has role, period and at least one bullet per locale', () => {
    for (const locale of LOCALES) {
      const flat = flattenForLocale(data, locale) as Array<{
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
      const link = entry.identity.link as string | undefined;
      if (link) {
        expect(() => new URL(link)).not.toThrow();
        expect(link).toMatch(/^https:\/\//);
      }
    }
  });
});

// ─── Education ──────────────────────────────────────────────────

describe('Education data', () => {
  const data = education as LocalizedEntry[];

  it('locales match', () => {
    assertNonEmptyEntries('education', data);
    assertLocaleParity('education', data);
  });

  it('every entry has degree, institution, period per locale', () => {
    for (const locale of LOCALES) {
      const flat = flattenForLocale(data, locale) as Array<{
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
      const link = entry.identity.link as string;
      expect(() => new URL(link)).not.toThrow();
      expect(link).toMatch(/^https:\/\//);
    }
  });
});

// ─── Work Projects ──────────────────────────────────────────────

describe('Work projects data', () => {
  const data = workProjects as LocalizedEntry[];

  it('locales match', () => {
    assertNonEmptyEntries('work_projects', data);
    assertLocaleParity('work_projects', data);
  });

  it('every project has title, company, description and tags per locale', () => {
    for (const locale of LOCALES) {
      const flat = flattenForLocale(data, locale) as Array<{
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
      const link = entry.identity.link as string | undefined;
      if (link) {
        expect(() => new URL(link)).not.toThrow();
        expect(link).toMatch(/^https:\/\//);
      }
    }
  });
});

// ─── Certifications ─────────────────────────────────────────────

describe('Certifications data', () => {
  const data = certifications as LocalizedEntry[];

  it('locales match', () => {
    assertNonEmptyEntries('certifications', data);
    assertLocaleParity('certifications', data);
  });

  it('every entry has name + issuer + issuerIcon in identity', () => {
    for (const entry of data) {
      const id = entry.identity as { name?: string; issuer?: string; issuerIcon?: string };
      expect((id.name ?? '').trim().length).toBeGreaterThan(0);
      expect((id.issuer ?? '').trim().length).toBeGreaterThan(0);
      expect((id.issuerIcon ?? '').trim().length).toBeGreaterThan(0);
    }
  });

  it('every non-empty link is a valid HTTPS URL', () => {
    for (const entry of data) {
      const link = (entry.identity.link as string | undefined) ?? '';
      if (link) {
        expect(() => new URL(link)).not.toThrow();
        expect(link).toMatch(/^https:\/\//);
      }
    }
  });

  it('credential URLs do not carry LinkedIn tracking params', () => {
    for (const entry of data) {
      const link = (entry.identity.link as string | undefined) ?? '';
      if (link) {
        expect(link).not.toMatch(/[?&]trk=/);
      }
    }
  });

  it('every issuerIcon slug exists in issuer-icons.ts', () => {
    const registered = new Set(Object.keys(ISSUER_ICON_PATHS));
    for (const entry of data) {
      const slug = entry.identity.issuerIcon as string;
      expect(registered, `issuer-icons.ts missing slug "${slug}"`).toContain(slug);
    }
  });
});

// ─── Demos ──────────────────────────────────────────────────────

describe('Demos data', () => {
  const data = demos as LocalizedEntry[];

  it('locales match', () => {
    assertNonEmptyEntries('demos', data);
    assertLocaleParity('demos', data);
  });

  it('every demo has a unique slug in identity', () => {
    const slugs = data.map(e => e.identity.slug as string);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) {
      expect(slug.trim().length).toBeGreaterThan(0);
    }
  });

  it('every demo has a non-empty icon in identity', () => {
    for (const entry of data) {
      expect((entry.identity.icon as string).trim().length).toBeGreaterThan(0);
    }
  });

  it('every demo flattens to at least one tag in every locale', () => {
    for (const locale of LOCALES) {
      const flat = flattenForLocale(data, locale) as Array<{ slug: string; tags: string[] }>;
      for (const d of flat) {
        expect(Array.isArray(d.tags), `${locale}.${d.slug} has no tags array`).toBe(true);
        expect(d.tags.length, `${locale}.${d.slug} has zero tags`).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('every demo flattens to legacy shape with title/description in every locale', () => {
    for (const locale of LOCALES) {
      const flat = flattenForLocale(data, locale) as Array<{
        slug: string;
        title: string;
        description: string;
      }>;
      for (const d of flat) {
        expect(d.title.trim().length, `${locale}.${d.slug} has empty title`).toBeGreaterThan(0);
        expect(d.description.trim().length, `${locale}.${d.slug} has empty description`).toBeGreaterThan(0);
      }
    }
  });
});
