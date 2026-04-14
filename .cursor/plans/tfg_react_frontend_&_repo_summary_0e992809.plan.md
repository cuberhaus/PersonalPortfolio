---
name: TFG React Frontend & Repo Summary
overview: Create a markdown summary of portfolio technologies, protect the legacy Streamlit app with Cursor rules, and build a new React frontend + FastAPI backend for the TFG project.
todos: []
isProject: false
---

# TFG React Frontend & Portfolio Summary Plan

## 1. Documentation & Rules

- **Portfolio Summary**: Create a `frontend_technologies_summary.md` file (in a location of your choice, likely the root of your workspace or inside your portfolio repo) documenting the different frameworks you've used across your projects.
- **Protect Legacy Code**: The current Streamlit app is located at `TFG/code/src/app.py`. We will leave this completely intact as a legacy test.
- **Cursor Rules**: Create `TFG/.cursorrules` explicitly forbidding the deletion of the legacy Streamlit app and defining conventions for the new React/FastAPI stack.
- **Copilot Integration**: Symlink the `.cursorrules` to `TFG/.github/copilot-instructions.md`.

## 2. Backend API (FastAPI)

Since React cannot run PyTorch models directly in the browser, we need to wrap your existing Python code into a REST API.

- **Location**: `TFG/backend/`
- **Stack**: FastAPI, Uvicorn, PyTorch, Pillow.
- **Endpoints**: 
  - `GET /models`: List available model weights.
  - `POST /predict`: Accept an uploaded colonoscopy image, run inference using your `clases.model_utils`, and return the bounding boxes, scores, and the generated image.

## 3. Frontend Application (React)

- **Location**: `TFG/frontend/`
- **Stack**: React (via Vite), TypeScript, Tailwind CSS (for modern, easy styling), Axios (for API requests).
- **Features**:
  - **Dashboard/Performance View**: Display the model performances (reading from the existing `csv/model_performances.csv` via the backend).
  - **Inference UI**: A clean, modern interface to upload images, select a model architecture/weights, adjust confidence thresholds, and display the resulting image with bounding boxes drawn over detected polyps.

