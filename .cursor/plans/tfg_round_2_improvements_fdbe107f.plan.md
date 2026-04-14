---
name: TFG Round 2 Improvements
overview: "Address remaining bugs found in a second audit pass: ML correctness issues (HPO metric, path doubling), backend robustness (path traversal, error handling, pre-check logic), frontend data/UX bugs, and script fixes."
todos:
  - id: hpo-metric
    content: Return best_metric instead of last-epoch metric_value from train_model()
    status: completed
  - id: path-doubling
    content: Fix path doubling in evaluate_models.py and app.py calls to load_model_with_hyperparams
    status: completed
  - id: epoch-loss-order
    content: Move epoch_losses.append before save_model_with_hyperparams call
    status: completed
  - id: gen-path-traversal
    content: Add path containment check to /api/generate/results endpoint
    status: completed
  - id: gen-precheck
    content: Add return after failed pre-check in run_generative_script
    status: completed
  - id: endpoint-error-handling
    content: Add try/except to HPO results, performance, and predict endpoints
    status: completed
  - id: train-models-debug
    content: Fix train_models.py empty debug_flag passed to subprocess
    status: completed
  - id: optuna-main-guard
    content: Wrap optuna_train_model.py top-level code in if __name__ == '__main__'
    status: completed
  - id: plot-csv-columns
    content: Fix plot_evaluated_models.py to use correct CSV column names
    status: completed
  - id: default-preds-catid
    content: Fix create_default_predictions category_id from 0 to 1
    status: completed
  - id: chart-top10
    content: Sort performance chart data by F1 before slicing top 10
    status: completed
  - id: nan-inputs
    content: Guard parseInt/parseFloat in frontend numeric inputs against NaN
    status: completed
  - id: url-leak-unmount
    content: Add useEffect cleanup to revoke object URL on unmount in InferenceUI
    status: completed
  - id: sklearn-dep
    content: Add scikit-learn to code/requirements.txt and code/ install to Makefile
    status: completed
  - id: gitignore-negation
    content: Fix .gitignore out/ -> out/* so negation patterns work
    status: completed
isProject: false
---

# TFG Round 2 Improvements

## Priority 1 — ML Correctness

### HPO optimizes last-epoch metric instead of best

`train_model()` in [code/src/clases/model_utils.py](code/src/clases/model_utils.py) returns `metric_value` from the **final epoch**, but saves the checkpoint from the **best epoch**. Optuna/Ray Tune rank trials by this returned value, so a trial where epoch 3/5 was best but epoch 5 regressed gets penalized.

**Fix:** Track `best_metric` and return it instead of the last `metric_value`:

```python
return model, epoch_losses, batch_losses, epoch, saved_model_path, best_metric
```

### `load_model_with_hyperparams` path doubling

In [code/src/evaluate_models.py](code/src/evaluate_models.py) (~~line 62), callers pass `os.path.join(MODEL_DIR, filename)` as `base_filename`, then `load_model_with_hyperparams` does `os.path.join(load_dir, base_filename)` again — doubling the path. Same issue in [code/src/app.py](code/src/app.py) (~~line 228).

**Fix:** Pass just `model_filename` (not the full path) to `load_model_with_hyperparams`, since it already joins with `load_dir`.

### Checkpoint epoch_losses snapshot misses current epoch

In `train_model()`, `save_model_with_hyperparams` is called **before** `epoch_losses.append(epoch_loss)`, so the saved loss file is missing the epoch that triggered the save.

**Fix:** Move `epoch_losses.append(epoch_loss)` before the save call.

---

## Priority 2 — Backend Bugs

### Path traversal in `/api/generate/results`

`experiment` and `epoch` query params are joined into filesystem paths without containment checks — same class of bug already fixed for losses/models in round 1.

**Fix:** Add `os.path.realpath` containment check against the results root directory.

### Generative pre-check doesn't block subprocess on failure

In `run_generative_script`, if the directory pre-check `except` block catches, execution falls through and `_run_subprocess` still launches.

**Fix:** Add `return` after the `except` block (or restructure to only call `_run_subprocess` on success).

### Unhandled errors in HPO results and performance endpoints

- `GET /api/hpo/results`: `json.load` can raise `JSONDecodeError` on corrupt file -> 500
- `GET /api/performance`: missing CSV columns -> `KeyError` -> 500
- `POST /api/predict`: invalid image data -> `UnidentifiedImageError` -> 500

**Fix:** Wrap each in try/except with appropriate HTTPException responses.

---

## Priority 3 — Script Fixes

### `train_models.py` passes empty string breaking child

When `--debug` is not passed, `debug_flag = ""` is still appended to the subprocess command, which gets parsed as a positional arg by `argparse` in `train_and_save_model.py`.

**Fix:** Only append `debug_flag` to the command list when it is non-empty.

### `optuna_train_model.py` runs at module level

No `if __name__ == "__main__":` guard — importing the module triggers a full Optuna study.

**Fix:** Wrap the parser + study + file writes in `if __name__ == "__main__":`.

### `plot_evaluated_models.py` uses wrong CSV columns

References `Precision`, `Recall`, `F1-Score`, `Mean IoU` but `evaluate_models.py` writes COCO-format columns like `AP_50_95_all`.

**Fix:** Update column names to match actual CSV output.

### `create_default_predictions` uses `category_id: 0` vs defined `1`

The COCO categories define polyp as id `1`, but the dummy predictions use `0`.

**Fix:** Change to `category_id: 1`.

---

## Priority 4 — Frontend Fixes

### Performance chart shows arbitrary rows, not top 10

`data.slice(0, 10)` takes the first 10 in API order, but the table sorts by F1. The chart label says "top models".

**Fix:** Sort by F1 before slicing: `[...data].sort((a, b) => (b.F1 || 0) - (a.F1 || 0)).slice(0, 10)`.

### NaN from empty numeric inputs

`parseInt(e.target.value)` on empty input returns `NaN`, which propagates to API calls.

**Fix:** Use `parseInt(e.target.value) || defaultValue` (or clamp) in onChange handlers across ModelTraining, GenerativeAugmentation, HyperparameterTuning.

### Object URL leak on unmount in InferenceUI

Round 1 added revoke-on-replace but not revoke-on-unmount.

**Fix:** Add a cleanup `useEffect` that calls `URL.revokeObjectURL(previewUrl)` on unmount.

---

## Priority 5 — Config / Dependencies

### Missing `scikit-learn` in `code/requirements.txt`

Used by `data_utils.py` and `csv/select_best.py` but not listed.

**Fix:** Add `scikit-learn` to [code/requirements.txt](code/requirements.txt).

### `make install` doesn't install `code/` dependencies

**Fix:** Add a `cd code && pip install -r requirements.txt` step to the `install` target in [Makefile](Makefile).

### `.gitignore` out/ negation may not work

`out/` ignores the directory entirely; `!out/losses/` negations can't un-ignore children of an ignored directory.

**Fix:** Change `out/` to `out/`* so negations can take effect.

---

## Not changing (fine for TFG scope)

- TOCTOU race on job start (single-user lab tool)
- CORS `*` + credentials (localhost only)
- `any` types in frontend (works, low risk)
- Accessibility (not required for TFG)
- useEffect cleanup / AbortController (tab-based nav, low risk)
- `pywin32` in code/requirements.txt (user is on Linux, ignore)
- `test_model.py` Windows path (user is on Linux)

