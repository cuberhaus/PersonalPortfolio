/**
 * Markup contract for the decorative "opens elsewhere" arrow that replaced the `↗` character
 * (issue #280). Rendered with `renderToStaticMarkup`, like the other component tests: the static
 * markup is exactly what a visitor's browser and screen reader receive.
 */
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import ExternalArrow from '../components/ExternalArrow';

describe('ExternalArrow', () => {
  const markup = renderToStaticMarkup(<ExternalArrow />);

  it('is an inline SVG with no text, so font fallback cannot turn it into an emoji', () => {
    expect(markup).toMatch(/^<svg\b/);
    expect(markup.replace(/<[^>]*>/g, '')).toBe('');
  });

  it('is decorative: hidden from assistive technology', () => {
    expect(markup).toContain('aria-hidden="true"');
  });

  it('stays on the text line although the global reset makes every svg block-level', () => {
    // global.css sets `img, svg { display: block }`; without this override the arrow wraps
    // onto a line of its own below "View credential".
    expect(markup).toContain('display:inline-block');
  });

  it("trims lucide's built-in padding so it takes about as much room as the glyph did", () => {
    // The icon is drawn on a 24-unit canvas with a quarter of it empty on each side. Left as is,
    // a 1em box is ~5px wider than the glyph it replaced, which pushed "Open in Nbviewer" onto a
    // row of its own on a 390px-wide phone. Negative inline margins give it a glyph-like advance.
    expect(markup).toMatch(/margin-inline:-0\.\d+em/);
  });

  it('takes its colour and size from the surrounding text', () => {
    expect(markup).toContain('stroke="currentColor"');
    expect(markup).toContain('width="1em"');
    expect(markup).toContain('height="1em"');
  });
});
