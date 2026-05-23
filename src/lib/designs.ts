import type { Locale } from '../config/locales';
import { DEFAULT_LOCALE } from '../config/locales';
import { getAllLocalesForNamespace } from '../i18n/locale-glob';

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
  /**
   * Palette ids that look especially good with this design. Used purely
   * as a soft visual hint in the Ctrl+K picker (star badge + subtle ring
   * on matching swatches); never enforced, never auto-swapped. All
   * palettes remain selectable with every design.
   */
  recommendedThemes?: string[];
}

type DesignCopyEntry = { name?: string; blurb?: string };
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
    recommendedThemes: ['dark', 'light', 'nord'],
  }),
  defineDesign({
    id: 'editorial',
    preview: { font: '"Playfair Display", Georgia, serif', radius: '0', style: 'serif' },
    recommendedThemes: ['sepia', 'paper', 'dark'],
  }),
  defineDesign({
    id: 'swiss',
    preview: { font: '"Inter Tight", Helvetica, Arial, sans-serif', radius: '0', style: 'grid' },
    recommendedThemes: ['paper', 'light', 'dark'],
  }),
  defineDesign({
    id: 'pixel',
    preview: { font: '"Press Start 2P", ui-monospace, monospace', radius: '0', style: 'pixel' },
    recommendedThemes: ['synthwave', 'phosphor', 'dracula'],
  }),
  defineDesign({
    id: 'terminal',
    preview: { font: '"JetBrains Mono", ui-monospace, monospace', radius: '0', style: 'terminal' },
    recommendedThemes: ['phosphor', 'amber-crt', 'gruvbox-dark'],
  }),
  defineDesign({
    id: 'cyber',
    preview: { font: 'Orbitron, "Inter Tight", sans-serif', radius: '0', style: 'neon' },
    recommendedThemes: ['synthwave', 'tokyo-night', 'dracula'],
  }),
  defineDesign({
    id: 'notebook',
    preview: { font: 'Caveat, "Comic Sans MS", cursive', radius: '0.5rem', style: 'paper' },
    recommendedThemes: ['paper', 'solarized-light', 'sepia'],
  }),
  defineDesign({
    id: 'brutalist',
    preview: { font: '"Times New Roman", Times, serif', radius: '0', style: 'raw' },
    recommendedThemes: ['paper', 'light', 'gruvbox-dark'],
  }),
  defineDesign({
    id: 'blueprint',
    preview: { font: '"JetBrains Mono", ui-monospace, monospace', radius: '0', style: 'schematic' },
    recommendedThemes: ['nord', 'tokyo-night', 'dark'],
  }),
  defineDesign({
    id: 'academic',
    preview: { font: '"EB Garamond", "Crimson Pro", Georgia, serif', radius: '0', style: 'tex' },
    recommendedThemes: ['sepia', 'paper', 'solarized-light'],
  }),
  defineDesign({
    id: 'ide',
    preview: {
      font: '"JetBrains Mono", ui-monospace, monospace',
      radius: '0.25rem',
      style: 'editor',
    },
    recommendedThemes: ['dark', 'gruvbox-dark', 'tokyo-night'],
  }),
  defineDesign({
    id: 'risograph',
    preview: { font: 'Inter, system-ui, sans-serif', radius: '0.25rem', style: 'riso' },
    recommendedThemes: ['synthwave', 'sepia', 'gruvbox-dark'],
  }),
  defineDesign({
    id: 'deco',
    preview: { font: '"Poiret One", "Playfair Display", serif', radius: '0', style: 'deco' },
    recommendedThemes: ['dark', 'sepia', 'dracula'],
  }),
  defineDesign({
    id: 'wabisabi',
    preview: { font: '"Shippori Mincho", "Noto Serif JP", serif', radius: '0', style: 'zen' },
    recommendedThemes: ['paper', 'sepia', 'nord-light'],
  }),
  defineDesign({
    id: 'zine',
    preview: { font: '"Times New Roman", Times, serif', radius: '0', style: 'zine' },
    recommendedThemes: ['gruvbox-dark', 'synthwave', 'paper'],
  }),
  defineDesign({
    id: 'comic',
    preview: { font: 'Bangers, "Inter Tight", sans-serif', radius: '0.5rem', style: 'comic' },
    recommendedThemes: ['synthwave', 'light', 'dracula'],
  }),
  defineDesign({
    id: 'newspaper',
    preview: { font: '"EB Garamond", Georgia, serif', radius: '0', style: 'news' },
    recommendedThemes: ['sepia', 'solarized-light', 'paper'],
  }),
];

export const DESIGN_IDS = DESIGNS.map((d) => d.id);
// The first entry doubles as the default design. Reordering DESIGNS picks a
// new default automatically, with no separate constant to keep in sync.
export const DEFAULT_DESIGN = DESIGNS[0].id;

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
