export interface ThemeMeta {
  id: string;
  label: string;
  colorScheme: 'dark' | 'light';
  preview: [string, string];
}

export const THEMES: ThemeMeta[] = [
  { id: 'dark',             label: 'Default Dark',     colorScheme: 'dark',  preview: ['#0a0a0f', '#6366f1'] },
  { id: 'dracula',          label: 'Dracula',          colorScheme: 'dark',  preview: ['#282a36', '#bd93f9'] },
  { id: 'nord',             label: 'Nord',             colorScheme: 'dark',  preview: ['#2e3440', '#88c0d0'] },
  { id: 'tokyo-night',      label: 'Tokyo Night',      colorScheme: 'dark',  preview: ['#1a1b26', '#7aa2f7'] },
  { id: 'catppuccin-mocha', label: 'Catppuccin Mocha', colorScheme: 'dark',  preview: ['#1e1e2e', '#cba6f7'] },
  { id: 'one-dark',         label: 'One Dark',         colorScheme: 'dark',  preview: ['#282c34', '#61afef'] },
  { id: 'light',            label: 'Default Light',    colorScheme: 'light', preview: ['#f8fafc', '#4f46e5'] },
  { id: 'nord-light',       label: 'Nord Light',       colorScheme: 'light', preview: ['#eceff4', '#5e81ac'] },
  { id: 'catppuccin-latte', label: 'Catppuccin Latte', colorScheme: 'light', preview: ['#eff1f5', '#8839ef'] },
  { id: 'solarized-light',  label: 'Solarized Light',  colorScheme: 'light', preview: ['#fdf6e3', '#b58900'] },
];

export const THEME_IDS = THEMES.map(t => t.id);
export const DEFAULT_THEME = 'dark';
