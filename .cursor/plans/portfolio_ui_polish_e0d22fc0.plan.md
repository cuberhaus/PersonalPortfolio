---
name: Portfolio UI Polish
overview: Fix a small set of verified UI issues (navbar wrap, theming-breaking hardcoded colors, FAB overlap, ambiguous client badge), then add category filtering to the demos grid, plus a light broader visual/UX pass.
todos:
  - id: navbar-wrap
    content: Fix 'Professional Work' navbar wrap (nowrap/breakpoint or shorten label in all 3 locales) in Navbar.astro
    status: completed
  - id: showmore-theming
    content: Replace hardcoded rgba(88,166,255) in Demos.astro .show-more-btn hover with color-mix(var(--accent-start))
    status: completed
  - id: fab-overlap
    content: Prevent ScrollToTop FAB from overlapping demo GitHub icon / skills chip
    status: completed
  - id: client-badge
    content: Clarify the company/client badge in WorkProjects.astro with a localized prefix or distinct chip
    status: completed
  - id: demo-categories-data
    content: Add category field to each demo in demos.json and surface via listDemos()
    status: completed
  - id: demo-filter-ui
    content: Add accessible category filter pills to Demos.astro reconciled with show-more logic + i18n labels (en/es/ca)
    status: completed
  - id: color-audit
    content: Audit shared components for stray literal colors; optionally tokenize Contact success/error colors
    status: completed
  - id: responsive-spotcheck
    content: Spot-check minimal/cyber/light designs at 375/768/1024/1440 for regressions
    status: completed
  - id: validate
    content: Run lint, check, vitest parity tests, and smoke e2e
    status: completed
isProject: false
---

# Portfolio UI Polish

A staged set of changes, ordered cheapest-first. Everything respects the repo's rules: no hardcoded hex/rgba in shared components (use `color-mix(... var(--accent-start) ...)`), all copy lives in `locales/{en,es,ca}` with identical keys/order (enforced by `content-parity.test.ts`), and animations stay wrapped for `prefers-reduced-motion`.

## Stage 1 - Quick polish fixes

### 1a. Navbar label wrap
`Professional Work` wraps to two lines between ~768px and ~1080px (hamburger only kicks in at `max-width: 768px`).
- In [src/components/Navbar.astro](src/components/Navbar.astro): add `white-space: nowrap;` to `.nav-link` (around line 101) and trim `.nav-links` gap slightly, OR raise the mobile collapse breakpoint to ~`900px`.
- Cleaner alternative: shorten the nav label only (keep the section heading). The label comes from `s.navKey`, so edit the relevant key in `locales/{en,es,ca}/ui.json` (e.g. "Professional Work" -> "Work"). Keep all three locales in sync.

### 1b. Theming bug - hardcoded blue in the demos "Show more" button
[src/components/Demos.astro](src/components/Demos.astro) lines ~434-435 use literal blue:

```css
.show-more-btn:hover {
  background: rgba(88, 166, 255, 0.1);
  box-shadow: 0 0 15px rgba(88, 166, 255, 0.2);
}
```

On any non-blue palette (synthwave/phosphor/amber/etc.) the hover glow clashes with the active accent. Replace with accent-derived tokens:

```css
background: color-mix(in srgb, var(--accent-start) 10%, transparent);
box-shadow: 0 0 15px color-mix(in srgb, var(--accent-start) 20%, transparent);
```

### 1c. Scroll-to-top FAB overlap
The FAB ([src/components/ScrollToTop.astro](src/components/ScrollToTop.astro), `position: fixed; z-index: 99`) visually covers the GitHub icon on the right demo card and the last skills chip. Low-effort mitigations (pick one):
- Add bottom padding / scroll-margin to the final sections so trailing interactive elements never sit under the FAB, or
- Nudge the FAB (`bottom`/`right`) and confirm it never overlaps the right column at the 2-column (`<=1024px`) breakpoint.

### 1d. Clarify the "HORSE" client badge
The featured-work `.work-badge` renders `project.company` (e.g. `HORSE`), which reads like an unexplained codename. In [src/components/WorkProjects.astro](src/components/WorkProjects.astro) (badge at lines ~53 and ~71) add a small localized prefix label (e.g. a `projects.client` key -> "Client") or a visually-distinct chip so visitors understand it's the client/employer.

## Stage 2 - Demo category filtering (enhancement)

The grid already does progressive disclosure (6 shown, rest behind "Show more"), so this is additive, not a rewrite. There is currently no `category` field.

- Add a `category` to each entry in [src/data/demos.json](src/data/demos.json) (~20 demos). Suggested buckets: `ai-ml`, `web`, `algorithms`, `graphics`, `robotics`, `academic`. Surface it through [src/i18n/demo.ts](src/i18n/demo.ts) `listDemos()`.
- Add a filter pill row above `#demo-grid` in [src/components/Demos.astro](src/components/Demos.astro) ("All" + one pill per category), styled with accent tokens and `cursor-pointer`. Wire the existing `astro:page-load` script to toggle a `data-category` filter, reconciling with the show-more visibility logic and `prefers-reduced-motion`.
- Category labels go in `locales/{en,es,ca}/demos.json` (or `ui.json`) with identical keys/order in all three locales.
- Use `aria-pressed` on the active pill and `role="status"`/`aria-live` for result-count feedback.

## Stage 3 - Broader visual/UX pass (light)

- Audit shared (non-design-specific) components for stray literal colors like Stage 1b. Most hits in [src/components/ThemeInit.astro](src/components/ThemeInit.astro) are intentional per-design custom tokens and should be left alone; focus on generic components. Semantic status colors in [src/components/Contact.astro](src/components/Contact.astro) (`#10b981`, `#ef4444`) could become `--color-success` / `--color-error` tokens for theme consistency (optional).
- Verify hover affordances and `cursor: pointer` on all clickable cards across designs.
- Spot-check 2-3 representative designs (minimal, cyber, a light one) at 375 / 768 / 1024 / 1440 to confirm no regressions from the above.

## Validation
- `npm run lint` and `npm run check`.
- `npx vitest run content-parity data-integrity designs` after any locale/JSON edits (locale key parity is enforced).
- `npm run test:e2e:smoke`; optionally the `themes` Playwright project to confirm theming holds across palettes.
- Manual: re-check navbar at ~900-1080px, the Show more hover glow under a non-blue theme, and FAB overlap at `<=1024px`.