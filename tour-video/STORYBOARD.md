---
format: 1080x1080
duration: 30s
message: "The whole portfolio in one scroll: real client work, 20 interactive demos, and the person behind them."
arc: Open on the page → One continuous scroll through all nine sections → Land on the address
audience: "Recruiters, hiring managers, and data/AI peers on the LinkedIn feed (muted autoplay)"
mode: autonomous
music: "upbeat, bright and positive electronic, energetic modern tech product, driving groove, no vocals"
---

## Video direction

- **Show it as it is.** The live site is the visual source of truth: three stacked 2160-wide screenshot segments of the whole page, captured at a 1080 px viewport (the desktop layout) and scrolled 1:1 in a 1080x1080 canvas, so none of the site's text is ever cropped at the left or right edge or restyled. Nothing is rebuilt in HTML. The site is shot in its **Brutalist / Light** design (`?design=brutalist&theme=light`), not the default Swiss look the promo opens on, so the two films do not start on the same page. Crops are chosen, not left to chance: `scripts/shoot-tour.mjs` measures where the page has content and `scripts/pick-stops.mjs` parks each stop (and each ink plate) with its top and bottom edge on empty rows, so a held frame never slices a line of text or a heading; where a tall section cannot manage that, the cut crosses only a card's padding. The site's fixed overlays (top nav, scroll-to-top) are hidden in the capture; the consent banner never appears (the capture pre-seeds "denied" and never accepts).
- **Canvas and safe area.** 1080x1080 square for the LinkedIn feed. Content stays in the top ~83% (the player UI owns the bottom): the plates sit above y = 896.
- **Palette system (from `frame.md`, by role).** Ground = `ink-black` #17231F. All words that are not the site's own = `cream` #C2D5D2 on flat ink plates. `fire-orange` #B9472F is used only for the current tick on the strip. Never tint, recolour or overlay-filter the captured page.
- **Type (by role).** Display (plates) = Inter 900, lowercase, tight tracking. Chrome (the strip) = JetBrains Mono, uppercase, tracked. Text over the page always sits on a flat ink plate: no gradients, no shadows, no outlines.
- **Motion grammar.** One idea: the scroll. The page moves on `power3.inOut` legs from section to section, slow where a heading is parked and fast between, with the whole path on the music's beat grid (a leg is 5 to 9.5 beats). Plates rise and settle on `power3.out` and drop away on `power2.in`. No camera drift, no zoom, no breathing, no `repeat` / `yoyo`, no randomness, no wall-clock.
- **Rhythm and holds.** A held hero (4 beats, 1.8s) while "one scroll." is on screen; then eight legs, one per remaining section; the last 4s hold on the contact section with the address.
- **Music only.** The same library track as the promo ("Astral Generated Music: d3d4fddb", labelled AI-generated; check its licence terms before posting), cut from 6.2s into the source so the drop (full energy at source 8.0s) lands at 1.8s, exactly when the first scroll leg starts. `scripts/make-bed.sh` builds `assets/bgm/bed.wav` (30.0s; -4 dB; limiter; 1.5s fade-out). The track's beat grid was measured on the promo's bed (kick onsets and full-band flux agree: 135.1 BPM); in this bed the first beat is at 0.046s. No narration, no `SCRIPT.md`, no SFX. The video must still read fully muted, so every beat is carried by the strip and the plates.
- **Claims allowed on screen (all source-traced to the live site).** Section names exactly as the site writes them (the strip); "one scroll." (a description of this video); "real client work." (the site's "Client Work" section: "Key milestones and AI initiatives delivered in the real world"); "20 interactive demos." (the site's "Showing 20 Interactive Lab"); the site's own address. **Never** say live, all work, production, real model output or any metric: many demo pages are browser mocks or need a local backend.
- **Negative list.** No stock "AI" gradients, bokeh, glows or generic shapes standing in for a real capture; no invented UI; no recoloured page; no cursors, browser chrome or scrollbars; both failure modes: slideshow (cuts between static screens) and screensaver (many things drifting independently); no `repeat` / `yoyo`, no randomness.

## Frame 1 — One scroll

- scene: The whole portfolio scrolls past in one continuous move, section by section, while a strip names each section; it parks on the contact section and the address lands
- duration: 30s
- poster: 9.5s
- transition_in: cut
- status: outline
- src: compositions/frames/01-one-scroll.html
- type: evidence
- persuasion: Show-don't-tell proof
- beat: curiosity → trust
- blueprint: compose
- reference: none: a continuous scroll over a tall captured plate, timed to the beat
- asset_candidates: assets/tour-00.png — the page from the top to y=3600 (hero, Featured Projects, Try my projects, the start of About); assets/tour-01.png — y=3600 to 7200 (About, Experience, Tech I work with, Licenses & certifications, the start of Where I studied); assets/tour-02.png — y=7200 to the foot of the page (Where I studied, Get in touch, the footer)
- focal: assets/tour-00.png
- roles: tour-00 / tour-01 / tour-02 = one continuous page plate, stacked with no seam and scrolled together; the strip is chrome; the plates are the only added words

narrativeRole: The proof that the claim is true: here is the entire page, every section, the real thing, in the order a visitor meets it.
keyMessage: This is the whole site, and it is real.

Layout, fixed for the whole frame: a flat ink strip across the top ~7% holds the label slot (section name left as the site writes it, "NN / 09" right, uppercase tracked chrome type, cream) with a 1px hairline under it carrying nine tick marks that advance one tick per section; the page fills the rest, scrolled at 1:1. Only the page, the two label tokens and the plates ever change.
Scene 1 (0.0–1.8s): the hero, held still, parked 150 px down (nav row and empty top padding cropped; the window ends below the next section's subtitle, so no heading is half-cut). "one scroll." lands on a flat ink plate at the lower left at 0.5s and leaves just before the music drops.
Scene 2 (1.8–7.4s): the scroll starts on the drop. Two legs: hero to Featured Projects (6.5 beats), then Featured Projects to Try my projects (6 beats). "real client work." rises as Featured Projects parks (4.7s).
Scene 3 (7.4–17.6s): Try my projects to A bit about me (9.5 beats, the longest hop), then Where I've worked (7) and Tech I work with (6.5). "20 interactive demos." rises as Try my projects parks (7.4s).
Scene 4 (17.6–26.0s): Licenses & certifications (7 beats), Where I studied (7), then the short last hop to Get in touch (5).
Scene 5 (26.0–30.0s): parked on Get in touch. The address "polcasacubertagil.com" lands on a large flat ink plate over the lower third and holds still to the end; the music fades out over the last 1.5s.
