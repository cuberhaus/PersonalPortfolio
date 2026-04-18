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
import { DESIGNS, DESIGN_IDS, DEFAULT_DESIGN } from '../lib/designs';
import { ui, languages } from '../i18n/ui';

const designsCss = readFileSync(resolve('./src/styles/designs.css'), 'utf8');

const MODAL_KEYS = [
  'theme.customize',
  'theme.design',
  'theme.palette',
  'theme.dark',
  'theme.light',
  'theme.closeHint',
] as const;

describe('DESIGNS registry', () => {
  it('contains at least 9 designs', () => {
    expect(DESIGNS.length).toBeGreaterThanOrEqual(9);
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
      expect(
        ['gradient', 'serif', 'blur', 'grid', 'soft', 'pixel', 'terminal', 'neon', 'clay'],
      ).toContain(d.preview.style);
    }
  });
});

describe('designs.css coverage', () => {
  it('every design id has a html[data-design=\'…\'] block', () => {
    for (const id of DESIGN_IDS) {
      const pattern = new RegExp(`html\\[data-design=['"]${id}['"]\\]`);
      expect(
        pattern.test(designsCss),
        `designs.css is missing a block for "${id}"`,
      ).toBe(true);
    }
  });

  it('reduced-motion gates design animations', () => {
    expect(designsCss).toMatch(/@media\s*\(prefers-reduced-motion:\s*no-preference\)/);
  });
});

describe('design i18n coverage', () => {
  const langs = Object.keys(languages) as (keyof typeof ui)[];

  it.each(langs)('%s has every design name + blurb key', (lang) => {
    const bundle = ui[lang] as Record<string, string>;
    for (const id of DESIGN_IDS) {
      const nameKey = `design.${id}.name`;
      const blurbKey = `design.${id}.blurb`;
      expect(bundle[nameKey], `${lang}: missing ${nameKey}`).toBeTruthy();
      expect(bundle[blurbKey], `${lang}: missing ${blurbKey}`).toBeTruthy();
    }
  });

  it.each(langs)('%s has every Ctrl+K modal label', (lang) => {
    const bundle = ui[lang] as Record<string, string>;
    for (const key of MODAL_KEYS) {
      expect(bundle[key], `${lang}: missing ${key}`).toBeTruthy();
    }
  });
});
