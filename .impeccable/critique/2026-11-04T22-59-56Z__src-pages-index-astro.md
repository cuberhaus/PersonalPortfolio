---
target: home page
total_score: 22
max_score: 32
na_heuristics: 7,10
p0_count: 0
p1_count: 2
target_identity: "file:/home/pol/cuberhaus/PersonalPortfolio/src/pages/index.astro"
target_fingerprint: "sha256:1c3e41e8c1bcadd2ceaa9418096d3fcaf3567d3998ca1d73c71bcb2b0140bad7"
target_path: /home/pol/cuberhaus/PersonalPortfolio/src/pages/index.astro
timestamp: 2026-11-04T22-59-56Z
slug: src-pages-index-astro
---
Method: dual-agent (A: design review 1b3b1212-f2a8-4f91-b846-53ed82889e54 · B: detector evidence 0b20b388-c526-4b4f-a3d1-9cd9fea4a2f0). A reviewed source only because the dev server was down when it ran; B measured the live DOM afterwards.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Scroll-spy nav, live-region announcements on the demo filter, and form status swaps all work. |
| 2 | Match System / Real World | 2 | Nav says "Client Work"/"Interactive Lab" but headings say "Featured Projects"/"Try my projects". Deloitte is "AI & ML Engineer" in Experience but "AI & Data Consultant" in About and Client Work. |
| 3 | User Control and Freedom | 3 | Locale and appearance controls easy to find; no persistent shortcut to CV or contact on a very long page. |
| 4 | Consistency and Standards | 2 | Square Swiss boxes sit next to 2rem pill chips in three places, plus card hover glow and lift. |
| 5 | Error Prevention | 3 | Contact form has email hints and honeypot protection. |
| 6 | Recognition Rather Than Recall | 3 | Numerals and labels help, but Experience, Skills, Certifications and Education are off-nav. |
| 7 | Flexibility and Efficiency | n/a | Single-purpose persuasion surface. |
| 8 | Aesthetic and Minimalist Design | 3 | Disciplined grid, but two large galleries come before the hiring proof. |
| 9 | Error Recovery | 3 | Contact success and failure copy exists. |
| 10 | Help and Documentation | n/a | A portfolio needs none. |
| **Total** | | **22/32** | **Acceptable (69%)** |

## Design Specificity Verdict

LLM assessment: mostly authored for this person, but the structure is category-default. Swiss grammar is specific (ink section rules, coral numerals, a 128px/900 Inter Tight name, flat transparent cards, teal emphasis with no gradient fill). The macro-structure is the standard long scroll, and the Interactive Lab dominates early scroll space. The hero's one filled action sends visitors to browse work, not to the CV or contact, which PRODUCT.md names as the success outcome.

Deterministic scan: 46 findings, all design-system-* or overused-font against DESIGN.md (design-system-font-size 18, design-system-font 13, design-system-radius 9, design-system-color 4, overused-font 2). No AI-slop patterns fired. About six are real: pill chips at Demos.astro:250 and :582 and Certifications.astro:141 (the certification chips were not in the documented drift), 0.7rem text at Demos.astro:444 and :548, and the Footer.astro:61 button radius. The other ~40 are false positives or off-ramp noise (noscript font list at Layout.astro:98, base-CSS radii/shadows/sizes overridden by Swiss, DESIGN.md documenting only 8 type roles).

Visual overlays: none. localhost:8400 was unreachable (the live helper had died), so no [Human]-tab overlay. Fallback: CLI scan plus DOM measurements at 1440px (swiss / barcelona-night): contrast body 16.25:1, hero description 7.52:1, coral CTA 7.67:1, section label 9.76:1, section numeral 7.67:1, all AA; no horizontal overflow at desktop or 390px; 37 alt="" images are decorative previews inside an aria-hidden container (correct); 209 focusable elements.

## Overall Impression

Coherent and well built, with clear Swiss hierarchy and solid contrast. The weak point is intent: the page is arranged to be admired, not to convert. A recruiter scrolls past two galleries to reach the CV, which sits inside About behind a configurator. Biggest opportunity: make the hiring path (CV or contact) as strong as the work.

## What's Working

1. The Signal Board grammar: ink rules, coral numerals and the headline scale make sections scannable without illustration; measured contrast is high everywhere.
2. Proof you can try: the Interactive Lab turns "I can build things" into something clickable, a clear advantage over a PDF-only candidate.
3. Trust mechanics: consent-first analytics, three-language routing, a live-region filter, scroll-spy nav and a skip link support the "shipped to the same standard" claim without invented testimonials.

## Priority Issues

1. [P1] The page's path doesn't serve its success outcome. .hero-cta links to #work ("View my work"). Order: Work, Interactive Lab, About, Experience, Skills, Certifications, Education, Contact (section 08). The CV sits inside About (section 03), reached via a nav item labelled "About". Contact does have GitHub, LinkedIn and email links, but only at the bottom. Fix: point the single filled hero action at the CV or contact, keep work as a quiet text link, surface a CV entry in the nav. Suggested command: $impeccable layout (with clarify for hero copy).
2. [P1] Employer proof is hidden and the title is inconsistent. Experience, Skills, Certifications and Education are not in the nav (inNav: false) and Experience appears after both galleries. Experience reads "AI & ML Engineer @ Deloitte" while About and Client Work say "AI & Data Consultant @ Deloitte"; PRODUCT.md uses Consultant. Fix: confirm the correct title (factual copy, not changed unasked), align the copy, and add Experience to the nav or put a one-line Deloitte credential in the hero. Suggested command: $impeccable clarify.
3. [P2] The CV downloader makes the recruiter configure before downloading. CvDownloader.tsx shows four preset radios and a portrait toggle ahead of the download button. Fix: one prominent default download (standard with portrait), presets behind "Other versions". Suggested command: $impeccable distill.
4. [P2] Swiss drift is wider than documented. .demo-filter-btn, .cert-filter-btn and .show-more-btn render as 2rem pills; Work and Demo cards still lift and glow on hover. Fix: html[data-design='swiss'] overrides in designs.css for the three chips and a flat card hover, then refresh the "Known drift" notes in DESIGN.md. Suggested command: $impeccable polish.
5. [P2] The appearance studio is on every page. The Palette button in the nav, the footer link and Ctrl+K open a 17-design modal on the first-screen nav of a 30-second visit. Rated P2, not P1: it is opt-in, blocks nothing, and the owner labelled it a lab. Fix: demote to a footer-only "Lab" link or a quieter nav item. Suggested command: $impeccable quieter.

## Persona Red Flags

Recruiter (30-second skim): nav offers Work, Interactive Lab, About, Contact with no Experience; first filled action is "View my work"; Deloitte appears third in the scroll with two different titles; the CV is behind About and a four-option picker.

Jordan (first-timer): taps the coral button and lands on project cards, not a CV; looks for "Resume" and finds "About"; the Palette button opens a 17-design modal unrelated to hiring.

Casey (mobile): 38 controls under 44px by raw measurement at 390px, which over-counts because the emulation does not trigger pointer: coarse. Real offenders: logo 52x34, language links 40x40, .demo-github-link 32x32, 40px theme button. The demo grid and 37 preview images are heavy mid-page.

Riley (stress tester): a language switch reloads the whole page (data-astro-reload); Experience, Skills, Certifications and Education have no nav anchors, so zoomed to 200% it is a long scroll with nothing to jump to; 19 certification cards in one list; 209 tab stops.

## Minor Observations

- Nav says "Client Work"/"Interactive Lab"; headings say "Featured Projects"/"Try my projects".
- One element animates infinitely and was not identified; check it respects prefers-reduced-motion.
- Inter loads for the other designs although the default uses only Inter Tight.
- Nav logo "Pol C." abbreviates the name the hero shows in full.
- The demo filter shows 7 buttons on desktop and 8 on mobile; not established why.
- The footer button and skill tooltip use var(--radius-sm, 6px), which resolves to square on Swiss, so they only trip the detector.

## Questions to Consider

- If success is a CV or a message within two clicks, why is the only filled hero action "View my work"?
- Should Experience be as visible in the nav as the work, or is the work the whole pitch?
- Is the studio still an honest experiment while it shares the first-screen nav with language switching?
