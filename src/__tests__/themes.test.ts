import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  DEFAULT_DARK_THEME,
  DEFAULT_LIGHT_THEME,
  DEFAULT_THEME,
  LIGHT_THEME_IDS,
  RETIRED_LIGHT_THEME_IDS,
  THEME_IDS,
  THEMES,
} from '../lib/themes';
import { DEFAULT_DESIGN, DESIGN_IDS } from '../lib/designs';

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

const themesCss = readFileSync(resolve('./src/styles/themes.css'), 'utf8');
const globalCss = readFileSync(resolve('./src/styles/global.css'), 'utf8');
const designsCss = readFileSync(resolve('./src/styles/designs.css'), 'utf8');

/** Ids that have a `html[data-theme='…'] { … }` block in a stylesheet. */
function themeBlockIds(css: string): string[] {
  return [...css.matchAll(/^html\[data-theme='([a-z-]+)'\]\s*\{/gm)].map((m) => m[1]);
}

describe('theme registry', () => {
  it('has unique theme ids', () => {
    const ids = THEMES.map((theme) => theme.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('keeps THEME_IDS in sync with THEMES order', () => {
    expect(THEME_IDS).toEqual(THEMES.map((theme) => theme.id));
  });

  it('derives light theme ids from the registry', () => {
    expect(LIGHT_THEME_IDS).toEqual(
      THEMES.filter((theme) => theme.colorScheme === 'light').map((theme) => theme.id)
    );
    expect(LIGHT_THEME_IDS).toContain('barcelona-day');
  });

  it('defines complete metadata for every theme', () => {
    for (const theme of THEMES) {
      expect(theme.id.trim().length, `${theme.id} has an empty id`).toBeGreaterThan(0);
      expect(['dark', 'light'], `${theme.id} has an invalid color scheme`).toContain(
        theme.colorScheme
      );
      expect(theme.preview).toHaveLength(2);

      for (const color of theme.preview) {
        expect(color, `${theme.id} has an invalid preview color`).toMatch(HEX_COLOR);
      }
    }
  });
});

describe('palette ownership', () => {
  it('every palette belongs to a registered design', () => {
    for (const theme of THEMES) {
      expect(DESIGN_IDS, `${theme.id} belongs to unknown design "${theme.design}"`).toContain(
        theme.design
      );
    }
  });

  it('every design owns exactly one dark and one light palette', () => {
    for (const designId of DESIGN_IDS) {
      const owned = THEMES.filter((theme) => theme.design === designId);
      expect(
        owned.map((theme) => theme.colorScheme),
        `design "${designId}" must own one dark and one light palette`
      ).toEqual(['dark', 'light']);
    }
  });

  it('retired light ids are gone from the registry', () => {
    for (const id of RETIRED_LIGHT_THEME_IDS) {
      expect(THEME_IDS, `${id} is retired but still registered`).not.toContain(id);
    }
  });
});

describe('defaults', () => {
  it('uses the default design’s own palettes for first visits', () => {
    expect(DEFAULT_DARK_THEME).toBe('barcelona-night');
    expect(DEFAULT_LIGHT_THEME).toBe('barcelona-day');
    expect(DEFAULT_THEME).toBe(DEFAULT_DARK_THEME);

    const dark = THEMES.find((theme) => theme.id === DEFAULT_DARK_THEME);
    const light = THEMES.find((theme) => theme.id === DEFAULT_LIGHT_THEME);
    expect(dark).toMatchObject({ design: DEFAULT_DESIGN, colorScheme: 'dark' });
    expect(light).toMatchObject({ design: DEFAULT_DESIGN, colorScheme: 'light' });
  });
});

describe('palette CSS', () => {
  // `dark` and `light` are Minimal's palettes and live in global.css as the
  // base `:root` tokens; every other palette has its own themes.css block.
  const globalIds = ['dark', 'light'];

  it('every registered palette has a stylesheet block', () => {
    const defined = new Set([...themeBlockIds(themesCss), ...globalIds]);
    for (const theme of THEMES) {
      expect(defined.has(theme.id), `${theme.id} has no CSS block`).toBe(true);
    }
  });

  it('themes.css defines nothing that is not registered', () => {
    for (const id of themeBlockIds(themesCss)) {
      expect(THEME_IDS, `themes.css defines unregistered palette "${id}"`).toContain(id);
    }
  });

  it('global.css keeps the Minimal light block', () => {
    expect(themeBlockIds(globalCss)).toContain('light');
  });

  it('every `data-design` + `data-theme` pairing in designs.css is a palette that design owns', () => {
    const pairs = [
      ...designsCss.matchAll(/\[data-design='([a-z]+)'\]\[data-theme='([a-z-]+)'\]/g),
    ].map((m) => ({ design: m[1], theme: m[2] }));

    expect(pairs.length, 'expected light-palette overrides in designs.css').toBeGreaterThan(0);
    for (const { design, theme } of pairs) {
      const owner = THEMES.find((t) => t.id === theme)?.design;
      expect(
        owner,
        `designs.css pairs "${design}" with palette "${theme}", which ${owner ? `belongs to "${owner}"` : 'is not registered'}`
      ).toBe(design);
    }
  });
});
