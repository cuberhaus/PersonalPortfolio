---
name: Update Project Description
overview: Update the description of the Aneurysm Detector project to be more similar to Draculin, mentioning the specific hackathon (BitsXLaMarató 2022) and the winning result.
todos:
  - id: update-en
    content: Update description in `projects.json`
    status: completed
  - id: update-es
    content: Update description in `projects.es.json`
    status: completed
  - id: update-ca
    content: Update description in `projects.ca.json`
    status: completed
isProject: false
---

# Update Project Description

The current description for the "Aneurysm Detector" project starts with "Award-winning convolutional neural network..." which is a bit generic. The user wants it to explicitly mention the hackathon name ("BitsXLaMarató") and the fact that it was the winning project, making it parallel to how the "Draculin" project says "Finalist at BitsXLaMarató 2023".

## Steps

1. **Update `src/data/projects.json` (English)**
  Change the description to explicitly mention the hackathon win: "Winner of BitsXLaMarató 2022 — a convolutional neural network using MaskRCNN to detect aortic aneurysms from ecography video, with 3D model generation and a GUI for visualization."
2. **Update `src/data/projects.es.json` (Spanish)**
  Update the translation: "Ganador de BitsXLaMarató 2022 — una red neuronal convolucional que utiliza MaskRCNN para detectar aneurismas aórticos a partir de vídeo de ecografía..."
3. **Update `src/data/projects.ca.json` (Catalan)**
  Update the translation: "Guanyador de BitsXLaMarató 2022 — una xarxa neuronal convolucional que utilitza MaskRCNN per detectar aneurismes aòrtics a partir de vídeo d'ecografia..."

