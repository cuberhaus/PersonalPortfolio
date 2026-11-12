---
name: Personal Portfolio
description: A strict Swiss grid in Mediterranean mineral colors, with one coral signal.
colors:
  ground-night: '#101a18'
  ground-night-raised: '#162521'
  card-night: '#1b2d28'
  ink-night: '#f2f6f1'
  ink-night-soft: '#c3d0ca'
  ink-night-muted: '#9aada5'
  rule-night: '#2d4841'
  teal-night: '#56c7b2'
  teal-night-text: '#68d2bd'
  coral-night: '#ff8a65'
  ground-day: '#f4f7f2'
  ground-day-raised: '#e7eee9'
  card-day: '#ffffff'
  ink-day: '#17231f'
  ink-day-soft: '#3f514b'
  ink-day-muted: '#52645e'
  rule-day: '#cbd8d1'
  teal-day: '#006d72'
  teal-day-text: '#00686d'
  coral-day: '#b9472f'
typography:
  display:
    fontFamily: 'Inter Tight, Helvetica, Arial, Helvetica Neue, sans-serif'
    fontSize: 'clamp(4rem, 12vw, 8rem)'
    fontWeight: 900
    lineHeight: 0.9
    letterSpacing: '-0.05em'
  numeral:
    fontFamily: 'Inter Tight, Helvetica, Arial, Helvetica Neue, sans-serif'
    fontSize: 'clamp(3rem, 8vw, 7rem)'
    fontWeight: 800
    lineHeight: 1
    letterSpacing: '-0.05em'
    fontFeature: 'tnum'
  headline:
    fontFamily: 'Inter Tight, Helvetica, Arial, Helvetica Neue, sans-serif'
    fontSize: 'clamp(2.5rem, 6vw, 4.5rem)'
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: '-0.04em'
  title:
    fontFamily: 'Inter Tight, Helvetica, Arial, Helvetica Neue, sans-serif'
    fontSize: 'clamp(1.25rem, 2.5vw, 1.5rem)'
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: '-0.03em'
  body:
    fontFamily: 'Inter Tight, Helvetica, Arial, Helvetica Neue, sans-serif'
    fontSize: '1rem'
    fontWeight: 400
    lineHeight: 1.7
    letterSpacing: '-0.005em'
  label:
    fontFamily: 'Inter Tight, Helvetica, Arial, Helvetica Neue, sans-serif'
    fontSize: '0.75rem'
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: '0.12em'
  button:
    fontFamily: 'Inter Tight, Helvetica, Arial, Helvetica Neue, sans-serif'
    fontSize: '0.95rem'
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: '0.15em'
  mono:
    fontFamily: 'JetBrains Mono, ui-monospace, monospace'
    fontSize: '0.875rem'
    fontWeight: 400
    lineHeight: 1.6
rounded:
  none: '0px'
spacing:
  gutter: '24px'
  gutter-narrow: '20px'
  section: '112px'
  section-inset: '64px'
  container: '1180px'
components:
  button-primary:
    backgroundColor: '{colors.coral-night}'
    textColor: '{colors.ground-night}'
    typography: '{typography.button}'
    rounded: '{rounded.none}'
    padding: '13.6px 32px'
  button-primary-day:
    backgroundColor: '{colors.coral-day}'
    textColor: '{colors.card-day}'
    typography: '{typography.button}'
    rounded: '{rounded.none}'
    padding: '13.6px 32px'
  card:
    backgroundColor: 'transparent'
    textColor: '{colors.ink-night}'
    rounded: '{rounded.none}'
  skill-pill:
    backgroundColor: 'transparent'
    textColor: '{colors.ink-night-soft}'
    rounded: '{rounded.none}'
    padding: '6.4px 16px'
  nav-link:
    textColor: '{colors.ink-night-soft}'
    typography: '{typography.label}'
---

# Design System: Personal Portfolio

## Overview

**Creative North Star: "The Signal Board"**

A transit signage board is a design system that has to be read at a glance by someone who is already moving. That is the brief for a portfolio that a recruiter skims. The page is a strict grid of ruled boxes and large grotesque type, set on mineral surfaces (a deep green-black at night, a pale chalk-green by day), with one coral signal reserved for position and action. Structure comes from lines and from type size, never from decoration.

The system is warm only in its palette and its voice. Layout stays exact: full-contrast hairlines divide sections, every section carries a giant numeral in the margin, and nav labels are small, uppercase and tracked, the way stops are on a platform sign. Nothing floats, glows, blurs or rounds. When a visitor needs to act (download a CV, send a message), exactly one filled coral control says so.

This file documents the default design (Swiss) and its two palettes (Barcelona Signal night and day). The site ships 16 other designs in a studio; those are an experiment and sit outside this system. Everything built for the default must still read correctly through the theme tokens when another design is active.

**Key Characteristics:**

- A strict grid with a 1180px container and 1px full-contrast rules between sections.
- One sans family (Inter Tight) at extreme weights and sizes; hierarchy is size and weight, not color.
- Zero radius, shadow and gradient, at rest and on hover, on the default design.
- Teal carries structure and emphasis; coral marks position and the single action.
- A night and a day palette, chosen by system preference on first visit, each held to WCAG AA.

## Colors

A mineral ground, off-white or near-black ink, a teal for structure, and a coral signal used sparingly. The night and day palettes are two compositions of the same roles, not a color inversion.

### Primary

- **Platform Teal** (night `#56c7b2`, day `#006d72`): structure and emphasis. Used for the nav underline, the `gradient-text` emphasis words, links and focus rings. As plain text it is always the text-safe shade (`#68d2bd` night, `#00686d` day), never the raw accent.

### Secondary

- **Signal Coral** (night `#ff8a65`, day `#b9472f`): position and action. Used for the section numerals and the fill of the one primary action. Nothing else.

### Neutral

- **Station Ground** (night `#101a18`, day `#f4f7f2`): page background and nav background.
- **Raised Ground** (night `#162521`, day `#e7eee9`): secondary bands and quiet fills.
- **Card Ground** (night `#1b2d28`, day `#ffffff`): used by the non-Swiss designs; on the default design cards are transparent and show Station Ground.
- **Ink** (night `#f2f6f1`, day `#17231f`): headings, rules, and every border on the default design.
- **Soft Ink** (night `#c3d0ca`, day `#3f514b`): body copy.
- **Muted Ink** (night `#9aada5`, day `#52645e`): captions and secondary labels. Still AA on every surface.
- **Mineral Rule** (night `#2d4841`, day `#cbd8d1`): quiet dividers inside components. The structural rules use Ink instead.

### Named Rules

**The One Signal Rule.** Coral marks where you are (the section numeral) and what to do (the one filled action). It never decorates, never fills a card, and never appears as text on a paragraph.

**The Ink Rule.** Structural lines (section tops, card borders, the nav underline) are Ink at 1px, not a tinted grey. The grid is meant to be seen.

**The Text-Safe Accent Rule.** Raw teal is for fills, borders and decoration. As text it is the `accent-text` shade, which clears 4.5:1 on all four surfaces.

## Typography

**Display Font:** Inter Tight (with Helvetica, Arial, Helvetica Neue)
**Body Font:** Inter Tight (same family)
**Label/Mono Font:** JetBrains Mono, for code and technical readouts only

**Character:** A tightly set Helvetica-lineage grotesque used the Swiss way: one family, wide range of weight and scale, negative tracking on large sizes, positive tracking on small caps labels. Contrast comes from size, not from pairing a second typeface.

### Hierarchy

- **Display** (900, `clamp(4rem, 12vw, 8rem)`, 0.9 line-height, -0.05em): the hero name only. Falls to `clamp(2.5rem, 14.5vw, 4rem)` below 481px so "Casacuberta" stays inside the viewport.
- **Numeral** (800, `clamp(3rem, 8vw, 7rem)`, 1, -0.05em, tabular figures): the section number in the right margin, in Signal Coral.
- **Headline** (800, `clamp(2.5rem, 6vw, 4.5rem)`, 1.2, -0.04em): section titles.
- **Title** (700, `clamp(1.25rem, 2.5vw, 1.5rem)`, 1.2, -0.03em): card and item titles.
- **Body** (400, 1rem, 1.7, -0.005em): running copy in Soft Ink, measured at 65-75ch where it is a paragraph.
- **Label** (600, 0.75rem, 0.12em, uppercase): nav links, the hero greeting, section labels.
- **Button** (700, 0.95rem, 0.15em, uppercase): the primary action only.

### Named Rules

**The Size-Not-Color Rule.** Hierarchy is carried by scale and weight. Headings are Ink; do not use an accent color to make a heading important.

**The Tracked-Caps Rule.** Uppercase is for short labels and the action, always tracked open (0.12em to 0.15em). Never uppercase a sentence.

## Layout

A single 1180px container with 24px side gutters (20px below 768px). Sections stack vertically and each opens with a 1px Ink rule, 64px of inset, and 112px of section padding (64px on phones). The section numeral sits in the right margin, aligned to the right edge of the content column rather than the viewport. Content is left-aligned on the grid; the demo grid is three equal columns with 24px gaps on desktop and reflows on narrower screens. The nav is a fixed bar with an Ink rule under it, no blur, and a 4rem height; on small screens its links become a large-type menu.

Spacing rhythm is generous between sections and tight inside components. Vary the inner spacing so related items sit close and unrelated groups have room; do not apply one padding to every box.

## Elevation & Depth

Flat at rest. The default design sets `--shadow-card: none`, removes the nav blur, and hides the hero gradient and grid. Depth is conveyed by ruled outlines, by scale, and by the numeral overlapping the section edge. Feedback is the only motion on a surface: a press scales a control to 0.97 for 120ms.

Hover on a card holds its place: the border takes Platform Teal and doubles in weight through a zero-blur inset hairline. Input focus does the same. The base component CSS still carries a glow and a lift for the other designs; the Swiss design overrides both, and new components should not copy them.

### Named Rules

**The Flat-By-Default Rule.** Surfaces are flat at rest. State is shown with color, underline, or border weight, never with a drop shadow or glow.

## Shapes

Every corner is square (0 radius). Containers are outlined by a 1px Ink border; there are no pills, circles or chamfers on the default design (pills and tags are rectangles with the same border). Icons are linear and stroked. A section numeral is the only large graphic form.

## Components

Ruled and exact: outlined boxes, tracked-caps labels, one filled coral action.

### Buttons

- **Shape:** square (0 radius), 13.6px by 32px padding.
- **Primary:** Signal Coral fill, ground-colored text at night (`#101a18`) and white by day, uppercase at 0.15em, weight 700, no border. This is the single filled control in a view.
- **Hover / Focus:** the fill darkens 12% toward Ink; it never lifts or glows. The press scales to 0.97 for 120ms. Keyboard focus draws a 2px teal outline offset by 4px; never remove it.
- **Quiet link:** the way on from the hero (`hero-link`) is a text link in Label type with a 1px teal underline, not a second button. A view has one filled action and any other path is a link.
- **Repeated actions:** the CV panel's "Download" in About (set like the hero's button) and a demo card's "Watch video" are the action of their own block, so they take the same coral fill. A control that only moves the visitor around the page (back to top) does not.

### Chips

- **Style:** `skill-pill` and the demo and work tags are transparent rectangles with a 1px Ink border, Soft Ink text at 0.85rem, weight 500, 6.4px by 16px padding.
- **Filter chips:** `demo-filter-btn`, `cert-filter-btn`, `show-more-btn` and `certifications-toggle` are weight 600 rectangles (the filters 0.85rem, 8px by 20px; the two "Show more" buttons 0.95rem, 12px by 32px) with a transparent fill and a 1px Ink border. Hover moves border and text to Platform Teal; the selected chip inverts to Ink fill with ground-colored text, so selection reads without coral. Selection is exposed with `aria-pressed`. Filter rows and "Show more" sit on the left of the grid under the title, never centred.
- **Back to top:** `scroll-to-top` is position, not the action, so it is an outlined 3rem square in Ink with the same teal hover. It has no fill and no glow.

### Cards / Containers

- **Corner Style:** square.
- **Background:** transparent; the card shows the page ground.
- **Shadow Strategy:** none at rest (see Elevation).
- **Border:** 1px solid Ink.
- **Internal Padding:** varies by component. The contact form uses 40px, 24px on phones.

### Inputs / Fields

- **Style:** square, page-ground fill, 1px Mineral Rule border, 12px by 16px padding, body type at 1rem.
- **Focus:** the border moves to Platform Teal and doubles in weight (an inset 1px hairline, no glow); the global 2px teal outline with 4px offset applies to every other focusable element.
- **Error / Disabled:** status colors come from the palette (`#991b1b`/`#166534` on day; the lighter set at night), always paired with a text message. Never use coral for status.

### Navigation

- **Style:** fixed bar on Station Ground with a 1px Ink rule beneath it. Links are Label type (uppercase, 0.12em), Soft Ink, turning Ink on hover or when active. A 2px teal underline grows from zero width on hover and focus. The tap target is extended to 44px with an invisible box.
- **Mobile:** a large-type menu with 1.75rem, weight 600 links and no underline.

### Section Header (signature)

Each section is introduced by a coral numeral in the right margin, a small tracked-caps label, and a Headline-size title. The numeral is decorative and `pointer-events: none`; the title and label carry the meaning.

### Motion

Entrances are one-shot and short: content settles up 16px over 420ms with a strong ease-out (`cubic-bezier(0.23, 1, 0.32, 1)`), with children staggered 50ms apart and capped at the sixth. State changes use 150ms. Nothing loops or autoplays. `prefers-reduced-motion` removes all movement and keeps opacity.

## Do's and Don'ts

### Do:

- **Do** use the theme variables (`var(--text-primary)`, `var(--accent-text)`, `var(--bg-primary)`) in every component and demo, never raw hex; the palette is swapped at runtime and the studio reshapes the rest.
- **Do** draw structure with 1px Ink rules and let the section numerals and large type fill the space.
- **Do** keep exactly one filled coral action per view.
- **Do** use `accent-text` for any accent-colored text, and verify new color pairs against WCAG AA on both palettes.
- **Do** keep every corner square on the default design and state that in new components.
- **Do** use `demoPanel` and `gradientButton` from `src/components/demos/_styles.ts` for demo panels and actions so the active design can reshape them.

### Don't:

- **Don't** use indigo-to-purple gradients, glow, or glass cards (the generic dev-portfolio look).
- **Don't** use SaaS landing-page tropes: a row of vanity metrics or identical icon-over-heading-over-text card grids.
- **Don't** add ornament for its own sake: decorative shapes, stock illustration, or emoji (iOS also turns many text glyphs into colored tiles).
- **Don't** put coral on body text, cards, or secondary buttons; it is the signal and loses meaning if it spreads.
- **Don't** add shadows, blur, gradients, rounded corners, or hover lift to new components on the default design, and don't bring back the base card-hover glow.
- **Don't** set sentences in uppercase or in a second typeface to create emphasis.
- **Don't** let a decorative element carry meaning; the numeral and any icon are `aria-hidden` and the text stands alone.
