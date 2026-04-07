---
name: Astro i18n Implementation
overview: Add multi-language support (English, Spanish, Catalan) using Astro's native i18n routing and TypeScript dictionaries, including automatic translations of all existing content.
todos:
  - id: config-i18n
    content: Configure Astro i18n in astro.config.mjs
    status: completed
  - id: create-i18n-utils
    content: Create i18n dictionaries and utilities (src/i18n/ui.ts, src/i18n/utils.ts) with EN, ES, CA translations
    status: completed
  - id: translate-data
    content: Translate JSON data files (experience, education, skills, projects)
    status: completed
  - id: language-picker
    content: Create LanguagePicker component and add it to Navbar
    status: completed
  - id: update-routing
    content: Update Layout and routing to support /es and /ca paths
    status: completed
  - id: refactor-components
    content: Refactor UI components to use useTranslations instead of hardcoded text
    status: completed
isProject: false
---

# Astro i18n Implementation Plan

## 1. Configure Astro i18n

- Update `astro.config.mjs` to include the `i18n` object.
- Set `en` as the `defaultLocale`.
- Add `en`, `es`, and `ca` to the `locales` array.
- Configure routing to not prefix the default locale (standard URL structure).

## 2. Set Up i18n Infrastructure

- Create `src/i18n/ui.ts` to hold the translation dictionaries for UI elements (Navbar links, Hero text, section titles, etc.).
- Automatically translate all existing English text into Spanish and Catalan within this file.
- Create `src/i18n/utils.ts` to add helper functions like `getLangFromUrl` (to detect language from the current path) and `useTranslations` (to fetch the correct strings).

## 3. Implement Language Switcher

- Create a `LanguagePicker.astro` component (a dropdown or inline links for EN | ES | CA).
- Integrate this component into the existing `Navbar.astro`.

## 4. Refactor Layouts and Pages

- Update `src/layouts/Layout.astro` to dynamically set the `<html lang="...">` attribute based on the current URL.
- Move the current `src/pages/index.astro` logic into a reusable structure, so it can be served at both `/` (English) and `/[lang]/index.astro` (for Spanish and Catalan).
- Ensure the same is done for the existing demo pages if necessary, or keep them localized.

## 5. Localize Data and Components

- Update all components (e.g., `Hero.astro`, `About.astro`, `Projects.astro`) to use the `useTranslations` helper instead of hardcoded English text.
- Translate the JSON data files in `src/data/` (like `skills.json`, `experience.json`, `education.json`, `projects.json`) by either creating language-specific copies (e.g., `skills.es.json`) or modifying the schema to include translations, and update the components to fetch the correct data based on the current locale.

