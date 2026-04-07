---
name: TFG README GUI Portfolio
overview: Enhance the TFG repo with a comprehensive README, add a Streamlit dashboard GUI for model inference and result exploration, and integrate it as an interactive demo in the PersonalPortfolio site.
todos:
  - id: readme
    content: Write comprehensive TFG/README.md merging existing docs with full setup, usage, and structure guide
    status: completed
  - id: requirements
    content: Create TFG/code/requirements.txt with all Python deps including streamlit
    status: completed
  - id: streamlit-app
    content: "Build Streamlit dashboard (TFG/code/src/app.py) with 3 tabs: Performance Explorer, Inference, Loss Viewer"
    status: completed
  - id: portfolio-json
    content: Add TFG demo entry to PersonalPortfolio/src/data/demos.json and create tfg-model-results.json
    status: completed
  - id: portfolio-page
    content: Create PersonalPortfolio/src/pages/demos/tfg-polyps.astro demo page
    status: completed
  - id: portfolio-component
    content: Create PersonalPortfolio/src/components/demos/TfgPolypDemo.tsx with pipeline diagram, model charts, mock inference
    status: completed
  - id: portfolio-icon
    content: Add microscope icon case to PersonalPortfolio/src/components/Demos.astro
    status: completed
isProject: false
---

# TFG: README, Streamlit GUI, and Portfolio Demo

## 1. Comprehensive README for TFG repo

Replace `TFG/README.md` with a polished README covering:

- **Project title and abstract** (bilingual EN/CA since it's FIB-UPC)
- **Prerequisites**: Python 3.11, CUDA (optional), conda/pipenv
- **Installation**: step-by-step clone, create env, install deps
- **Dataset setup**: where to place LDPolypVideo data (`data/TrainValid/`, `data/Test/`)
- **Quick start**: train a model, run hyperparameter search, evaluate, test
- **Project structure**: expanded tree from the existing README with descriptions
- **Key scripts reference table**: what each script does, its CLI args
- **Streamlit GUI**: how to launch the new dashboard
- **Tech stack and references**
- **License / citation info**

Source: existing content from [TFG/README.md](TFG/README.md) and [TFG/code/README.md](TFG/code/README.md) will be merged and expanded.

## 2. Streamlit Dashboard GUI

Create `TFG/code/src/app.py` -- a Streamlit app with multiple tabs:

### Tab 1: Model Performance Explorer

- Load and display data from `src/csv/model_performances.csv`
- Interactive bar/radar charts comparing Faster R-CNN configurations (AP, AR, F1)
- Sortable table with all hyperparameters and metrics
- Filter by batch size, learning rate ranges, epoch count

### Tab 2: Inference

- Upload a colonoscopy image (or select from sample images if available in `data/`)
- Select a trained model file from `out/saved_models/` (or a configurable path)
- Confidence threshold slider
- Run Faster R-CNN / RetinaNet / SSD inference and display the image with bounding box overlays
- Show detection scores and box coordinates
- Reuse existing functions from `clases/model_utils.py`: `get_model()`, `load_model_with_hyperparams()`

### Tab 3: Training Loss Viewer

- Load loss files from `out/losses/` directory
- Plot epoch losses and batch losses over time
- Compare losses across different model runs

### Setup

- Add `streamlit` to a new `TFG/code/requirements.txt` (consolidating the Pipfile deps + adding streamlit, pandas, plotly/altair)
- Launch command: `streamlit run src/app.py`

Key code to reuse:

- `[model_utils.py](TFG/code/src/clases/model_utils.py)` -- `get_model()`, `load_model_with_hyperparams()`, `parse_model_filename()`
- `[custom_dataset.py](TFG/code/src/clases/custom_dataset.py)` -- `parse_annotation()`
- `[csv/model_performances.csv](TFG/code/src/csv/model_performances.csv)` -- pre-computed results

## 3. PersonalPortfolio Demo Page

Follow the existing demo pattern (3 files + 1 JSON entry):

### 3a. Add entry to `[src/data/demos.json](PersonalPortfolio/src/data/demos.json)`

```json
{
  "slug": "tfg-polyps",
  "title": "TFG -- Polyp Detection",
  "description": "Deep learning polyp detection with generative data augmentation (CycleGAN/SPADE). Explore model results and the training pipeline.",
  "tags": ["PyTorch", "CycleGAN", "Object Detection", "UPC"],
  "icon": "microscope"
}
```

### 3b. Create demo page `[src/pages/demos/tfg-polyps.astro](PersonalPortfolio/src/pages/demos/tfg-polyps.astro)`

- Uses `DemoLayout` with header, badge, and lead text
- Loads `TfgPolypDemo` React component with `client:load`

### 3c. Create React component `[src/components/demos/TfgPolypDemo.tsx](PersonalPortfolio/src/components/demos/TfgPolypDemo.tsx)`

Interactive sections (all browser-side, no PyTorch needed):

- **Pipeline diagram**: visual flow from Dataset -> Augmentation (CycleGAN/SPADE) -> Training -> Detection, similar to the BitsXMarato pipeline strip
- **Model comparison chart**: embed the `model_performances.csv` data as a static JSON import; interactive bar chart letting users compare AP/AR/F1 across the 10 model configurations
- **Mock inference animation**: similar to BitsXMarato's simulated inference -- show a colonoscopy frame, animate a "detection" pass, reveal bounding boxes
- **CycleGAN visualizer**: side-by-side before/after showing how mask-to-polyp image translation works (static example images)
- **Links section**: GitHub repo link + link to the live Streamlit dashboard (if deployed)
- **"Run locally" collapsible**: instructions to clone and run the Streamlit app

### 3d. Add "microscope" icon to `[Demos.astro](PersonalPortfolio/src/components/Demos.astro)`

Add the SVG icon case for `demo.icon === 'microscope'` in the icon rendering block.

### 3e. Embed performance data

Create `[src/data/tfg-model-results.json](PersonalPortfolio/src/data/tfg-model-results.json)` with the 10 model configurations from the CSV, pre-processed for the chart component.