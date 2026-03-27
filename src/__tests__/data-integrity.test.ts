import { describe, it, expect } from 'vitest';
import { readdirSync } from 'fs';
import { join } from 'path';
import demosEn from '../data/demos.json';
import demosEs from '../data/demos.es.json';
import demosCa from '../data/demos.ca.json';
import { ui, languages } from '../i18n/ui';

const DEMO_PAGES_DIR = join(__dirname, '..', 'pages', 'demos');
const demoPageFiles = readdirSync(DEMO_PAGES_DIR)
  .filter(f => f.endsWith('.astro'))
  .map(f => f.replace('.astro', ''));

const VALID_ICONS = [
  'gamepad', 'tree', 'music', 'store', 'heart', 'camera',
  'graph', 'scatter', 'map', 'helicopter', 'aorta', 'ml',
  'microscope', 'server',
];

// ─── Demo data consistency ──────────────────────────────────────

describe('Demo data files', () => {
  it('EN, ES, and CA have the same number of demos', () => {
    expect(demosEn.length).toBe(demosEs.length);
    expect(demosEn.length).toBe(demosCa.length);
  });

  it('EN, ES, and CA have identical slugs in the same order', () => {
    const slugsEn = demosEn.map(d => d.slug);
    const slugsEs = demosEs.map(d => d.slug);
    const slugsCa = demosCa.map(d => d.slug);
    expect(slugsEn).toEqual(slugsEs);
    expect(slugsEn).toEqual(slugsCa);
  });

  it('every demo has a unique slug', () => {
    const slugs = demosEn.map(d => d.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('every demo has a non-empty title and description', () => {
    for (const demos of [demosEn, demosEs, demosCa]) {
      for (const demo of demos) {
        expect(demo.title.trim().length, `empty title for ${demo.slug}`).toBeGreaterThan(0);
        expect(demo.description.trim().length, `empty description for ${demo.slug}`).toBeGreaterThan(0);
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

  it('EN, ES, and CA have matching icons per slug', () => {
    for (let i = 0; i < demosEn.length; i++) {
      expect(demosEn[i].icon).toBe(demosEs[i].icon);
      expect(demosEn[i].icon).toBe(demosCa[i].icon);
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

  it('every demo slug appears in the getStaticPaths array', () => {
    for (const demo of demosEn) {
      expect(routerContent, `slug "${demo.slug}" missing from router getStaticPaths`).toContain(`'${demo.slug}'`);
    }
  });

  it('every demo slug has a conditional render line', () => {
    for (const demo of demosEn) {
      expect(routerContent, `slug "${demo.slug}" missing conditional render`).toContain(`demo === '${demo.slug}'`);
    }
  });
});
