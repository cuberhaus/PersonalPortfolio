---
workflow: product-launch-video
flow: automation
storyboard: no
message: "The whole portfolio in one scroll: real client work, 20 interactive demos, and the person behind them."
destination: linkedin
aspect: 1080x1080
language: en
audience: "Recruiters, hiring managers, and data/AI peers scrolling LinkedIn (muted autoplay)"
length: 30s
angle: one-scroll-as-is
---

## Intent

A site tour of https://polcasacubertagil.com for the LinkedIn feed: the page shown exactly as a visitor reads it, top to bottom, in one continuous scroll. It is the second film for this site. The first is the promo in `../promo-video/` (a re-skin showcase: "255 looks" and the 20 interactive demos), and the tour is its calm counterpart: the same page, same order, nothing restyled. It must read fully muted; on-screen text carries every beat.

Owner's answers (2026-10-07, after asking for "the separate site-tour video"): show the whole site in page order; angle "one scroll, start to finish"; about 30s; LinkedIn feed (square); no storyboard review; automation.

## Customizations

- Show-it-as-is: the captured screens are the visual source of truth. Real pixels from the live site; no section is rebuilt in HTML. Only chrome added: a flat ink strip across the top. It is deliberately not the promo's strip (mono label, counter, nine ticks): the owner asked for a different design for it. This one reads number | name | address, in display type: the section's number as the site itself numbers it (00 for the hero, 01 Featured Projects ... 08 Get in touch) in big Inter 900, the section's name in Inter 800 lowercase, the site's address in mono at the right, and along the bottom edge one continuous progress bar in fire-orange that is the page's scroll position, notched at each section.
- Sections, in page order (from the live page): Hero · Featured Projects (Professional Work) · Try my projects (the interactive lab) · A bit about me · Where I've worked · Tech I work with · Licenses & certifications · Where I studied · Get in touch.
- Reuse of the promo's capture: `capture/` is copied from `../promo-video/capture/` (brand tokens, visible text, the site's own assets, the 1920-wide full-page plate). A fresh 1080-wide scroll capture is added, because a 1920-wide plate cannot fill a square at 1:1 without cutting the site's text at the edges.
- Same design identity as the promo: reuse its `frame.md` (the `broadside` preset remixed onto the site's tokens).

## Notes

- Decisions the agent made without asking (inferred, with reasons): the tour is a new project, not a new section in the promo's (a HyperFrames project holds one film; its `index.html` is the whole timeline); sibling folder `tour-video/`, inside PersonalPortfolio at the owner's request that all of this stays in the repo. Look: the site is shot in its own default design, as a first-time visitor sees it. (v2 tried the Brutalist / Light design after a misreading of "use a different design": the owner meant the strip, not the website. That render is kept as `renders/video-v2-brutalist.mp4`; to shoot it again run `node scripts/shoot-tour.mjs --design brutalist --theme light`, then `node scripts/pick-stops.mjs`, paste the output into the composition and re-assemble. v1, the first cut with the promo's strip and uncorrected crops, is `renders/video-v1-first-cut.mp4`.) Crops: stops and plate positions are picked from the measured content layout (`scripts/pick-stops.mjs`), so held frames do not slice text. Music: a different library track from the promo's, on the owner's request, so the two films sound different (the promo keeps d3d4fddb, 135 BPM with one big drop; the tour uses 8568afda, a steady, bright 120 BPM groove). The previous bed, built from the promo's track, is in `.backups/music-d3d4fddb/`; other auditioned candidates are in `../promo-video/assets/bgm/candidates/` (a library track labelled AI-generated; the owner must check its licence before posting). No narration, no `SCRIPT.md`.
- Claims allowed on screen are the same as the promo's, all source-traced to the live site: section names as the site writes them; "20" (the site's "Showing 20 Interactive Lab"); "open any in your browser"; "255 looks / 15 themes x 17 designs" only if shown on the page itself. Never say live, all work, production, real model output or any metric: many demo pages are browser mocks or need a local backend.
- Setup used the pinned local skills (`HYPERFRAMES_SKIP_SKILLS=1`); nothing was pulled from GitHub main. HyperFrames telemetry is disabled at the owner's request.
- Preferences recorded from this brief: destination, flow, storyboard (the owner approved recording them after the promo). `style_preset` is not recorded: the preset was chosen by the workflow, not by the owner.
