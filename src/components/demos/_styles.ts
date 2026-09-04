// Shared style helpers for demo components.
//
// `demoPanel` and `gradientButton()` return the design-aware recipes used for
// primary surfaces and actions in demos. Their CSS tokens let each design
// reshape the controls without coupling React islands to `data-design`.
// The default action fallback darkens its gradient so white text clears WCAG
// AA (4.5:1) across every theme. See
// CONTRIBUTING.md → "A11y test patterns" for the rationale, and the
// `gradient text contrast` block in e2e/a11y.spec.ts for the assertion
// that keeps this honest.
//
// Use it inline:
//   <button style={gradientButton()}>Run</button>
//
// Override individual properties as needed by spreading:
//   <button style={{ ...gradientButton(), padding: '0.6rem 1.2rem' }}>...</button>
import type { CSSProperties } from 'react';

export const demoPanel: CSSProperties = {
  background: 'var(--demo-panel-bg)',
  border: '1px solid var(--demo-panel-border)',
  borderRadius: 'var(--demo-panel-radius)',
  padding: '1.5rem',
};

export interface GradientButtonOptions {
  /** Pre-computed accent endpoints. Defaults to the theme's `--accent-start`/`--accent-end`. */
  accent1?: string;
  accent2?: string;
  /**
   * Black-overlay alpha. 0.5 keeps every shipped theme above 4.5:1 contrast
   * with white text; lower values lose the assertion against light themes
   * (phosphor, amber-crt, synthwave-cyan).
   */
  overlay?: number;
}

export function gradientButton(opts: GradientButtonOptions = {}): CSSProperties {
  const accent1 = opts.accent1 ?? 'var(--accent-start)';
  const accent2 = opts.accent2 ?? 'var(--accent-end)';
  const a = opts.overlay ?? 0.5;
  return {
    background: `var(--demo-action-bg, linear-gradient(rgba(0,0,0,${a}), rgba(0,0,0,${a})), linear-gradient(135deg, ${accent1}, ${accent2}))`,
    color: 'var(--demo-action-color, #fff)',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 600,
  };
}
