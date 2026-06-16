# PersonalPortfolio

Astro 5 + React 19 portfolio with 20 interactive demos, EN/ES/CA i18n, Sentry observability, and sharded a11y CI. See [README.md](README.md) for stack details and `make` targets.

## Architecture

Static site built by Astro; React islands hydrated per-demo. Identity/metadata in [src/data/](src/data/) (JSON); all translatable copy in [locales/](locales/) under per-locale namespaces. Themes ([src/lib/themes.ts](src/lib/themes.ts)) and designs ([src/lib/designs.ts](src/lib/designs.ts)) are independent axes restored before first paint by `ThemeInit.astro`.

Before non-trivial work, read the matching guide:

- Content/data edits → [docs/guides/everyday-tasks.md](docs/guides/everyday-tasks.md)
- New demo, React island, or live embed → [docs/guides/adding-a-demo.md](docs/guides/adding-a-demo.md)
- Translations, Crowdin, locale JSON → [docs/guides/i18n.md](docs/guides/i18n.md)
- Choosing validation commands → [docs/guides/testing.md](docs/guides/testing.md)
- Cross-cutting/architectural → [docs/architecture/overview.md](docs/architecture/overview.md)

If a guide conflicts with this file, follow the guide and update the stale rule here.

## Build and Test

`make dev` (Astro only), `make dev-bare` (all demo backends + Astro), `make build`, `make test` (full suite). Focused: `npm run test` (Vitest), `npm run test:e2e:smoke`, `npm run lint`, `npm run check`. Playwright projects (`browser-demos`, `live-demos`, `themes`) are independent — pick one rather than running all.

## Conventions

- **Adding a certification** — touch all four or parity tests fail: append object to [src/data/certifications.json](src/data/certifications.json); if a new `issuerIcon` slug, add to `ISSUER_ICON_PATHS` in [src/lib/issuer-icons.ts](src/lib/issuer-icons.ts); append a positional key (next integer = array length − 1) with `{ "issued": "<Mon YYYY>" }` to `locales/{en,es,ca}/certifications.json` (Catalan months: `Gen Feb Març Abr Maig Jun Jul Ago Set Oct Nov Des`); verify with `npx vitest run content-parity data-integrity`.
- **i18n** — no inline `TRANSLATIONS` objects, hardcoded English, alt text, ARIA labels, or mock-banner copy in `.astro`/`.tsx`. Place strings in `locales/{locale}/ui.json` (shared), `demos.json` (card/header), `<slug>-demo.json` (island), or `designs.json`. Locale namespaces must keep identical keys/order (enforced by `content-parity.test.ts`, `data-integrity.test.ts`, `designs.test.ts`).
- **Theming in demos** — never hardcode hex colors. CSS/HTML/JSX styles use `var(--accent-start)`, `var(--bg-card)`, `var(--text-primary)`, etc.; semi-transparent accents use `color-mix(in srgb, var(--accent-start) 15%, transparent)`. For `<canvas>` `fillStyle`/`strokeStyle` and D3 `.attr('fill', …)`, CSS vars don't resolve — import `getThemeColors()` from [src/lib/demo-theme.ts](src/lib/demo-theme.ts). Designs with custom tokens (`--comic-ink`, `--deco-gold`, …) require light-theme override blocks covering `light`, `nord-light`, `solarized-light`, `sepia`, `paper`.
- **React islands** — receive `lang` as a prop; do not read it from URL or context. Prefer `client:visible`; reserve `client:load` for above-the-fold interactivity. Split heavy subtabs with `React.lazy` + `<Suspense>`.
- **Asset paths** — always BASE_URL-aware: `const base = import.meta.env.BASE_URL === '/' ? '' : import.meta.env.BASE_URL;` then `base + '/asset.png'`. Use `existsSync()` for optional assets (profile image, CV).
- **Accessibility & motion** — semantic landmarks, `aria-expanded`/`aria-controls`/`aria-current`, `role="status" aria-live="polite"` for dynamic feedback, `aria-hidden="true"` for decorative SVGs. Wrap animations in `@media (prefers-reduced-motion: reduce)` and use `--transition-fast/base/slow` instead of literal ms.

## Agent skills

Installable skills live under `.agents/skills/` (gitignored; restore with `make skills-restore`). Pinned versions are in [skills-lock.json](skills-lock.json).

- **astro** — consult when modifying `.astro` pages, layouts, or islands hydration directives.
- **vercel-react-best-practices** — consult when editing React 19 islands under `src/components/`.
- **vitest** — consult when adding or modifying Vitest unit tests (`*.test.ts`).
- **playwright-best-practices** — consult when adding/modifying Playwright tests (`browser-demos`, `live-demos`, `themes` projects).
- **accessibility** — consult before merging UI changes; pair with the a11y Playwright project.
- **performance** — consult when optimizing bundle size, LCP, or Core Web Vitals.
- **sentry-workflow** — consult when touching Sentry configuration / observability.

## Pitfalls

- **Astro ViewTransitions** — `DOMContentLoaded` does not fire on client-side navigation. Bind init logic to **both** `DOMContentLoaded` and `astro:page-load`, or use `<script is:inline>` when you need to bypass the bundler.
- **`data-astro-reload`** — required on links that change language, switch demos, or return from a demo to the portfolio; otherwise transitions break layout/lang context.
- **Live demo specs** — guard with `test.skip(!response.ok(), 'Backend unreachable')` so missing Docker backends don't fail CI.
- **`.cursorrules` stays** — Cursor reads it. Do not delete or rename; mirror substantive changes here.
- **CV download has two modes** — `About.astro` uses [`CvDownloader.tsx`](src/components/CvDownloader.tsx) (4 section checkboxes) when `public/cv/cv_english_0111.pdf` exists (i.e. `deploy.yml` has fetched the 48 variants from cuberhaus/cv). Falls back to a single legacy download button when only `public/cv.pdf` / `cv_es.pdf` / `cv_ca.pdf` are present (local dev). To exercise the variant UI locally, create a stub `public/cv/cv_english_0111.pdf` and run `npm run dev`.
- **CV variant filename contract** — `cv_<lang>_<cepsbits>.pdf` where each bit toggles certifications / extracurricular / projects / skills (left to right). The cuberhaus/cv repo owns this naming; any change to the toggle set must be coordinated in lockstep across both repos (cv's `.tex` files + matrix + this repo's `CvDownloader.tsx` + i18n keys + `deploy.yml` fetch loop).

See [README.md](README.md) for full setup and usage.
