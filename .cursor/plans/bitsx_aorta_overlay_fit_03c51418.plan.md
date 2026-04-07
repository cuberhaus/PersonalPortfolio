---
name: BitsX aorta overlay fit
overview: Tighten the mock segmentation overlay on `bitsx-aorta-frame.jpg` by replacing the axis-aligned ellipse with a sloped quadrilateral that follows the described lumen geometry (472×296), optionally with slight inset so the fill sits on the dark band.
todos:
  - id: polygon-mask
    content: Replace ellipse with sloped quad polygon + tune inset in BitsXMaratoDemo.tsx
    status: completed
isProject: false
---

# Better rat-aorta overlay fit

## Problem

`[BitsXMaratoDemo.tsx](PersonalPortfolio/src/components/demos/BitsXMaratoDemo.tsx)` uses one horizontal ellipse (`FRAME.mask`: `cx: 236, cy: 228, rx: 168, ry: 26`). The real lumen in `[public/demos/bitsx-aorta-frame.jpg](PersonalPortfolio/public/demos/bitsx-aorta-frame.jpg)` is a **sloped** dark band (top/bottom walls rise slightly toward the right), so a symmetric ellipse will always look “off.”

## Approach (recommended): SVG polygon

Use a **4-point polygon** in the same `viewBox="0 0 472 296"` space, tracing the lumen:


| Corner       | x   | y (from wall positions, 0–1000 → pixel) |
| ------------ | --- | --------------------------------------- |
| Top-left     | 0   | `680/1000 * 296` ≈ 201                  |
| Top-right    | 472 | `610/1000 * 296` ≈ 181                  |
| Bottom-right | 472 | `740/1000 * 296` ≈ 219                  |
| Bottom-left  | 0   | `810/1000 * 296` ≈ 240                  |


- Replace the `<ellipse>` in the simulated-inference SVG with `<polygon points="...">` using those coordinates (integers are fine).
- Keep the same `fill` (red + `overlayOpacity`) and a subtle `stroke`; optional `feGaussianBlur` on the polygon for softness.
- Optional **1–3 px inset** (move top edge down, bottom edge up, trim left/right) so the overlay doesn’t bleed over the bright walls—tweak by eye in the browser.

## Alternative (if you prefer one primitive)

A **rotated ellipse** centered near `(236, 210)`, `rx ≈ 225`, `ry ≈ 19–21`, `transform="rotate(-2.5 236 210)"` approximates the band but will still be less accurate than the polygon.

## Files to touch

- `[PersonalPortfolio/src/components/demos/BitsXMaratoDemo.tsx](PersonalPortfolio/src/components/demos/BitsXMaratoDemo.tsx)`: extend `FRAME` with e.g. `maskPolygon: [x,y,...]` (or hardcoded `points` string), swap ellipse for polygon in the “done” overlay only; remove unused ellipse-specific `mask` fields or keep for comments.

## Verification

Open `/demos/bitsx-marato` → Interactive → Run demo inference; adjust polygon coordinates slightly until the red overlay sits on the dark lumen.