/**
 * Theme-aware color helpers for demo components.
 *
 * CSS custom properties work in HTML/SVG but **not** in `<canvas>` fillStyle.
 * This module reads computed values at render-time so canvas and inline styles
 * can follow the active theme.
 */

/* ── Read a CSS variable from the root element ── */
function css(prop: string, fallback = ""): string {
  if (typeof document === "undefined") return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(prop).trim() || fallback;
}

/* ── Public API ── */

export interface DemoColors {
  bgPrimary: string;
  bgSecondary: string;
  bgCard: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accentStart: string;
  accentEnd: string;
  borderColor: string;
  borderColorHover: string;
  glowColor: string;
}

/** Snapshot of the current theme for canvas / imperative drawing. */
export function getThemeColors(): DemoColors {
  return {
    bgPrimary: css("--bg-primary", "#0a0a0f"),
    bgSecondary: css("--bg-secondary", "#12121a"),
    bgCard: css("--bg-card", "#16161f"),
    textPrimary: css("--text-primary", "#e4e4e7"),
    textSecondary: css("--text-secondary", "#a1a1aa"),
    textMuted: css("--text-muted", "#71717a"),
    accentStart: css("--accent-start", "#6366f1"),
    accentEnd: css("--accent-end", "#a855f7"),
    borderColor: css("--border-color", "#27272a"),
    borderColorHover: css("--border-color-hover", "#3f3f46"),
    glowColor: css("--glow-color", "rgba(99,102,241,0.15)"),
  };
}

/** Build a lighter shade from a hex color (for canvas where color-mix isn't available). */
export function lighten(hex: string, amount = 0.3): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lr = Math.round(r + (255 - r) * amount);
  const lg = Math.round(g + (255 - g) * amount);
  const lb = Math.round(b + (255 - b) * amount);
  return `#${lr.toString(16).padStart(2, "0")}${lg.toString(16).padStart(2, "0")}${lb.toString(16).padStart(2, "0")}`;
}

/** Build an alpha variant from a hex color (for canvas). */
export function withAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
