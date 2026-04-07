---
name: TFG Repo Improvements
overview: Prioritized improvements for the TFG repo covering critical bugs, code quality, architecture, and documentation across the frontend, backend, and ML code.
todos:
  - id: coco-annid
    content: Fix COCO GT annotation ID duplication bug in model_utils.py coco_evaluate()
    status: completed
  - id: import-json
    content: Add explicit import json to train_and_save_model.py
    status: completed
  - id: enum-fix
    content: Fix PYTHON_INSTALLED enum values and python_version() logic in utils.py
    status: completed
  - id: api-base-url
    content: Centralize API base URL with shared axios instance + VITE_API_URL env var
    status: completed
  - id: subprocess-dedup
    content: Extract shared subprocess runner helper in backend main.py
    status: completed
  - id: cancel-dedup
    content: Extract shared cancel process helper in backend main.py
    status: completed
  - id: pydantic-validation
    content: Add Field constraints to TrainingRequest, HPORequest, GenRequest; fix typo
    status: completed
  - id: inference-blocking
    content: Fix blocking model inference in async predict endpoints
    status: completed
  - id: path-traversal
    content: Add path containment checks to loss file and model loading endpoints
    status: completed
  - id: dead-code
    content: "Remove dead code: validate(), commented evaluate, unused imports in model_utils.py"
    status: completed
  - id: variable-names
    content: "Rename misleading variables: best_val_loss, metric_to_optimize shadowing"
    status: completed
  - id: error-handling
    content: "Standardize error handling: traceback in subprocess runners, JSON parse 400, loss file guards"
    status: completed
  - id: frontend-cleanup
    content: Fix object URL leak, Math.max edge case, invalid Tailwind classes
    status: completed
  - id: readme
    content: Update README to document full-stack architecture (backend, frontend, Makefile)
    status: completed
  - id: coco-json-paths
    content: Use temp files for COCO JSON in coco_evaluate to avoid parallel contention
    status: completed
isProject: false
---

# TFG Repository Improvement Plan

## Priority 1 -- Critical Bugs

### COCO Ground Truth Duplicate Annotation IDs

In [code/src/clases/model_utils.py](code/src/clases/model_utils.py) `coco_evaluate()`, the `ann_id` counter is only incremented in the prediction loop, not after each GT annotation. Multiple GT boxes share the same `id`, which violates COCO's unique ID requirement and can silently skew evaluation metrics.

### Missing `import json` in train_and_save_model.py

[code/src/train_and_save_model.py](code/src/train_and_save_model.py) uses `json.loads` in argparse but relies on `from clases.model_utils import *` to bring `json` into scope. If that star-import changes, this breaks with a `NameError`. Should be an explicit import.

### Enum Bug in utils.py

[code/src/clases/utils.py](code/src/clases/utils.py): `PYTHON_INSTALLED` enum has `PYTHON_3 = 2` and `NOT_INSTALLED = 2` (same value). `python_version()` uses `python_installed.PYTHON_3` as an attribute access on an instance, which is not how Python enums work. This function happens to work by accident but is logically broken.

---

## Priority 2 -- High Impact Code Quality

### Centralize API Base URL (Frontend)

`http://localhost:8082` is hardcoded in every component (~30+ occurrences across 9 files). Create a shared axios instance:

```typescript
// src/api.ts
import axios from 'axios';
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8082',
});
```

### Deduplicate Subprocess Runner (Backend)

The same Popen + stream lines + deque + wait + return code pattern is repeated 4 times in [backend/main.py](backend/main.py) (training, evaluation, generative, HPO). Extract a helper:

```python
def _run_subprocess(cmd: list, state: dict, task_label: str):
    # env setup, Popen, line streaming, return code handling, state cleanup
```

### Deduplicate Cancel Endpoints (Backend)

Same `killpg` / fallback `kill` pattern appears 4 times. Extract:

```python
def _cancel_process(state: dict, label: str):
    pid = state.get("pid")
    ...
```

### Add Pydantic Validation (Backend)

- `TrainingRequest`: add `Field(gt=0)` for `batch_size`, `num_epochs`, `lr`, `weight_decay`
- `HPOResquest` (also fix typo to `HPORequest`): constrain `num_trials` range
- `GenRequest.task_type`: use `Literal["train_cyclegan", "test_cyclegan", "train_spade"]`

### Fix Blocking Inference on Async Event Loop

`predict` and `predict_batch` in [backend/main.py](backend/main.py) run model inference synchronously inside `async def` endpoints, blocking the entire event loop. Use `run_in_executor` or switch to sync `def` endpoints.

### Path Traversal in Loss/Model Endpoints

- `/api/losses/{filename}`: no containment check on `filename` -- can escape `LOSSES_DIR`
- Model loading in inference: `base_filename` passed to `os.path.join` without sanitization

---

## Priority 3 -- Code Cleanup

### Dead Code Removal (model_utils.py)

- `validate()` function: never called anywhere in the repo
- Large commented-out `evaluate` function block
- Unused `box_iou` import
- `iou_threshold` parameter on `coco_evaluate` is unused (COCOeval uses its own)

### Misleading Variable Names

- `best_val_loss` in `train_model()` actually tracks best metric (F1), not loss
- `metric_to_optimize` in `optuna_train_model.py` is shadowed: starts as a string, gets overwritten with the float return from `train_model`

### Inconsistent Error Handling (Backend)

- Most subprocess runners use bare `except Exception` without `traceback.format_exc()` (only `run_prepare_cyclegan` does it properly)
- `upload_dataset_files`: invalid JSON in `relative_paths` raises unhandled 500 instead of 400
- `get_loss_data`: bad float lines can 500 the whole request

### Frontend Cleanup

- `URL.createObjectURL` leak in `InferenceUI.tsx` (no `revokeObjectURL` on replace/unmount)
- `Math.max(...[])` edge case in `TrainingLossViewer.tsx` returns `-Infinity`
- Invalid Tailwind class `hover:bg-gray-750` used in multiple components (not a default Tailwind value)
- `from clases.model_utils import *` in multiple scripts: replace with explicit imports

---

## Priority 4 -- Architecture / DX

### Update README

Current README only covers `code/` and Streamlit. Missing:

- FastAPI backend documentation
- React frontend documentation
- Root Makefile workflow
- References `environment.yml` which doesn't exist

### Pin Dependencies

Both `backend/requirements.txt` and `code/requirements.txt` have unpinned (or overly broad) versions. At minimum pin major versions for reproducibility.

### Add `.env` Support

- Frontend: `VITE_API_URL` env var
- Backend: configurable port, paths via env vars instead of relative path derivation

### COCO JSON Path Contention

`coco_evaluate` writes `predictions.json` and `ground_truth.json` to fixed paths under `OUT_DIR` -- not safe for parallel training/evaluation runs. Use temp files or per-run directories.

### Optional: Shared Polling Hook (Frontend)

The "long-running job" pattern (poll status, track wasRunning ref, detect completion, show result banner, cancel button) is duplicated across ModelTraining, ModelEvaluation, HyperparameterTuning, and GenerativeAugmentation. Could be a `useJobStatus(endpoint)` hook.

---

## What NOT to Change (fine as-is for a TFG project)

- No React Router needed (tab-based nav is fine for this scale)
- No Docker/CI (manual Makefile workflow is appropriate)
- No auth/rate-limiting (local lab tool)
- Global state dicts in backend (single-worker Uvicorn is the deployment target)

