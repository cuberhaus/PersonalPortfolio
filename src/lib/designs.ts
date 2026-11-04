import type { Locale } from '../config/locales';
import { DEFAULT_LOCALE } from '../config/locales';
import { getAllLocalesForNamespace } from '../i18n/locale-glob';
import { THEMES } from './themes';

export interface DesignMeta {
  id: string;
  /** Default-locale label loaded from locales/en/designs.json. */
  label: string;
  /** Default-locale description loaded from locales/en/designs.json. */
  blurb: string;
  /** Representative preview hints rendered in the modal swatch (pure CSS). */
  preview: {
    /** Font family sample rendered in the tile. */
    font: string;
    /** Corner radius sample: e.g. '0', '0.75rem', '1.5rem'. */
    radius: string;
    /** Pictorial style keyword used to pick the tile's mini-mockup. */
    style:
      | 'gradient'
      | 'serif'
      | 'grid'
      | 'pixel'
      | 'terminal'
      | 'neon'
      | 'paper'
      | 'raw'
      | 'schematic'
      | 'tex'
      | 'editor'
      | 'riso'
      | 'deco'
      | 'zen'
      | 'zine'
      | 'comic'
      | 'news';
  };
  /**
   * Retired designs: kept registered (so persisted `localStorage.design`
   * and `?design=<id>` URLs keep working) but not rendered in the Ctrl+K
   * picker grid.
   */
  hidden?: boolean;
}

type DesignCopyEntry = {
  name?: string;
  blurb?: string;
  /** Name of the design's dark colorway. */
  paletteNight?: string;
  /** Name of the design's light colorway. */
  paletteDay?: string;
};
type DesignCopyNamespace = Record<string, DesignCopyEntry>;

const DESIGN_COPY = getAllLocalesForNamespace<DesignCopyNamespace>('designs');

function copyFor(id: string, lang: Locale = DEFAULT_LOCALE): DesignCopyEntry | undefined {
  return DESIGN_COPY[lang]?.[id] ?? DESIGN_COPY[DEFAULT_LOCALE]?.[id];
}

function defineDesign(meta: Omit<DesignMeta, 'label' | 'blurb'>): DesignMeta {
  const copy = copyFor(meta.id);
  return { ...meta, label: copy?.name ?? '', blurb: copy?.blurb ?? '' };
}

export const DESIGNS: DesignMeta[] = [
  defineDesign({
    id: 'minimal',
    preview: { font: 'Inter, system-ui, sans-serif', radius: '0.75rem', style: 'gradient' },
  }),
  defineDesign({
    id: 'editorial',
    preview: { font: '"Playfair Display", Georgia, serif', radius: '0', style: 'serif' },
  }),
  defineDesign({
    id: 'swiss',
    preview: { font: '"Inter Tight", Helvetica, Arial, sans-serif', radius: '0', style: 'grid' },
  }),
  defineDesign({
    id: 'pixel',
    preview: { font: '"Press Start 2P", ui-monospace, monospace', radius: '0', style: 'pixel' },
  }),
  defineDesign({
    id: 'terminal',
    preview: { font: '"JetBrains Mono", ui-monospace, monospace', radius: '0', style: 'terminal' },
  }),
  defineDesign({
    id: 'cyber',
    preview: { font: 'Orbitron, "Inter Tight", sans-serif', radius: '0', style: 'neon' },
  }),
  defineDesign({
    id: 'notebook',
    preview: { font: 'Caveat, "Comic Sans MS", cursive', radius: '0.5rem', style: 'paper' },
  }),
  defineDesign({
    id: 'brutalist',
    preview: { font: '"Times New Roman", Times, serif', radius: '0', style: 'raw' },
  }),
  defineDesign({
    id: 'blueprint',
    preview: { font: '"JetBrains Mono", ui-monospace, monospace', radius: '0', style: 'schematic' },
  }),
  defineDesign({
    id: 'academic',
    preview: { font: '"EB Garamond", "Crimson Pro", Georgia, serif', radius: '0', style: 'tex' },
  }),
  defineDesign({
    id: 'ide',
    preview: {
      font: '"JetBrains Mono", ui-monospace, monospace',
      radius: '0.25rem',
      style: 'editor',
    },
  }),
  defineDesign({
    id: 'risograph',
    preview: { font: 'Inter, system-ui, sans-serif', radius: '0.25rem', style: 'riso' },
  }),
  defineDesign({
    id: 'deco',
    preview: { font: '"Poiret One", "Playfair Display", serif', radius: '0', style: 'deco' },
  }),
  defineDesign({
    id: 'wabisabi',
    preview: { font: '"Shippori Mincho", "Noto Serif JP", serif', radius: '0', style: 'zen' },
  }),
  defineDesign({
    id: 'zine',
    preview: { font: '"Times New Roman", Times, serif', radius: '0', style: 'zine' },
  }),
  defineDesign({
    id: 'comic',
    preview: { font: 'Bangers, "Inter Tight", sans-serif', radius: '0.5rem', style: 'comic' },
  }),
  defineDesign({
    id: 'newspaper',
    preview: { font: '"EB Garamond", Georgia, serif', radius: '0', style: 'news' },
  }),
];

export const DESIGN_IDS = DESIGNS.map((d) => d.id);
export const DEFAULT_DESIGN = 'swiss';

const designsById = new Map(DESIGNS.map((d) => [d.id, d]));

/**
 * Localized name for a design id, falling back to the English JSON value when
 * no translation is registered. Returns `null` for unknown ids.
 */
export function getDesignName(id: string, lang: Locale): string | null {
  if (!designsById.has(id)) return null;
  return copyFor(id, lang)?.name ?? null;
}

/**
 * Localized blurb for a design id, falling back to the English JSON value when
 * no translation is registered. Returns `null` for unknown ids.
 */
export function getDesignBlurb(id: string, lang: Locale): string | null {
  if (!designsById.has(id)) return null;
  return copyFor(id, lang)?.blurb ?? null;
}

/**
 * Localized name of a palette ("Barcelona Night", "Gloss", ...), falling back
 * to the English JSON value when no translation is registered. Returns `null`
 * for unknown palette ids.
 */
export function getPaletteName(themeId: string, lang: Locale): string | null {
  const theme = THEMES.find((t) => t.id === themeId);
  if (!theme) return null;
  const key = theme.colorScheme === 'dark' ? 'paletteNight' : 'paletteDay';
  return copyFor(theme.design, lang)?.[key] ?? copyFor(theme.design)?.[key] ?? null;
}
