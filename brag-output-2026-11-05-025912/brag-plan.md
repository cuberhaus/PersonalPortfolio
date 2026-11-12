# Brag Plan: Personal Portfolio, the project cards

## What is this app?
A personal portfolio whose "Try my projects" section is a wall of 20 project cards, most of them old course projects that now run live in the browser, plus two real "Client Work" cards.

## The angle
**Homework, but it runs.** Most course projects end their life as `entrega_final_v2_DEFINITIVO.zip`. These ones are still alive: a MATLAB license-plate reader that now reads plates in your tab, a C/OpenMP lab you can scroll-zoom into the Mandelbrot set. The joke is the zip file. The proof is the real UI actually running (recorded from the dev server, nothing mocked up). It is the sibling of the first brag (the design studio): that one is about the *look*, this one is about the *work*.

The card copy already does the storytelling: "originally built as a classical MATLAB pipeline", "course labs in C with OpenMP", "Compilers course project", "Data structures course project". The video quotes it.

## Hook (first 2-3 seconds)
"Homework ends in a .zip." in huge type, then a file chip types out `entrega_final_v2_DEFINITIVO.zip` (invented gag, no product claim). The chip tenses up and the next scene opens out of it.

## Key moments (the middle)
- **"Mine run."** The real "Try my projects" section (heading, "Live, interactive demos you can play with right in your browser", filter chips, first row of cards) slides in beside the line.
- **License Plate Detection actually running.** Real recording: cursor picks a sample, presses Detect plate, the pipeline panels fill in and the plate reads `ZME8325 · Match`. Caption is the card's own "originally built as a classical MATLAB pipeline", trimmed.
- **Parallel Computing Labs actually running.** Real recording: cursor presses Play on the heat equation (red edge diffusing down, residual ticking), then drags and scroll-zooms into the Mandelbrot set. Caption is the card's own "parallel computing course labs in C with OpenMP", trimmed.
- **The wall.** All 20 real cards, captured from the site, step past one beat at a time while a counter rolls 00 → 05 → 10 → 15 → 20. "0 zip files." pays off the hook.
- **Client work, too.** The two real Client Work cards (Physical AI Anomalies Detection / client Horse, E2E AI Talent Matching Platform / client Gobierno de Aragón) arrive one after the other.

## Outro / punchline
"Hi, I'm Pol Casacuberta. AI & ML Engineer. Homework that runs." then `polcasacubertagil.com`. The beat before: a hard cut to a coral flood that collapses into the underline.

## User flow worth showing
Both centerpiece scenes are real flows recorded from the running site: *pick sample → Detect plate → pipeline stages + plate text*, and *Play → drag → scroll-zoom*. The cards themselves are the browse flow (landing page → wall).

## Tone
- Preset: default
- Creative direction: deadpan student-humour framing ("Homework ends in a .zip."), then confident proof.
- Interpretation: the first 3 s are dry and typographic, the middle is the product doing its thing at real speed (1.1x), the wall is a rhythmic beat-stepped catalog. Playful but not chaotic, no mascots, no stock motion.

## Format: landscape — 1920x1080
## Duration: 23.7 s (3.01 + 4.34 + 7.93 + 3.27 + 2.19 + 2.96)

## Visual identity (from the project)
Swiss design, Barcelona Signal Night palette (`DESIGN.md`, `src/lib/themes.ts`).
- Background: `#101a18` (card `#1b2d28`, hairline `#3e6359`)
- Accent: teal `#68d2bd`, one coral signal `#ff8a65` (the colour of the real demo buttons, "Upload your own" / "Detect plate")
- Text: `#f2f6f1` (secondary `#c3d0ca`)
- Display font: Inter 900, -0.05em tracking (the site's Inter Tight is not bundled with Hyperframes)
- Body font: Inter. Mono labels: JetBrains Mono
- Strongest visual element: the real demos running, and the 20-card wall with its live previews

## Share copy (draft)
Course projects usually end as a .zip. Mine run in your browser: 20 of them, from a MATLAB license-plate reader to a Mandelbrot you can scroll-zoom. polcasacubertagil.com

## Audio direction
- Role: warm bed with motion-matched accents
- Music: Happy Beats / Business Moves Vol. 10 (Sascha Ende, CC BY 4.0), ~110 BPM, compact and punchy
- Music treatment: starts at 0, volume 0.34, 0.3 s fade-in, 1.6 s fade-out under the final hold
- Music cue guidance: preset read from `assets/cues/...vol-10...music-cues.json`. Strong cues in the window: 18.55 (0.98), 20.74 (1.00), 21.83 (0.99). Locks: the blur swap into client work lands on **18.55**, the coral hit and name slam land on **20.74**. Beat-grid (110 BPM, ~0.55 s): hook lines on 0.27 / 0.82, chip on 1.37, "Mine" / "run." on 3.55 / 4.10, the plate clicks on 8.22 / 9.29, the whip on 11.47, Play on 12.02, wall steps on 15.82 / 16.38 / 16.93 / 17.47, second client card on 19.10, URL on 21.28.
- Audio-reactive treatment: subtle. Bass energy drives a coral glow on ".zip.", "run.", the LIVE dots, the "20", and the name, never waveforms.
- SFX posture: moderate, motion-matched. Soft impacts for word landings and cuts, `ui/click2` for the simulated clicks (synced to the real recorded clicks), card slides for the wall steps and client cards, one bell for the name.
- Audio-coupled moments: the filename typing, cursor clicks in both demos, the wall stepping on the beat, the counter rolling, the two client cards.
- Restraint rule: no SFX stacked on a text line that is being read; nothing above 0.8; the bell is the only long sound.

## Storyboard

### Scene 1: Hook, "Homework ends in a .zip." — 3.01 s (0.00-3.01)
Two lines of huge type, per-word blur-in ("Homework ends", then "in a .zip." with ".zip." in coral). The chip `entrega_final_v2_DEFINITIVO.zip` drops in and its name types out left to right, then the chip tenses (scales up, coral border). Hold for reading: line 1 settled ~0.7 s, line 2 ~1.3 s, chip ~2.0 s.
Sequential/interaction: yes, the filename types out.
Audio intent: dry, a little smug.
Audio-coupled idea: soft impacts on each line, a drop when the chip lands.
Transition mood: iris opening from the chip → Scene 2.

### Scene 2: Reveal, "Mine run." — 4.34 s (3.01-7.35)
Iris from the chip opens onto a ground. "Mine" (3.55) then "run." in coral (4.10), caption "Live demos, right in your browser." (trimmed from the section's own subtitle). On the right, the real "Try my projects" section drifts slowly upward in a hairline frame. Hold: "Mine run." ≥ 3 s, caption ~2.4 s.
Sequential/interaction: two words on consecutive beats.
Audio intent: the first lift of the video.
Audio-coupled idea: soft impact on each word, bass glow on "run.".
Transition mood: coral flood (a "Run" press, opening from the word "run.") → Scene 3.

### Scene 3: Proof, two real demos — 7.93 s (7.35-15.28)
Part A (7.35-11.47): kicker "Computer Vision · FIB-UPC", title "License Plate Detection", caption "Originally a MATLAB pipeline." Right: the recorded clip in a frame with a LIVE DEMO tag. Cursor picks a sample (8.22), presses Detect plate (9.29), result and plate crop appear at ~10.0 (`ZME8325 · Match`).
Part B (11.47-15.28): the scene scrolls to the next demo (whip). Kicker "Mandelbrot · Heat equation", title "Parallel Computing Labs", caption "Course labs in C with OpenMP." Recorded clip: Play (12.02), heat diffuses, drag, scroll-zoom into the Mandelbrot set from 13.7.
Sequential/interaction: yes, real recorded clicks; SFX synced to them.
Audio intent: tactile and satisfying; the clicks should feel like yours.
Audio-coupled idea: `click2` on the real clicks, card-slide on the whip.
Transition mood: whip (A→B), then hard cut → Scene 4.

### Scene 4: The wall — 3.27 s (15.28-18.55)
Hard cut to the 20-card wall (right) stepping one beat at a time while the big counter rolls 00 → 05 → 10 → 15 → 20 with "projects."; on 17.47 "0 zip files." lands and the "20" glows. Hold: "0 zip files." ~1.4 s.
Sequential/interaction: yes, four beat-locked steps.
Audio intent: rhythm, then a small payoff.
Audio-coupled idea: card slide per step, a bong on "20".
Transition mood: blur swap → Scene 5.

### Scene 5: Client work — 2.19 s (18.55-20.74)
"Client work, too." with the two real Client Work cards arriving one after the other (the second on 19.10). Hold: ~1.2 s on the full pair.
Sequential/interaction: two cards, one by one.
Audio intent: a quick credibility beat.
Audio-coupled idea: card slide per card.
Transition mood: hard cut on the strongest cue → Scene 6.

### Scene 6: Outro — 2.96 s (20.74-23.70)
Hard cut to a full coral frame on 20.74 (strong cue) that collapses into the underline. "Hi, I'm" / "Pol Casacuberta" / "AI & ML Engineer. Homework that runs." / `polcasacubertagil.com`. Hold: name settled ~0.9 s in, URL ≥ 2 s.
Audio intent: confident landing.
Audio-coupled idea: the bell on the hit, a drop on the URL.

**Music mood for this video:** upbeat
**Audio summary:** a warm bed, soft impacts on the words, real-sounding clicks in the demos, beat-stepped card slides on the wall, one bell for the name.
