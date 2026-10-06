---
workflow: product-launch-video
flow: automation
storyboard: no
message: "This portfolio re-skins into 255 looks, and it ships 20 interactive demos you can open in your browser."
destination: linkedin
aspect: 1080x1080
language: en
audience: "Recruiters, hiring managers, and data/AI peers scrolling LinkedIn (muted autoplay)"
length: 35s
angle: transformation-then-proof
---

## Intent

A promo for the portfolio website https://polcasacubertagil.com, made for the LinkedIn feed. The owner asked for "a cool video about my portfolio webpage" and had no fixed picture: "no idea, but probably the most likely [destination] is linkedin", then "you decide" on the pitched concepts, so the recommended concept was adopted.

Chosen concept, "255 looks" (pitched as "306 looks"; corrected, see Notes): one portfolio, every look. The same page re-skins through the site's 15 visible themes x 17 designs in rapid succession (CRT phosphor, comic panels, newspaper, risograph, blueprint, ...), each look a real capture of the live site, then settles on the real thing. It closes on proof, borrowed from the "20 things you can touch" concept: a counter climbing to 20 interactive demos (polyp detection, license plates, WebGL shaders, PDDL planning, ...), each tile a real capture of its page.

Hook: a plain page appears and, about half a second in, glitches into a comic panel. Reads fully with no sound; on-screen text carries the message.

## Customizations

- Website capture of the live site for brand tokens and real screens.
- Extra "looks shoot": capture the page in ~8-10 distinct theme + design combinations using the site's own `?theme=<id>&design=<id>` URL parameters (it stores them and applies them before first paint), since the standard capture only gets the default look.
- Shader-wipe transitions between looks.
- Count-up counter to 20 on the closing proof beat, over real captured demo screens.
- Design spec: leave to the workflow's design step (it remixes a preset onto the captured brand tokens).

## Notes

- Autonomous run: "you decide" read as accepting the pitch and deciding the rest. The one kept question is the final preview: render now, or what changes? Nothing rendered before the answer; the owner answered "render now" and v1 was rendered (see the variants note below).
- No narration (no `SCRIPT.md`, no voice or generation paths). Music only: the owner signed in to HeyGen themselves and approved library music; the track and how it was shaped are in `STORYBOARD.md` under "Music only". The video must still read fully muted.
- Square 1080x1080 over a wide desktop site: crop to the hero area per look, one idea per frame, check legibility at phone size. Format decision (user): a full 4:5 (1080x1350) build was made and reviewed first (LinkedIn lists 4:5 as the "Recommended ratio" for video ads, https://www.linkedin.com/help/linkedin/answer/a424737), then the user chose 1:1 as the lower-risk pick for mobile + desktop feeds. The 4:5 build is preserved (untracked) at `.backups/4x5-build/`; the 1:1 build as it was before the 4:5 rework is at `.backups/1x1-before-4x5-rework/`.
- Look count, verified 2026-10-06 against the live site's own picker markup: 15 visible themes x 17 designs = 255. The pitch said 306 (18 x 17), which counted the 3 retired themes (catppuccin-mocha, one-dark, catppuccin-latte) that are hidden from visitors but still URL-accessible. Show only 255, and only claims verified from the site.
- Demo-claim correction, verified 2026-10-06 by reading all 20 demo pages: many say they are browser mocks ("The bounding boxes are a browser mock, not model output", "This is a mock demo") or need a local backend ("Run locally to see the full app"). So never say "live", "all work", "real model output" or "production". Safe, source-backed wording only: "20 interactive demos" (the site: "Showing 20 Interactive Lab") and "open any in your browser" (the site: "demos you can play with right in your browser"). The original pitch phrase "every demo really works" is dropped.
- Per-look captions come from the site's own design blurbs (e.g. Terminal: "CRT vibes, monospace everywhere, blinking cursor"; Comic: "Bangers titles, Ben-Day dots, speech bubbles"; Newspaper: "Blackletter masthead, columns, classified ads"), see `capture/extracted/visible-text.txt` lines 1-60. Use the site's UI labels ("Cyberpunk", "Art Deco"), not the internal ids.
- Design: `broadside` preset chosen by the workflow (not user-picked, so not recorded as a preference). The remix mapped `cream-muted` to teal #006D72, only ~2.7:1 on the ink ground: use cream #C2D5D2 for all small text; brick #B9472F only for large display type (~3.1:1 on ink).
- Follow-on, built after this one: a show-it-as-is site tour, a separate sibling project at `../tour-video/` (its own brief, storyboard and render). It reuses this project's `frame.md`, the capture's site assets and the same music family.
- Setup used pinned local skills (`HYPERFRAMES_SKIP_SKILLS=1`); nothing was pulled from GitHub main. HyperFrames telemetry was disabled at the owner's request.
- Preferences are not recorded yet: destination was hedged ("probably") and the run shape comes from a signal; record after the owner confirms at the final review.
- Variants, on the owner's request ("it would be fun if it sped up shifting through the looks? keep the other video just in case", then "and adding more looks"). v1 is `renders/video-v1-steady.mp4`: nine looks at a steady 1.3 to 1.8s each; its sources are in `.backups/v1-steady-pace/` (`03-nine-looks.html`, `index.html`, `STORYBOARD.md`). v2 is `renders/video-v2-accelerating.mp4`: 26 looks, from 1.4s down to 0.22s per look, every cut on a beat of the music bed (measured 135.1 BPM, a beat at 8.42s), ordered so the fast stretch stays dark and crosses to light once. Measured on the render: at most 3 whole-frame luminance swings of 10% or more in any second, against a WCAG limit of 3 flash pairs (6 swings). Frame 3's file was renamed to `03-look-ramp.html`. The owner preferred v2 ("i like it better this way i think", 2026-10-06; tentative, music still unheard by the agent). To go back to v1: copy the three backed-up files over the current ones, delete `compositions/frames/03-look-ramp.html`, then re-run `assemble-index.mjs` and `transitions.mjs inject`.
