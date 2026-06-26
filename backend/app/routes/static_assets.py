import os
import re
from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from backend.app.database.session import get_db
from backend.app.database.models import JobHistory

router = APIRouter(prefix="/api", tags=["assets"])

# Regex to validate UUIDs and safe filenames
UUID_REGEX = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", re.IGNORECASE)
SAFE_FILENAME_REGEX = re.compile(r"^[a-zA-Z0-9_\-\.]+$")

def validate_job_and_file(frame_id: str) -> tuple[str, str]:
    """
    Parses frame_id of format {job_id}_{filename} and validates against path traversal.
    """
    if "_" not in frame_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid frame identifier format. Expected {job_id}_{filename}."
        )
        
    job_id, filename = frame_id.split("_", 1)
    
    # Security validation
    if not UUID_REGEX.match(job_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid job ID format.")
    if not SAFE_FILENAME_REGEX.match(filename) or ".." in filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid filename format.")
        
    return job_id, filename

@router.get("/frame/{frame_id}")
def get_frame(frame_id: str):
    """
    Serves a video frame or face crop image securely.
    frame_id is expected to be {job_id}_{filename} (e.g., jobid_frame_5.jpg or jobid_face_5_0.jpg)
    """
    job_id, filename = validate_job_and_file(frame_id)
    
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
    file_path = os.path.abspath(os.path.join(base_dir, "frames", job_id, filename))
    
    # Path traversal check
    allowed_parent = os.path.abspath(os.path.join(base_dir, "frames", job_id))
    if not file_path.startswith(allowed_parent):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    if not os.path.exists(file_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Frame not found.")

    return FileResponse(file_path, media_type="image/jpeg")

@router.get("/heatmap/{frame_id}")
def get_heatmap(frame_id: str):
    """
    Serves a Grad-CAM heatmap or overlay image securely.
    frame_id is expected to be {job_id}_{filename} (e.g., jobid_overlay_5_0.jpg or jobid_heatmap_5_0.jpg)
    """
    job_id, filename = validate_job_and_file(frame_id)
    
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
    file_path = os.path.abspath(os.path.join(base_dir, "heatmaps", job_id, filename))
    
    # Path traversal check
    allowed_parent = os.path.abspath(os.path.join(base_dir, "heatmaps", job_id))
    if not file_path.startswith(allowed_parent):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    if not os.path.exists(file_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Heatmap not found.")

    return FileResponse(file_path, media_type="image/jpeg")

@router.get("/report/{job_id}")
def get_report_pdf(job_id: str):
    """
    Serves the generated PDF report securely.
    """
    if not UUID_REGEX.match(job_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid job ID format.")
        
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
    file_path = os.path.abspath(os.path.join(base_dir, "reports", f"report_{job_id}.pdf"))
    
    # Path traversal check
    allowed_parent = os.path.abspath(os.path.join(base_dir, "reports"))
    if not file_path.startswith(allowed_parent):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    if not os.path.exists(file_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Forensic report not found.")

    return FileResponse(
        file_path, 
        media_type="application/pdf", 
        filename=f"TruthLens_AI_Forensic_Report_{job_id}.pdf"
    )

@router.get("/video/{job_id}")
def get_video(job_id: str, db: Session = Depends(get_db)):
    """
    Serves the raw uploaded video file for streaming/playback.
    """
    if not UUID_REGEX.match(job_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid job ID format.")
        
    job = db.query(JobHistory).filter(JobHistory.id == job_id).first()
    if not job or not job.video_path:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video not found in records.")
        
    if not os.path.exists(job.video_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video file not found on disk.")
        
    # Check parent folder boundary to prevent path traversal
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
    allowed_parent = os.path.abspath(os.path.join(base_dir, "uploads"))
    if not os.path.abspath(job.video_path).startswith(allowed_parent):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
        
    return FileResponse(job.video_path, media_type="video/mp4")

