import csv
import io
import os
import shutil
import json
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional

from backend.app.database.session import get_db
from backend.app.database.models import JobHistory
from backend.app.models.schemas import JobHistoryResponse, SystemSettings
from backend.app.utils.config import load_settings, save_settings

router = APIRouter(prefix="/api", tags=["history"])

@router.get("/history", response_model=List[JobHistoryResponse])
def get_history(search: Optional[str] = None, db: Session = Depends(get_db)):
    """
    Retrieves the list of all video analysis jobs, sorted by creation date.
    Supports optional case-insensitive query parameter to filter by video name.
    """
    query = db.query(JobHistory)
    if search:
        query = query.filter(JobHistory.video_name.ilike(f"%{search}%"))
    
    # Sort newest first
    jobs = query.order_by(JobHistory.created_at.desc()).all()
    return jobs

@router.delete("/history/{job_id}")
def delete_history_item(job_id: str, db: Session = Depends(get_db)):
    """
    Deletes an analysis job from the database and removes all related files
    (videos, frames, Grad-CAM overlays, and PDF reports) from disk.
    """
    job = db.query(JobHistory).filter(JobHistory.id == job_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found."
        )

    # Extract paths to local variables before deleting/committing DB record
    # (otherwise job attributes expire and raise ObjectDeletedError)
    video_path = job.video_path
    report_path = job.report_path

    # 1. Delete DB record
    db.delete(job)
    db.commit()

    # 2. Safely delete associated files
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
    
    # Delete uploaded video
    if video_path and os.path.exists(video_path):
        try:
            os.remove(video_path)
        except Exception as e:
            print(f"Error deleting video file {video_path}: {e}")
            
    # Delete frames directory
    frames_dir = os.path.join(base_dir, "frames", job_id)
    if os.path.exists(frames_dir):
        try:
            shutil.rmtree(frames_dir)
        except Exception as e:
            print(f"Error deleting frames folder {frames_dir}: {e}")

    # Delete heatmaps directory
    heatmaps_dir = os.path.join(base_dir, "heatmaps", job_id)
    if os.path.exists(heatmaps_dir):
        try:
            shutil.rmtree(heatmaps_dir)
        except Exception as e:
            print(f"Error deleting heatmaps folder {heatmaps_dir}: {e}")

    # Delete PDF report
    if report_path:
        report_abs_path = os.path.join(base_dir, report_path)
        if os.path.exists(report_abs_path):
            try:
                os.remove(report_abs_path)
            except Exception as e:
                print(f"Error deleting report file {report_abs_path}: {e}")

    return {"detail": "Job history and associated assets deleted successfully."}

@router.get("/history/export/json")
def export_json(db: Session = Depends(get_db)):
    """
    Exports the complete database history as a JSON file.
    """
    jobs = db.query(JobHistory).order_by(JobHistory.created_at.desc()).all()
    
    export_data = []
    for job in jobs:
        results = None
        if job.results_json:
            try:
                results = json.loads(job.results_json)
            except Exception:
                pass
                
        export_data.append({
            "job_id": job.id,
            "video_name": job.video_name,
            "status": job.status,
            "prediction": job.prediction,
            "confidence": job.confidence,
            "frames_analyzed": job.frames_analyzed,
            "suspicious_frames_count": job.suspicious_frames_count,
            "created_at": job.created_at.isoformat(),
            "error_message": job.error_message,
            "detailed_results": results
        })

    json_str = json.dumps(export_data, indent=4)
    
    # Return as streamable file
    return StreamingResponse(
        io.StringIO(json_str),
        media_type="application/json",
        headers={"Content-Disposition": "attachment; filename=truthlens_history_export.json"}
    )

@router.get("/history/export/csv")
def export_csv(db: Session = Depends(get_db)):
    """
    Exports the summary table of the database history as a CSV file.
    """
    jobs = db.query(JobHistory).order_by(JobHistory.created_at.desc()).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write Headers
    writer.writerow([
        "Job ID", "Video Name", "Status", "Verdict", "Confidence", 
        "Frames Sampled", "Suspicious Frames", "Created At", "Error Message"
    ])
    
    for job in jobs:
        writer.writerow([
            job.id,
            job.video_name,
            job.status,
            job.prediction or "N/A",
            f"{job.confidence * 100:.2f}%" if job.confidence else "N/A",
            job.frames_analyzed,
            job.suspicious_frames_count,
            job.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            job.error_message or ""
        ])
        
    output.seek(0)
    
    return StreamingResponse(
        output,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=truthlens_history_export.csv"}
    )

@router.get("/settings", response_model=SystemSettings)
def get_settings():
    """
    Retrieves the current configurations.
    """
    return load_settings()

@router.post("/settings", response_model=SystemSettings)
def update_settings(new_settings: SystemSettings):
    """
    Updates and saves the configuration settings.
    """
    save_settings(new_settings)
    return new_settings
