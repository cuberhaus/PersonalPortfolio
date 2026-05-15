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
import { listDemos } from '../i18n/demo';
import { LOCALES } from '../config/locales';
import { ui, languages } from '../i18n/ui';

const DEMO_PAGES_DIR = join(__dirname, '..', 'pages', 'demos');
const demoPageFiles = readdirSync(DEMO_PAGES_DIR)
  .filter((f) => f.endsWith('.astro'))
  .map((f) => f.replace('.astro', ''));

const demosEn = listDemos('en');

// ─── Demo data consistency ──────────────────────────────────────
//
// Per-entry shape (slug regex, icon enum, tags non-empty, github URLs,
// default-locale presence) is enforced by the Zod schema in
// src/i18n/demo-schema.ts at module load — see demo-schema.test.ts for
// the negative cases. The checks below are cross-cutting properties Zod
// can't express on a single entry.

describe('Demo data files', () => {
  it('flattens to the same number of demos in every locale', () => {
    for (const locale of LOCALES) {
      expect(listDemos(locale).length).toBe(demosEn.length);
    }
  });

  it('every demo has a unique slug', () => {
    const slugs = demosEn.map((d) => d.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
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
    const slugs = demosEn.map((d) => d.slug);
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
