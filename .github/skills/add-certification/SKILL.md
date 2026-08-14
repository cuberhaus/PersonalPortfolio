---
name: add-certification
description: 'Add or update a certification, certificate, credential, or badge in PersonalPortfolio and synchronize its localized dates, assets, and the sibling cv repository mirror.'
argument-hint: '<credential URL or certificate details>'
---

# Add Certification

Use this workflow for a new professional certification or a change to an existing one.

## Source Of Truth

`src/data/certifications.json` owns certification identity and portfolio display order. The three locale files own the issued month and year:

- `locales/en/certifications.json`
- `locales/es/certifications.json`
- `locales/ca/certifications.json`

Locale keys are positional array indexes serialized as strings. Keep identical contiguous keys (`0` through `n - 1`) in all three files. Use the Catalan month forms documented in `AGENTS.md`.

The CV is a sibling repository at `../cv`. Its certification sections are an intentional mirror sorted newest-first; it is not another source of truth.

## Workflow

1. Read `AGENTS.md` in both repositories and inspect both worktrees. Preserve unrelated changes.
2. Search `src/data/certifications.json` by credential URL and normalized certification name. Update an existing record instead of creating a duplicate.
3. Confirm the credential details from the supplied badge or certificate. Do not invent a URL, issue date, issuer, badge asset, or expiry date. Do not publish private certificate files or identifiers.
4. Add or update the identity object in `src/data/certifications.json`. Use an existing `issuerIcon` slug when possible. For a new record, follow the repository convention and append it with the next locale index. If intentionally inserting or reordering records, reindex every subsequent key in all three locale files in the same edit.
5. If the issuer is new, add its icon to `src/lib/issuer-icons.ts`. Store durable badge/fallback assets under `public/certifications/` when external resources may expire, and reference them with BASE_URL-compatible `/certifications/...` paths.
6. Add the localized `issued` value at the matching positional key in all three locale files.
7. Mirror the record in `../cv/cv/certifications.tex`, `../cv/cv/certifications_es.tex`, and `../cv/cv/certifications_ca.tex`, sorted newest-first. Localize only the date unless TeX escaping or a concise line-length variant is required. Keep the issuer and credential identity semantically equivalent to the portfolio.
8. Update tests only when the data contract changes. Do not add inline translations to components.

## Validation

From `PersonalPortfolio`:

```powershell
npx vitest run content-parity data-integrity content-schemas
npm run check
pwsh .github/skills/add-certification/scripts/check-certification-parity.ps1
```

From `cv`:

```powershell
pwsh scripts/build-local.ps1 english -Toggles 1000
pwsh scripts/build-local.ps1 spanish -Toggles 1000
pwsh scripts/build-local.ps1 catalan -Toggles 1000
```

Inspect the generated certification variants for page overflow or TeX errors before publishing. Keep unrelated worktree changes intact.

The [parity script](./scripts/check-certification-parity.ps1) verifies contiguous locale indexes, equal locale/source counts, duplicate CV titles, and equal portfolio/CV counts. It does not prove that abbreviated CV titles are semantically equivalent; review those lines directly.

## Pull Requests

When the change is ready, create paired PRs: one in `PersonalPortfolio` for the
source data, locale entries, and asset; one in `cv` for the TeX mirror.

1. Check each worktree and its current branch before committing. Do not add the
   certification to a branch that contains unrelated work or an unrelated PR.
2. From `origin/main`, create matching clean feature branches in both
   repositories. Stash and restore only the certification changes if needed;
   preserve all other worktree changes.
3. Commit each repository separately with a focused certification message, push
   both branches, and open PRs targeting `main`.
4. Link the two PRs in their descriptions. The portfolio PR records the source
   data, display position, localized dates, durable asset, and completed
   validation. The CV PR identifies the portfolio PR as its source and records
   any TeX build blocker rather than claiming a successful build.
5. Confirm both PR URLs, branches, and worktrees after creation. Do not merge
   either PR unless explicitly asked.
