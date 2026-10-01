# PersonalPortfolio

Astro 5 + React 19 portfolio with 20 interactive demos, EN/ES/CA i18n, Sentry observability, and sharded a11y CI. See [README.md](README.md) for stack details and `make` targets.

## Architecture

Static site built by Astro; React islands hydrated per-demo. Identity/metadata in [src/data/](src/data/) (JSON); all translatable copy in [locales/](locales/) under per-locale namespaces. Themes ([src/lib/themes.ts](src/lib/themes.ts)) and designs ([src/lib/designs.ts](src/lib/designs.ts)) are independent axes restored before first paint by `ThemeInit.astro`.

Before non-trivial work, read the matching guide:

- Content/data edits → [docs/guides/everyday-tasks.md](docs/guides/everyday-tasks.md)
- New demo, React island, or live embed → [docs/guides/adding-a-demo.md](docs/guides/adding-a-demo.md)
- Translations, Crowdin, locale JSON → [docs/guides/i18n.md](docs/guides/i18n.md)
- Analytics, the consent banner, `PUBLIC_GA_ID` → [docs/guides/analytics-and-privacy.md](docs/guides/analytics-and-privacy.md)
- Choosing validation commands → [docs/guides/testing.md](docs/guides/testing.md)
- Cross-cutting/architectural → [docs/architecture/overview.md](docs/architecture/overview.md)

If a guide conflicts with this file, follow the guide and update the stale rule here.

## Build and Test

`make dev` (Astro only), `make dev-bare` (all demo backends + Astro), `make build`, `make test` (fast local gate), `make test-full` (all Playwright + backend suites). Focused: `npm run test` (Vitest), `npm run test:e2e:smoke`, `npm run test:e2e:consent` (builds a second site with a test GA ID), `npm run lint`, `npm run check`. Playwright projects (`browser-demos`, `live-demos`, `hosted-demos`, `themes`) are independent — pick one rather than running all.

## Conventions

- **Adding a certification** — touch all four or parity tests fail: append object to [src/data/certifications.json](src/data/certifications.json); if a new `issuerIcon` slug, add to `ISSUER_ICON_PATHS` in [src/lib/issuer-icons.ts](src/lib/issuer-icons.ts); append a positional key (next integer = array length − 1) with `{ "issued": "<Mon YYYY>" }` to `locales/{en,es,ca}/certifications.json` (Catalan months: `Gen Feb Març Abr Maig Jun Jul Ago Set Oct Nov Des`); verify with `npx vitest run content-parity data-integrity`.
- **i18n** — no inline `TRANSLATIONS` objects, hardcoded English, alt text, ARIA labels, or mock-banner copy in `.astro`/`.tsx`. Place strings in `locales/{locale}/ui.json` (shared), `demos.json` (card/header), `<slug>-demo.json` (island), or `designs.json`. Locale namespaces must keep identical keys/order (enforced by `content-parity.test.ts`, `data-integrity.test.ts`, `designs.test.ts`).
- **Theming in demos** — never hardcode hex colors. Use `demoPanel` and `gradientButton` from [src/components/demos/_styles.ts](src/components/demos/_styles.ts) for primary panels and actions so the active design can reshape them; other CSS/HTML/JSX styles use `var(--accent-start)`, `var(--bg-card)`, `var(--text-primary)`, etc. Semi-transparent accents use `color-mix(in srgb, var(--accent-start) 15%, transparent)`. For `<canvas>` `fillStyle`/`strokeStyle` and D3 `.attr('fill', …)`, CSS vars don't resolve — import `getThemeColors()` from [src/lib/demo-theme.ts](src/lib/demo-theme.ts). Designs with custom tokens (`--comic-ink`, `--deco-gold`, …) require light-theme override blocks covering `light`, `nord-light`, `solarized-light`, `sepia`, `paper`.
- **Analytics** — consent-first: nothing loads from Google until a visitor accepts. Only [`src/lib/analytics-consent.ts`](src/lib/analytics-consent.ts) may name Google's hosts, globals or IDs, and only [`src/config/analytics.ts`](src/config/analytics.ts) reads `PUBLIC_GA_ID` (both enforced by `analytics-source-guard.test.ts`). A page shell that owns `<html>` renders `{ANALYTICS_MEASUREMENT_ID && <Analytics />}` once in `<body>` after the skip link (never ungated, or every page of an unconfigured build loads the consent script); content pages add `<AnalyticsSettingsButton />`. Consent copy lives under `analytics` in `locales/*/ui.json`. A separate **cookieless visit counter** runs without asking: only [`src/lib/visit-counter.ts`](src/lib/visit-counter.ts) may name GoatCounter and only [`src/config/visit-counter.ts`](src/config/visit-counter.ts) reads `PUBLIC_GOATCOUNTER_CODE`; it must never set a cookie, write browser storage, load third-party JS, send the query string or title, or depend on the consent choice. Page shells render `{VISIT_COUNTER_CODE && <VisitCounter />}` right after `<Analytics />`, and the panel uses `descriptionWithCounter` only when a counter is configured. After touching any of it, run `npm run test:e2e:consent`.
- **React islands** — receive `lang` as a prop; do not read it from URL or context. Prefer `client:visible`; reserve `client:load` for above-the-fold interactivity. Split heavy subtabs with `React.lazy` + `<Suspense>`.
- **Hosted live apps** — a demo's public copy is the optional `backend.hosted` `{ url, enabled }` registry block; `LiveAppEmbed` picks hosted vs local at runtime from the page hostname (loopback ⇒ local). Nothing is requested before the visitor presses Start (no keep-warm pings). Never add the hosted origin to `iframeUrl`, `listAllowedIframeOrigins`, or Sentry `tracePropagationTargets` — custom headers would make the `/health` poll preflighted. Copy lives in the `hosted*` keys of `live-app-embed.json`; see [docs/guides/adding-a-demo.md](docs/guides/adding-a-demo.md#hosted-live-app-opt-in).
- **Asset paths** — always BASE_URL-aware: `const base = import.meta.env.BASE_URL === '/' ? '' : import.meta.env.BASE_URL;` then `base + '/asset.png'`. Use `existsSync()` for optional assets (profile image, CV).
- **Accessibility & motion** — semantic landmarks, `aria-expanded`/`aria-controls`/`aria-current`, `role="status" aria-live="polite"` for dynamic feedback, `aria-hidden="true"` for decorative SVGs. Wrap animations in `@media (prefers-reduced-motion: reduce)` and use `--transition-fast/base/slow` instead of literal ms.

## Agent skills

### Issue tracker

Issues and specs are tracked in GitHub Issues for `cuberhaus/PersonalPortfolio`. See [docs/agents/issue-tracker.md](docs/agents/issue-tracker.md).

### Domain docs

This is a single-context repository. Domain language belongs in root `CONTEXT.md`; durable decisions belong in `docs/adr/`. Both are created lazily. See [docs/agents/domain.md](docs/agents/domain.md).

### Installed skills

Installable third-party skills live under `.agents/skills/` (gitignored; restore with `make skills-restore`). Pinned versions are in [skills-lock.json](skills-lock.json). Project-owned workflows live under `.github/skills/` and are tracked directly.

- **astro** — consult when modifying `.astro` pages, layouts, or islands hydration directives.
- **vercel-react-best-practices** — consult when editing React 19 islands under `src/components/`.
- **vitest** — consult when adding or modifying Vitest unit tests (`*.test.ts`).
- **playwright-best-practices** — consult when adding/modifying Playwright tests (`browser-demos`, `live-demos`, `themes` projects).
- **accessibility** — consult before merging UI changes; pair with the a11y Playwright project.
- **performance** — consult when optimizing bundle size, LCP, or Core Web Vitals.
- **sentry-workflow** — consult when touching Sentry configuration / observability.
- **add-certification** — consult when adding or updating a certification; keeps the portfolio locale data and all three CV certification sections synchronized.

## Pitfalls

- **Astro ViewTransitions** — `DOMContentLoaded` does not fire on client-side navigation. Bind init logic to **both** `DOMContentLoaded` and `astro:page-load`, or use `<script is:inline>` when you need to bypass the bundler.
- **`data-astro-reload`** — required on links that change language, switch demos, or return from a demo to the portfolio; otherwise transitions break layout/lang context.
- **Live demo specs** — guard with `test.skip(!response.ok(), 'Backend unreachable')` so missing Docker backends don't fail CI.
- **`.cursorrules` stays** — Cursor reads it. Do not delete or rename; mirror substantive changes here.
- **CV downloads stay available locally** — `About.astro` always renders [`CvDownloader.tsx`](src/components/CvDownloader.tsx) with preset + photo controls. Deployments use cache-busted files fetched into `public/cv/`; builds without those files resolve the same filenames through `https://github.com/cuberhaus/cv/releases/latest/download`.
- **CV variant filename contract** — public assets use `cv_<lang>_<preset>_<photo-mode>.pdf`, with presets `standard`, `technical`, `complete`, and `concise`, plus `photo` and `no-photo` modes. The cuberhaus/cv repo owns this naming; update `CvDownloader.tsx`, localized UI, and `deploy.yml` in lockstep with release changes. ATS PDFs are local/CI-only and never appear in the downloader.
- **Certification locale contract** — `certifications.json` records have permanent lowercase-kebab IDs and unique explicit `displayOrder` values. Locale records are keyed by ID, not position. Use the `add-certification` skill for any change.

See [README.md](README.md) for full setup and usage.
