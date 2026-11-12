# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: recruiters and hiring managers evaluating Pol for roles. They skim, compare candidates, and want to find proof of capability and a way to get in touch quickly.

Secondary: fellow engineers and peers who look at how the site is built, and prospective clients and collaborators in AI and data consulting. Visitors arrive in English, Spanish, or Catalan.

## Product Purpose

A personal portfolio for Pol Casacuberta Gil (Computer Science Engineer from Barcelona, graduate of UPC's FIB, AI & ML Engineer at Deloitte since 2024-09). It presents client work, experience, education, certifications, skills, and interactive demos of university and personal projects.

Success is a visitor contacting Pol or downloading a CV. The demos exist to build trust on the way there.

## Positioning

The proof is hands-on. Roughly twenty projects can be tried in the browser, with a browser-only fallback where a project needs a backend, and the site itself is shipped to the same standard (tested, accessible, three languages). A static CV or a list of repositories could not make that claim.

## Operating Context

- Static Astro site with React islands for demos, deployed to GitHub Pages at polcasacubertagil.com.
- Content is JSON data plus per-locale translation files (EN, ES, CA); every string lives in a locale file.
- CV downloads come in four versions (standard, technical, complete, concise), each with or without a portrait, in all three languages. The hero's single filled action downloads the default (standard, with portrait); the other versions sit behind "Other versions" in About.
- Some demos depend on a backend. Locally these run in Docker. A demo may also have a hosted copy that wakes only when a visitor asks for it.
- Analytics is consent-first (Google Analytics loads only after acceptance). A separate cookieless visit counter runs without asking.

## Capabilities and Constraints

- Three locales with identical keys and order, enforced by tests.
- A design studio offers 17 designs, each with its own night and day palette. Swiss is the default. Palettes are only ever offered with their own design.
- Every palette must meet WCAG AA contrast, enforced by tests.
- Demos never hardcode colors; they use theme tokens so the active design reshapes them.
- Asset paths respect the deployment base URL.
- Text-default emoji glyphs may not appear as bare characters (iOS renders them as colored tiles).
- Undecided: whether the design studio should stay a prominent feature or recede (see Brand Commitments).

## Brand Commitments

- The studio of alternative designs is an experiment and a lab. The default Swiss design is what matters most and carries the main experience. The studio should not compete with the content or the path to contact.
- Voice, from the About copy: warm, plain-spoken, first person, practical over trendy ("I care more about solving the problem than about picking the trendiest stack").
- Identity: the name Pol Casacuberta Gil, the site icon (the canonical site icon decision lives in `docs/design/`), and the Deloitte logo on the Experience section.

## Evidence on Hand

- Client work entries (Deloitte physical-AI press release, Aragon) in `src/data/work_projects.json`.
- Around twenty demos, each with a captured screenshot, in `docs/demo-gallery.md` and `docs/assets/readme-gallery/`.
- Experience, education, certifications, and skills data in `src/data/`.
- A 24-second launch video in `docs/assets/launch-video/`.
- CV PDFs, built and fetched from the `cuberhaus/cv` releases.
- Absences future work must not fabricate: client testimonials, customer logos beyond those in the repo, usage numbers, and benchmarks.

## Product Principles

1. Contact comes first. Anything that slows the path to a CV download or a message needs a reason.
2. Show working proof. Prefer a demo a visitor can try over a claim about skill.
3. Everything works in every language. Copy, alt text, ARIA labels, and layout hold up in EN, ES, and CA.
4. The default design carries the product. Experiments stay opt-in and must not weaken the default.
5. Respect the visitor: consent before measurement, no keep-warm pings, motion that honors `prefers-reduced-motion`.

## Accessibility & Inclusion

- WCAG AA contrast on every palette (tested).
- Semantic landmarks, correct ARIA state, and live regions for dynamic feedback.
- Reduced-motion support on every animation.
- Accessibility checks run in CI (sharded Playwright suite).
