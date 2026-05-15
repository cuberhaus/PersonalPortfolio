import { describe, it, expect } from 'vitest';
import { DEFAULT_THEME, THEME_IDS, THEMES } from '../lib/themes';

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

describe('theme registry', () => {
  it('has unique theme ids', () => {
    const ids = THEMES.map((theme) => theme.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('keeps THEME_IDS in sync with THEMES order', () => {
    expect(THEME_IDS).toEqual(THEMES.map((theme) => theme.id));
  });

  it('registers DEFAULT_THEME as a visible theme', () => {
    const defaultTheme = THEMES.find((theme) => theme.id === DEFAULT_THEME);

    expect(defaultTheme).toBeDefined();
    expect(defaultTheme?.hidden).not.toBe(true);
  });

  it('defines complete metadata for every theme', () => {
    for (const theme of THEMES) {
      expect(theme.id.trim().length, `${theme.id} has an empty id`).toBeGreaterThan(0);
      expect(theme.label.trim().length, `${theme.id} has an empty label`).toBeGreaterThan(0);
      expect(['dark', 'light'], `${theme.id} has an invalid color scheme`).toContain(
        theme.colorScheme
      );
      expect(theme.preview).toHaveLength(2);

      for (const color of theme.preview) {
        expect(color, `${theme.id} has an invalid preview color`).toMatch(HEX_COLOR);
      }
    }
  });

  it('offers visible dark and light theme choices', () => {
    const visibleThemes = THEMES.filter((theme) => !theme.hidden);

    expect(visibleThemes.some((theme) => theme.colorScheme === 'dark')).toBe(true);
    expect(visibleThemes.some((theme) => theme.colorScheme === 'light')).toBe(true);
  });

  it('keeps hidden themes available through THEME_IDS', () => {
    const hiddenThemes = THEMES.filter((theme) => theme.hidden);

    expect(hiddenThemes.length).toBeGreaterThan(0);
    for (const theme of hiddenThemes) {
      expect(THEME_IDS).toContain(theme.id);
    }
  });
});
