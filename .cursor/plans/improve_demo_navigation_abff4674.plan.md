---
name: Improve Demo Navigation
overview: Redesign the DemoNav component to add sequential prev/next navigation and limit the "more projects" grid to a curated subset, making it easier to browse demos without being overwhelmed.
todos:
  - id: demo-nav-redesign
    content: "Redesign DemoNav.astro: add prev/next strip with descriptions, limit explore grid to 4 random demos"
    status: completed
isProject: false
---

# Improve Demo Navigation

## Current Problems

- Shows all 13 other demos in a flat grid -- overwhelming, no hierarchy
- No sequential prev/next navigation -- users can't step through demos in order
- Every card has equal visual weight -- no sense of "what's next"

## Design

Split the section into two parts:

**1. Prev / Next strip** -- Two side-by-side cards (or one if at the first/last demo) showing the previous and next demo in order (based on `demos.json` array position). These are larger, more prominent cards with the description included. Uses arrow icons to hint at direction.

```
+--- Previous -------------------+--- Next -----------------------+
| <  WPGMA Clustering            |    MPIDS Solver              > |
|    Build phylogenetic trees... |    Find the minimum dom...     |
|    TypeScript · Algorithms · D3|    Algorithms · Graph · TS     |
+--------------------------------+--------------------------------+
```

**2. Explore more** -- Below that, show up to 4 randomly selected demos (excluding current, prev, next) in the existing compact 2-column card style. This keeps the section short and fresh on each build.

## File Changes

**Modified: `[src/components/DemoNav.astro](src/components/DemoNav.astro)`**

- Import demo data as before, find current index in the array
- Compute `prev` and `next` demos from array position (wrap around)
- Pick 4 random other demos (excluding current, prev, next)
- Render the prev/next strip as larger cards with descriptions
- Render the "Explore more" grid with the existing compact card style
- Update styles: prev/next cards get a two-column layout with larger text and description, mobile stacks them vertically

No other files need to change -- DemoNav is self-contained and already receives `currentSlug` as prop.