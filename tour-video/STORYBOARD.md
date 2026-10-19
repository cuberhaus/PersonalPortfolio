---
format: 1080x1080
duration: 30s
message: "The whole portfolio in one scroll: real client work, 20 interactive demos, and the person behind them."
arc: Open on the page → One continuous scroll through all nine sections → Land on the address
audience: "Recruiters, hiring managers, and data/AI peers on the LinkedIn feed (muted autoplay)"
mode: autonomous
music: "bright uplifting electronic track, medium tempo 110-120 BPM, modern tech feel"
---

## Video direction

- **Show it as it is.** The live site is the visual source of truth: three stacked 2160-wide screenshot segments of the whole page, captured at a 1080 px viewport (the desktop layout) and scrolled 1:1 in a 1080x1080 canvas, so none of the site's text is ever cropped at the left or right edge or restyled. Nothing is rebuilt in HTML. The site is shot in its own default design (`shoot-tour.mjs` takes `--design` and `--theme` to shoot another). Crops are chosen, not left to chance: `scripts/shoot-tour.mjs` measures where the page has content and `scripts/pick-stops.mjs` parks each stop (and each ink plate) with its top and bottom edge on empty rows, so a held frame never slices a line of text or a heading; where a tall section cannot manage that, the cut crosses only a card's padding. The site's fixed overlays (top nav, scroll-to-top) are hidden in the capture; the consent banner never appears (the capture pre-seeds "denied" and never accepts).
- **Canvas and safe area.** 1080x1080 square for the LinkedIn feed. Content stays in the top ~83% (the player UI owns the bottom): the plates sit above y = 896.
- **Palette system (from `frame.md`, by role).** Ground = `ink-black` #17231F. All words that are not the site's own = `cream` #C2D5D2 on flat ink plates. `fire-orange` #B9472F is used only for the strip's progress bar. Never tint, recolour or overlay-filter the captured page.
- **Type (by role).** Display (plates) = Inter 900, lowercase, tight tracking. The strip = Inter 900 for the section number, Inter 800 lowercase for its name, JetBrains Mono for the small address. Text over the page always sits on a flat ink plate: no gradients, no shadows, no outlines.
- **Motion grammar.** One idea: the scroll. The page moves on `power3.inOut` legs from section to section, slow where a heading is parked and fast between, with the whole path on the music's beat grid (a leg is 4.5 to 8.5 beats). Plates rise and settle on `power3.out` and drop away on `power2.in`. No camera drift, no zoom, no breathing, no `repeat` / `yoyo`, no randomness, no wall-clock.
- **Rhythm and holds.** A held hero (3 beats, 1.5s) while "one scroll." is on screen; then eight legs, one per remaining section; the last 4s hold on the contact section with the address.
- **Music only.** A different library track from the promo's, on purpose, so the two films sound different: "Astral Generated Music: 8568afda" (bright, uplifting, medium tempo; labelled AI-generated, check its licence terms before posting), where the promo uses d3d4fddb (135 BPM, one big drop). It is candidate 03 of `promo-video/scripts/audition-music.mjs`; the other candidates are in `promo-video/assets/bgm/candidates/`. Measured on the source: exactly 120.00 BPM (a beat is 0.5s = 15 frames), beats at source 0.488s + k x 0.5s, a one-second riser, then the first full hit at source ~0.99s and a steady groove to ~32s. `scripts/make-bed.sh` delays it by 512 ms and builds `assets/bgm/bed.wav` (30.0s; -2 dB, -16.3 LUFS; limiter; 1.5s fade-out), so every beat falls on a whole half second of the video and the first hit lands at 1.5s, exactly when the first scroll leg starts; the riser plays under the hero hold. No narration, no `SCRIPT.md`, no SFX. The video must still read fully muted, so every beat is carried by the strip and the plates.
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

Layout, fixed for the whole frame: a flat ink strip across the top ~7% holds, left to right, the section's number as the site numbers it (00 for the hero, then 01 to 08) in big display type, a thin rule, the section's name in lowercase display type, and the site's address in small mono at the right; a 6px progress bar along the strip's bottom edge fills in fire-orange as the page scrolls (the same ease and legs as the scroll, notched at each section). The page fills the rest, scrolled at 1:1. Only the page, the number and name tokens, the bar and the plates ever change; the small address steps aside when the big one lands.
Scene 1 (0.0–1.5s): the hero, held still, parked 150 px down (nav row and empty top padding cropped; the window ends below the next section's subtitle, so no heading is half-cut). "one scroll." lands on a flat ink plate at the lower left at 0.15s and leaves just before the music hits.
Scene 2 (1.5–7.0s): the scroll starts on the hit. Two legs: hero to Featured Projects (5.5 beats), then Featured Projects to Try my projects (5.5 beats). "real client work." rises as Featured Projects parks (4.25s).
Scene 3 (7.0–17.5s): Try my projects to A bit about me (8.5 beats, the longest hop), then Where I've worked (6.5) and Tech I work with (6). "20 interactive demos." rises as Try my projects parks (7.0s).
Scene 4 (17.5–26.0s): Licenses & certifications (6 beats), Where I studied (6.5), then the short last hop to Get in touch (4.5).
Scene 5 (26.0–30.0s): parked on Get in touch. The address "polcasacubertagil.com" lands on a large flat ink plate over the lower third and holds still to the end; the music fades out over the last 1.5s.
