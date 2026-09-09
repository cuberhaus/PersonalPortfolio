# Site Icon Concepts

This directory contains the four visual icon families explored for issue #254.
The files are design artifacts, not production assets. The production icon set
is generated from the one selected canonical site icon.

## Brief

The icon should feel technically curious, human, and experimental while working
for recruiters, clients, researchers, and general visitors. The first test is
recognition at 16px and 32px, followed by distinctiveness, consistency across
treatments, personality, and large-size polish.

The palette stays within the portfolio family:

- Deep green: `#101a18`
- Green border: `#2d4841`
- Mint: `#68d2bd`
- Light mint: `#82dfca`
- Coral: `#ff8a65`
- Paper: `#f2f6f1`

## Concepts

| Family   | Direction                                                                              | Files                                                |
| -------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Organic  | Three leaves around a warm center; an evolution of the current mark                    | `organic-contained.svg`, `organic-transparent.svg`   |
| Signal   | A rising waveform with one warm endpoint; abstract data motion without circuit cliches | `signal-contained.svg`, `signal-transparent.svg`     |
| Monogram | Interlocking P and C strokes for a personal mark                                       | `monogram-contained.svg`, `monogram-transparent.svg` |
| Aperture | Four inward blades around an open center; an unrelated portal direction                | `aperture-contained.svg`, `aperture-transparent.svg` |

Each family has a contained treatment for dark surfaces and a transparent
treatment for flexible placement. Neither treatment uses text, gradients,
filters, shadows, literal medical imagery, or generic brain/robot imagery.

## Comparison

Open `comparison.html` directly in a browser, or serve this directory with a
static file server. It shows every concept at 16px, 32px, 64px, 180px, 192px,
and 512px on both dark and light surfaces.

## Decision record

The selected canonical site icon and the evidence behind the decision should be
recorded here before production exports are regenerated. Keep the other concept
files as historical design references; they must not be copied into `public/`.

## Decision

The **signal** family is the canonical site icon. The contained treatment is
used for production because the dark square stays stable in browser chrome,
the PWA manifest, and the Apple touch icon. The transparent treatment remains
available as the flexible counterpart for future surfaces.

Why signal won:

1. At 16px and 32px it reads as one clear rising gesture instead of collapsing
   into a small cluster of details.
2. The coral endpoint creates a memorable focal point without introducing
   text, a literal neural-network cliché, or medical imagery.
3. The contained and transparent treatments preserve the same silhouette and
   palette, so the family is coherent across surfaces.
4. The signal gesture carries technical curiosity, human warmth, and
   experimental confidence without relying on a literal technology symbol.
5. The stroke and endpoint still have enough presence at 180px, 192px, and
   512px for a polished PWA and touch-icon export.
