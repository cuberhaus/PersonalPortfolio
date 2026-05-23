# Everyday tasks

Cookbook for the small, frequent edits — adding a job, swapping two sections,
adding a unit test. Each recipe is an **Edit** list, an optional **Notes**
block, and a **Verify** command. Deeper topics live in their own docs and are
linked at the bottom of each recipe.

> **The i18n parity rule.** Most content lives in three sibling JSON files
> (`foo.json`, `foo.es.json`, `foo.ca.json`). They must stay in lock-step:
> same length, same field set per entry, same order. The vitest suites
> [`content-parity.test.ts`](../../src/__tests__/content-parity.test.ts) and
> [`data-integrity.test.ts`](../../src/__tests__/data-integrity.test.ts) enforce
> this — every content recipe ends with running them.

> **One command before every commit.** `npm run check && npm run lint && npm test`.
> Lefthook re-runs eslint + prettier on staged files automatically; see
> [CONTRIBUTING.md](../../CONTRIBUTING.md#before-you-commit).

---

## 1. Adding a new experience entry

**Edit:**

- [src/data/experience.json](../../src/data/experience.json) — append an object
  with `identity` (company, link, dates, optional `logo` / `logoLight`) and
  `copy.{en,es,ca}` (role, period, bullets[]).
- [src/data/experience.es.json](../../src/data/experience.es.json) and
  [experience.ca.json](../../src/data/experience.ca.json) — append the same
  entry, translated. Same array length, same field set.

**Notes:** logos go in `public/logos/`. Use `logo` for the dark-theme SVG and
`logoLight` for the light-theme variant. Newest first — entries render in
file order.

**Verify:** `npx vitest run content-parity data-integrity`

---

## 2. Adding a new education entry

**Edit:** [src/data/education.json](../../src/data/education.json) +
`.es.json` + `.ca.json`. Shape: `identity.institution`, `identity.link`,
`copy.{en,es,ca}.{degree, location, period}`.

**Verify:** `npx vitest run content-parity data-integrity`

---

## 3. Adding a new certification

**Edit:** [src/data/certifications.json](../../src/data/certifications.json) +
`.es.json` + `.ca.json`. Shape: `identity.{name, issuer, issuerIcon, link,
fallback?}`, `copy.{en,es,ca}.issued`.

**Notes:** `issuerIcon` is a known slug (`microsoft`, `nvidia`, `oracle`, …)
matched by the icon component. If the credential URL might rot, drop a static
HTML snapshot in `public/certifications/` and reference it with `fallback`.

**Verify:** `npx vitest run content-parity data-integrity`

---

## 4. Adding a new work project

**Edit:** [src/data/work_projects.json](../../src/data/work_projects.json) +
`.es.json` + `.ca.json`. Shape: `identity.{role, icon, link, fallback?}`,
`copy.{en,es,ca}.{title, company, description, tags[]}`.

**Notes:** `link` typically points to a press release or public artifact;
`fallback` is the local snapshot under `public/`. `icon` is one of the icon
slugs already used in the file.

**Verify:** `npx vitest run content-parity data-integrity`

---

## 5. Editing skills

**Edit:** [src/data/skills.json](../../src/data/skills.json) + `.es.json` +
`.ca.json`. Shape: `identity.items[]` (the skill names — **shared across
locales**, not translated) and `copy.{en,es,ca}.category` (the category label,
which **is** translated).

To add a new category: add a new top-level entry. To add a skill to an existing
category: append to that entry's `identity.items`.

**Verify:** `npx vitest run content-parity data-integrity`

---

## 6. Reordering, adding, or removing a homepage section

**Edit:**

1. [src/config/section-ids.ts](../../src/config/section-ids.ts) — reorder, add,
   or delete the entry in `SECTION_META`. The numbered prefixes (`01`, `02`,
   …) are auto-derived from the order of `numbered: true` entries, so
   renumbering is automatic.
2. [src/config/sections.ts](../../src/config/sections.ts) — add or remove the
   matching `import` and `COMPONENTS` entry.
3. If the section appears in the navbar, ensure the matching `nav.*` key
   exists in `locales/{en,es,ca}/ui.json` for all three locales.

**Notes:** the hero is the only section with `inNav: false` and
`numbered: false`. To hide a section from the navbar without removing it, flip
`inNav` to `false`.

**Verify:** `npm run check && npx vitest run structural` and visit `/`,
`/es/`, `/ca/` in `make dev`.

---

## 7. Adding a shared UI string (button, label, ARIA)

**Edit:** `locales/{en,es,ca}/ui.json`. Add the nested key under all three
locales. Callers still use dotted keys (`nav.*`, `aria.*`, `meta.*`, `demo.*`,
`contact.*`, …), but the JSON file itself is grouped by topic.

In any `.astro` file:

```astro
---
import { getLangFromUrl, useTranslations } from '../i18n/utils';
const lang = getLangFromUrl(Astro.url);
const t = useTranslations(lang);
---

<button aria-label={t('contact.send')}>{t('contact.send')}</button>
```

**Notes:** `t(key)` falls back to `en` if a locale is missing the key. If the
page renders the raw key, check that `src/i18n/locale-glob.ts` still flattens
nested `ui.json` via `flattenDottedKeys()`.

**Verify:** `npm run check && npx vitest run`

---

## 8. Adding page-specific copy with HTML or placeholders

**Edit:** create or extend `locales/{en,es,ca}/<slug>-page.json` (page UI) or
`locales/{en,es,ca}/<slug>-demo.json` (client island). If the page/component
needs an importable helper, add a tiny accessor under
[src/i18n/demos/](../../src/i18n/demos/) that calls `getDemoT()` or
`getDemoTranslations()`.

Use this **only** for copy that's specific to one page/component and can't
live in shared `ui.json` (because it has inline HTML, `{0}` placeholders, or
long prose). Don't duplicate fields that already live in `demos.json`.

See [docs/i18n.md § Pattern C](./i18n.md#pattern-c--per-demo-namespace-json)
for the full rules.

**Verify:** `npx vitest run`

---

## 9. Adding or removing a demo

Has its own dedicated document. The doc has a fast path for browser-only
demos (steps 1–7) and a clearly-fenced backend & observability second half
(steps 8+) — start at step 1 of [docs/adding-a-demo.md](./adding-a-demo.md)
and stop at the marker if `hasBackend: false`.

**Verify:** `make check-registry && npx vitest run && npx playwright test`

---

## 10. Updating identity (name, email, social handles, hero, contact)

**Edit:**

- [src/config/site.ts](../../src/config/site.ts) — URL, GitHub user, LinkedIn
  user, email. Single source of truth; consumed by `Contact.astro`,
  `Layout.astro` (schema.org `sameAs`), and `astro.config.mjs`.
- [src/components/Hero.astro](../../src/components/Hero.astro) — name and
  taglines (most copy lives in `locales/{locale}/ui.json` under `hero.*`).
- [src/components/About.astro](../../src/components/About.astro) — bio.
- [src/components/Contact.astro](../../src/components/Contact.astro) — contact
  block.
- `astro.config.mjs` `site:` field — only if the deployed URL itself changes.

**Verify:** `npm run check && npx vitest run`

---

## 11. Changing the navbar items

The navbar is generated from sections with `inNav: true` in
[src/config/section-ids.ts](../../src/config/section-ids.ts). The link label
comes from the `navKey` (e.g. `nav.experience`) looked up in
the `ui` namespace. To rename a label: edit `locales/{en,es,ca}/ui.json`. To
hide / reorder: edit `section-ids.ts` (see recipe 6).

**Verify:** `npx playwright test --project=portfolio-smoke`

---

## 12. Adding a Vitest unit test

**Edit:** create `src/__tests__/<name>.test.ts`. Skeleton:

```ts
import { describe, it, expect } from 'vitest';
import { thingUnderTest } from '../lib/<thing>';

describe('thingUnderTest', () => {
  it('does the thing', () => {
    expect(thingUnderTest(42)).toBe('expected');
  });
});
```

Pick the closest existing test as a starting point:

- **Content / data shape:** [data-integrity.test.ts](../../src/__tests__/data-integrity.test.ts)
  or [content-parity.test.ts](../../src/__tests__/content-parity.test.ts).
- **Pure logic / algorithms:** [wpgma.test.ts](../../src/__tests__/wpgma.test.ts).
- **React component:** [error-boundary.test.tsx](../../src/__tests__/error-boundary.test.tsx).
- **i18n / utils:** [i18n-utils.test.ts](../../src/__tests__/i18n-utils.test.ts).

**Verify:** `npx vitest run <name>` (or `npx vitest` for watch mode).

---

## 13. Adding a Playwright e2e test

**Edit:** create `e2e/<name>.spec.ts`. Skeleton:

```ts
import { test, expect } from '@playwright/test';

test.describe('<feature>', () => {
  test('renders something', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('section#hero')).toBeVisible();
  });
});
```

**Notes:** [playwright.config.ts](../../playwright.config.ts) defines named
projects (`portfolio-smoke`, `browser-demos`, `live-demos`, `themes`,
`debug-overlay`, `a11y`, `keyboard`, `visual`). Each project has a
`testMatch` regex — name your file to match an existing project, or add a
new project block. Closest fixtures to copy:

- **Page-level smoke:** [portfolio-smoke.spec.ts](../../e2e/portfolio-smoke.spec.ts)
- **Keyboard / a11y:** [keyboard.spec.ts](../../e2e/keyboard.spec.ts) or
  [a11y.spec.ts](../../e2e/a11y.spec.ts)
- **Demo behavior:** [browser-demos.spec.ts](../../e2e/browser-demos.spec.ts)

**Verify:** `npx playwright test <name>` (or `make test-keyboard`,
`make test-a11y`, `make test-visual` for the named groups).

---

## 14. Refreshing visual baselines after an intended design change

Visual baselines must be regenerated on **Linux** because font hinting is
OS-specific. The recommended path is the `Refresh visual baselines` GitHub
Action — see the
[Visual regression](../../README.md#visual-regression) section in the README.

---

## 15. Pre-commit cheat sheet

| Command               | Purpose                                                |
| --------------------- | ------------------------------------------------------ |
| `npm run check`       | Astro + TypeScript strict type-check                   |
| `npm run lint`        | eslint                                                 |
| `npm run format`      | prettier --write (auto-fix)                            |
| `npx vitest run`      | Unit tests                                             |
| `npx playwright test` | All e2e projects (auto-starts dev server)              |
| `make check-registry` | Demo registry consistency (fast, pre-commit)           |
| `make test`           | Everything CI runs (incl. backend pytests + Go + Rust) |

Lefthook auto-runs eslint + prettier on staged files; the `commit-msg` hook
rejects direct commits to `main`. See
[CONTRIBUTING.md § Before you commit](../../CONTRIBUTING.md#before-you-commit).

---

## See also

- [README.md](../../README.md) — stack overview, `make dev-bare` matrix,
  troubleshooting
- [CONTRIBUTING.md](../../CONTRIBUTING.md) — first clone, day-to-day commands,
  test layer cake
- [docs/guides/adding-a-demo.md](./adding-a-demo.md) — the full demo
  onboarding checklist
- [docs/guides/i18n.md](./i18n.md) — translation patterns A / B / C,
  decision flow
- [docs/guides/testing.md](./testing.md) — test pyramid, Vitest categories,
  the 8 Playwright projects
- [docs/architecture/overview.md](../architecture/overview.md) — one-page
  big-picture map (start here for architecture)
- [docs/architecture/decisions.md](../architecture/decisions.md),
  [docs/architecture/debugging-architecture.md](../architecture/debugging-architecture.md),
  [docs/architecture/observability.md](../architecture/observability.md) —
  architecture deep dives
- [docs/troubleshooting.md](../troubleshooting.md) — when something breaks
