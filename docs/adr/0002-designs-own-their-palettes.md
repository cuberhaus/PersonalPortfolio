# ADR-0002: Each design owns its palettes

- Status: accepted
- Date: 2026-11-04

## Context

Design (typography, layout, borders) and palette (colour tokens) were
independent axes. The Ctrl+K picker offered 17 designs and 14 palettes, so a
visitor could reach 238 combinations, and most of them were nobody's
decision: a comic-book design in Nord, a brutalist one in Solarized, a
terminal in Catppuccin. The palettes were also borrowed editor colour schemes
(Nord, Dracula, Gruvbox, Tokyo Night, Solarized, Catppuccin, One Dark), none
of which was composed for this site.

The borrowed set leaked into the design CSS. Five designs carried a six-name
list of "light palettes" to patch their contrast; four others diluted the
palette's background with a fixed cream (`color-mix(var(--bg-primary) 70%,
#fffef2)`) to look like paper, which turned a navy night into grey. The picker
papered over the rest with a ★ "recommended" hint that nothing enforced.

## Decision

Each design owns exactly two palettes, a dark _night_ and a light _day_,
composed for that design. A palette is only ever offered with, and applied to,
its own design.

1. `src/lib/themes.ts` registers every palette with the `design` that owns it.
   Minimal's are the original `dark` and `light`; every other design has
   `<design>-night` and `<design>-day`, defined in `src/styles/themes.css`.
2. `src/lib/palettes.ts` is the single definition of the rule:
   `resolvePalette(design, id, fallbackScheme)` keeps an owned palette, snaps
   any other id to the design's palette of the **same scheme** (so switching
   design never flips night and day), and uses the system preference for ids
   nobody knows. The head script in `ThemeInit.astro` carries a deliberately
   small copy of that function because it cannot import.
3. The picker shows only the active design's two palettes. `window.setDesign`
   snaps; `window.setTheme(id)` switches to the design that owns `id`, and a
   `?theme=` deep link does the same unless `?design=` is also given.
4. The famous schemes are retired, not hidden. A stored retired id snaps by
   scheme; retired light ids are listed in `RETIRED_LIGHT_THEME_IDS` so a
   returning visitor who chose a light theme stays in light.
5. Designs take their ground from the palette. The paper-dilution mixes and
   the light-palette name lists are removed; a design that needs a light-only
   override keys it on its own `-day` palette.
6. Palette names are localized in `locales/*/designs.json`
   (`paletteNight`, `paletteDay`), unique within a locale.

## Consequences

- The site has 34 looks, every one composed on purpose. The 238 reachable
  combinations, and the ★ hint, are gone.
- `theme-contrast.test.ts` already audits every `html[data-theme]` block, so
  each new palette is held to WCAG AA automatically. `themes.test.ts` also
  fails if a design pairs with a palette it does not own.
- Accessibility specs audit each (design, own palette) pair rather than each
  palette on the default design, which makes the a11y project about twice as
  large.
- Adding a design means shipping two palettes with it (registry entry, CSS
  block, two localized names). A design is no longer one CSS block that works
  everywhere.
- Persisted choices and shared links keep working: they resolve through the
  rule above and are corrected in storage.

## Alternatives considered

- **Keep all palettes selectable, only hint.** Rejected: that was the status
  quo, and a hint nothing enforces does not stop the ugly combinations.
- **Curate three to five palettes per design.** Rejected: more to compose and
  maintain, and the extra choices were the problem, not the cure.
- **Hide mismatched palettes but keep the shared set.** Rejected: it keeps the
  borrowed schemes, and the designs would still be written to survive any of
  them.
