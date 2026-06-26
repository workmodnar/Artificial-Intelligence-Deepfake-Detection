from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class JobStatusResponse(BaseModel):
    id: str
    video_name: str
    status: str
    progress: int
    progress_stage: str
    prediction: Optional[str] = None
    confidence: Optional[float] = None
    error_message: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class JobHistoryResponse(BaseModel):
    id: str
    video_name: str
    status: str
    prediction: Optional[str] = None
    confidence: Optional[float] = None
    frames_analyzed: int
    suspicious_frames_count: int
    created_at: datetime
    error_message: Optional[str] = None

    class Config:
        from_attributes = True

class SystemSettings(BaseModel):
    sampling_rate: int = Field(default=5, ge=1, le=60, description="Process 1 frame every X frames")
    suspicious_threshold: float = Field(default=0.5, ge=0.0, le=1.0, description="Deepfake score threshold to flag frame as suspicious")
    face_min_size: int = Field(default=40, ge=10, le=200, description="Minimum face size in pixels for OpenCV cascade")
    max_upload_size_mb: int = Field(default=100, ge=1, le=1000, description="Maximum video upload size in Megabytes")

class AnalysisDetailResponse(BaseModel):
    id: str
    video_name: str
    status: str
    prediction: Optional[str] = None
    confidence: Optional[float] = None
    frames_analyzed: int
    suspicious_frames_count: int
    created_at: datetime
    results: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    report_path: Optional[str] = None

    class Config:
        from_attributes = True
