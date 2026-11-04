import { describe, it, expect } from 'vitest';
import postcss from 'postcss';
import hoverMedia, {
  HOVER_MEDIA_PARAMS,
  isGateableSelector,
} from '../../scripts/postcss-hover-media.mjs';

/** Whitespace-insensitive form: nodes the plugin creates carry no formatting. */
const compact = (css: string) => css.replace(/\s+/g, '');

const GATE = compact(`@media ${HOVER_MEDIA_PARAMS}`);

async function run(css: string): Promise<string> {
  const result = await postcss([hoverMedia()]).process(css, { from: undefined });
  return compact(result.css);
}

describe('isGateableSelector', () => {
  it('matches :hover and ignores negated hover', () => {
    expect(isGateableSelector('.card:hover')).toBe(true);
    expect(isGateableSelector('.card:hover .title')).toBe(true);
    expect(isGateableSelector('.card:not(:hover)')).toBe(false);
    expect(isGateableSelector('.card:focus-visible')).toBe(false);
    expect(isGateableSelector('.hoverable')).toBe(false);
  });
});

describe('postcss-hover-media', () => {
  it('wraps a hover-only rule in the hover media query', async () => {
    expect(await run('.card:hover { transform: translateY(-4px); }')).toBe(
      compact(`${GATE} { .card:hover { transform: translateY(-4px); } }`)
    );
  });

  it('leaves rules without :hover untouched', async () => {
    const css = '.card { color: red; } .card:focus-visible { outline: 2px solid; }';
    expect(await run(css)).toBe(compact(css));
  });

  it('keeps keyboard selectors unconditional when a list mixes hover and focus', async () => {
    expect(await run('.link:hover, .link:focus-visible { color: red; }')).toBe(
      compact(`.link:focus-visible { color: red; } ${GATE} { .link:hover { color: red; } }`)
    );
  });

  it('keeps cascade order: the gated copy sits right after its source rule', async () => {
    const out = await run('.a:hover, .a:focus { color: red; } .b { color: blue; }');
    expect(out.indexOf('.a:focus')).toBeLessThan(out.indexOf(GATE));
    expect(out.indexOf(GATE)).toBeLessThan(out.indexOf('.b{'));
  });

  it('does not gate :not(:hover) because that would delete the rule on touch', async () => {
    const css = '.card:not(:hover) { opacity: 0.8; }';
    expect(await run(css)).toBe(compact(css));
  });

  it('gates rules inside other at-rules and keeps the outer at-rule', async () => {
    expect(await run('@media (max-width: 768px) { .nav-link:hover { color: red; } }')).toBe(
      compact(`@media (max-width: 768px) { ${GATE} { .nav-link:hover { color: red; } } }`)
    );
  });

  it('skips keyframes', async () => {
    const css = '@keyframes pulse { 0% { opacity: 0; } 100% { opacity: 1; } }';
    expect(await run(css)).toBe(compact(css));
  });

  it('is idempotent: running twice does not nest the gate', async () => {
    const once = await run('.card:hover { color: red; }');
    expect(await run(once)).toBe(once);
  });

  it('handles descendant, pseudo-element and compound hover selectors', async () => {
    const out = await run(
      '.card:hover::before { opacity: 1; } .card:hover .title { color: red; } .a:hover:focus { color: blue; }'
    );
    expect(out.match(/@media/g)).toHaveLength(3);
    expect(out).toContain('.card:hover::before');
    expect(out).toContain('.card:hover.title');
    expect(out).toContain('.a:hover:focus');
  });
});
