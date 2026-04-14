---
name: Demo navigation component
overview: Add a "More Projects" navigation section at the bottom of every demo page, allowing users to browse and jump to other demos without going back to the portfolio home page.
todos:
  - id: i18n
    content: Add `demo.moreProjects` translation key to ui.ts (EN/ES/CA)
    status: completed
  - id: demo-nav-component
    content: Create `DemoNav.astro` component with responsive card grid, icons, and language-aware links
    status: completed
  - id: demo-layout
    content: Add `slug` prop to `DemoLayout.astro` and render `DemoNav` after the slot
    status: completed
  - id: thread-slug
    content: Add `slug` prop to all 14 demo page files
    status: completed
isProject: false
---

# Demo-to-Demo Navigation

## Approach

Add a reusable `DemoNav.astro` component that renders at the bottom of every demo page, showing a compact grid of other demos (excluding the current one) with clickable cards. This is implemented once in the shared `DemoLayout.astro` so every demo page gets it automatically.

## Key Files

- **New:** [PersonalPortfolio/src/components/DemoNav.astro](PersonalPortfolio/src/components/DemoNav.astro) -- the reusable navigation component
- **Edit:** [PersonalPortfolio/src/layouts/DemoLayout.astro](PersonalPortfolio/src/layouts/DemoLayout.astro) -- include `DemoNav` below the `<slot />`

## Component Design (`DemoNav.astro`)

- Accepts a `currentSlug` prop to exclude the current demo from the list
- Imports the demo list from `demos.json` / `demos.es.json` / `demos.ca.json` based on the current language
- Renders a section titled "More Projects" (translated for ES/CA) with a responsive grid of compact cards
- Each card shows: icon (reuse the SVG icon set from `Demos.astro`), title, tags, and links to `/demos/{slug}/` (or `/{lang}/demos/{slug}/`)
- Styled to match the existing dark card aesthetic (`var(--bg-card)`, `var(--border-color)`, accent hover)
- Cards use `data-astro-reload` links just like the main portfolio grid does

## Changes to `DemoLayout.astro`

- Accept an additional `slug` prop (the current demo's slug)
- After `<slot />`, render `<DemoNav currentSlug={slug} />` inside the `<main>` tag
- Each individual demo `.astro` page already passes its slug implicitly; we'll thread the slug through from `DemoLayout`

## i18n

- Add `'demo.moreProjects'` translation key to [PersonalPortfolio/src/i18n/ui.ts](PersonalPortfolio/src/i18n/ui.ts):
  - EN: "More Projects"
  - ES: "Mas Proyectos"
  - CA: "Mes Projectes"

## Passing the slug

Each demo page (e.g., `matriculas.astro`) already wraps content in `<DemoLayout title={title} ...>`. We add a `slug` prop:

```astro
<DemoLayout title={title} description="..." slug="matriculas">
```

This needs to be added to all 14 demo pages. A straightforward find-and-replace since they all follow the same pattern.
