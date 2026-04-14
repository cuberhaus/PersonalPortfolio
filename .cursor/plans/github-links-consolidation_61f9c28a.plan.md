---
name: github-links-consolidation
overview: Add uniform GitHub links to demo cards and demo page headers, while removing the old scattered links across different components.
todos:
  - id: update-json-data
    content: Add `github` string to all entries in `demos.json`, `demos.es.json`, and `demos.ca.json`
    status: pending
  - id: update-demo-cards
    content: Refactor `Demos.astro` to support a dedicated GitHub link per card while keeping the card clickable
    status: pending
  - id: add-header-links
    content: Add a standardized `.demo-header-github` button to the header of all 14 `.astro` demo pages
    status: pending
  - id: cleanup-old-links
    content: Remove scattered GitHub links from `.astro` footers and `.tsx` interactive components
    status: pending
isProject: false
---

# Consolidate GitHub Links for Demos

This plan will unify how GitHub links are displayed across the portfolio. It ensures links are consistently located on both the main portfolio demo cards and within the header of every individual demo page. Old, scattered links will be cleaned up.

## Steps

1. **Update Data Files:**
  - Add a `github` property to every demo entry in `src/data/demos.json`, `src/data/demos.es.json`, and `src/data/demos.ca.json`. 
  - *Example:* `"github": "https://github.com/cuberhaus/TFG"`
2. **Update Main Portfolio Cards (`src/components/Demos.astro`):**
  - Refactor `.demo-card` from an `<a>` tag to a `<article>` or `<div>` to avoid nested links.
  - Implement the "pseudo-element trick" so the entire card remains clickable (linking to the demo page).
  - Add a newly styled GitHub anchor icon to the card (e.g., top-right corner or alongside the tags) with a higher z-index so it can be clicked independently.
3. **Update Demo Page Headers (14 `.astro` files):**
  - Add a standardized "View Source" button to the `.demo-header` section of each page inside `src/pages/demos/`.
  - The button will use existing localization keys (e.g., `t.viewSource`).
  - For `draculin.astro`, we will add both the Frontend and Backend links to the header.
4. **Clean up scattered links:**
  - Remove existing footer/bottom-page links from `joc-eda.astro`, `pro2.astro`, `tenda.astro`, `mpids.astro`, `prop.astro`, `jsbach.astro`, `matriculas.astro`, `phase-transitions.astro`, `draculin.astro`.
  - Remove inline hardcoded GitHub links and repository `git clone` snippets from interactive React components (`TfgPolypDemo.tsx`, `BitsXMaratoDemo.tsx`, `DesastresIADemo.tsx`, `PlanificacionDemo.tsx`, `ApaPracticaDemo.tsx`).

