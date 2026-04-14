---
name: Sidebar Reorganization
overview: Group the sidebar navigation items logically according to the standard Machine Learning pipeline (Data, Training, Evaluation, Inference) to improve usability and structure.
todos:
  - id: refactor_nav_items
    content: Refactor `navItems` in `App.tsx` into logical ML pipeline groups.
    status: completed
  - id: update_sidebar_ui
    content: Update sidebar rendering logic in `App.tsx` to include visual category headers.
    status: completed
isProject: false
---

# Sidebar Navigation Restructuring Plan

Currently, the sidebar has 8 tabs arranged somewhat randomly: Dataset, Performance, Inference, Training, Losses, Evaluation, Augmentation, and Tuning. 

To make the dashboard feel like a professional ML tool, we should group these logically following a standard Machine Learning lifecycle. I will update `App.tsx` to group the navigation items under descriptive headers.

Here is the proposed structure:

### 1. Data & Exploration

*Everything related to viewing and generating data.*

- **Dataset Explorer:** Browse raw images and ground truth annotations.
- **Data Augmentation:** Generate synthetic polyps using CycleGAN/SPADE.

### 2. Training & Optimization

*Everything related to training models and finding the best hyperparameters.*

- **Hyperparameter Tuning:** Run Optuna searches to find optimal configs.
- **Detection Training:** Train object detection models (FasterRCNN, etc.).
- **Training Losses:** Monitor loss curves during and after training.

### 3. Evaluation & Analytics

*Everything related to assessing model performance.*

- **Model Evaluation:** Run the evaluation script on your saved models.
- **Performance Explorer:** View the CSV metrics and bar charts of your best models.

### 4. Inference & Testing

*Using the trained models.*

- **Inference:** Run predictions on single images or batch process random test images.

### Implementation Steps

1. Edit `frontend/src/App.tsx`.
2. Refactor the `navItems` array into an array of grouped objects (e.g., `{ group: "Data & Exploration", items: [...] }`).
3. Update the sidebar mapping to render category headers (small, gray, uppercase text) above each group of buttons to visually separate them.

