/**
 * Static contrast audit for design-token combinations.
 *
 * Parses src/styles/global.css (`:root` and `[data-theme='light']`) and
 * src/styles/themes.css (every other theme block), then asserts that every
 * meaningful (foreground, background) token pair meets WCAG AA 4.5:1.
 *
 * Why this exists alongside the Playwright axe sweep:
 *   - axe inspects the *rendered* DOM, so it only catches contrast bugs on
 *     pages where a token actually shows up. A token defined out of policy
 *     but used only on, say, the modal that the test never opens, would
 *     slip through.
 *   - This test covers the static token definitions themselves: cheap to
 *     run (<100ms), catches token regressions in the same PR that
 *     introduces them, complements the slower axe coverage.
 *
 * Pairs audited:
 *   - --text-secondary, --text-muted, --accent-text on bg-primary,
 *     bg-secondary, bg-card
 *   - --status-success, --status-error, --status-warning, --status-info on
 *     bg-primary, bg-secondary, bg-card
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(__dirname, '..', '..');
const GLOBAL_CSS = readFileSync(join(ROOT, 'src/styles/global.css'), 'utf8');
const THEMES_CSS = readFileSync(join(ROOT, 'src/styles/themes.css'), 'utf8');
const ALL_CSS = GLOBAL_CSS + '\n' + THEMES_CSS;

const TEXT_TOKENS = ['text-secondary', 'text-muted', 'accent-text'] as const;
const STATUS_TOKENS = ['status-success', 'status-error', 'status-warning', 'status-info'] as const;
const FG_TOKENS = [...TEXT_TOKENS, ...STATUS_TOKENS] as const;
const BG_TOKENS = ['bg-primary', 'bg-secondary', 'bg-card'] as const;

const WCAG_AA = 4.5;

interface Block {
  name: string;
  vars: Record<string, string>;
}

function parseBlocks(css: string): Block[] {
  const blocks: Block[] = [];
  // Match `:root { ... }` and `html[data-theme='X'] { ... }` blocks.
  const regex = /(?::root|html\[data-theme='([^']+)'\])\s*\{([^}]+)\}/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(css)) !== null) {
    const name = m[1] ?? 'default-dark';
    const body = m[2];
    const vars: Record<string, string> = {};
    const varRegex = /--([\w-]+):\s*(#[0-9a-fA-F]{6})\b/g;
    let v: RegExpExecArray | null;
    while ((v = varRegex.exec(body)) !== null) {
      vars[v[1]] = v[2].toLowerCase();
    }
    blocks.push({ name, vars });
  }
  return blocks;
}

function hexToRgb(h: string) {
  const x = h.replace('#', '');
  return {
    r: parseInt(x.slice(0, 2), 16),
    g: parseInt(x.slice(2, 4), 16),
    b: parseInt(x.slice(4, 6), 16),
  };
}

function relativeLuminance(c: { r: number; g: number; b: number }) {
  const srgb = [c.r, c.g, c.b].map((v) => {
    const n = v / 255;
    return n <= 0.03928 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}

function contrastRatio(fg: string, bg: string) {
  const lf = relativeLuminance(hexToRgb(fg));
  const lb = relativeLuminance(hexToRgb(bg));
  return (Math.max(lf, lb) + 0.05) / (Math.min(lf, lb) + 0.05);
}

const blocks = parseBlocks(ALL_CSS);
const rootBlock = blocks.find((b) => b.name === 'default-dark');
if (!rootBlock) {
  throw new Error('Could not parse :root variables from global.css');
}
const root: Block = rootBlock;

/**
 * Resolve a token in a given theme: prefer the theme block's own value,
 * fall back to :root. Returns undefined if undefined in both.
 */
function resolve_token(block: Block, name: string): string | undefined {
  return block.vars[name] ?? root.vars[name];
}

describe('theme contrast tokens', () => {
  it('parses all theme blocks (sanity)', () => {
    expect(blocks.length).toBeGreaterThanOrEqual(15);
    expect(root.vars['bg-primary']).toBeTruthy();
    expect(root.vars['accent-text']).toBeTruthy();
  });

  for (const block of blocks) {
    describe(`[${block.name}]`, () => {
      for (const fgToken of FG_TOKENS) {
        for (const bgToken of BG_TOKENS) {
          it(`--${fgToken} on --${bgToken} >= ${WCAG_AA}:1`, () => {
            const fg = resolve_token(block, fgToken);
            const bg = resolve_token(block, bgToken);
            // Skip silently if either token is not defined for this scheme;
            // missing tokens are flagged separately below.
            if (!fg || !bg) return;
            const ratio = contrastRatio(fg, bg);
            expect(
              ratio,
              `${block.name}: --${fgToken} (${fg}) vs --${bgToken} (${bg}) = ${ratio.toFixed(2)}:1`
            ).toBeGreaterThanOrEqual(WCAG_AA);
          });
        }
      }
    });
  }

  // Token coverage: every theme should resolve every fg/bg token (either
  // directly or via :root inheritance). A missing token suggests a typo or
  // an incomplete theme.
  describe('token coverage', () => {
    for (const block of blocks) {
      for (const t of [...FG_TOKENS, ...BG_TOKENS]) {
        it(`[${block.name}] --${t} resolves`, () => {
          expect(resolve_token(block, t), `--${t} unresolved for ${block.name}`).toBeTruthy();
        });
      }
    }
  });
});
