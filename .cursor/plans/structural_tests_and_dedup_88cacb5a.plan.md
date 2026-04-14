---
name: Structural Tests and Dedup
overview: Add structural integrity tests that catch drift between duplicated parts of the codebase, then deduplicate SVG icons, the theme script, and the demo page boilerplate (shared header, GitHub link, CSS).
todos:
  - id: structural-tests
    content: "Add structural tests: icon parity, navbar-section sync, slug prop check, description locale check"
    status: completed
  - id: dedup-icons
    content: Extract shared SVG icon paths to src/lib/demo-icons.ts, update Demos.astro + DemoNav.astro + test
    status: completed
  - id: dedup-theme
    content: Extract theme init script to src/components/ThemeInit.astro, use in both layouts
    status: completed
  - id: dedup-header
    content: Create DemoHeader.astro component, refactor 14 demo pages to use it
    status: completed
isProject: false
---

# Structural Tests and Deduplication

## Part 1: New Structural Tests

These are "meta" tests that catch when two things that should stay in sync drift apart -- exactly like the homepage parity test that would have caught the missing WorkProjects.

### Test: Icon keys in Demos.astro and DemoNav.astro match

Both files render SVG icons keyed by `demo.icon`. `Demos.astro` uses inline conditionals (`demo.icon === 'gamepad' && ...`) while `DemoNav.astro` uses an `ICONS` dictionary. If a new icon is added to one but not the other, the icon silently disappears. The test should parse both files and assert the same set of icon keys.

### Test: Navbar anchor hrefs match homepage section IDs

`Navbar.astro` links to `#about`, `#projects`, `#skills`, `#experience`, `#education`, `#contact`. Each homepage component defines its section `id`. A test should extract anchor hrefs from Navbar and section IDs from the homepage components, then assert they match. (Note: `WorkProjects.astro` has `id="work"` with no nav link -- the test can document that as intentional.)

### Test: Every demo .astro page passes slug to DemoLayout

All 14 demo pages should pass `slug="<matching-slug>"` to `DemoLayout`. A test can read each file and assert it contains `slug="<filename>"` where filename matches the `.astro` basename.

### Test: DemoLayout description is not hardcoded English for localized pages

Several demo pages pass an English-only `description` string to `DemoLayout` (used in `<meta>` tags). A test could flag this pattern: if the page has localized `titles` but the `description=` prop is a plain string literal rather than a variable.

## Part 2: Deduplication -- Icons

**Current state**: SVG icon paths are defined in 3 places:

- `Demos.astro` lines 29-128: 14 inline `{demo.icon === '...' && <svg>}` blocks (28px)
- `DemoNav.astro` lines 22-36: `ICONS` dictionary (20px)
- `data-integrity.test.ts` lines 14-18: `VALID_ICONS` array

**Proposed**: Create a single `src/lib/demo-icons.ts` module that exports:

- `ICON_PATHS: Record<string, string>` -- just the SVG path data (no size)
- A helper `renderIcon(icon: string, size: number): string` that wraps paths in an SVG tag

Both `Demos.astro` and `DemoNav.astro` import from this module. The test imports `ICON_PATHS` keys directly instead of hardcoding `VALID_ICONS`.

## Part 3: Deduplication -- Theme Script

**Current state**: Identical 16-line inline `<script is:inline>` block in both `[Layout.astro](src/layouts/Layout.astro)` (lines 29-45) and `[DemoLayout.astro](src/layouts/DemoLayout.astro)` (lines 45-61).

**Proposed**: Extract to `src/components/ThemeInit.astro` containing just the `<script is:inline>` block. Both layouts import and render `<ThemeInit />` in their `<head>`.

## Part 4: Deduplication -- Demo Page Boilerplate

**Current state**: All 14 demo `.astro` pages repeat:

- Same `titles` / `leads` / `badges` / `viewSource` pattern (en/es/ca objects)
- Same GitHub link SVG + markup (~12 lines)
- Same `.demo-header` / `.badge` / `.demo-lead` CSS (~50 lines, only gradient colors differ)

**Proposed**: Create `src/components/DemoHeader.astro` that accepts props:

```typescript
interface Props {
  badge: string;
  title: string;
  lead: string;
  githubUrl: string | string[];
  githubLabel: string;
}
```

Each demo page then becomes much shorter -- just define the translation objects and pass resolved values. The shared CSS lives in `DemoHeader.astro`'s scoped style.

This reduces each demo page from ~130 lines to ~50-60 lines.

## What I would NOT change

- **Per-demo TRANSLATIONS in .tsx files**: These are large (32-194 lines) but each is unique content. Moving them to JSON files would add 13x3=39 new files and require a different import pattern in React. The current approach keeps each demo self-contained. Not worth the churn.
- `**[lang]/demos/[demo].astro` conditionals**: Astro doesn't support dynamic component imports well in static mode. The 14 conditionals are ugly but functional and already tested.
- **Inline styles in React demos**: Converting to CSS modules across 13 large files would be a massive refactor with high risk and low user-facing benefit.

