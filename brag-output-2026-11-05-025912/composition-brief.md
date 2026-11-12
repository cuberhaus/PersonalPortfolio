# Hyperframes Composition Brief: Pol Casacuberta — Personal Portfolio, project cards

## Objective
Create a short launch-style brag video for the Personal Portfolio repo, about its project cards: the 20 "Try my projects" Interactive Lab demos and the two Client Work cards. Sibling of the earlier design-studio brag in `brag-output/`.

## Output
- Composition directory: `brag-output-2026-11-05-025912/composition/`
- Rendered video: `brag-output-2026-11-05-025912/brag.mp4`
- Format: landscape — 1920x1080 @ 30 fps
- Duration: 23.70 seconds

## Source Material
- Project root: `/home/pol/cuberhaus/PersonalPortfolio`
- Primary files read: `README.md`, `AGENTS.md`, `DESIGN.md`, `PRODUCT.md`, `src/components/Demos.astro`, `src/components/WorkProjects.astro`, `src/data/work_projects.json`, `locales/{en,es,ca}/{ui,demos,work_projects,par-demo,spmatriculas-demo}.json`
- Product name: Pol Casacuberta — Portfolio
- Tagline / strongest claim: "Live, interactive demos you can play with right in your browser" (trimmed to "Live demos, right in your browser.")
- Key UI moments to show (all recorded from the running site, `assets/clips/`, `assets/shots/`):
  - License Plate Detection: pick a sample, Detect plate, pipeline stages, plate text `ZME8325`, ground truth `Match`
  - Parallel Computing Labs: Play on the heat equation, drag and scroll-zoom into the Mandelbrot set
  - The full wall of 20 real cards and the two real Client Work cards
- Copy that must appear verbatim:
  - Titles: "License Plate Detection", "Parallel Computing Labs"
  - Kickers from the cards: "Computer Vision · FIB-UPC", "Mandelbrot · Heat equation"
  - Client Work cards as on the site: "Physical AI Anomalies Detection" (Horse), "E2E AI Talent Matching Platform" (Gobierno de Aragón)
  - "Hi, I'm", "Pol Casacuberta", "AI & ML Engineer"
  - polcasacubertagil.com
- Framing copy invented for the video (jokes, not product claims): "Homework ends in a .zip.", `entrega_final_v2_DEFINITIVO.zip`, "Mine run.", "0 zip files.", "Homework that runs."

## Creative Direction
- Tone preset: default
- Creative direction: deadpan student-humour hook ("Homework ends in a .zip."), then confident proof
- Interpretation: Dry and typographic for the first 3 s, then the product doing its thing at real speed (lightly sped up, 1.09x / 1.12x), then a beat-stepped catalog of all 20 cards with a counter, then client credibility, then the name. Transitions are causal: iris from the filename chip, coral flood from "run.", a whip between the two demos, a hard cut into the wall, a blur swap into client work, a coral hit that collapses into the underline.
- Angle: Course projects usually die as a zip file; these ones run in your browser.
- Hook: "Homework ends in a .zip." with the chip `entrega_final_v2_DEFINITIVO.zip` typing in.
- Outro / punchline: "Hi, I'm Pol Casacuberta — AI & ML Engineer. Homework that runs." + URL.
- Avoid:
  - Generic SaaS language
  - Abstract filler visuals (every visual is a capture of the real site, or the site's own type and colours)
  - Claims not in the project (no test counts, no private data, no repo names; the "Run locally" dev banner is cropped out of the demo recordings)
  - Fake UI (the demos are real recordings; nothing is mocked up)

## Visual Identity
- Background: `#101a18`
- Text: `#f2f6f1` (secondary `#c3d0ca`)
- Accent: teal `#68d2bd`, signal coral `#ff8a65`; card `#1b2d28`; border `#3e6359`
- Display font: Inter 900 (bundled stand-in for the site's Inter Tight), tracking -0.05em on hero-scale lines
- Body font: Inter 700/400; labels and the filename chip in JetBrains Mono
- Visual references from the project: giant coral Swiss numerals, hairline rules, uppercase mono eyebrow labels, hard-cornered cards, the coral demo buttons

## Storyboard
Use the storyboard in `brag-output-2026-11-05-025912/brag-plan.md` as the creative contract.

Scene summary:
1. Hook — 3.01s (0.00-3.01) — "Homework ends in a .zip." + the filename chip
2. Reveal — 4.34s (3.01-7.35) — "Mine run." + the real "Try my projects" section
3. Proof — 7.93s (7.35-15.28) — real License Plate Detection run, whip, real Parallel Computing Labs run
4. Wall — 3.27s (15.28-18.55) — 20 real cards stepping on the beat, counter 00 → 20, "0 zip files."
5. Client work — 2.19s (18.55-20.74) — the two real Client Work cards
6. Outro — 2.96s (20.74-23.70) — coral hit, name, tag, URL

## Audio
- Audio role: moderate professional accents on a warm bed
- Audio arc: bed in → dry impacts on the hook → real clicks in the demos → card slides stepping the wall → bell on the name → fade-out
- Music: `happy-beats-business-moves-vol-10-by-ende-dot-app.mp3` (CC BY 4.0, Sascha Ende)
- Music treatment: vol 0.34, fade-in 0.3 s, fade-out 1.6 s
- Music cue guidance: bundled preset at `composition/assets/cues/…vol-10….music-cues.json`. Strong-cue locks: 18.55 (blur swap into client work), 20.74 (coral hit and name). Beat-grid: hook 0.27/0.82/1.37, "Mine"/"run." 3.55/4.10, plate clicks 8.22/9.29, whip 11.47, Play 12.02, wall steps 15.82/16.38/16.93/17.47, second client card 19.10, URL 21.28.
- Audio-reactive treatment: subtle. `assets/audio-env.js` (bass/treble/rms per frame at 30 fps) is sampled at build time to size soft coral glows on ".zip.", "run.", the LIVE dots, the counter and the name. No waveform visuals.
- Audio-coupled moments:
  - Scene 1 — impact per line, drop when the chip lands
  - Scene 3 — `click2` on the two recorded clicks and on Play; card-slide on the whip; soft impact when the plate result appears (10.02)
  - Scene 4 — card-slide per wall step; bong on "20"
  - Scene 5 — card-slide per card
  - Scene 6 — bell on the hit, drop on the URL
- SFX selection guidance: low / medium HF-risk picks only — impactSoft_medium_*, click2, card-slide-1, drop_001/002, bong_001, impactBell_heavy_003. Volumes 0.35-0.8.
- Exact SFX choice: implemented in `index.html`; timestamps follow the visible animation (the demo clicks are synced to the cursor clicks in the recordings).
- Audio files: copied into `composition/assets/{music,sfx,cues}/`.

## Hyperframes Instructions
Followed the Hyperframes `hyperframes`, `hyperframes-cli` and `media-use` guidance (contract, motion, look, audio-reactive). Storyline/SPEC/REVIEW/usage/history/feedback steps skipped per /brag. `npx hyperframes check` is the pre-render gate (0 errors; the one remaining craft note is `first_frame_empty`, resolved by baking the poster into frame 0). Creation and rendering are local (GSAP vendored into `assets/vendor/`). Capture scripts are kept in `scripts/`.
