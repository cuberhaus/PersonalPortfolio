---
name: Fix repo improvements
overview: Fix bugs, refactor all 4 converter GUIs to use BaseConverterApp, clean up unused imports/emojis, update stale documentation, add pyproject.toml, and fix hardcoded paths.
todos:
  - id: bugs
    content: "Fix bugs: Clasificaciones logic (#1), duplicate docstrings (#2), missing input validation (#3), missing initialdir (#12)"
    status: completed
  - id: base-gui-tweak
    content: "Tweak base_gui.py: add configurable initialdir, app_dir attribute"
    status: completed
  - id: refactor-glossary-to-inf
    content: Refactor glossary_to_informatica/gui.py to subclass BaseConverterApp
    status: completed
  - id: refactor-inf-to-glossary
    content: Refactor informatica_to_glossary/gui.py to subclass BaseConverterApp
    status: completed
  - id: refactor-metadata-to-inf
    content: Refactor metadata_to_informatica/gui.py to subclass BaseConverterApp
    status: completed
  - id: refactor-inf-to-metadata
    content: Refactor informatica_to_metadata/gui.py to subclass BaseConverterApp
    status: completed
  - id: remove-emojis
    content: Remove all emojis from GUI log messages and labels
    status: completed
  - id: fix-readme
    content: Fix root README.md stale references and directory tree
    status: completed
  - id: fix-dq-readme
    content: Fix dq_rules_generator/README.md to describe the actual tool
    status: completed
  - id: doc-scripts
    content: Add documentation for undocumented scripts in root README
    status: completed
  - id: pyproject
    content: Create pyproject.toml with project metadata
    status: completed
  - id: fix-debug-paths
    content: Fix hardcoded Windows paths in scripts/debug/*.py
    status: completed
isProject: false
---

# Fix Repo Improvements

## 1. Bug Fixes (items 1, 2, 3, 12)

### glossary_to_informatica/gui.py

- **Clasificaciones bug (#1)**: Line 332 checks `'Clasificaciones (Opcional)' in df_new.columns` but `df_new` uses Informatica column names. Fix to check `df_source` columns instead.
- **Duplicate docstrings (#2)**: Methods `log`, `browse_glossary`, `browse_output`, `validate_inputs`, `start_conversion` each have two docstrings stacked. Remove the second one from each.

### informatica_to_glossary/gui.py

- **Missing input validation (#3)**: `start_conversion()` checks `self.input_path.get()` is non-empty but never checks `os.path.exists()`. Add file existence check.
- **Missing initialdir (#12)**: `browse_input()` and `browse_output()` don't pass `initialdir`. Add `initialdir=Path(__file__).parent`.

## 2. Refactor GUIs to use BaseConverterApp (item 4)

### Tweak [base_gui.py](utils/converters/shared/base_gui.py)

- Change `browse_open_file` / `browse_save_file` to default `initialdir` to the calling module's directory rather than hardcoded `Path(__file__).parent.parent`. Add an `initialdir` parameter defaulting to `None` (which falls back to a stored `self._app_dir` set in `__init`__).
- Add `self._app_dir` attribute that subclasses set (defaults to script directory).

### Refactor each GUI to subclass `BaseConverterApp`

Each GUI becomes a subclass implementing:

- `get_title()` / `get_geometry()` - window config
- `create_custom_widgets(parent) -> int` - converter-specific widgets only (input sections, checkboxes, output sections, summary). No scrollable canvas, no log, no buttons (base handles all that).
- `validate_inputs() -> bool` - using base helpers like `validate_file_exists()` and `validate_output_path()`
- `run_conversion()` - pure conversion logic, no `try/except/finally` (base's `_run_conversion_wrapper` handles that)

Use `run_app(AppClass)` from shared instead of raw `main()` function.

Affected files:

- `metadata_to_informatica/gui.py` (~583 -> ~350 lines)
- `informatica_to_metadata/gui.py` (~561 -> ~330 lines)
- `glossary_to_informatica/gui.py` (~419 -> ~280 lines)
- `informatica_to_glossary/gui.py` (~358 -> ~230 lines)

## 3. Remove unused imports (item 5)

- `metadata_to_informatica/gui.py`: remove `numpy as np`, `Any`, `List`
- `informatica_to_metadata/gui.py`: remove `numpy as np`, `Any`, `Dict`
- `informatica_to_glossary/gui.py`: remove `numpy as np`, `Any`, `Dict`

(These will be addressed naturally during the GUI refactoring in step 2.)

## 4. Remove emojis from log messages (item 11)

All 4 GUIs and their log/description strings. Examples:

- `glossary_to_informatica/gui.py`: remove emojis from description labels, log messages, and convert button text
- `informatica_to_glossary/gui.py`: same

## 5. Fix root README.md (item 6)

- Remove references to deleted files: `generate_templates.py`, `cu3_tests/`
- Remove stale references to standalone scripts (translate_glossary.py, map_to_template.py, merge_datasets.py, etc.)
- Update directory tree to match current state

## 6. Fix dq_rules_generator/README.md (item 7)

Replace the current content (which describes `list_profiles.py`) with correct documentation for the DQ Rules Generator (LLM-based rule generation, required env vars like `GOOGLE_APPLICATION_CREDENTIALS`, `GEMINI_MODEL`, etc.).

## 7. Document undocumented scripts (item 8)

Add brief docstring headers or README mentions for:

- `scripts/md_to_docx.py`
- `scripts/generate_vacation_calendar.py`
- `scripts/populate_marketplace_templates.py`
- API test scripts in `scripts/api_tests/`

(Light-touch: add a section to the root README listing these with one-line descriptions.)

## 8. Add pyproject.toml (item 14)

Create a minimal `pyproject.toml` with:

- Project metadata (name, version, python requirement)
- Tool configs (ruff or similar if desired)
- Dependencies from current requirements.txt

## 9. Fix hardcoded Windows paths (item 17)

In `scripts/debug/*.py` (9 files) and a few others: replace hardcoded `c:\Users\pcasacubertagil\...` paths with `Path(__file__)` relative paths or configurable variables.