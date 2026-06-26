from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, DateTime, Text
from backend.app.database.session import Base

class JobHistory(Base):
    """
    SQLAlchemy model representing a video analysis job.
    Tracks background tasks and records historic deepfake detection results.
    """
    __tablename__ = "job_history"

    id = Column(String, primary_key=True, index=True)
    video_name = Column(String, nullable=False)
    video_path = Column(String, nullable=False)
    status = Column(String, nullable=False, default="PENDING")  # PENDING, PROCESSING, COMPLETED, FAILED
    progress = Column(Integer, nullable=False, default=0)       # Progress percentage (0 to 100)
    progress_stage = Column(String, nullable=False, default="Created") # Uploading, Extracting, AI Analysis, etc.
    prediction = Column(String, nullable=True)                  # REAL or FAKE
    confidence = Column(Float, nullable=True)                   # Video-level confidence score
    frames_analyzed = Column(Integer, nullable=False, default=0)
    suspicious_frames_count = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    results_json = Column(Text, nullable=True)                  # Detailed frame analysis JSON dump
    error_message = Column(Text, nullable=True)                 # Error message if task failed
    report_path = Column(String, nullable=True)                 # Path to generated PDF report
