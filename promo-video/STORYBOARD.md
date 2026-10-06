---
format: 1080x1080
duration: 35s
message: "This portfolio re-skins into 255 looks, and it ships 20 interactive demos you can open in your browser."
arc: Hook → Value claim → Evidence (the looks) → Breather → Proof (20 demos) → CTA
audience: "Recruiters, hiring managers, and data/AI peers on the LinkedIn feed (muted autoplay)"
mode: autonomous
music: "upbeat, bright and positive electronic, energetic modern tech product, driving groove, no vocals"
---

## Video direction

- **Canvas and safe area.** 1080x1080 square for the LinkedIn feed. Plan every frame's content into the top ~83% (the player UI and caption band own the bottom). Captured looks are 2160x2720 plates (1080x1360 CSS px at 2x), shown 1:1 with no zoom, so the site's text is never cropped at the edges; demo-page plates are 1080x1080 (tiles only, never pushed in past 1:1).
- **Palette system (from `frame.md`, by role).** Ground = `ink-black` #17231F. All text = `cream` #C2D5D2. `fire-orange` #B9472F only for large display numerals ("255", "20"), never small text. Never use `cream-muted` for text (it remixed to teal #006D72, only ~2.7:1 on the ink ground). The captured looks supply every other colour on screen; never tint, recolour or overlay-filter a captured look.
- **Type (by role).** Display = the frame's lowercase heavy display ramp (`display` / `fadelist-title`); chrome = the uppercase tracked `label` ramp. Text over a screenshot always sits on a flat ink plate: no gradients, no shadows, no outlines.
- **Plate crop.** Hero plates (looks) are cropped to start just below the site's own top nav, so no tiny UI text appears and the hero name stays readable at phone size. No real cursors, browser chrome, scrollbars or footers.
- **Motion grammar.** The engine is the in-place swap: a fixed frame whose content changes on a velocity-matched glitch snap (about 0.2s, shrinking to about 0.1s at the fastest cuts: RGB split, horizontal slice displacement, brightness flicker; technique reference `compositions/glitch.html`, a WebGL shader the worker may adapt or replace with an equivalent seek-safe version). Type uses long-tail `power3` settles, never bounce. No camera drift, no breathing, no lazy back-half pan or push.
- **Reveal model (silent video).** There is no voiceover, so cues are on-screen text beats. At t=0 of each frame only its first element shows; each further line, label or tile enters on its own beat, spread across the back ~50% of the frame, never all at once.
- **Rhythm and holds.** Held frames, deliberately: Frame 1 opens on a held plain page (1.1s) before the snap; Frame 4 is the breather and the calmest frame; Frame 6 ends on a held read. Frame 3 is the only high-energy frame, and its speed ramps up: 1.4s for the first look, then 1.1s, 0.9s, 0.67s, 0.44s, down to 0.22s per look in the closing burst, then it lands and holds on the last look. Every cut sits on a beat of the music bed (see Music), and the burst is one dark run that crosses to light once, so it never strobes.
- **Music only.** Background music from the HeyGen library (`music:` mood above); no `SCRIPT.md`, so no narration, and no SFX. The video must still read fully muted (LinkedIn autoplays silent), so every beat stays carried by on-screen text. Track: "Astral Generated Music: d3d4fddb" (a library track labelled as AI-generated; 46s, ~134 BPM; check its licence terms before posting), chosen from the five candidates `scripts/audition-music.mjs` saves in `assets/bgm/candidates/` because its structure fits the picture (quiet intro, full energy from 8.0s); it is the agent's pick from measurements, not yet confirmed by listening. `scripts/make-bed.sh` shapes it into `assets/bgm/bed.wav` (exactly 35.0s, so the assembler does not loop it): delayed 0.4s so the music enters at ~1.4s as the first snap ends, the riser hit lands at ~8.3s and full energy starts at 8.4s (the start of frame 3), and an onset near 4.75s meets the "255" count start (4.8s); a beat-grid measurement of the bed (kick onsets and full-band spectral flux agree) gives 135.1 BPM with a beat at 8.42s, so Frame 3's cuts are placed on that grid (a beat is 0.444s; the table of looks in `03-look-ramp.html` is in beats); trimmed by -4 dB (full section about -16 LUFS, true peak -4.6 dBFS) with a 1.5s fade-out. The first track (minimal electronic, 120 BPM) is kept as `assets/bgm/*-v1-minimal-electronic.wav`. If `audio.mjs generate` is re-run, copy the track it writes (`track.mp3`, which holds WAV data) to `assets/bgm/source.wav`, re-run `make-bed.sh`, and re-point `audio_meta.json` at `bed.wav`.
- **Claims allowed on screen (all source-traced).** "255" and "15 themes x 17 designs" (the live site's picker); "20" (the site's "Showing 20 Interactive Lab"); "open any in your browser" (the site's "demos you can play with right in your browser"); design and theme labels exactly as the site's UI writes them; the site's own hero line. **Never** say live, all work, production, real model output or any metric: many demo pages are browser mocks or need a local backend.
- **Negative list.** No stock "AI" gradients, bokeh, glows or generic decorative shapes standing in for a real capture; no invented UI; no recoloured looks; both failure modes: slideshow (everything dumped early, then frozen) and screensaver (many things drifting independently); no `repeat` / `yoyo`, no randomness, no wall-clock.

## Frame 1 — The plain page

- scene: The portfolio exactly as a first-time visitor sees it, held still, then it glitch-snaps into a comic panel
- duration: 3.6s
- poster: 2.6s
- transition_in: cut
- status: animated
- src: compositions/frames/01-plain-page.html
- type: hook
- persuasion: Pattern interrupt (expectation, then break)
- beat: curiosity
- blueprint: compose
- reference: compositions/glitch.html — the glitch snap's artifacts (scanlines, block scramble, chromatic aberration, flicker); adapt for a plate-to-plate swap
- asset_candidates: assets/look-00-default.png — hero in the Swiss design x Barcelona Signal Day palette (the site's default look); assets/look-01-comic-light.png — the same hero in the Comic design x Light palette
- focal: assets/look-00-default.png
- roles: look-00-default = background (full-bleed plate) · look-01-comic-light = background (replaces the first at the snap)

narrativeRole: Open on a normal-looking portfolio so the viewer's brain files it as "another portfolio", then break that expectation inside two seconds.
keyMessage: It is the same page.

Scene 1 (0.0–1.1s): look-00-default fills the canvas as a full-bleed plate cropped below the site nav, held completely still: name and tagline at the left, nothing else on screen. Layout: full-bleed plate, hero name on the left third. No motion at all: the stillness is the setup.
Scene 2 (1.1–1.5s): the glitch snap swaps look-00-default for look-01-comic-light in place, hard cut at peak velocity (cut-the-curve in `cut-catalog.md`): RGB split plus slice displacement, same direction and speed on both sides of the cut.
Scene 3 (1.5–3.6s): the comic look holds still. At 2.1s a flat ink plate lands at top-right with the single line "same page." in display type (kinetic beat-slam, `kinetic-beat-slam`), cream on ink. At 2.9s the mono label "COMIC x LIGHT" appears under it. Held read to the end: no drift, no breathing.

## Frame 2 — One portfolio, 255 looks

- scene: Ink ground; "one portfolio." then a 255 counter pays it off, then the sum behind it
- duration: 4.8s
- poster: 4.2s
- transition_in: zoom-through
- status: animated
- src: compositions/frames/02-255-looks.html
- type: value_claim
- persuasion: Quantified claim
- beat: intrigue → clarity
- blueprint: kinetic-type-beats (Adapt)
- asset_candidates:

Adapt: keep the signature (a statement builds across full-screen type beats onto a payoff); change: no voiceover, so the beats are on-screen only, and the payoff is a numeral that counts up.
narrativeRole: Lands the value claim by beat two: the page is not one design, it is a system of looks.
keyMessage: 255 looks.

Scene 1 (0.0–1.2s): ink ground; only the line "one portfolio." enters, lowercase display type, cream, left-aligned in the upper third (kinetic beat-slam, `kinetic-beat-slam`). Nothing else on screen.
Scene 2 (1.2–3.0s): below it the numeral "255" counts up from 0 in fire-orange at the largest display scale, growing as it climbs (value-scaled counter, `counting-dynamic-scale`); when it lands, "looks." joins it in cream on the same baseline. Layout: left-aligned stack, the numeral dominates about 45% of the canvas.
Scene 3 (3.0–4.8s): the mono label "15 THEMES x 17 DESIGNS" reveals under the stack (keyword reveal on a smooth `power3` settle), then the frame holds still. Nothing else moves.

## Frame 3 — Looks, faster and faster

- scene: The same hero snaps through 26 real looks, accelerating on the beat until it lands; one fixed label slot names each design x theme
- duration: 13.4s
- poster: 12.9s
- transition_in: squeeze
- status: animated
- src: compositions/frames/03-look-ramp.html
- type: evidence
- persuasion: Show-don't-tell proof
- beat: awe → delight
- blueprint: compose
- reference: compositions/glitch.html — same glitch-snap technique as Frame 1; use one shared snap for every swap
- asset_candidates: assets/look-02-terminal-phosphor.png — Terminal x Phosphor Green (CRT green, monospace); assets/look-03-newspaper-sepia.png — Newspaper x Sepia (blackletter masthead); assets/look-04-pixel-synthwave.png — Pixel x Synthwave (8-bit pixel font); assets/look-09-notebook-paper.png — Notebook x Paper (graph paper, highlighter); assets/look-08-cyber-tokyo-night.png — Cyberpunk x Tokyo Night (neon, synthwave grid); assets/look-05-blueprint-nord.png — Blueprint x Nord (cyan grid, hairlines); assets/look-06-risograph-gruvbox-dark.png — Risograph x Gruvbox Dark (duotone print); assets/look-07-deco-dark.png — Art Deco x Dark (gold, sunburst); assets/look-11-brutalist-light.png — Brutalist x Light (yellow tape, thick borders); assets/look-14-swiss-barcelona-night.png — Swiss x Barcelona Signal Night; assets/look-17-zine-synthwave.png — Zine x Synthwave; assets/look-16-ide-gruvbox-dark.png — IDE x Gruvbox Dark; assets/look-21-comic-dracula.png — Comic x Dracula; assets/look-18-terminal-amber-crt.png — Terminal x Amber CRT; assets/look-19-pixel-phosphor.png — Pixel x Phosphor Green; assets/look-12-minimal-dark.png — Minimal x Default Dark; assets/look-33-editorial-dark.png — Editorial x Default Dark; assets/look-20-cyber-synthwave.png — Cyberpunk x Synthwave; assets/look-30-comic-synthwave.png — Comic x Synthwave; assets/look-22-deco-dracula.png — Art Deco x Dracula; assets/look-23-blueprint-tokyo-night.png — Blueprint x Tokyo Night; assets/look-24-risograph-synthwave.png — Risograph x Synthwave; assets/look-26-newspaper-solarized-light.png — Newspaper x Solarized Light; assets/look-25-notebook-solarized-light.png — Notebook x Solarized Light; assets/look-29-swiss-nord-light.png — Swiss x Nord Light; assets/look-32-zine-paper.png — Zine x Paper (all shot with `scripts/shoot-looks.mjs --from 12`, and the pool's other plates stay in the capture folder, unused)
- focal: assets/look-02-terminal-phosphor.png
- roles: all 26 = background plates (one on screen at a time, full-bleed, cropped below the site nav); the label strip is chrome

narrativeRole: The proof for "255 looks": 26 of them, each a real capture of the live site, each readable at a glance, shown faster and faster so the number feels bigger than the count.
keyMessage: Same page, skin after skin, nothing faked.

Layout, fixed for the whole frame: a flat ink strip across the top ~7% holds the label slot (design name left, palette name right, uppercase tracked chrome type, cream) with a 1px hairline under it carrying one tick mark per look, advancing one tick per cut; the look plate fills the rest. Only the plate and the two label tokens ever change. The look table and its durations (in beats) live at the top of the script in `03-look-ramp.html`; the order is chosen so no design sits next to itself and the fast stretch stays within one brightness band (dark, then light once).
Scene 1 (0.0–1.4s): look 1, Terminal x Phosphor Green (3 beats). Label reads "TERMINAL" / "PHOSPHOR GREEN". Plate and label enter with the frame's squeeze; then it holds still.
Scene 2 (1.4–4.2s): three unhurried looks, 2.5 to 2 beats each: Newspaper x Sepia, Pixel x Synthwave, Notebook x Paper. Glitch snap on every cut, label tokens swap in place (in-place token cycle, `discrete-text-sequence`).
Scene 3 (4.2–6.9s): four looks at 1.5 beats (0.67s): Cyberpunk x Tokyo Night, Blueprint x Nord, Risograph x Gruvbox Dark, Art Deco x Dark.
Scene 4 (6.9–10.5s): eight looks at one beat (0.44s): Swiss x Barcelona Signal Night, Zine x Synthwave, IDE x Gruvbox Dark, Comic x Dracula, Terminal x Amber CRT, Pixel x Phosphor Green, Minimal x Default Dark, Editorial x Default Dark. The white flash is already fading out.
Scene 5 (10.5–12.5s): the burst, nine looks at half a beat (0.22s): five dark (Cyberpunk, Comic and Art Deco x Synthwave/Dracula, Blueprint x Tokyo Night, Risograph x Synthwave), then one cross to light and four light (Newspaper x Solarized Light, Notebook x Solarized Light, Swiss x Nord Light, Zine x Paper). No flash; shorter snap; scanlines stay.
Scene 6 (12.5–13.4s): the last cut lands on Brutalist x Light, labels "BRUTALIST" / "LIGHT", final tick; a held read to the end of the frame, where it blur-crossfades into the light default page.

## Frame 4 — Same work underneath

- scene: The default look returns, calm; one line says the skin changes and the work does not
- duration: 3.6s
- poster: 3.0s
- transition_in: blur-crossfade
- status: animated
- src: compositions/frames/04-same-work.html
- type: bridge
- persuasion: Reframe (the variable is the skin, not the substance)
- beat: calm → trust
- blueprint: titlecard-reveal (Adapt)
- asset_candidates: assets/look-00-default.png — hero in the Swiss design x Barcelona Signal Day palette (the site's default look), name, tagline "I build AI & data systems that work in the real world."
- focal: assets/look-00-default.png
- roles: look-00-default = background (full-bleed plate, cropped below the site nav)

Adapt: keep the signature (one clean card revealed with exactly one restrained move, then a still hold); change: the "card" is a flat ink plate over the real hero plate.
narrativeRole: The breather before the proof. The viewer sees the site's own line, in the site's own words, return to rest.
keyMessage: The looks change; the work does not.

Scene 1 (0.0–1.2s): the real default hero is already on screen via the transition; held still, so the viewer can read the site's own tagline.
Scene 2 (1.2–3.6s): one flat ink plate slides up from below the hero's lower edge into the lower third (within the top 83%) carrying "same work underneath." in display type, cream; one restrained move on a smooth `power3` settle, then a still hold to the end. Layout: asymmetric 70/30, plate overlapping the plate's lower third.

## Frame 5 — Twenty demos

- scene: Twenty real demo pages cascade into a grid while a counter ticks from 1 to 20
- duration: 6.0s
- poster: 5.0s
- transition_in: crossfade
- status: animated
- src: compositions/frames/05-twenty-demos.html
- type: proof
- persuasion: Statistical proof tied to a visual
- beat: awe → trust
- blueprint: grid-card-assemble (Adapt)
- asset_candidates: assets/demo-grafics.png — Computer Graphics Shader Playground; assets/demo-matriculas.png — License Plate Detection; assets/demo-tfg-polyps.png — Bachelor's Thesis, Polyp Detection; assets/demo-par-parallel.png — Parallel Computing Labs; assets/demo-caim.png — CAIM IR Explorer; assets/demo-algorithms.png — Algorithm Visualizer; assets/demo-jsbach.png — JSBach Interpreter; assets/demo-planificacion.png — Travel agency (PDDL); assets/demo-phase-transitions.png — Graph Phase Transitions; assets/demo-apa-practica.png — Machine Learning, Hypothyroid; assets/demo-bitsx-marato.png — BitsXLaMarató, Aorta; assets/demo-desastres-ia.png — Desastres IA; assets/demo-draculin.png — Draculin; assets/demo-joc-eda.png — Programming Game Viewer; assets/demo-mpids.png — MPIDS Solver; assets/demo-pro2.png — WPGMA Clustering; assets/demo-prop.png — Recommendation System; assets/demo-rob-robotics.png — Robotics Dashboard; assets/demo-sbc-ia.png — Trip Planner (Expert System); assets/demo-tenda.png — Tenda Online
- focal: assets/demo-grafics.png
- roles: all twenty = supporting tiles (equal weight, no tile is pushed in); the counter numeral is the hero

Adapt: keep the signature (a staggered cascade that self-assembles into a grid and holds); change: a value-scaled counter is bound to the cascade so the number always equals the tiles on screen, and the optional zoom-out is dropped.
narrativeRole: The proof that the site is substance as well as skin: twenty distinct projects, each a real page.
keyMessage: 20 interactive demos, open any in your browser.

Layout: counter zone at the top ~19% (numeral at the left, a two-line mono label at its right); a 5x4 grid of square tiles below it with thin ink gaps and a 1px hairline border on each tile, fully inside the top 83%.
Scene 1 (0.0–0.8s): ink ground; only the numeral "0" in fire-orange and the mono label "INTERACTIVE DEMOS" appear. No tiles yet.
Scene 2 (0.8–4.4s): the tiles cascade in row-major order, one every ~0.18s, in the order listed in `asset_candidates`; each landing tile bumps the counter by one (value-scaled counter, `counting-dynamic-scale`), so the numeral grows as it climbs. Grid assembly on a smooth `power3` settle (`center-outward-expansion` may drive each tile's entry); no bounce.
Scene 3 (4.4–6.0s): the counter lands on 20 and holds; the label's second line "OPEN ANY IN YOUR BROWSER" reveals beside it; everything holds still to the end (at most subtle jitter on the numeral).

## Frame 6 — Pick your look

- scene: "pick your look." then the site's address types in; held read
- duration: 3.6s
- poster: 3.4s
- transition_in: crossfade
- status: animated
- src: compositions/frames/06-pick-your-look.html
- type: cta
- persuasion: Invitation to self-serve interaction
- beat: curiosity → ease
- blueprint: typewriter-reveal (Adapt)
- asset_candidates:

Adapt: keep the signature (a live caret types the line a person would type); change: the typed line is the site address on a flat ink plate, with no browser chrome.
narrativeRole: Turns the viewer's curiosity into one action: go and try the Customize panel yourself.
keyMessage: polcasacubertagil.com

Scene 1 (0.0–1.0s): ink ground; only "pick your look." enters in lowercase display type, cream, upper-left (smooth `power3` settle).
Scene 2 (1.0–2.5s): beneath it a caret types "polcasacubertagil.com" character by character in the display or mono ramp (`discrete-text-sequence` plus `context-sensitive-cursor`), sized so the whole address fits one line inside the side margins.
Scene 3 (2.5–3.6s): the caret rests; the mono label "POL CASACUBERTA" appears under the address; held read to the end (the final frame may exit; nothing else moves).
