/**
 * Palette ownership: which colorways a design may wear.
 *
 * Every design owns one dark and one light palette (`THEMES[].design`). A
 * visitor can switch design, and switch between that design's night and day,
 * but cannot cross-wear palettes. These helpers are the single definition of
 * that rule; the inline head script in `ThemeInit.astro` carries a deliberately
 * tiny copy of `resolvePalette` (it cannot import), kept honest by the
 * `themes` Playwright spec.
 */
import { DEFAULT_DARK_THEME, DEFAULT_LIGHT_THEME, RETIRED_LIGHT_THEME_IDS, THEMES } from './themes';

export type Scheme = 'dark' | 'light';

const themesById = new Map(THEMES.map((t) => [t.id, t]));
const retiredLight = new Set(RETIRED_LIGHT_THEME_IDS);

/** The palettes a design owns, night first. Empty for an unknown design. */
export function palettesOf(designId: string) {
  return THEMES.filter((t) => t.design === designId);
}

/** The design's palette for a scheme, or `undefined` for an unknown design. */
export function paletteFor(designId: string, scheme: Scheme): string | undefined {
  return THEMES.find((t) => t.design === designId && t.colorScheme === scheme)?.id;
}

/** The design that owns a palette id, or `undefined` for unknown/retired ids. */
export function ownerOf(themeId: string): string | undefined {
  return themesById.get(themeId)?.design;
}

export function isPaletteOf(designId: string, themeId: string): boolean {
  return themesById.get(themeId)?.design === designId;
}

/**
 * The scheme a stored palette id was in. Retired light palettes keep their
 * scheme; anything else we have never heard of is `undefined`.
 */
export function schemeOf(themeId: string): Scheme | undefined {
  const known = themesById.get(themeId);
  if (known) return known.colorScheme;
  return retiredLight.has(themeId) ? 'light' : undefined;
}

/**
 * Resolve any palette id (stored, from a URL, from the system preference) to
 * one the design actually owns:
 *
 * - an id the design owns is kept;
 * - an id another design owns, or a retired id, snaps to this design's palette
 *   of the same scheme, so switching design never flips night and day;
 * - an id nobody knows uses `fallbackScheme` (the system preference).
 */
export function resolvePalette(
  designId: string,
  themeId: string | null | undefined,
  fallbackScheme: Scheme
): string {
  if (themeId && isPaletteOf(designId, themeId)) return themeId;
  const scheme = (themeId ? schemeOf(themeId) : undefined) ?? fallbackScheme;
  return (
    paletteFor(designId, scheme) ?? (scheme === 'light' ? DEFAULT_LIGHT_THEME : DEFAULT_DARK_THEME)
  );
}
