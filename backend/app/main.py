import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.database.session import engine, Base
from backend.app.routes import upload, analyze, history, static_assets

# Create SQLite database tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="TruthLens AI Backend",
    description="REST API for TruthLens AI Explainable Deepfake Detection System.",
    version="1.0.0"
)

# Configure CORS Middleware
# Allows Vite frontend (typically running on localhost:5173 or 3000) to communicate with API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify actual domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup event to ensure all standard storage directories exist
@app.on_event("startup")
def create_directories():
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    folders = ["uploads", "frames", "heatmaps", "reports", "models"]
    for folder in folders:
        path = os.path.join(base_dir, folder)
        os.makedirs(path, exist_ok=True)
        print(f"Directory verified: {path}")

# Mount routers
app.include_router(upload.router)
app.include_router(analyze.router)
app.include_router(history.router)
app.include_router(static_assets.router)

@app.get("/")
def read_root():
    return {
        "app": "TruthLens AI",
        "version": "1.0.0",
        "description": "Explainable Deepfake Video Detection System API",
        "status": "online"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="127.0.0.1", port=8000, reload=True)
