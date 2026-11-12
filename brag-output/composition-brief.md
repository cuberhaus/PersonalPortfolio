# Hyperframes Composition Brief: Pol Casacuberta — Personal Portfolio

## Objective
Create a short launch-style brag video for the Personal Portfolio repo (the design-customisable Astro + React portfolio).

## Output
- Composition directory: `brag-output/composition/`
- Rendered video: `brag-output/brag.mp4`
- Format: landscape — 1920x1080 @ 30 fps
- Duration: 23.70 seconds

## Source Material
- Project root: `/home/pol/cuberhaus/PersonalPortfolio`
- Primary files read: `README.md`, `package.json`, `src/lib/themes.ts`, `src/lib/designs.ts`, `src/styles/{global,themes,designs}.css`, `src/components/ThemeInit.astro` (picker markup), `src/components/Demos.astro`, `locales/{en,es,ca}/{ui,designs,demos,work_projects}.json`, `AGENTS.md`
- Product name: Pol Casacuberta — Portfolio
- Tagline / strongest claim: "I build AI & data systems that work in the real world." / 17 designs
- Key UI moment to show: the real Ctrl+K "Customize" picker re-skinning the page (captured from the running site, `assets/shots/`), plus the real Lab cards (`assets/cards/`)
- Copy that must appear verbatim:
  - "It's a portfolio." / "It has 17 designs." (framing; the "17" is true: `DESIGNS.length === 17`)
  - Design names and palette labels exactly as in the picker: Comic, Synthwave, Terminal, Phosphor Green, Pixel, Newspaper, Sepia, Brutalist, Paper, Zine, Gruvbox Dark
  - Zine blurb: "Photocopied ransom-note collage, staples and tape"
  - "Try my projects", "Live, interactive demos"
  - "Hi, I'm", "Pol Casacuberta", "I build AI & data systems that work in the real world."
  - polcasacubertagil.com

## Creative Direction
- Tone preset: default
- Creative direction: deadpan "it's just a portfolio" that escalates into a personality-swap montage
- Interpretation: Confident, warm, a little smug. Quote the product's own copy for the jokes. Hard cuts live in the montage only; everywhere else use clean, causal motion (blur-in titles, colour flood, iris, blur swap).
- Angle: A portfolio that is a design studio. The proof is the real flow (Ctrl+K → pick design → pick palette → the whole page transforms), then the same hero in other designs and languages.
- Hook: "It's a portfolio." then (beat 1.59) "It has 17 designs." over the dimmed real hero.
- Outro / punchline: "Hi, I'm Pol Casacuberta" + the hero tagline + URL, over the same dimmed hero as frame 0.
- Avoid:
  - Generic SaaS language
  - Abstract filler visuals (every visual is a capture of the real site or a recreation of its real UI elements)
  - Unrelated visual redesign (video chrome follows the site's Swiss / Barcelona Signal look)
  - Claims not in the project (no test counts, no client names, no private data)

## Visual Identity
- Background: `#101a18`
- Text: `#f2f6f1` (secondary `#c3d0ca`, muted `#9aada5`)
- Accent: teal `#68d2bd`, signal coral `#ff8a65`; card `#1b2d28`; border `#2d4841`
- Display font: Inter 900 (bundled stand-in for the site's Inter Tight), tracking -0.05em on hero-scale lines
- Body font: Inter 700/400; labels in JetBrains Mono
- Visual references from the project: giant coral Swiss numerals, hairline rules, uppercase mono eyebrow labels, hard-cornered cards

## Storyboard
Use the storyboard in `brag-output/brag-plan.md` as the creative contract.

Scene summary:
1. Hook — 3.18s (0.00-3.18) — dimmed real hero + "It's a portfolio." / "It has 17 designs."
2. Real flow — 4.22s (3.18-7.40) — Ctrl K keycaps, real picker, click Comic, click Synthwave, Esc, comic hero
3. Swap montage — 7.22s (7.40-14.62) — Terminal, Pixel, Newspaper, Brutalist cuts, Zine with real blurb
4. Lab wall — 3.16s (14.22-17.38) — 20 real cards in rows, counter 5/10/15/20, "Try my projects", "Live, interactive demos"
5. Three languages — 3.16s (17.38-20.54) — EN / ES / CA real heroes, switch follows cuts
6. Outro — 3.16s (20.54-23.70) — name slam, tagline, URL

## Audio
- Audio role: moderate professional accents on a warm bed
- Audio arc: bed in → tactile UI sounds → rhythmic thuds → card slides + ping → bell → fade-out
- Music: `happy-beats-business-moves-vol-9-by-ende-dot-app.mp3` (CC BY 4.0, Sascha Ende)
- Music treatment: vol ≈ 0.36, fade-in 0.3 s, fade-out 1.6 s
- Music cue guidance: bundled preset at `composition/assets/cues/…vol-9….music-cues.json`. Beat-locked: 3.70 picker open, 6.34 picker close/reveal, 14.22 Lab wall start, 20.54 name slam. Beat-grid: montage cuts 7.40/8.44/9.50/10.54/11.60, Lab rows 14.22/14.76/15.28/15.81, language cuts 17.38/18.44/19.48.
- Audio-reactive treatment: subtle. `assets/audio-env.js` (bass/treble/rms per frame at 30 fps, extracted from the track with media-use `extract-audio-data.py`) is sampled at build time to size soft coral glows on "17", the montage plate and the outro name. No waveform visuals.
- Audio-coupled moments:
  - Scene 2 — Ctrl, K, Esc keycaps; two clicks; picker open/close thuds
  - Scene 3 — one soft thud per cut
  - Scene 4 — card slide per row; ping on "20"
  - Scene 5 — click per language cut
  - Scene 6 — bell on the name
- SFX selection guidance: all from `sfx-analysis.md` low/medium HF-risk picks — impactSoft_medium_*, click_002/003/005, keyboard keypress-*, card-slide-1, bong_001, impactBell_heavy_003. Volumes 0.35-0.8.
- Exact SFX choice: implemented in `index.html`; timestamps follow the visible animation.
- Audio files: copied into `composition/assets/{music,sfx,cues}/`.

## Hyperframes Instructions
Followed the Hyperframes `hyperframes`, `hyperframes-cli` and `media-use` guidance (contract, motion, look, audio-reactive). Storyline/SPEC/REVIEW/usage/history/feedback steps skipped per /brag. `npx hyperframes check` is the pre-render gate. Creation and rendering are local (GSAP vendored into `assets/vendor/`).
