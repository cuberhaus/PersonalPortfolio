export interface DesignMeta {
  id: string;
  label: string;
  /** Short one-line description for the Ctrl+K modal preview tile. */
  blurb: string;
  /** Representative preview hints rendered in the modal swatch (pure CSS). */
  preview: {
    /** Font family sample rendered in the tile. */
    font: string;
    /** Corner radius sample: e.g. '0', '0.75rem', '1.5rem'. */
    radius: string;
    /** Pictorial style keyword used to pick the tile's mini-mockup. */
    style:
      | 'gradient' | 'serif' | 'grid' | 'pixel'
      | 'terminal' | 'neon'
      | 'paper' | 'raw' | 'schematic'
      | 'tex' | 'editor' | 'riso'
      | 'deco' | 'zen'
      | 'zine' | 'comic' | 'news';
  };
  /**
   * Retired designs: kept registered (so persisted `localStorage.design`
   * and `?design=<id>` URLs keep working) but not rendered in the Ctrl+K
   * picker grid.
   */
  hidden?: boolean;
  /**
   * Palette ids that look especially good with this design. Used purely
   * as a soft visual hint in the Ctrl+K picker (★ badge + subtle ring
   * on matching swatches); never enforced, never auto-swapped. All
   * palettes remain selectable with every design.
   */
  recommendedThemes?: string[];
}

export const DESIGNS: DesignMeta[] = [
  {
    id: 'minimal',
    label: 'Minimal',
    blurb: 'Clean modern portfolio with gradient accents',
    preview: { font: 'Inter, system-ui, sans-serif', radius: '0.75rem', style: 'gradient' },
    recommendedThemes: ['dark', 'light', 'nord'],
  },
  {
    id: 'editorial',
    label: 'Editorial',
    blurb: 'Serif headlines, drop caps, magazine columns',
    preview: { font: '"Playfair Display", Georgia, serif', radius: '0', style: 'serif' },
    recommendedThemes: ['sepia', 'paper', 'dark'],
  },
  {
    id: 'swiss',
    label: 'Swiss',
    blurb: 'Strict grid, giant numerals, hairline rules',
    preview: { font: '"Inter Tight", Helvetica, Arial, sans-serif', radius: '0', style: 'grid' },
    recommendedThemes: ['paper', 'light', 'dark'],
  },
  {
    id: 'pixel',
    label: 'Pixel',
    blurb: '8-bit pixel font, chunky buttons, hard shadows',
    preview: { font: '"Press Start 2P", ui-monospace, monospace', radius: '0', style: 'pixel' },
    recommendedThemes: ['synthwave', 'phosphor', 'dracula'],
  },
  {
    id: 'terminal',
    label: 'Terminal',
    blurb: 'CRT vibes, monospace everywhere, blinking cursor',
    preview: { font: '"JetBrains Mono", ui-monospace, monospace', radius: '0', style: 'terminal' },
    recommendedThemes: ['phosphor', 'amber-crt', 'gruvbox-dark'],
  },
  {
    id: 'cyber',
    label: 'Cyberpunk',
    blurb: 'Neon glow, chromatic aberration, synthwave grid',
    preview: { font: 'Orbitron, "Inter Tight", sans-serif', radius: '0', style: 'neon' },
    recommendedThemes: ['synthwave', 'tokyo-night', 'dracula'],
  },
  {
    id: 'notebook',
    label: 'Notebook',
    blurb: 'Graph paper, handwritten ink, highlighter marks',
    preview: { font: 'Caveat, "Comic Sans MS", cursive', radius: '0.5rem', style: 'paper' },
    recommendedThemes: ['paper', 'solarized-light', 'sepia'],
  },
  {
    id: 'brutalist',
    label: 'Brutalist',
    blurb: 'Raw HTML energy: Times, yellow tape, thick borders',
    preview: { font: '"Times New Roman", Times, serif', radius: '0', style: 'raw' },
    recommendedThemes: ['paper', 'light', 'gruvbox-dark'],
  },
  {
    id: 'blueprint',
    label: 'Blueprint',
    blurb: 'Cyan grid, hairlines, dimension marks, tech labels',
    preview: { font: '"JetBrains Mono", ui-monospace, monospace', radius: '0', style: 'schematic' },
    recommendedThemes: ['nord', 'tokyo-night', 'dark'],
  },
  {
    id: 'academic',
    label: 'Academic',
    blurb: 'LaTeX paper: Garamond, numbered sections, abstracts',
    preview: { font: '"EB Garamond", "Crimson Pro", Georgia, serif', radius: '0', style: 'tex' },
    recommendedThemes: ['sepia', 'paper', 'solarized-light'],
  },
  {
    id: 'ide',
    label: 'IDE',
    blurb: 'VSCode vibes: tab cards, gutter, syntax-coloured hero',
    preview: { font: '"JetBrains Mono", ui-monospace, monospace', radius: '0.25rem', style: 'editor' },
    recommendedThemes: ['dark', 'gruvbox-dark', 'tokyo-night'],
  },
  {
    id: 'risograph',
    label: 'Risograph',
    blurb: 'Duotone print, halftone dots, grain and misregister',
    preview: { font: 'Inter, system-ui, sans-serif', radius: '0.25rem', style: 'riso' },
    recommendedThemes: ['synthwave', 'sepia', 'gruvbox-dark'],
  },
  {
    id: 'deco',
    label: 'Art Deco',
    blurb: 'Sunbursts, gold gradients, stepped pyramid borders',
    preview: { font: '"Poiret One", "Playfair Display", serif', radius: '0', style: 'deco' },
    recommendedThemes: ['dark', 'sepia', 'dracula'],
  },
  {
    id: 'wabisabi',
    label: 'Wabi-sabi',
    blurb: 'Serene Japanese minimalism, vast negative space',
    preview: { font: '"Shippori Mincho", "Noto Serif JP", serif', radius: '0', style: 'zen' },
    recommendedThemes: ['paper', 'sepia', 'nord-light'],
  },
  {
    id: 'zine',
    label: 'Zine',
    blurb: 'Photocopied ransom-note collage, staples and tape',
    preview: { font: '"Times New Roman", Times, serif', radius: '0', style: 'zine' },
    recommendedThemes: ['gruvbox-dark', 'synthwave', 'paper'],
  },
  {
    id: 'comic',
    label: 'Comic',
    blurb: 'Bangers titles, Ben-Day dots, speech bubbles',
    preview: { font: 'Bangers, "Inter Tight", sans-serif', radius: '0.5rem', style: 'comic' },
    recommendedThemes: ['synthwave', 'light', 'dracula'],
  },
  {
    id: 'newspaper',
    label: 'Newspaper',
    blurb: 'Blackletter masthead, columns, classified ads',
    preview: { font: '"EB Garamond", Georgia, serif', radius: '0', style: 'news' },
    recommendedThemes: ['sepia', 'solarized-light', 'paper'],
  },
];

export const DESIGN_IDS = DESIGNS.map(d => d.id);
export const DEFAULT_DESIGN = 'minimal';
