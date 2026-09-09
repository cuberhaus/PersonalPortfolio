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
semantic lookup by collection IDs, filter buttons, `aria-live` announcements,
hidden state, `aria-expanded`, pagination, animation cancellation, and
responsive presentation. `Demos.astro` and `Certifications.astro` provide
only the semantic IDs, `data-filter-value` values, labels, and card markup.
They do not expose implementation marker attributes or runtime visibility
classes.

## Debug lifecycle

The debug lifecycle is the idempotent owner of debug adapter activation. It
installs and tears down network instrumentation, Sentry forwarding, and visible
Docker subscriptions as one generation-aware operation. A pending asynchronous
Sentry install must still receive exactly one teardown after it resolves.

`src/lib/debug-bootstrap.ts` composes the dynamically loaded adapters into the
lifecycle without making `DebugOverlay.tsx` know the module graph. Iframe and
Docker/relay ingress both pass through `src/lib/debug-event.mjs`, which
validates required fields, normalizes namespaces and timestamps, and preserves
transport-specific security and rate limiting in their owning adapters.

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
