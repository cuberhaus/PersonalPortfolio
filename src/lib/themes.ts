export interface ThemeMeta {
  id: string;
  label: string;
  colorScheme: 'dark' | 'light';
  preview: [string, string];
  /**
   * Retired palettes: kept registered (so persisted `localStorage.theme`
   * and `?theme=<id>` URLs keep working) but not rendered as swatches in
   * the Ctrl+K picker.
   */
  hidden?: boolean;
}

export const THEMES: ThemeMeta[] = [
  // ── Dark ──────────────────────────────────────────────────
  { id: 'dark',             label: 'Default Dark',     colorScheme: 'dark',  preview: ['#0a0a0f', '#6366f1'] },
  { id: 'dracula',          label: 'Dracula',          colorScheme: 'dark',  preview: ['#282a36', '#bd93f9'] },
  { id: 'nord',             label: 'Nord',             colorScheme: 'dark',  preview: ['#2e3440', '#88c0d0'] },
  { id: 'tokyo-night',      label: 'Tokyo Night',      colorScheme: 'dark',  preview: ['#1a1b26', '#7aa2f7'] },
  { id: 'gruvbox-dark',     label: 'Gruvbox Dark',     colorScheme: 'dark',  preview: ['#1d2021', '#fe8019'] },
  { id: 'synthwave',        label: 'Synthwave',        colorScheme: 'dark',  preview: ['#0b0221', '#ff2a6d'] },
  { id: 'phosphor',         label: 'Phosphor Green',   colorScheme: 'dark',  preview: ['#0a140c', '#33ff66'] },
  { id: 'amber-crt',        label: 'Amber CRT',        colorScheme: 'dark',  preview: ['#140a00', '#ffb000'] },

  // ── Light ─────────────────────────────────────────────────
  { id: 'light',            label: 'Default Light',    colorScheme: 'light', preview: ['#f8fafc', '#4f46e5'] },
  { id: 'nord-light',       label: 'Nord Light',       colorScheme: 'light', preview: ['#eceff4', '#5e81ac'] },
  { id: 'solarized-light',  label: 'Solarized Light',  colorScheme: 'light', preview: ['#fdf6e3', '#b58900'] },
  { id: 'sepia',            label: 'Sepia',            colorScheme: 'light', preview: ['#f4ecd8', '#a85a2e'] },
  { id: 'paper',            label: 'Paper',            colorScheme: 'light', preview: ['#fafaf5', '#cc4236'] },

  // ── Hidden (retired but still accessible via URL / API / localStorage) ──
  { id: 'catppuccin-mocha', label: 'Catppuccin Mocha', colorScheme: 'dark',  preview: ['#1e1e2e', '#cba6f7'], hidden: true },
  { id: 'one-dark',         label: 'One Dark',         colorScheme: 'dark',  preview: ['#282c34', '#61afef'], hidden: true },
  { id: 'catppuccin-latte', label: 'Catppuccin Latte', colorScheme: 'light', preview: ['#eff1f5', '#8839ef'], hidden: true },
];

export const THEME_IDS = THEMES.map(t => t.id);
export const DEFAULT_THEME = 'dark';
