from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException, status
from sqlalchemy.orm import Session
import json

from backend.app.database.session import get_db, SessionLocal
from backend.app.database.models import JobHistory
from backend.app.models.schemas import JobStatusResponse, AnalysisDetailResponse
from backend.app.services.analysis_service import AnalysisService
from backend.app.utils.config import load_settings

router = APIRouter(prefix="/api", tags=["analyze"])

@router.post("/analyze/{job_id}", response_model=JobStatusResponse)
async def start_analysis(job_id: str, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """
    Triggers the video analysis pipeline for the given job_id.
    Runs asynchronously in a background thread and updates progress stages.
    """
    job = db.query(JobHistory).filter(JobHistory.id == job_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found."
        )
        
    if job.status == "PROCESSING":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Analysis is already in progress for this video."
        )

    settings = load_settings()

    # Reset job metrics in case of retry
    job.status = "PROCESSING"
    job.progress = 0
    job.progress_stage = "Initiating"
    job.error_message = None
    db.commit()

    # Pass SessionLocal factory to background task so it can open its own DB sessions
    background_tasks.add_task(
        AnalysisService.analyze_video_task,
        job_id=job_id,
        db_session_factory=SessionLocal,
        sampling_rate=settings.sampling_rate,
        suspicious_threshold=settings.suspicious_threshold,
        face_min_size=settings.face_min_size
    )

    return job

@router.get("/status/{job_id}", response_model=AnalysisDetailResponse)
def get_job_status(job_id: str, db: Session = Depends(get_db)):
    """
    Returns the current status, progress, stage, and full analysis results of a job.
    """
    job = db.query(JobHistory).filter(JobHistory.id == job_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found."
        )

    # Convert JobHistory ORM model to AnalysisDetailResponse Pydantic schema
    response_data = {
        "id": job.id,
        "video_name": job.video_name,
        "status": job.status,
        "prediction": job.prediction,
        "confidence": job.confidence,
        "frames_analyzed": job.frames_analyzed,
        "suspicious_frames_count": job.suspicious_frames_count,
        "created_at": job.created_at,
        "error_message": job.error_message,
        "report_path": job.report_path,
        "results": None
    }

    if job.results_json:
        try:
            response_data["results"] = json.loads(job.results_json)
        except Exception as e:
            print(f"Error decoding results_json for job {job_id}: {e}")

    return response_data
