/**
 * Data integrity: is the demo/i18n data valid and does it match the pages?
 *
 * These tests validate the JSON data files that feed the site (demos, skills,
 * experience, education, work projects) — checking required fields, value
 * constraints, cross-language array lengths, and consistency between the data
 * and the actual Astro page files on disk.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync } from 'fs';
import { join } from 'path';
import demosData from '../data/demos.json';
import { listDemos } from '../i18n/demo';
import { LOCALES } from '../config/locales';
import { ui, languages } from '../i18n/ui';
import { ICON_PATHS } from '../lib/demo-icons';

const DEMO_PAGES_DIR = join(__dirname, '..', 'pages', 'demos');
const demoPageFiles = readdirSync(DEMO_PAGES_DIR)
  .filter(f => f.endsWith('.astro'))
  .map(f => f.replace('.astro', ''));

const VALID_ICONS = Object.keys(ICON_PATHS);

type LocalizedEntry = {
  identity: Record<string, unknown>;
  copy: Record<string, Record<string, unknown>>;
};

const demosCanonical = demosData as LocalizedEntry[];
const demosEn = listDemos('en');

// ─── Demo data consistency ──────────────────────────────────────

describe('Demo data files', () => {
  it('flattens to the same number of demos in every locale', () => {
    for (const locale of LOCALES) {
      expect(listDemos(locale).length).toBe(demosEn.length);
    }
  });

  it('every demo has a unique slug', () => {
    const slugs = demosEn.map(d => d.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('every demo has a non-empty title and description in every locale', () => {
    for (const locale of LOCALES) {
      for (const demo of listDemos(locale)) {
        expect(demo.title.trim().length, `${locale}: empty title for ${demo.slug}`).toBeGreaterThan(0);
        expect(demo.description.trim().length, `${locale}: empty description for ${demo.slug}`).toBeGreaterThan(0);
      }
    }
  });

  it('every demo has at least one tag', () => {
    for (const demo of demosEn) {
      expect(demo.tags.length, `no tags for ${demo.slug}`).toBeGreaterThanOrEqual(1);
    }
  });

  it('every demo uses a valid icon', () => {
    for (const demo of demosEn) {
      expect(VALID_ICONS, `unknown icon "${demo.icon}" for ${demo.slug}`).toContain(demo.icon);
    }
  });

  it('every demo has a github link (string or array)', () => {
    for (const demo of demosEn) {
      const gh = demo.github;
      if (Array.isArray(gh)) {
        expect(gh.length, `empty github array for ${demo.slug}`).toBeGreaterThan(0);
        for (const url of gh) {
          expect(url).toMatch(/^https:\/\/github\.com\//);
        }
      } else {
        expect(gh).toMatch(/^https:\/\/github\.com\//);
      }
    }
  });

  it('icon and slug live in identity (shared across locales by construction)', () => {
    for (const entry of demosCanonical) {
      expect(typeof entry.identity.slug, `entry missing identity.slug`).toBe('string');
      expect(typeof entry.identity.icon, `entry ${entry.identity.slug} missing identity.icon`).toBe('string');
    }
  });
});

// ─── Demo pages ↔ data sync ─────────────────────────────────────

describe('Demo pages match demo data', () => {
  it('number of .astro page files matches demos.json length', () => {
    expect(demoPageFiles.length).toBe(demosEn.length);
  });

  it('every slug in demos.json has a corresponding .astro page', () => {
    for (const demo of demosEn) {
      expect(demoPageFiles, `missing page for slug "${demo.slug}"`).toContain(demo.slug);
    }
  });

  it('every .astro page has a corresponding slug in demos.json', () => {
    const slugs = demosEn.map(d => d.slug);
    for (const page of demoPageFiles) {
      expect(slugs, `page "${page}.astro" has no matching slug in demos.json`).toContain(page);
    }
  });
});

// ─── Homepage SSOT consumption ──────────────────────────────────

describe('Homepage pages consume the sections SSOT', () => {
  const enHomePath = join(__dirname, '..', 'pages', 'index.astro');
  const langHomePath = join(__dirname, '..', 'pages', '[lang]', 'index.astro');
  const enHome = require('fs').readFileSync(enHomePath, 'utf-8') as string;
  const langHome = require('fs').readFileSync(langHomePath, 'utf-8') as string;

  // Both pages MUST import { sections } from config/sections so the order
  // is centralised in one place. Detailed structural assertions live in
  // structural.test.ts; this test is a smoke check at the integrity layer.
  it('default and localized homepages both import { sections } from the SSOT', () => {
    const pattern = /import\s*\{\s*sections\s*\}\s*from\s*['"](\.\.\/)+config\/sections['"]/;
    expect(enHome).toMatch(pattern);
    expect(langHome).toMatch(pattern);
  });
});

// ─── i18n completeness ──────────────────────────────────────────

describe('i18n translations', () => {
  const enKeys = Object.keys(ui.en) as (keyof typeof ui.en)[];

  it('all languages defined in "languages" have a ui entry', () => {
    for (const lang of Object.keys(languages)) {
      expect(ui).toHaveProperty(lang);
    }
  });

  it('ES has every key that EN has', () => {
    for (const key of enKeys) {
      expect(ui.es, `ES missing key "${key}"`).toHaveProperty(key);
    }
  });

  it('CA has every key that EN has', () => {
    for (const key of enKeys) {
      expect(ui.ca, `CA missing key "${key}"`).toHaveProperty(key);
    }
  });

  it('no translation value is an empty string', () => {
    for (const [lang, translations] of Object.entries(ui)) {
      for (const [key, value] of Object.entries(translations)) {
        expect(String(value).trim().length, `empty value for ${lang}.${key}`).toBeGreaterThan(0);
      }
    }
  });
});

// ─── Dynamic router sync ────────────────────────────────────────

describe('Dynamic demo router ([lang]/demos/[demo].astro)', () => {
  const routerPath = join(__dirname, '..', 'pages', '[lang]', 'demos', '[demo].astro');
  const routerContent = require('fs').readFileSync(routerPath, 'utf-8') as string;

  // The router globs every page in src/pages/demos/ at build time, so slug
  // coverage is enforced by the "every slug has a corresponding .astro page"
  // and "every .astro page has a corresponding slug" assertions above. Here
  // we just verify the router is using the SSOT-compatible glob pattern.

  it('uses import.meta.glob to discover demo pages', () => {
    expect(routerContent).toMatch(/import\.meta\.glob\(\s*['"]\.\.\/\.\.\/demos\/\*\.astro['"]/);
  });

  it('imports the locale list from the locales SSOT', () => {
    expect(routerContent).toMatch(/from\s+['"](\.\.\/){3}config\/locales['"]/);
  });
});
