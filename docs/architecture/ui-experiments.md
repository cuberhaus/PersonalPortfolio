# UI/UX Experiments — What Was Tried and Rejected

Record of visual and interaction experiments tested on the portfolio,
so future agents and contributors don't re-propose the same ideas.

---

## Experience Section — Dynamic Redesigns (all rejected)

The original Experience section uses a **static vertical timeline** with
simple hover states (border-color change + box-shadow). Multiple dynamic
alternatives were prototyped and all were rejected by the user in favour
of the original.

### Variant A: Accordion Timeline

- Collapsed job entries that expand on click to reveal bullet details.
- **Verdict**: Felt clunky with only 2–3 entries. Accordion adds
  interaction cost without benefit when the list is short.

### Variant B: Tab Slider

- Horizontal company tabs that switch the visible job card.
- **Verdict**: "Not my style" — felt like a different site's design
  language, didn't match the Swiss-style aesthetic.

### Variant C: Carousel with Navigation

- Card-based carousel with prev/next buttons and dot indicators.
- Created as `ExperienceCarousel.astro` (now deleted).
- **Verdict**: Also rejected — carousel pattern felt out of place on a
  long-scroll portfolio.

### Variant D: Animated Gradient Line

- The timeline `::before` line draws in via `scaleY` animation on scroll.
- Active/hovered card gets an accent left-border and `translateX(4px)`.
- Used IntersectionObserver in a `<script>` tag.
- **Verdict**: "Weird" — the animated line highlighted multiple cards at
  once, the dot styling looked off, and the movement was distracting.

### Variant E: Simplified Reactive (subtle hover only)

- Removed the animated line but kept enhanced hover with accent border.
- **Verdict**: Still not right. The original simple hover is preferred.

**Conclusion**: The static timeline with basic `border-color-hover` +
`box-shadow` hover is the right design. Don't try to make it dynamic.

---

## Card Glow — Mouse-Tracking Radial Highlight (rejected)

A radial gradient (`::after` pseudo-element) that follows the cursor on
hover across all card-based sections (Work, Demos, Education,
Certifications).

### Implementation

- `src/lib/card-glow.ts` — set `--glow-x`/`--glow-y` CSS vars on
  `mousemove`, cleared on `mouseleave`.
- `.card-glow::after` in `global.css` — radial gradient positioned at
  the CSS vars, `opacity: 0 → 1` on hover.
- Respected `prefers-reduced-motion` and Astro view transitions.

### Iterations

1. **600px radius, 15% opacity** — way too prominent, flooded the card.
2. **300px radius, 8% opacity** — still visibly distracting, looked
   unprofessional against the clean Swiss aesthetic.
3. **250px radius, 4% opacity** — invisible. No visual payoff, just
   dead JS overhead.

**Conclusion**: The existing hover states (accent border, shadow lift,
gradient bar on Work/Demos cards) are sufficient. A mouse-tracking glow
adds complexity without improving the design. Don't re-implement this.

---

## General Observations

- The site's Swiss-style design works best with **restrained, consistent**
  hover states rather than flashy effects.
- The scroll-reveal system (`.reveal` / `.reveal-stagger` with
  IntersectionObserver) already provides enough visual dynamism.
- Sections that benefit from interactivity are those with **many items**
  (Certifications show-more/less, Demos show-more/less) — not those with
  few items (Experience with 2–3 entries).
