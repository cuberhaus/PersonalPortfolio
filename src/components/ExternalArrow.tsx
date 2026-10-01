import { ArrowUpRight } from 'lucide-react';

/**
 * Decorative arrow that marks a link as opening somewhere else, as in "View credential".
 *
 * It is an inline SVG on purpose. U+2197 (north east arrow) and its siblings have an emoji form,
 * and the web fonts we load (Google's Inter and JetBrains Mono slices) do not contain them, so the
 * browser falls back to a system font. iOS answers with Apple Color Emoji and paints a coloured
 * tile instead of a monochrome arrow (issue #280). An SVG looks the same everywhere, follows the
 * surrounding text's colour and size, and is hidden from assistive technology as the glyph was.
 *
 * `display: inline-block` is required: global.css resets every svg to `display: block`, which would
 * push the arrow onto a line of its own below the label.
 *
 * The icon is drawn on a 24-unit canvas with a quarter of it empty on each side, so its visible
 * arrow is about 0.5em wide inside a 1em box: the same size as the glyph, but ~5px more advance.
 * The negative inline margins hand that padding back, so a label followed by the arrow takes about
 * as much room as it did with the glyph and does not reflow (measured: without the trim, "Open in
 * Nbviewer" wrapped onto its own row at 390px).
 */
export default function ExternalArrow() {
  return (
    <ArrowUpRight
      size="1em"
      strokeWidth={2}
      aria-hidden="true"
      style={{
        display: 'inline-block',
        flexShrink: 0,
        marginInline: '-0.2em',
        verticalAlign: '-0.125em',
      }}
    />
  );
}
