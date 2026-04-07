---
name: add-model-training
overview: Add a new 'Model Training' tab to the frontend and new backend endpoints to trigger and monitor PyTorch training scripts asynchronously.
todos: []
isProject: false
---

# Add Model Training to Dashboard

This plan outlines adding a new "Model Training" feature that allows the user to configure hyperparameters and trigger the existing PyTorch training script from the React frontend, without blocking the backend server.

## 1. Backend Changes (`[TFG/backend/main.py](TFG/backend/main.py)`)

### 1.1 State Management

Add a simple global state to track training progress so the frontend can poll it.

```python
training_state = {
    "is_training": False,
    "current_model": None,
    "message": "Idle",
    "process": None
}
```

### 1.2 Training Background Task

Create a function that uses `subprocess.Popen` to run the existing `train_and_save_model.py` script.

- It will parse the incoming Hyperparameters.
- Construct the command: `python ../code/src/train_and_save_model.py <ModelName> '{"BATCH_SIZE": 2, "LR": 0.005, ...}'`
- Set `training_state["is_training"] = True` before starting.
- Wait for the process to finish using `process.wait()`.
- Once finished, set `training_state["is_training"] = False` and update the message (Success or Error based on return code).

### 1.3 New Endpoints

- `**POST /api/train**`: 
  - Accepts a JSON body with `model_name`, `batch_size`, `lr`, `weight_decay`, `num_epochs`.
  - Checks if `training_state["is_training"]` is True. If so, return a 400 error (already training).
  - Uses FastAPI's `BackgroundTasks` to trigger the subprocess function so the HTTP request returns immediately.
- `**GET /api/train/status**`:
  - Returns the current `training_state`.

## 2. Frontend Changes

### 2.1 Update Main Layout (`[TFG/frontend/src/App.tsx](TFG/frontend/src/App.tsx)`)

- Add a new state for the active tab: `activeTab === 'training'`.
- Add a "Model Training" button to the tab navigation bar.
- Import and render a new `<ModelTraining />` component.

### 2.2 Create `ModelTraining` Component (`[TFG/frontend/src/components/ModelTraining.tsx](TFG/frontend/src/components/ModelTraining.tsx)`)

Create a new file with the following features:

- **Form Inputs**:
  - Model Architecture (Dropdown: FasterRCNN, RetinaNet, SSD)
  - Batch Size (Number input)
  - Learning Rate (Number input, e.g., 0.005)
  - Weight Decay (Number input, e.g., 0.0005)
  - Epochs (Number input)
- **Status Polling**:
  - A `useEffect` with `setInterval` that pings `/api/train/status` every 3 seconds to check if training is active.
- **UI States**:
  - If `is_training` is true: Disable the form, show a spinning loader, and display "Training in progress for ... Check terminal for detailed epoch logs."
  - If `is_training` is false: Enable form and "Start Training" button. Show the result message from the last training run.

