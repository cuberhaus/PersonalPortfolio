# ADR-0001: Validated Runtime Boundaries for Demos

- Status: accepted
- Date: 2026-03-31

## Context

The portfolio has one demo registry but several consumers: Astro and React
code, Sentry configuration, Make, shell orchestration, the log relay, and the
screenshot gallery. Those consumers had begun to parse the same JSON and
reconstruct different policies. Demo routes also repeated locale and metadata
assembly, while debug adapters were activated from more than one owner.

## Decision

Keep `src/data/demo-services.json` as the registry source of truth and expose
explicit runtime projections:

1. `src/data/demo-registry-contract.mjs` owns the structural Zod contract.
2. `src/data/demo-services.ts` uses that contract and publishes typed browser
   projections.
3. `scripts/demo-registry.mjs` uses the same contract for Node and shell
   consumers and owns the CLI projections used by Make and orchestration.
4. `src/lib/live-app-embed.ts` owns live URL resolution and probing; the React
   component renders the resulting state.
5. `src/lib/debug-lifecycle.ts` owns idempotent activation and generation-safe
   teardown for debug adapters, including iframe forwarding.
6. `src/lib/demo-page.ts` owns shared locale, translation, and demo metadata
   assembly; page files keep only route-specific content.
7. `src/lib/filtered-collection.ts` owns the semantic DOM protocol shared by
   the demos and certifications collections; callers provide IDs, labels, and
   card/filter markup without runtime marker attributes.
8. `src/components/demos/LiveAppFallbackRegion.astro` owns the relationship
   between a live embed and its route-specific fallback through the typed
   `live-app:status` event contract.
9. `src/lib/debug-event.mjs` owns shared ingress normalization, while iframe
   origin checks, backend rate limiting, and debug lifecycle composition remain
   in their respective adapters.
10. `src/lib/demo-dispatch.ts` owns pure path-to-slug extraction and lookup for
    localized demo dispatch; the route reuses one typed module map for lookup
    and static paths and renders an explicit localized 404 for missing slugs.

Tests cross these public seams instead of duplicating the implementation under
test.

## Consequences

- Registry shape errors fail at the browser or Node boundary instead of later in
  a script, page, or iframe.
- Browser and Node adapters share one structural contract without sharing their
  runtime-specific projections or side effects.
- Runtime-specific adapters remain small and can evolve without making the
  JSON schema a shell or React API.
- A route still has local markup, but repeated setup policy has one owner.
- Debug teardown is safe across repeated toggles and asynchronous imports.
- Docker relay parsing and rate limiting have a focused internal module while
  transport and visibility remain behind the lifecycle-facing adapter.
- Collection behavior is shared without making the Astro callers depend on
  private implementation markers.
- Live fallback visibility is coordinated by a local region boundary rather
  than document-wide selectors or route-specific event handlers.
- External debug transports converge on one event shape without merging their
  security and throttling responsibilities.
- Localized demo dispatch has one typed lookup and an explicit missing-route
  behavior.
- Adding a registry field requires updating the schema and the projections that
  intentionally expose it; this is explicit maintenance rather than hidden
  coupling.

## Alternatives rejected

- Let every consumer parse raw JSON: minimal initial code, but duplicated
  validation and policy drift remain invisible until runtime.
- Put all runtime behavior in the JSON file: makes data encode side effects and
  couples shell, browser, and observability concerns.
- Replace every demo page with one highly configurable template: would hide
  meaningful demo-specific markup and make the route abstraction shallow.
