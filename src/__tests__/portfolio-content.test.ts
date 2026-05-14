import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

import skills from '../data/skills.json';
import experience from '../data/experience.json';
import education from '../data/education.json';
import workProjects from '../data/work_projects.json';
import certifications from '../data/certifications.json';

import { flattenForLocale } from '../i18n/load';
import { LOCALES } from '../config/locales';

type LocalizedEntry = {
  identity: Record<string, unknown>;
  copy: Record<string, Record<string, unknown>>;
};

/**
 * After the nested-locale refactor, content lives in ONE file per entity with
 * the `{identity, copy:{en,es,ca}}` shape. Identity-vs-copy parity is enforced
 * by the file structure itself — no more triple-locale parity tests. These
 * tests focus on per-locale content quality (no empty bullets, no duplicate
 * tags, valid HTTPS URLs, etc.).
 */

// ─── Skills content quality ───────────────────────────────────

describe('skills content quality', () => {
  it('has no empty or duplicate skill labels within a category, in every locale', () => {
    for (const locale of LOCALES) {
      const flat = flattenForLocale(skills as LocalizedEntry[], locale) as Array<{
        category: string;
        items: string[];
      }>;
      for (const group of flat) {
        const trimmed = group.items.map(item => item.trim());
        for (const item of trimmed) {
          expect(item.length, `${locale}.${group.category} has an empty skill`).toBeGreaterThan(0);
        }
        expect(
          new Set(trimmed).size,
          `${locale}.${group.category} has duplicate skills`,
        ).toBe(trimmed.length);
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
          expect(bullet.trim().length, `${locale}.${entry.company} has an empty bullet`).toBeGreaterThan(0);
        }
      }
    }
  });
});

// ─── Education content quality ────────────────────────────────

describe('education content quality', () => {
  it('has unique links across entries', () => {
    const links = (education as LocalizedEntry[]).map(e => e.identity.link as string);
    expect(new Set(links).size, 'education has duplicate links').toBe(links.length);
  });
});

// ─── Work projects content quality ────────────────────────────

describe('work projects content quality', () => {
  it('every project has a non-empty role and clean, unique tags in every locale', () => {
    const data = workProjects as LocalizedEntry[];
    for (const locale of LOCALES) {
      const flat = flattenForLocale(data, locale) as Array<{
        title: string;
        role: string;
        tags: string[];
      }>;
      for (const project of flat) {
        expect(project.role.trim().length, `${locale}.${project.title} has an empty role`).toBeGreaterThan(0);
        const trimmed = project.tags.map(t => t.trim());
        for (const tag of trimmed) {
          expect(tag.length, `${locale}.${project.title} has an empty tag`).toBeGreaterThan(0);
        }
        expect(
          new Set(trimmed).size,
          `${locale}.${project.title} has duplicate tags`,
        ).toBe(trimmed.length);
      }
    }
  });

  it('uses valid, unique HTTPS links when projects are linked', () => {
    const data = workProjects as LocalizedEntry[];
    const links = data.map(e => e.identity.link as string | undefined).filter((l): l is string => Boolean(l));
    for (const link of links) {
      expect(() => new URL(link), `invalid work project URL ${link}`).not.toThrow();
      expect(link, `work project URL is not HTTPS: ${link}`).toMatch(/^https:\/\//);
    }
    expect(new Set(links).size, 'work projects have duplicate links').toBe(links.length);
  });

  it('renders every icon used by work project data', () => {
    const source = readFileSync(join(__dirname, '..', 'components', 'WorkProjects.astro'), 'utf-8');
    const renderedIcons = new Set([...source.matchAll(/project\.icon === '([^']+)'/g)].map(match => match[1]));
    const dataIcons = new Set((workProjects as LocalizedEntry[]).map(e => e.identity.icon as string));
    for (const icon of dataIcons) {
      expect(renderedIcons, `WorkProjects.astro does not render icon "${icon}"`).toContain(icon);
    }
  });
});

// ─── Certifications content quality ───────────────────────────

describe('certifications content quality', () => {
  it('every entry has a name and issuer in identity, plus an issued string in every locale', () => {
    const data = certifications as LocalizedEntry[];
    for (const entry of data) {
      const name = entry.identity.name as string;
      const issuer = entry.identity.issuer as string;
      expect(name.trim().length, `cert "${name}" missing name`).toBeGreaterThan(0);
      expect(issuer.trim().length, `cert "${name}" missing issuer`).toBeGreaterThan(0);
      for (const locale of LOCALES) {
        const issued = entry.copy[locale]?.issued as string | undefined;
        expect(
          typeof issued,
          `cert "${name}" missing copy.${locale}.issued`,
        ).toBe('string');
      }
    }
  });
});
