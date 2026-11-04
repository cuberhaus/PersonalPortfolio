import { describe, it, expect } from 'vitest';
import {
  isPaletteOf,
  ownerOf,
  paletteFor,
  palettesOf,
  resolvePalette,
  schemeOf,
} from '../lib/palettes';
import { DEFAULT_DARK_THEME, DEFAULT_LIGHT_THEME, THEMES } from '../lib/themes';
import { DESIGN_IDS } from '../lib/designs';

describe('palette lookups', () => {
  it('lists a design’s palettes, night first', () => {
    expect(palettesOf('comic').map((t) => t.id)).toEqual(['comic-night', 'comic-day']);
    expect(palettesOf('no-such-design')).toEqual([]);
  });

  it('finds a design’s palette for a scheme', () => {
    expect(paletteFor('deco', 'dark')).toBe('deco-night');
    expect(paletteFor('deco', 'light')).toBe('deco-day');
    expect(paletteFor('no-such-design', 'dark')).toBeUndefined();
  });

  it('reports the owner of a palette', () => {
    expect(ownerOf('zine-day')).toBe('zine');
    expect(ownerOf('dark')).toBe('minimal');
    expect(ownerOf('dracula')).toBeUndefined();
  });

  it('answers ownership questions', () => {
    expect(isPaletteOf('swiss', 'barcelona-night')).toBe(true);
    expect(isPaletteOf('comic', 'barcelona-night')).toBe(false);
    expect(isPaletteOf('comic', 'dracula')).toBe(false);
  });

  it('knows the scheme of current and retired palettes', () => {
    expect(schemeOf('terminal-night')).toBe('dark');
    expect(schemeOf('terminal-day')).toBe('light');
    expect(schemeOf('sepia')).toBe('light');
    expect(schemeOf('nord-light')).toBe('light');
    // Retired dark ids are not tracked: unknown ids use the system preference.
    expect(schemeOf('dracula')).toBeUndefined();
  });
});

describe('resolvePalette', () => {
  it('keeps a palette the design owns', () => {
    expect(resolvePalette('comic', 'comic-day', 'dark')).toBe('comic-day');
    expect(resolvePalette('comic', 'comic-night', 'light')).toBe('comic-night');
  });

  it('snaps another design’s palette to this design’s palette of the same scheme', () => {
    expect(resolvePalette('comic', 'barcelona-night', 'light')).toBe('comic-night');
    expect(resolvePalette('comic', 'barcelona-day', 'dark')).toBe('comic-day');
  });

  it('snaps retired palettes without flipping night and day', () => {
    expect(resolvePalette('editorial', 'sepia', 'dark')).toBe('editorial-day');
    expect(resolvePalette('editorial', 'paper', 'dark')).toBe('editorial-day');
  });

  it('uses the fallback scheme for ids nobody knows, or no id', () => {
    expect(resolvePalette('pixel', 'dracula', 'dark')).toBe('pixel-night');
    expect(resolvePalette('pixel', 'dracula', 'light')).toBe('pixel-day');
    expect(resolvePalette('pixel', null, 'light')).toBe('pixel-day');
    expect(resolvePalette('pixel', undefined, 'dark')).toBe('pixel-night');
  });

  it('falls back to the default palettes for an unknown design', () => {
    expect(resolvePalette('no-such-design', null, 'dark')).toBe(DEFAULT_DARK_THEME);
    expect(resolvePalette('no-such-design', null, 'light')).toBe(DEFAULT_LIGHT_THEME);
  });

  it('always lands on a palette the design owns', () => {
    const ids = [...THEMES.map((t) => t.id), 'sepia', 'dracula', 'nord', '', 'not-a-theme'];
    for (const design of DESIGN_IDS) {
      for (const id of ids) {
        for (const scheme of ['dark', 'light'] as const) {
          const out = resolvePalette(design, id, scheme);
          expect(isPaletteOf(design, out), `${design} + "${id}" (${scheme}) -> ${out}`).toBe(true);
        }
      }
    }
  });
});
