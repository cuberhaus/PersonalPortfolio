# Portfolio Domain Context

## Demo service registry

`src/data/demo-services.json` is the source of truth for demo identity, backend
ports, iframe origins, run hints, and local orchestration metadata. Runtime code
does not reinterpret that JSON ad hoc:

- `src/data/demo-registry-contract.mjs` owns the shared structural and semantic
  validation, including backend/page compatibility, unique ports, and
  orchestrator requirements.
- `src/data/demo-services.ts` validates it with the contract and exposes
  browser-facing projections for Astro, React, Sentry, and tests.
- `scripts/demo-registry.mjs` validates the same file for Node and shell-facing
  consumers, then exposes process-oriented projections and small CLI views.

The registry is data; each runtime adapter owns only the representation and
side effects required by that runtime.

Browser and Node projections are intentionally separate. Parity tests compare
their meaning at the adapter boundary without making either runtime consume
the other's API.

The validated contract also owns the canonical meaning of orchestrated service
rows and the complete backend port set. Browser and Node adapters reuse those
pure projections, then retain their own nullability and process-facing shape.

## Live app orchestration

A live app definition is the resolved URL plus optional run hints for one demo.
`src/lib/live-app-embed.ts` owns registry resolution, explicit overrides,
origin extraction, bounded probing, cancellation, and probe events.
`LiveAppEmbed.tsx` owns presentation and delegates those policies to the
orchestrator.

`LiveAppFallbackRegion.astro` owns the DOM region that pairs one live embed
with one route-specific fallback. `live-app-fallback.ts` listens for the
bubbling `live-app:status` contract and hides the fallback only after an
`online` status. Demo routes retain their fallback markup and choose their own
mock or local component.

## Filtered collections

`src/lib/filtered-collection.ts` owns the runtime protocol for filtered grids:
`src/lib/filtered-collection.ts` owns the runtime protocol for filtered grids:
declarative root discovery, filter buttons, `aria-live` announcements, hidden
state, `aria-expanded`, pagination, animation cancellation, and responsive
presentation. `Demos.astro` and `Certifications.astro` provide only the
semantic collection root, `data-filter-value` values, labels, and card markup.
They do not expose implementation marker attributes or runtime visibility
classes. The initializer is tested through that DOM contract rather than only
through the pure presentation function.

## Debug lifecycle

The debug lifecycle is the idempotent owner of debug adapter activation. It
installs and tears down network instrumentation, Sentry forwarding, and visible
Docker subscriptions as one generation-aware operation. A pending asynchronous
Sentry install must still receive exactly one teardown after it resolves.

`src/lib/debug-bootstrap.ts` composes the dynamically loaded adapters into the
lifecycle without making `DebugOverlay.tsx` know the module graph. Iframe and
Docker/relay ingress both pass through `src/lib/debug-event.mjs`, which
`src/lib/debug-event.mjs`, which validates required fields, normalizes
namespaces and timestamps, and exposes narrow iframe/backend adapter helpers.
The Node relay's line adapter is pure and parity-tested against backend browser
normalization. Transport-specific security and rate limiting remain in their
owning adapters.

## Demo page context

A demo page context combines the locale selected by the URL, the localized
translation function, and the localized metadata record returned by `getDemo`.
`src/lib/demo-page.ts` owns that assembly. Individual Astro routes retain their
unique content, fallback markup, and component choices; they should not repeat
locale and metadata lookup policy.

## Localized demo dispatch

`src/lib/demo-dispatch.ts` is the pure path-to-slug boundary for the localized
`[lang]/demos/[demo].astro` route. The route creates one typed eager glob
lookup, reuses it for static-path generation, and renders a localized 404 with
an explicit response status when a slug is not present.

## Site identity

**Visual icon variant**:
A distinct piece of artwork representing the portfolio in browser and PWA icon surfaces.
_Avoid_: Format variant, size variant.

**Format variant**:
An export of the same visual icon artwork for a particular file format or display size.
_Avoid_: Alternative icon.

**Canonical site icon**:
The selected visual icon artwork that serves as the source for every browser and PWA format variant.
_Avoid_: Default favicon.
