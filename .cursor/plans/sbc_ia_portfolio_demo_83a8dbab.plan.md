---
name: SBC_IA portfolio demo
overview: "Add a new PersonalPortfolio demo page for SBC_IA: explain the KB/CLIPS travel advisor, show ontology-to-rules pipeline and rule-module structure, and replay a sample CLIPS session from the repo—static and educational, like the descriptive tabs of Desastres IA before any optional future CLIPS backend."
todos:
  - id: demos-json-icon
    content: Add demos.json entry + new icon SVG in Demos.astro
    status: cancelled
  - id: sbc-page-component
    content: Create sbc-ia.astro + SbcIADemo.tsx (tabs + example timeline + local run tile)
    status: cancelled
  - id: readme-link
    content: README demo row + GitHub URL in astro
    status: cancelled
isProject: false
---

# SBC_IA demo page

## What the repo is

[SBC_IA/README.md](SBC_IA/README.md): FIB-UPC **Sistemas Basados en el Conocimiento** — **OWL** (`src/sbc.owl`) edited in Protégé, converted to **CLIPS** (`owl2clips`), plus hand-written rules in `[src/sbc.clp](SBC_IA/src/sbc.clp)`, `[main.clp](SBC_IA/src/main.clp)`, `[instancias.clp](SBC_IA/src/instancias.clp)`. Runtime: `(load …) (reset) (run)` then **interactive questions** (ages, trip type, budget, transport, etc.) and **inference** for cities / accommodation. [test/input.txt](SBC_IA/test/input.txt) is a fixed **replay** of answers.

Running real CLIPS in the browser would require WASM or a server; the demo will **not** execute CLIPS—only document and **visualize the flow**.

## Implementation

### 1. Register demo

- New row in [PersonalPortfolio/src/data/demos.json](PersonalPortfolio/src/data/demos.json): e.g. slug `sbc-ia`, title **SBC / travel KB**, tags `CLIPS`, `OWL`, `Expert systems`, `UPC`, icon e.g. `brain` or `book` (add minimal SVG in [Demos.astro](PersonalPortfolio/src/components/Demos.astro)).

### 2. Route

- [PersonalPortfolio/src/pages/demos/sbc-ia.astro](PersonalPortfolio/src/pages/demos/sbc-ia.astro) — `DemoLayout`, short lead (OWL + CLIPS travel advisor; run locally per README), `SbcIADemo client:load`, About + GitHub link (`https://github.com/cuberhaus/SBC_IA` or monorepo path if you prefer).

### 3. React demo component

New [PersonalPortfolio/src/components/demos/SbcIADemo.tsx](PersonalPortfolio/src/components/demos/SbcIADemo.tsx):


| Section             | Content                                                                                                                                                                                                                                                                                                    |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Overview**        | Problem: recommend a trip from user constraints; separation **ontology (concepts)** vs **rules (behavior)**.                                                                                                                                                                                               |
| **Pipeline**        | Mermaid or numbered steps: Protégé → Turtle → `owl2clips` → CLIPS + `main` / `instancias`. Code block with README install/usage.                                                                                                                                                                           |
| **Architecture**    | Summarize modules from [docs/list.md](SBC_IA/docs/list.md): MENU (questionnaire), INFERENCIA (trip type, cities), LOGIC (scoring, accommodation)—compact bullets or small diagram.                                                                                                                         |
| **Example session** | Parse or hardcode lines from `test/input.txt` after the `(run)` block as a **vertical timeline**: each line labeled (e.g. “ages”, “trip type”, …) with short tooltip from domain knowledge—so visitors see what the expert system asks. Final line can note `(focus RESULTADOS)` as transition to results. |
| **Run locally**     | Separate bottom tile (same pattern as [DesastresIADemo](PersonalPortfolio/src/components/demos/DesastresIADemo.tsx) “Run the demo”): copy-paste commands + “requires CLIPS / Jess-compatible environment”.                                                                                                 |


Optional: ship a trimmed **snippet** of `sbc.owl` or class list as collapsible `<pre>` (read-only), if file size is acceptable; otherwise skip.

### 4. README

- One line in [PersonalPortfolio/README.md](PersonalPortfolio/README.md) demo table for `sbc-ia` (overview + example session; CLIPS local).

## Out of scope (unless requested later)

- Executing CLIPS in the browser or via API.
- Full ontology browser.

