/**
 * Unit tests for the `data-design` axis.
 *
 * Covers:
 *  - `DESIGNS` / `DESIGN_IDS` shape and uniqueness
 *  - every design id has a `html[data-design='…']` block in `designs.css`
 *  - every design id has `design.<id>.name` + `design.<id>.blurb` i18n keys
 *    in every supported language
 *  - the Ctrl+K modal labels (`theme.customize`, `theme.design`, …) exist
 *    in every supported language
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DESIGNS, DESIGN_IDS, DEFAULT_DESIGN, getDesignName, getDesignBlurb } from '../lib/designs';
import { THEME_IDS } from '../lib/themes';
import { ui, languages } from '../i18n/ui';
import { LOCALES } from '../config/locales';

const designsCss = readFileSync(resolve('./src/styles/designs.css'), 'utf8');

// Derive the modal key list from the EN bundle so adding a new theme.* key
// in ui.ts is automatically required to exist in every locale.
const MODAL_KEYS = Object.keys(ui.en).filter((k) => k.startsWith('theme.')) as Array<
  keyof typeof ui.en
>;

describe('DESIGNS registry', () => {
  it('contains at least 17 designs', () => {
    expect(DESIGNS.length).toBeGreaterThanOrEqual(17);
  });

  it('DEFAULT_DESIGN is a valid id', () => {
    expect(DESIGN_IDS).toContain(DEFAULT_DESIGN);
  });

  it('ids are unique', () => {
    const set = new Set(DESIGN_IDS);
    expect(set.size).toBe(DESIGN_IDS.length);
  });

  it('every entry has non-empty id, label, blurb and preview', () => {
    for (const d of DESIGNS) {
      expect(d.id.trim().length, `design ${d.id} has empty id`).toBeGreaterThan(0);
      expect(d.label.trim().length, `design ${d.id} has empty label`).toBeGreaterThan(0);
      expect(d.blurb.trim().length, `design ${d.id} has empty blurb`).toBeGreaterThan(0);
      expect(d.preview.font.trim().length).toBeGreaterThan(0);
      expect(typeof d.preview.radius).toBe('string');
      expect([
        'gradient',
        'serif',
        'grid',
        'pixel',
        'terminal',
        'neon',
        'paper',
        'raw',
        'schematic',
        'tex',
        'editor',
        'riso',
        'deco',
        'zen',
        'zine',
        'comic',
        'news',
      ]).toContain(d.preview.style);
    }
  });
});

describe('designs.css coverage', () => {
  it("every design id has a html[data-design='…'] block", () => {
    for (const id of DESIGN_IDS) {
      const pattern = new RegExp(`html\\[data-design=['"]${id}['"]\\]`);
      expect(pattern.test(designsCss), `designs.css is missing a block for "${id}"`).toBe(true);
    }
  });

  it('reduced-motion gates design animations', () => {
    expect(designsCss).toMatch(/@media\s*\(prefers-reduced-motion:\s*no-preference\)/);
  });
});

describe('design i18n coverage', () => {
  it.each(LOCALES)(
    '%s resolves a non-empty name and blurb for every design via designs.ts',
    (locale) => {
      for (const id of DESIGN_IDS) {
        const name = getDesignName(id, locale);
        const blurb = getDesignBlurb(id, locale);
        expect(name, `${locale}: missing name for design "${id}"`).toBeTruthy();
        expect(blurb, `${locale}: missing blurb for design "${id}"`).toBeTruthy();
      }
    }
  );

  it.each(Object.keys(languages) as (keyof typeof ui)[])(
    '%s has every Ctrl+K modal label',
    (lang) => {
      const bundle = ui[lang] as Record<string, string>;
      for (const key of MODAL_KEYS) {
        expect(bundle[key], `${lang}: missing ${key}`).toBeTruthy();
      }
    }
  );
});

describe('recommendedThemes (soft palette hints)', () => {
  it('every design (active + hidden) declares at least one recommendation', () => {
    for (const d of DESIGNS) {
      expect(
        d.recommendedThemes && d.recommendedThemes.length > 0,
        `design "${d.id}" has no recommendedThemes`
      ).toBe(true);
    }
  });

  it('every recommended palette id resolves to a real theme', () => {
    for (const d of DESIGNS) {
      for (const paletteId of d.recommendedThemes ?? []) {
        expect(THEME_IDS, `design "${d.id}" recommends unknown palette "${paletteId}"`).toContain(
          paletteId
        );
      }
    }
  });

  it('recommendedThemes contains no duplicates per design', () => {
    for (const d of DESIGNS) {
      const recs = d.recommendedThemes ?? [];
      expect(new Set(recs).size, `design "${d.id}" has duplicate recommendations`).toBe(
        recs.length
      );
    }
  });
});
