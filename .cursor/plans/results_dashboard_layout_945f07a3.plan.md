---
name: Results dashboard layout
overview: Replace the tab-based results interface with a single-page dashboard that shows all three sections simultaneously, eliminating the need to switch between tabs and the associated component lifecycle issues.
todos:
  - id: remove-tabs
    content: Remove tab state/buttons from app.ts and app.html, replace with dashboard grid layout
    status: completed
  - id: css-grid
    content: Add CSS grid layout for results dashboard with responsive breakpoint
    status: completed
  - id: section-headers
    content: Add section headers/cards around each component for visual separation
    status: completed
  - id: verify
    content: Test all three sections render correctly without tab switching
    status: completed
isProject: false
---

# Results Dashboard Layout

## Problem with Tabs

The current tab interface has several downsides:

- Components are destroyed/recreated on each tab switch (causing change detection and Three.js init bugs)
- The user can only see one thing at a time -- they can't compare the frame overlay with the measurement
- The workflow is linear (pick frame -> measure -> view 3D) but tabs hide that relationship

## Proposed Layout: Vertical Dashboard

A single scrollable page with all three sections stacked vertically, each in its own card. The user sees everything at once and scrolls naturally. On wide screens, the frame viewer and measurement sit side-by-side since they're related (you pick a frame, then measure it).

```
+---------------------------------------------------------------+
| Aorta Viewer              [NVIDIA RTX 5090]    [New Video]    |
+---------------------------------------------------------------+
| [====== RUNNING INFERENCE 67/101 (66%) ======]                |
| Processing frame 67/101                                       |
+---------------------------------------------------------------+
|                                                               |
|  FRAME VIEWER (left 60%)      |  MEASUREMENT (right 40%)     |
|  +-------------------------+  |  +------------------------+   |
|  |  [overlay image]        |  |  | Frame 12               |   |
|  |                         |  |  | Scale: [0.03378] cm/px |   |
|  |                         |  |  | [Measure Diameter]     |   |
|  +-------------------------+  |  |                        |   |
|  [<] ---====----------- [>]  |  | 2.34 cm                |   |
|  Frame 12/101  [Overlay v]   |  | Within normal range    |   |
|                               |  +------------------------+   |
+---------------------------------------------------------------+
|                                                               |
|  3D MODEL                                                     |
|  [Generate 3D Mesh]  Drag to rotate, scroll to zoom          |
|  +----------------------------------------------------------+ |
|  |                                                          | |
|  |              [Three.js canvas]                           | |
|  |                                                          | |
|  +----------------------------------------------------------+ |
+---------------------------------------------------------------+
```

## Key Changes

### Layout structure in `[web/frontend/src/app/app.html](web/frontend/src/app/app.html)`

- Remove tab buttons and `activeTab` state entirely
- Replace with a two-row grid layout:
  - **Row 1**: Frame viewer (left, ~60%) + Measurement panel (right, ~40%), side by side
  - **Row 2**: 3D model viewer, full width
- All three components are always visible (no `@if` or `[hidden]` switching)
- The measurement component auto-updates when the user selects a frame (via `selectedFrame` binding)

### CSS in `[web/frontend/src/app/app.css](web/frontend/src/app/app.css)`

- Remove `.tabs`, `.tab`, `.tab-content` styles
- Add a `.results-grid` with CSS grid: `grid-template-columns: 1fr 380px` for the top row
- Add a `.results-full` for the bottom row (3D viewer)
- Responsive: on screens below ~900px, stack everything vertically

### Component changes

- `**[app.ts](web/frontend/src/app/app.ts)`**: Remove `activeTab` property entirely. Keep `selectedFrame` for linking frame-viewer to diameter.
- **Frame viewer**: No changes needed -- already works with `ngOnInit`.
- **Three-viewer**: No changes needed -- initializes on mount, canvas is always visible so `clientWidth > 0`.
- **Diameter**: Gets `frameIndex` from parent, measures on button click. No lifecycle issues since it's always mounted.

### Responsive breakpoint

- Above 900px: side-by-side frame viewer + measurement
- Below 900px: stacked vertically (frame viewer, then measurement, then 3D)

