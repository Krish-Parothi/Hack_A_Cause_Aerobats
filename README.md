# Hack_A_Cause_Aerobats

### Problem Statement:

Create an AI-driven system that monitors hygiene
conditions of public toilets in real time and displays a live
cleanliness grade outside the facility. The platform should
also guide users to alternative nearby toilets within 1–2 km,
showing their location, rating, and operational status.


---

## Table of Contents

- **Overview**
- **Repository Structure**
- **Requirements**
- **Backend — Setup & Run**
- **Frontend — Setup & Run**
- **Training**
- **Model Artifacts**
- **Testing**
- **Routes & API**
- **Development Notes**
- **Contributing**
- **License & Contact**

---

## Overview

- **Project:** Hack_A_Cause_Aerobats
- **Purpose:** End-to-end object detection pipeline (YOLO-based) with a Python backend and a Vite + TypeScript frontend. Includes training scripts, model artifacts, testing helpers, and API routes.

---

## Repository Structure (high level)

- `backend/` : Python backend, training scripts, models and routes.
  - `data.yaml` : dataset configuration for training.
  - `main.py` : backend entrypoint / app runner (inspect to confirm server type: FastAPI/Flask).
  - `train.py` : top-level training helper.
  - `yolo11n.pt`, `yolov8s.pt` : model weights shipped for inference/training seeds.
  - `Model/runs/` : training run outputs (check subfolders like `yolov8_custom*`).
  - `routes/routes.py` : API route definitions used by the backend.
  - `testing/` : test scripts and sample images for evaluation.

- `train/` : raw dataset images and `labels/` used for training.

- `Frontend/` : Vite + TypeScript frontend app.
  - `package.json`, `vite.config.ts`, `src/` : source code for UI, components, contexts, etc.

- `supabase/` : (optional) supabase functions and migrations.

- `test-results/` : (optional) CI / local test outputs.

---

## Requirements

- **Backend (Python):** Python 3.8+ recommended. Create a virtual environment.
- **Frontend:** Node.js 16+ with npm or pnpm/yarn.
- **GPU (optional):** For training with YOLO on large datasets, a CUDA-capable GPU + matching PyTorch/CUDA is recommended.

---

## Backend — Setup & Run

1. Open a terminal and change to the backend folder:

```powershell
cd backend
```

2. Create and activate a virtual environment (Windows example):

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1    # PowerShell
# or
.\.venv\Scripts\activate.bat    # cmd
```

3. Install dependencies. If `requirements.txt` is present, run:

```powershell
pip install -r requirements.txt
```

If there is no `requirements.txt`, a typical minimal set for YOLO-style workflows includes:

```powershell
pip install ultralytics pyyaml fastapi uvicorn[standard] python-multipart
```

(Adjust packages to match actual imports in `main.py` and `routes/routes.py`.)

4. Run the backend server (example):

```powershell
python main.py
# or (if FastAPI)
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Check `backend/main.py` for the exact run instructions or the chosen framework.

---

## Frontend — Setup & Run

1. Change into the frontend folder and install dependencies:

```bash
cd Frontend
npm install
# or
pnpm install
# or
yarn
```

2. Run the dev server:

```bash
npm run dev
# or
pnpm dev
# or
yarn dev
```

3. Build for production:

```bash
npm run build
```

The frontend is a standard Vite + React (TypeScript) app. Check `Frontend/src` for environment variables and API base URLs.

---

## Training

- Dataset config: `backend/data.yaml` points to train/val splits and class names — verify its paths before training.
- Training script: `backend/train.py` (or other helpers inside `backend/`) — inspect for CLI flags. A typical YOLO training command (if using Ultralytics YOLOv8 API) looks like:

```bash
python backend/train.py --data backend/data.yaml --model backend/yolov8s.pt --epochs 100 --img 640
```

Adjust arguments for your environment. Training outputs are saved under `backend/Model/runs/`.

---

## Model Artifacts

- Pretrained weights found at `backend/yolo11n.pt` and `backend/yolov8s.pt`.
- Training outputs/runs in `backend/Model/runs/yolov8_custom*/` — contains `weights/best.pt`, metrics, and `labels/`.

When deploying or running inference, point your detection code at the correct weights file.

---

## Testing

- Unit / quick tests: `backend/testing/` contains `Single_Image_test.py` and `folder_images_test.py` for evaluating model predictions on single images or folders.

Run them like:

```powershell
python backend/testing/Single_Image_test.py --image backend/testing/test_images/your_image.jpg --weights backend/Model/runs/yolov8_custom/weights/best.pt
```

(Inspect the test scripts for their exact CLI/API.)

---

## Routes & API

- The backend route definitions live in `backend/routes/routes.py` — review it to learn endpoints, expected payloads, and response shapes.
- Typical endpoints will include image upload, inference, and health-check routes. Use `curl` or the frontend to exercise the API once the backend is running.

---

## Development Notes

- Keep model files and large datasets out of version control; use `.gitignore` for `Model/runs`, local `.venv`, and dataset caches.
- If you add CI, include small smoke tests that run inference on a tiny sample image using the shipped weights.

---

## Contributing

- **Bug reports:** Open an issue describing steps to reproduce, environment, and observed vs expected behavior.
- **Feature requests / improvements:** Propose via an issue or a short design PR.
- **PR guidelines:** Keep changes focused, add tests for new behavior where possible, and update this README if you add or change top-level commands.

---

## License & Contact

- Add a `LICENSE` file to this repo if you want to make usage/licensing explicit.
- For questions, contact the maintainers or open issues in the repository.

---

## Quick Links

- Backend entry: `backend/main.py`
- Training config: `backend/data.yaml`
- Training script: `backend/train.py`
- Model weights: `backend/yolo11n.pt`, `backend/yolov8s.pt`
- Frontend app: `Frontend/`
- API routes: `backend/routes/routes.py`
- Tests: `backend/testing/`


---

If you'd like, I can:

- Replace the existing root `README.md` with this content (overwrite), or
- Commit `README.generated.md` into a new branch and open a PR draft.

Tell me which you prefer and I will proceed.