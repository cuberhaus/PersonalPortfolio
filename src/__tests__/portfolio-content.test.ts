import { describe, it, expect } from 'vitest';

import experience from '../data/experience.json';
import { skills, workProjects, education, certifications } from '../data/loaders';

import { flattenForLocale, type AnyLocalized as LocalizedEntry } from '../i18n/load';
import { LOCALES } from '../config/locales';

/**
 * After the nested-locale refactor, content lives in ONE file per entity with
 * the `{identity, copy:{en,es,ca}}` shape. Per-entry shape (icon enum,
 * https URLs, tag minimums, default-locale presence) is enforced by Zod via
 * src/i18n/content-schemas.ts — see content-schemas.test.ts for negative
 * cases. The tests below cover cross-cutting properties Zod can't express
 * on a single entry (uniqueness, content quality, parity).
 */

// ─── Skills content quality ───────────────────────────────────

describe('skills content quality', () => {
  it('has no duplicate skill labels within a category, in every locale', () => {
    // Non-emptiness of items is covered by the schema; this asserts the
    // cross-cutting "unique within group" property the schema can't express.
    for (const locale of LOCALES) {
      const flat = flattenForLocale(skills as LocalizedEntry[], locale) as Array<{
        category: string;
        items: string[];
      }>;
      for (const group of flat) {
        const trimmed = group.items.map((item) => item.trim());
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
    for (const locale of LOCALES) {
      const flat = flattenForLocale(experience as LocalizedEntry[], locale) as Array<{
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
    const links = (education as LocalizedEntry[]).map((e) => e.identity.link as string);
    expect(new Set(links).size, 'education has duplicate links').toBe(links.length);
  });
});

// ─── Work projects content quality ────────────────────────────

describe('work projects content quality', () => {
  it('has unique tags within each project, in every locale', () => {
    // Tag non-emptiness, role presence, https-shape, and icon-enum membership
    // are all enforced by the schema; this test covers the cross-cutting
    // "unique within entry" property.
    const data = workProjects as LocalizedEntry[];
    for (const locale of LOCALES) {
      const flat = flattenForLocale(data, locale) as Array<{
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
    const data = workProjects as LocalizedEntry[];
    const links = data
      .map((e) => e.identity.link as string | undefined)
      .filter((l): l is string => Boolean(l) && l !== '');
    expect(new Set(links).size, 'work projects have duplicate links').toBe(links.length);
  });
});

// ─── Certifications content quality ───────────────────────────

describe('certifications content quality', () => {
  it('has unique cert names across entries', () => {
    // Schema enforces non-empty name, issuer, issuerIcon enum, and issued
    // string presence per locale. This test covers the cross-cutting
    // uniqueness check the schema can't express.
    const names = (certifications as LocalizedEntry[]).map((e) => e.identity.name as string);
    expect(new Set(names).size, 'certifications have duplicate names').toBe(names.length);
  });
});
