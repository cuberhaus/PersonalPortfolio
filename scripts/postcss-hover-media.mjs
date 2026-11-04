/**
 * PostCSS plugin: hover only where hovering exists.
 *
 * Touch browsers emulate `:hover` on tap and leave it stuck until the next tap
 * elsewhere, so a card that lifts on hover stays lifted after you press it. This
 * wraps every rule whose selector uses `:hover` in
 *
 *     @media (hover: hover) and (pointer: fine) { ... }
 *
 * so those styles apply for a mouse or trackpad only. Source stays plain
 * `.card:hover { ... }`: authors do not have to remember the wrapper, and new
 * components are covered automatically.
 *
 * Behaviour worth knowing:
 * - A selector list is split. `a:hover, a:focus-visible` keeps `a:focus-visible`
 *   unconditional and gates only `a:hover`, so keyboard users lose nothing.
 * - `:not(:hover)` is left alone. Gating it would delete the rule on touch
 *   instead of making it permanently true.
 * - Rules inside `@keyframes`, rules nested in other rules, and rules already
 *   inside the gate are skipped.
 *
 * Covered by src/__tests__/postcss-hover-media.test.ts.
 */

export const HOVER_MEDIA_PARAMS = '(hover: hover) and (pointer: fine)';

const HOVER = /:hover\b/;
const NEGATED_HOVER = /:not\([^)]*:hover/;

/** True for a selector that should only apply where hover exists. */
export function isGateableSelector(selector) {
  return HOVER.test(selector) && !NEGATED_HOVER.test(selector);
}

const squash = (value) => value.replace(/\s+/g, '').toLowerCase();
const GATE_KEY = squash(HOVER_MEDIA_PARAMS);

function isGateMedia(node) {
  // Whitespace-insensitive, so a tool that reformats the query cannot make the
  // plugin nest a second gate inside the first.
  return node.type === 'atrule' && node.name === 'media' && squash(node.params) === GATE_KEY;
}

function shouldSkip(rule) {
  for (let node = rule.parent; node; node = node.parent) {
    if (node.type === 'rule') return true; // native CSS nesting: leave to the author
    if (node.type !== 'atrule') continue;
    if (isGateMedia(node)) return true;
    if (/keyframes$/i.test(node.name)) return true;
  }
  return false;
}

export default function hoverMedia() {
  return {
    postcssPlugin: 'postcss-hover-media',
    Rule(rule, { AtRule }) {
      if (!HOVER.test(rule.selector) || shouldSkip(rule)) return;

      const gated = rule.selectors.filter(isGateableSelector);
      if (gated.length === 0) return;
      const rest = rule.selectors.filter((selector) => !isGateableSelector(selector));

      const media = new AtRule({ name: 'media', params: HOVER_MEDIA_PARAMS });

      if (rest.length === 0) {
        // Whole rule is hover-only: wrap it where it stands.
        rule.replaceWith(media);
        media.append(rule);
        return;
      }

      // Mixed list: keep the non-hover selectors where they are and gate the
      // hover ones in a copy placed right after, preserving cascade order.
      const copy = rule.clone({ selectors: gated });
      rule.selectors = rest;
      media.append(copy);
      rule.after(media);
    },
  };
}

hoverMedia.postcss = true;
