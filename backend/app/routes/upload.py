import os
import uuid
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime

from backend.app.database.session import get_db
from backend.app.database.models import JobHistory
from backend.app.models.schemas import JobStatusResponse
from backend.app.utils.config import load_settings

router = APIRouter(prefix="/api", tags=["upload"])

ALLOWED_EXTENSIONS = {".mp4", ".avi", ".mov"}

@router.post("/upload", response_model=JobStatusResponse)
async def upload_video(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    Uploads a video, runs validation filters, creates database record and returns Job status.
    """
    settings = load_settings()
    
    # 1. Validate file extension
    _, ext = os.path.splitext(file.filename)
    ext = ext.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{ext}'. Only MP4, AVI, and MOV files are allowed."
        )

    # 2. Check file size using a chunked reader (to avoid reading full file into memory)
    max_bytes = settings.max_upload_size_mb * 1024 * 1024
    
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
    uploads_dir = os.path.join(base_dir, "uploads")
    os.makedirs(uploads_dir, exist_ok=True)
    
    job_id = str(uuid.uuid4())
    save_filename = f"{job_id}{ext}"
    video_save_path = os.path.join(uploads_dir, save_filename)
    
    bytes_written = 0
    try:
        with open(video_save_path, "wb") as buffer:
            while chunk := await file.read(1024 * 1024):  # Read in 1MB chunks
                bytes_written += len(chunk)
                if bytes_written > max_bytes:
                    buffer.close()
                    # Delete partial file
                    if os.path.exists(video_save_path):
                        os.remove(video_save_path)
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=f"Video exceeds maximum allowed size of {settings.max_upload_size_mb}MB."
                    )
                buffer.write(chunk)
    except HTTPException as he:
        raise he
    except Exception as e:
        if os.path.exists(video_save_path):
            os.remove(video_save_path)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save video: {str(e)}"
        )

    # 3. Create database entry
    new_job = JobHistory(
        id=job_id,
        video_name=file.filename,
        video_path=video_save_path,
        status="PENDING",
        progress=0,
        progress_stage="Uploaded",
        created_at=datetime.utcnow()
    )
    
    db.add(new_job)
    db.commit()
    db.refresh(new_job)

    return new_job
