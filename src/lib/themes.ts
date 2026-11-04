/**
 * Every palette belongs to exactly one design: each design owns a dark ("night")
 * and a light ("day") colorway composed for it, so any combination the visitor
 * can reach was chosen by us. A palette is never offered with, or applied to,
 * another design (see `./palettes.ts`).
 *
 * `id` is the value of `html[data-theme]`; its CSS block lives in
 * `src/styles/themes.css`. Display names are localized in each locale's
 * `designs.json` (`paletteNight` / `paletteDay`).
 */
export interface ThemeMeta {
  id: string;
  /** Id of the design this colorway belongs to. */
  design: string;
  colorScheme: 'dark' | 'light';
  /** [background, accent] shown in the picker swatch. */
  preview: [string, string];
}

/** Grouped by design, in picker order; night before day. */
export const THEMES: ThemeMeta[] = [
  { id: 'dark', design: 'minimal', colorScheme: 'dark', preview: ['#0a0a0f', '#6366f1'] },
  { id: 'light', design: 'minimal', colorScheme: 'light', preview: ['#f8fafc', '#4f46e5'] },
  {
    id: 'editorial-night',
    design: 'editorial',
    colorScheme: 'dark',
    preview: ['#2a1119', '#f58aa8'],
  },
  {
    id: 'editorial-day',
    design: 'editorial',
    colorScheme: 'light',
    preview: ['#faf6f5', '#b0123c'],
  },
  { id: 'barcelona-night', design: 'swiss', colorScheme: 'dark', preview: ['#101a18', '#56c7b2'] },
  { id: 'barcelona-day', design: 'swiss', colorScheme: 'light', preview: ['#f4f7f2', '#006d72'] },
  { id: 'pixel-night', design: 'pixel', colorScheme: 'dark', preview: ['#15111d', '#ff8a1f'] },
  { id: 'pixel-day', design: 'pixel', colorScheme: 'light', preview: ['#dff0fb', '#c4281c'] },
  {
    id: 'terminal-night',
    design: 'terminal',
    colorScheme: 'dark',
    preview: ['#0a140c', '#33ff66'],
  },
  { id: 'terminal-day', design: 'terminal', colorScheme: 'light', preview: ['#eef4e6', '#166534'] },
  { id: 'cyber-night', design: 'cyber', colorScheme: 'dark', preview: ['#0b0221', '#ff2a6d'] },
  { id: 'cyber-day', design: 'cyber', colorScheme: 'light', preview: ['#f3efff', '#b0006b'] },
  {
    id: 'notebook-night',
    design: 'notebook',
    colorScheme: 'dark',
    preview: ['#1b2826', '#f2d268'],
  },
  { id: 'notebook-day', design: 'notebook', colorScheme: 'light', preview: ['#f5f8fb', '#1c4fd1'] },
  {
    id: 'brutalist-night',
    design: 'brutalist',
    colorScheme: 'dark',
    preview: ['#151515', '#ff4a1c'],
  },
  {
    id: 'brutalist-day',
    design: 'brutalist',
    colorScheme: 'light',
    preview: ['#f6f6f3', '#1212d6'],
  },
  {
    id: 'blueprint-night',
    design: 'blueprint',
    colorScheme: 'dark',
    preview: ['#0c2f55', '#7fd3ff'],
  },
  {
    id: 'blueprint-day',
    design: 'blueprint',
    colorScheme: 'light',
    preview: ['#e8f0f6', '#0a5a9c'],
  },
  {
    id: 'academic-night',
    design: 'academic',
    colorScheme: 'dark',
    preview: ['#101a16', '#7fc4a0'],
  },
  { id: 'academic-day', design: 'academic', colorScheme: 'light', preview: ['#fdfcf9', '#15429b'] },
  { id: 'ide-night', design: 'ide', colorScheme: 'dark', preview: ['#16181c', '#5aa9ee'] },
  { id: 'ide-day', design: 'ide', colorScheme: 'light', preview: ['#f6f7f9', '#0b63c5'] },
  {
    id: 'risograph-night',
    design: 'risograph',
    colorScheme: 'dark',
    preview: ['#141217', '#ff6f9c'],
  },
  {
    id: 'risograph-day',
    design: 'risograph',
    colorScheme: 'light',
    preview: ['#f3f0ea', '#cf1968'],
  },
  { id: 'deco-night', design: 'deco', colorScheme: 'dark', preview: ['#0d0c0a', '#c9a961'] },
  { id: 'deco-day', design: 'deco', colorScheme: 'light', preview: ['#f5eedd', '#88651d'] },
  {
    id: 'wabisabi-night',
    design: 'wabisabi',
    colorScheme: 'dark',
    preview: ['#1c1b19', '#b7a98a'],
  },
  { id: 'wabisabi-day', design: 'wabisabi', colorScheme: 'light', preview: ['#efebe1', '#2f4b73'] },
  { id: 'zine-night', design: 'zine', colorScheme: 'dark', preview: ['#131313', '#ff3d8b'] },
  { id: 'zine-day', design: 'zine', colorScheme: 'light', preview: ['#efefea', '#c9185a'] },
  { id: 'comic-night', design: 'comic', colorScheme: 'dark', preview: ['#101b33', '#ffd23f'] },
  { id: 'comic-day', design: 'comic', colorScheme: 'light', preview: ['#fffbea', '#1a5fd1'] },
  {
    id: 'newspaper-night',
    design: 'newspaper',
    colorScheme: 'dark',
    preview: ['#1b1a17', '#e8574a'],
  },
  {
    id: 'newspaper-day',
    design: 'newspaper',
    colorScheme: 'light',
    preview: ['#efece4', '#a61e1e'],
  },
];

export const THEME_IDS = THEMES.map((t) => t.id);
export const LIGHT_THEME_IDS = THEMES.filter((theme) => theme.colorScheme === 'light').map(
  (theme) => theme.id
);

/**
 * Palettes that used to be offered (generic editor colour schemes and the
 * earlier shared set). They no longer exist, but a returning visitor may still
 * have one stored; knowing which were light lets us keep their dark/light
 * choice when snapping to the active design's own palette.
 */
export const RETIRED_LIGHT_THEME_IDS = [
  'nord-light',
  'solarized-light',
  'sepia',
  'paper',
  'catppuccin-latte',
];

/** Mirrors the default design (`DEFAULT_DESIGN` in `./designs.ts`). */
export const DEFAULT_DARK_THEME = 'barcelona-night';
export const DEFAULT_LIGHT_THEME = 'barcelona-day';
export const DEFAULT_THEME = DEFAULT_DARK_THEME;
