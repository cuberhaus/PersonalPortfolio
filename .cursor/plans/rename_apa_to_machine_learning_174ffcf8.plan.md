---
name: Rename APA to Machine Learning
overview: Rename the 'APA practica' references across the site to more accessible terms like 'Machine Learning', 'Aprendizaje Automático', and 'Aprenentatge Automàtic' while keeping the core content intact.
todos:
  - id: update-demos-apa-en
    content: Update `demos.json` (English)
    status: completed
  - id: update-demos-apa-es
    content: Update `demos.es.json` (Spanish)
    status: completed
  - id: update-demos-apa-ca
    content: Update `demos.ca.json` (Catalan)
    status: completed
  - id: update-apa-astro
    content: Update `<DemoLayout>` title in `apa-practica.astro`
    status: completed
  - id: update-apa-tsx
    content: Update `course` string in `ApaPracticaDemo.tsx` translations
    status: completed
isProject: false
---

# Rename APA to Machine Learning

The term "APA" (Aprenentatge Automàtic) is too specific and not widely recognized. We will rename the "APA practica" texts to generic "Machine Learning" terms. 

## Steps

1. **Update `src/data/demos.json` (English)**
  Change title to "Machine Learning — Hypothyroid"
   Update description to remove "APA practica" and rephrase to describe the machine learning classification task.
2. **Update `src/data/demos.es.json` (Spanish)**
  Change title to "Aprendizaje Automático — Hipotiroidismo"
   Update description accordingly.
3. **Update `src/data/demos.ca.json` (Catalan)**
  Change title to "Aprenentatge Automàtic — Hipotiroïdisme"
   Update description accordingly.
4. **Update `src/pages/demos/apa-practica.astro`**
  Change the `<DemoLayout>` title to remove the "APA Practica" suffix.
5. **Update `src/components/demos/ApaPracticaDemo.tsx`**
  Change `course: "FIB-UPC · APA course"` to `course: "FIB-UPC · Machine Learning"` (and localized equivalents in the translation dict).
   Keep the slug `apa-practica` and internal Jupyter Notebook URLs unchanged so we don't break existing links or the repository pointers.

