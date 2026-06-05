# Copilot instructions for PersonalPortfolio

Read [../.cursorrules](../.cursorrules) before changing code in this repository.

Before implementing non-trivial changes, use the README documentation map and read the relevant guide for the task:

- [../docs/guides/everyday-tasks.md](../docs/guides/everyday-tasks.md) for content/data edits.
- [../docs/guides/adding-a-demo.md](../docs/guides/adding-a-demo.md) for demo pages, React islands, live embeds, and registry work.
- [../docs/guides/i18n.md](../docs/guides/i18n.md) for translations, Crowdin, locale JSON structure, and copy placement.
- [../docs/guides/testing.md](../docs/guides/testing.md) for choosing focused validation commands.

For architectural or cross-cutting work, also read [../docs/architecture/overview.md](../docs/architecture/overview.md) and the relevant architecture note. Treat those guides as the canonical workflow; if an instruction file conflicts with a guide, follow the guide and update the stale instruction.

---

## Adding a certification (checklist)

When adding a new entry to `src/data/certifications.json`, **always** complete all of these steps — missing any one will break the parity tests:

1. **`src/data/certifications.json`** — append the object (`name`, `issuer`, `issuerIcon`, `link`, optional `fallback`, `badgeImage`, `badgeImageFallback`).
2. **`src/lib/issuer-icons.ts`** — if `issuerIcon` is a new slug, add it to `ISSUER_ICON_PATHS`.
3. **`locales/en/certifications.json`**, **`locales/es/certifications.json`**, **`locales/ca/certifications.json`** — append a new positional key (next integer index) with `{ "issued": "<Mon YYYY>" }`. The index must equal `certifications.json` array length − 1. Use locale-appropriate month abbreviations (en/es share the same abbreviations; ca uses Catalan: `Gen`, `Feb`, `Març`, `Abr`, `Maig`, `Jun`, `Jul`, `Ago`, `Set`, `Oct`, `Nov`, `Des`).
4. **Verify:** `npx vitest run content-parity data-integrity`