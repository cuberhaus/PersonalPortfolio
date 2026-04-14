---
name: Update Demo Cards
overview: Update the description of the BitsXLaMarató demo in the demos section to emphasize the hackathon win, similar to Draculin, and consider removing the "Projects" section if it's redundant.
todos:
  - id: update-demos-en
    content: Update description in `demos.json`
    status: completed
  - id: update-demos-es
    content: Update description in `demos.es.json`
    status: completed
  - id: update-demos-ca
    content: Update description in `demos.ca.json`
    status: completed
isProject: false
---

# Update Demo Descriptions and Evaluate Projects Section

The user noted that the "Projects" section feels somewhat superseded by the "Demos" section. They want to start by ensuring the `BitsXLaMarató` entry in the **Demos** section (`demos.json`) mentions the hackathon win, making it parallel to the `Draculin` demo description. 

After this, we need to ask the user if they'd like to completely remove the "Projects" section from the webpage.

## Steps

1. **Update `src/data/demos.json` (English)**
  Modify the "bitsx-marato" description to start with the winning statement: "Winner of BitsXLaMarató 2022 — Ultrasound → Mask R-CNN aorta segmentation and 3D reconstruction..."
2. **Update `src/data/demos.es.json` (Spanish)**
  Modify the translation: "Ganador de BitsXLaMarató 2022 — Ecografía → Segmentación de aorta con Mask R-CNN y reconstrucción 3D..."
3. **Update `src/data/demos.ca.json` (Catalan)**
  Modify the translation: "Guanyador de BitsXLaMarató 2022 — Ecografia → Segmentació d'aorta amb Mask R-CNN i reconstrucció 3D..."
4. **Discuss "Projects" Section Removal**
  If the user wants to remove the Projects section entirely, we would remove the `<Projects />` component from `src/pages/index.astro`, remove the corresponding link from `src/components/Navbar.astro` and `src/i18n/ui.ts`, and potentially delete the `src/components/Projects.astro` file. *We will execute step 4 only if confirmed by the user after steps 1-3 are done.*

