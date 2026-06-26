# TruthLens AI
### Explainable Deepfake Video Detection System

TruthLens AI is a production-quality, explainable forensic deepfake detection system. It allows users to upload videos, samples frames, extracts facial crops using OpenCV face detection, analyses them with a pre-trained EfficientNet-B0 classifier (trained on FaceForensics++), overlays Grad-CAM attention heatmaps showing forensic regions, and exports high-quality downloadable PDF audit logs compiled via ReportLab.

---

## Technical Stack

*   **Frontend**: React (Vite), TypeScript, TailwindCSS, Recharts, Framer Motion, Axios, Lucide Icons.
*   **Backend**: FastAPI, Python 3.12, Uvicorn, SQLite, SQLAlchemy.
*   **AI Engine**: PyTorch, TorchVision, OpenCV, Matplotlib, NumPy, Pillow, scikit-image.
*   **Report Engine**: ReportLab.
*   **Asset Management**: SQLite database tracking, automated cleanup of temporary outputs.

---

## Repository Structure

```text
truthlens-ai/
├── ai/
│   ├── __init__.py
│   ├── model.py        # Model architecture & weight downloads
│   ├── gradcam.py      # Hooks-based Grad-CAM heatmap extraction
│   └── inference.py    # Face detection, normalization & forwarding
├── backend/
│   └── app/
│       ├── __init__.py
│       ├── main.py     # FastAPI entry & server configuration
│       ├── database/
│       │   ├── session.py  # SQLAlchemy session setup
│       │   └── models.py   # Job history SQLite models
│       ├── models/
│       │   └── schemas.py  # Pydantic schema models
│       ├── routes/
│       │   ├── __init__.py
│       │   ├── upload.py   # Upload and file-size/extension validation
│       │   ├── analyze.py  # Async analysis runner & status polling
│       │   ├── static_assets.py # Securely serve frames/heatmaps/PDFs
│       │   └── history.py  # Audit history, settings, CSV/JSON exports
│       ├── services/
│       │   ├── video_service.py  # Frame sampling with OpenCV
│       │   ├── analysis_service.py # Core aggregator and explanation engine
│       │   └── report_service.py # ReportLab PDF with Matplotlib charts
│       └── utils/
│           └── config.py   # settings.json config loaders
├── frontend/
│   ├── package.json
│   ├── vite.config.ts  # Vite configs with /api backend proxy
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── index.html
│   └── src/
│       ├── index.css   # Neon dark styling & glassmorphism
│       ├── main.tsx
│       ├── App.tsx     # Router layout & sidebar navigation
│       ├── types.ts    # TypeScript interface mappings
│       ├── services/
│       │   └── api.ts  # Axios wrapper & relative endpoint paths
│       └── pages/
│           ├── LandingPage.tsx   # Premium hero CTA page
│           ├── Dashboard.tsx     # Drag-and-drop upload & progress bar
│           ├── AnalysisPage.tsx  # Timelines, video player, charts, overlays
│           ├── ReportPage.tsx    # Forensic audit summaries
│           ├── HistoryPage.tsx   # Log listings, deletions, JSON/CSV exports
│           └── SettingsPage.tsx  # Threshold and sampling rate configuration
├── uploads/            # Uploaded target video storage (Secure)
├── frames/             # Extracted frames & cropped face cache
├── heatmaps/           # Grad-CAM JPEG overlays
├── reports/            # Generated PDF report outcomes
├── models/             # Cached neural weights
├── requirements.txt    # Python requirements
├── run.py              # Parallel server launcher
└── README.md           # Instructions
```

---

## Installation & Setup

### Prerequisites
1.  **Python 3.12+**
2.  **Node.js (v18+) & npm**
3.  **FFmpeg** (Recommended for video reading codecs used by OpenCV)

---

### Step-by-Step Installation

#### 1. Setup Virtual Environment (Recommended)
Open a terminal in the project root directory:

```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS / Linux
python3 -m venv venv
source venv/bin/activate
```

#### 2. Install Python Dependencies
```bash
pip install -r requirements.txt
```

#### 3. Install Frontend Packages
The runner script `run.py` automatically performs this step if `node_modules` is missing, but you can also run it manually:
```bash
cd frontend
npm install
cd ..
```

---

## Running the Application

To download the AI model weights, compile frontend assets, and start both the backend API and frontend dev servers in parallel, simply run:

```bash
python run.py
```

### URLs
*   **Frontend Dashboard**: [http://127.0.0.1:5173/](http://127.0.0.1:5173/)
*   **FastAPI API Swagger Docs**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

---

## API Documentation

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/upload` | Ingests video file, validates constraints, returns Job ID. |
| `POST` | `/api/analyze/{job_id}` | Asynchronously triggers frame sampling, face crop forwarding, and PDF compilation. |
| `GET` | `/api/status/{job_id}` | Fetches progress stages (Extracting, Running AI, etc.), percentages, and final JSON results. |
| `GET` | `/api/frame/{frame_id}` | Securely streams a target frame or cropped face image (`{job_id}_{filename}`). |
| `GET` | `/api/heatmap/{frame_id}` | Securely streams a Grad-CAM heatmap or overlay image (`{job_id}_{filename}`). |
| `GET` | `/api/video/{job_id}` | Streams the raw uploaded video. |
| `GET` | `/api/report/{job_id}` | Downloads the forensic ReportLab PDF file. |
| `GET` | `/api/history` | Lists all analysis runs. Supports `?search=` filter. |
| `DELETE` | `/api/history/{job_id}` | Deletes job record and clears all associated videos/frames/heatmaps/PDFs from disk. |
| `GET` | `/api/history/export/json` | Downloads a JSON dump of the database. |
| `GET` | `/api/history/export/csv` | Downloads a CSV spreadsheet of history summaries. |
| `GET` | `/api/settings` | Gets current thresholds and sampling rates. |
| `POST` | `/api/settings` | Saves configurations to local `settings.json`. |

---

## Security Features
1.  **Randomized Filenames**: Files are saved on disk using their generated Job UUID (e.g. `uuid.mp4`, `uuid_frame_5.jpg`) preventing original filename override attacks.
2.  **Path Traversal Prevention**: Asset requests are split, parsed, and restricted to their respective folder boundaries. Attempts to access paths outside `frames/` or `heatmaps/` will return `403 Forbidden`.
3.  **Automatic Disk Cleanup**: Deleting an item on the History page triggers complete removal of the uploaded video, sampled frames, heatmap layers, and PDF files.
