# Brag Plan: Pol Casacuberta — Personal Portfolio

## What is this app?
A portfolio that is secretly a design studio: one Astro + React site that can re-skin itself into 17 completely different designs (Swiss, Terminal, Newspaper, Comic…) with 15 palettes, 20 interactive demos and three languages.

## The angle
Deadpan understatement into overkill. The site opens by admitting it's "a portfolio", then immediately shows how absurdly customisable that is. The proof is the product's own flow, not a description of it: press Ctrl+K, pick a design, pick a palette, and the *same* hero page becomes a different website each time. The project's own design-picker blurbs ("Photocopied ransom-note collage, staples and tape") are funnier than anything we could invent, so we quote them.

## Hook (first 2-3 seconds)
Real hero page (default Swiss / Barcelona Signal Night) dimmed behind giant type:
**"It's a portfolio."** then, on the first beat, **"It has 17 designs."** with "17" in the site's signal coral.

## Key moments (the middle)
- **The real flow (entry → key action → result):** Ctrl+K keycaps → the real "Customize" picker opens → cursor clicks **Comic** → cursor clicks **Synthwave** → Esc → the whole hero page is now a Ben-Day-dots comic. All frames are captures of the running site.
- **The swap montage:** the same hero, hard-cut on the beat through Terminal, Pixel, Newspaper, Brutalist, then Zine. Each cut shows the design's real name, its index out of 17 and its palette. Zine holds long enough to read its real blurb.
- **The Lab wall:** 20 real Interactive Lab cards pop in row by row while a giant Swiss numeral counts 5 → 10 → 15 → 20. Real heading "Try my projects", real copy "Live, interactive demos".
- **Three languages:** the real hero in EN → ES → CA, with a language switch (EN / ES / CA) following the cuts.

## Outro / punchline
Callback to the hero's own words: "Hi, I'm" → **Pol Casacuberta** → "I build AI & data systems that work in the real world." → polcasacubertagil.com. Ends on the dimmed hero from the first frame (loop-friendly).

## User flow worth showing
1. Entry: press Ctrl+K on the portfolio.
2. Key action: choose a design (Comic) and a palette (Synthwave) in the picker.
3. Result: the entire page re-skins; then the same page in other designs and in EN / ES / CA.

## Tone
- Preset: `default`
- Creative direction: deadpan "it's just a portfolio" that escalates into a personality-swap montage
- Interpretation: Warm and playful, few scenes, each with one idea; the humour comes from real UI copy; hard cuts only inside the montage (it's the joke), motion otherwise confident and clean.

## Format: landscape — 1920x1080
## Duration: 23.70 s (ends on a beat; above the 18-22 sweet spot because the product flow and the final line each need a full read)

## Visual identity (from the project)
- Background: `#101a18` (Barcelona Signal Night `--bg-primary`)
- Card: `#1b2d28`, border `#2d4841`
- Accent: `#68d2bd` teal (`--accent-text`), signal `#ff8a65` coral (`--accent-signal`)
- Text: `#f2f6f1`, secondary `#c3d0ca`, muted `#9aada5`
- Display font: Inter Tight in the site → closest bundled face, Inter 900 with tight tracking (-0.05em, as the Swiss hero-name rule)
- Body/label font: JetBrains Mono for eyebrow labels (the site's greeting uses mono)
- Strongest visual element: the real Ctrl+K "Customize" picker and the giant Swiss section numerals ("01") in coral

## Share copy (draft)
It's a portfolio. It has 17 designs, 15 palettes, 20 demos and three languages. Press Ctrl+K.

## Audio direction
- Role: moderate professional accents on a warm upbeat bed
- Music: "Happy Beats / Business Moves Vol. 9" (Sascha Ende, ende.app, CC BY 4.0), ~114.8 BPM
- Music treatment: starts at 0:00 at ~0.36 volume, short fade-in, 1.6 s fade-out into the final line
- Music cue guidance: bundled preset `happy-beats-business-moves-vol-9-by-ende-dot-app.music-cues.json`. Strong cues locked: **3.70** (picker opens), **6.34** (picker closes → comic reveal), **14.22** (Lab wall begins), **20.54** (name slam). Beat grid used for sequential events: montage cuts every 2 beats (7.40, 8.44, 9.50, 10.54, 11.60), Lab rows (14.22, 14.76, 15.28, 15.81), language cuts (17.38, 18.44, 19.48).
- Audio-reactive treatment: subtle. Bass energy sampled at build time drives soft coral glow on "17", on the montage caption plate and on the outro name; treble gives the hairline accents a touch of presence. No waveform/equaliser visuals.
- SFX posture: moderate, motion-matched, all low/medium high-frequency risk. Keycap sounds for Ctrl/K/Esc, clicks for the two clicks, soft thuds for montage cuts, card slides for the Lab wall rows, one bell on the name.
- Audio-coupled moments: Ctrl+K keypresses; two real clicks; row-by-row card reveals; count-up; final name slam.
- Restraint rule: SFX never louder than ~0.8; nothing sharp or repeated high-frequency; music stays under the keypress/click moments.

## Storyboard

### Scene 1 — Hook — 3.18s (0.00-3.18)
Dimmed real hero (default look) behind two lines of giant type: "It's a portfolio." lands first (~0.2s, word-by-word blur-in), then "It has 17 designs." on beat 1.59 with "17" in coral. Hold ≥1.4s on the full pair. Exit: blur-out in 0.18s.
Sequential/interaction: two lines arrive one after another; hold on the pair ≥ 1.4 s.
Audio intent: dry and a little smug; one soft thud when "17" lands.
Audio-coupled idea: "17" glow breathes with bass.
Music: warm upbeat bed enters.
Transition mood: colour flood (dim lifts off the same hero) → Scene 2

### Scene 2 — The real flow — 4.22s (3.18-7.40)
Same hero, full brightness. Ctrl then K keycaps press (bottom-left). On the strong cue 3.70 the real Customize picker opens with a punch-in (1.7×). Cursor glides to **Comic** and clicks on 4.23 (page re-skins behind the blur); camera pans down, cursor clicks **Synthwave** on 5.28; "Esc" keycap; on strong cue 6.34 the picker closes and the full comic hero is revealed. Swiss numerals label the two steps: 01 Design, 02 Palette (holds ≥ 0.9 s each).
Sequential/interaction: yes — simulated keyboard (Ctrl, K, Esc) and two cursor clicks, each landing on a beat.
Audio intent: tactile and satisfying; every action has a sound.
Audio-coupled idea: keypress sounds, two click sounds, soft thud when the page re-skins.
Music: continues.
Transition mood: hard cut on the beat → Scene 3

### Scene 3 — The swap montage — 7.22s (7.40-14.62, last 0.40 s is covered by Scene 4's iris)
Five hard cuts of the same punched-in hero, two beats each (1.06 s): **Terminal** (05/17, Phosphor Green), **Pixel** (04/17, Synthwave), **Newspaper** (17/17, Sepia), **Brutalist** (08/17, Paper), then **Zine** (15/17, Gruvbox Dark) held for ~2.6 s with its real blurb: "Photocopied ransom-note collage, staples and tape."
Sequential/interaction: yes — five cuts, each with a caption plate (name 1-2 words ≥ 0.8 s settled; Zine blurb ≥ 2.2 s settled).
Audio intent: rhythmic, the cuts ARE the beat.
Audio-coupled idea: a soft thud per cut on the 2-beat grid; plate glow follows bass.
Music: continues.
Transition mood: iris opens from centre (0.4 s) → Scene 4

### Scene 4 — The Lab wall — 3.16s (14.22-17.38)
Left: real heading "Try my projects", giant coral numeral counting 05 → 10 → 15 → 20 on beats, then "Live, interactive demos" (held ≥ 1.5 s). Right: 20 real card screenshots in a 5×4 wall, one row per beat.
Sequential/interaction: yes — rows land on beats 14.22, 14.76, 15.28, 15.81; counter changes with each row.
Audio intent: shuffling cards, building to a soft ping at 20.
Audio-coupled idea: card-slide sound per row; bong on "20".
Music: continues.
Transition mood: blur swap → Scene 5

### Scene 5 — Three languages — 3.16s (17.38-20.54)
Real hero in EN, ES, CA (two beats each), punched in; plate "3 languages" with EN / ES / CA switch whose active chip follows the cuts.
Sequential/interaction: yes — three cuts + the switch highlight.
Audio intent: light, quick clicks.
Audio-coupled idea: click per language switch.
Music: continues.
Transition mood: colour flood to ground → Scene 6

### Scene 6 — Outro — 3.16s (20.54-23.70)
"Hi, I'm" (mono, teal) → **Pol Casacuberta** slams in on strong cue 20.54 → tagline "I build AI & data systems that work in the real world." (accent on the last clause, as on the site) → polcasacubertagil.com. Dimmed hero behind, like frame 0. Last line holds ≥ 2 s.
Sequential/interaction: name, then tagline, then URL.
Audio intent: payoff; bell on the name, music fades under the tagline.
Audio-coupled idea: name glow with bass; bell on the slam.
Music: fades out over the last 1.6 s.
Transition mood: end

**Music mood for this video:** upbeat
**Audio summary:** Warm bed → keycaps and clicks make the flow tactile → soft thuds on every montage cut → card slides and a ping on the wall → one bell on the name → fade-out.
