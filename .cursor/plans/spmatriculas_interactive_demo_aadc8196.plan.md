---
name: SPMatriculas interactive demo
overview: Port the MATLAB license plate detection pipeline to a browser-based interactive demo using OpenCV.js (WebAssembly) and the Canvas API, then integrate it into the PersonalPortfolio as a new demo page.
todos:
  - id: opencv-loader
    content: Create OpenCV.js lazy loader utility and plate-detection.ts with the 3-stage pipeline
    status: completed
  - id: demo-component
    content: Create SPMatriculasDemo.tsx React component with image picker, pipeline stepper, and results display
    status: completed
  - id: copy-assets
    content: Copy sample car images + reference font to public/demos/matriculas/
    status: completed
  - id: astro-page
    content: Create matriculas.astro demo page and add entry to demos.json
    status: completed
  - id: test-verify
    content: Test the full pipeline in the browser and verify plate detection works
    status: completed
isProject: false
---

# SPMatriculas Interactive Demo

## Approach

Port the 3-stage MATLAB pipeline (plate detection, character segmentation, OCR) to JavaScript using **OpenCV.js** (WASM build, ~8MB, loaded lazily and cached). The demo will let users pick from sample car images or upload their own, then visualize each pipeline step in real time.

## Architecture

```mermaid
flowchart LR
    Input["Car Image"] --> Stage1["1. Plate Detection"]
    Stage1 --> Stage2["2. Char Segmentation"]
    Stage2 --> Stage3["3. OCR"]
    Stage3 --> Result["Plate Text"]
```



Each stage shows its intermediate output (grayscale, binarized, detected region, segmented chars, final text).

## Pipeline Details (JS port of MATLAB logic)

**Stage 1 – Plate Detection** (from `findPlate.m` + `morfologicProcess.m`):

- Grayscale conversion
- Adaptive threshold (`cv.adaptiveThreshold`, sensitivity 0.4 mapped to block size)
- Morphological filtering: clear border objects, fill holes
- Connected components with stats (`cv.connectedComponentsWithStats`)
- Filter regions by: aspect ratio (eccentricity proxy), extent, solidity, orientation, axis lengths
- Select best candidate by solidity
- Retry with higher sensitivity (0.5 → 1.0) if nothing found

**Stage 2 – Character Segmentation** (from `findChars.m` + `morfologicProcessChars.m`):

- Adaptive threshold on plate crop (sensitivity 0.7), invert
- Filter regions by: major axis [12,180], area >= 50, extent [0.25,1], eccentricity < 0.99
- Remove near-horizontal elongated regions (orientation filter)
- Crop individual characters

**Stage 3 – OCR** (from `identifyChars.m` + template matching):

- Use the existing reference font image `[data/lletres/Greek-License-Plate-Font-2004.jpg](VC/SPMatriculas/data/lletres/Greek-License-Plate-Font-2004.jpg)` (798x70px, 16KB)
- Segment it into 23 individual character templates (digits 0-9, letters a/b/e/h/i/k/m/n/p/t/x/y/z) using the x-coordinates from `lettersImagePreprocess.m`
- For each detected character: resize, binarize, and match against all templates using normalized cross-correlation (`cv.matchTemplate`)
- Pick best match

## Files to Create/Modify

- `**PersonalPortfolio/src/components/demos/SPMatriculasDemo.tsx`** – Main React component with the interactive pipeline UI
- `**PersonalPortfolio/src/lib/plate-detection.ts`** – Core detection logic (stages 1-3) using OpenCV.js
- `**PersonalPortfolio/src/pages/demos/matriculas.astro`** – Astro page following existing demo pattern (DemoLayout, client:load)
- `**PersonalPortfolio/src/data/demos.json**` – Add entry with slug `matriculas`, icon `camera`
- `**PersonalPortfolio/public/demos/matriculas/**` – 6-8 sample car images (~100KB each) copied from the repo, plus the reference font image

## UI Design

- Image selector: grid of sample thumbnails + upload button
- Pipeline visualization: horizontal stepper showing each stage
  - Step 1: Original → Grayscale → Binarized → Plate region highlighted
  - Step 2: Plate crop → Binarized → Characters highlighted with bounding boxes
  - Step 3: Individual chars → Matched templates → Final plate string
- Results card with the detected plate text
- "How it works" collapsible section explaining the algorithm

## Dependencies

- **OpenCV.js**: loaded dynamically from CDN (`https://docs.opencv.org/4.x/opencv.js`) – no npm package needed, just a script tag with lazy loading
- No other new dependencies

## Sample Images

Copy 6-8 representative images from `[VC/SPMatriculas/data/day_color/](VC/SPMatriculas/data/day_color/)` into `public/demos/matriculas/samples/`, plus `Greek-License-Plate-Font-2004.jpg` as the OCR reference. Pair each with its ground truth from `[data/plates.txt](VC/SPMatriculas/data/plates.txt)` so we can show accuracy.