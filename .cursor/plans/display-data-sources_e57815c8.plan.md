---
name: display-data-sources
overview: Update the backend to expose the file paths for the CSV and models, and display these paths in the frontend UI.
todos:
  - id: update-backend
    content: Add source_path to /api/performance and /api/models responses in main.py
    status: completed
  - id: update-performance-ui
    content: Update PerformanceExplorer.tsx to parse and display the CSV path
    status: completed
  - id: update-inference-ui
    content: Update InferenceUI.tsx to parse and display the models directory path
    status: completed
isProject: false
---

# Display Data Sources in Frontend

This plan updates both the backend and frontend to show exactly where the data (performance metrics and model weights) is coming from.

## Changes to Backend

File: `[TFG/backend/main.py](TFG/backend/main.py)`

1. **Update `/api/performance`**:
  - Return `"source_path": CSV_PATH` alongside the `"data"` array.
2. **Update `/api/models`**:
  - Change the response model from a List to a new Pydantic model:

```python
     class ModelsResponse(BaseModel):
         models: List[ModelInfo]
         source_path: str
     

```

- Return `{"models": [...], "source_path": SAVED_MODELS_DIR}` instead of just the list.

## Changes to Frontend

1. **Update `PerformanceExplorer`** (`[TFG/frontend/src/components/PerformanceExplorer.tsx](TFG/frontend/src/components/PerformanceExplorer.tsx)`):
  - Add a `sourcePath` state variable.
  - Set it using `response.data.source_path` in the `axios.get` call.
  - Render the path near the top of the component:

```tsx
     <div className="text-xs text-gray-400 bg-gray-800 px-3 py-1 rounded border border-gray-700">
       Data source: <span className="font-mono text-gray-300">{sourcePath}</span>
     </div>
     

```

1. **Update `InferenceUI`** (`[TFG/frontend/src/components/InferenceUI.tsx](TFG/frontend/src/components/InferenceUI.tsx)`):
  - Add a `sourcePath` state variable.
  - Update the API parsing to use `response.data.models` due to the backend structure change, and capture `response.data.source_path`.
  - Render the path in the "Configuration" sidebar under "Model Weights" so users know where the `.pth` files are being loaded from.

