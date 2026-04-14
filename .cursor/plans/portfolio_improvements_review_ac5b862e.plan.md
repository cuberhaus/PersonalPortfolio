---
name: Portfolio Improvements Review
overview: A prioritized review of bugs, content issues, i18n gaps, code quality patterns, and SEO/accessibility improvements found across the PersonalPortfolio repo.
todos:
  - id: fix-worksprojects
    content: "Add WorkProjects import and render to [lang]/index.astro (bug: ES/CA homepage missing section)"
    status: pending
  - id: fix-nav-home-test
    content: "Fix i18n-utils.test.ts: replace nav.home with a key that actually exists in ui.ts (e.g. nav.about)"
    status: completed
  - id: fix-types-devdeps
    content: Move @types/react and @types/react-dom to devDependencies in package.json
    status: completed
  - id: fix-contact-i18n
    content: Localize 'Sending...' and 'Did you mean...' strings in Contact.astro using t() keys
    status: completed
  - id: fix-console-logs
    content: Remove console.log/console.error from Contact.astro, DemoLayout.astro, MPIDSDemo.tsx
    status: completed
  - id: fix-content-typos
    content: Fix PowerBI -> Power BI, education wording, experience.ca 'Present', demos.ca grammar
    status: completed
  - id: fix-404-i18n
    content: Make 404 page locale-aware or at minimum less English-centric
    status: completed
  - id: fix-gitignore
    content: Add .env, .env.*, .DS_Store, coverage/ to .gitignore
    status: completed
  - id: fix-seo-canonical
    content: Add rel=canonical to Layout.astro, fix Twitter meta name= attributes
    status: pending
isProject: false
---

# PersonalPortfolio Review — Findings and Recommendations

## Bugs (should fix)

- `**WorkProjects` missing from ES/CA homepage**: `[src/pages/[lang]/index.astro](src/pages/[lang]/index.astro)` does not import or render `WorkProjects`, while `[src/pages/index.astro](src/pages/index.astro)` does (line 23). Spanish and Catalan users never see the "Work Projects" section.
- **Test references non-existent i18n key**: `[src/__tests__/i18n-utils.test.ts](src/__tests__/i18n-utils.test.ts)` lines 38/43/48 assert against `nav.home`, which does not exist in `[src/i18n/ui.ts](src/i18n/ui.ts)`. The test currently passes because `useTranslations` returns `undefined` and the assertion checks `undefined === undefined`, which is truthy -- so this is a false-positive test, not a real failure.
- `**@types/react` and `@types/react-dom` in `dependencies`** instead of `devDependencies` in `[package.json](package.json)` (lines 17-18). They are build-time only.

## i18n Gaps

Several UI strings are hardcoded in English and shown to ES/CA users:

- `**Contact.astro`** (lines 108, 122): `"Did you mean..."` and `"Sending..."` not localized
- `**Footer.astro`**: `"Designed & built with"` and copyright are English-only
- `**ThemeToggle.astro**`: `aria-label="Toggle theme"` English-only
- `**ScrollToTop.astro**`: `aria-label="Scroll to top of page"` English-only
- `**404.astro**`: entire page is English-only ("Page Not Found", body copy, button text)
- `**experience.ca.json**`: uses English `"Present"` in the date range instead of Catalan `"Actualitat"`
- `**work_projects.*.json**`: the `role` field (`"AI & Data Consultant @ Deloitte"`) is always English, even in ES/CA
- `**About.astro**`: tech stack list (Python, SQL, AWS...) is English-only on all locales (minor -- tech names are often left in English)

## Content Improvements

- `**education.json**`: `"English Certificate at C1"` reads awkwardly -- consider `"Cambridge C1 English Certificate"`
- `**education.json**`: Period says `"Mar 2019 — 2023"` for the CS degree. Spanish university semesters start in September -- verify if `Mar` should be `Sep`
- `**skills.json**` (all locales): `"PowerBI"` should be `"Power BI"` (official Microsoft branding with a space)
- `**demos.json**` (`apa-practica`): description mentions `"binaryClass N/P"` which is too insider/FIB-specific for portfolio readers
- `**demos.ca.json**` (`joc-eda`): `"Observa a bots d'IA lluitar"` has a grammatical issue -- should use `"com lluiten"` or `"lluitant"` instead of Spanish-like `"a ... lluitar"`
- `**work_projects.json**`: `"The world's first Physical AI project delivered at Deloitte"` -- strong claim, make sure you are comfortable with this publicly

## Code Quality

- **Duplicated theme bootstrap script**: The inline `<script>` that reads `localStorage` and sets `data-theme` is duplicated between `[Layout.astro](src/layouts/Layout.astro)` and `[DemoLayout.astro](src/layouts/DemoLayout.astro)`. Could be extracted to a shared partial.
- **Large demo components**: `TfgPolypDemo.tsx` (681 lines), `ApaPracticaDemo.tsx` (678 lines), `TendaDemo.tsx` (657 lines) each contain large `TRANSLATIONS` objects, inline styles, and multiple sub-sections. These are candidates for splitting (extract translations, extract sub-components).
- **Duplicated TRANSLATIONS pattern**: Every demo `.tsx` file defines its own `en/es/ca` translations object. A shared pattern (e.g., per-demo JSON files or a `useDemoTranslations` hook) would reduce boilerplate.
- **Heavy inline styles**: Demo components use `style={{ ... }}` extensively rather than CSS modules or scoped classes. Not broken, but harder to maintain.
- **No React ErrorBoundary**: Demo islands can throw and blank the entire island with no user-facing fallback.
- `**console.log` / `console.error` in production code**: Found in `Contact.astro` (lines 145, 155), `DemoLayout.astro` (line 132), and `MPIDSDemo.tsx` (line 272).

## SEO and Accessibility

- **No `rel="canonical"`** link in `Layout.astro` `<head>` -- common SEO best practice, especially with multi-locale pages
- **Twitter meta tags** use `property=` instead of the recommended `name=` attribute
- `**DemoLayout.astro`**: `<nav>` element lacks `aria-label` to distinguish it from other nav landmarks
- `**DemoLayout.astro`**: no `id="main-content"` on `<main>`, so skip-to-content links don't work on demo pages
- **Empty `alt=""` on images** in `SPMatriculasDemo.tsx` (lines 319, 515) and `DraculinDemo.tsx` (line 153) -- fine if decorative, but pipeline stage images likely deserve descriptive alt text
- `**.gitignore`** is missing common entries: `.env`, `.env.`*, `.DS_Store`, `coverage/`

## Assessment

The highest-impact items are the **WorkProjects bug** (ES/CA users miss an entire section), the **broken test** (`nav.home`), and the **Contact.astro i18n gaps** (users see English mid-flow on localized pages). Everything else is polish. The architecture is solid -- Astro + React islands is the right pattern, data-driven JSON with parity tests is well-structured, and the CI pipeline covers both tests and deployment.