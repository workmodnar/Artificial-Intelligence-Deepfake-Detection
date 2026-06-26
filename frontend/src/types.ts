export interface BBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface FaceDetail {
  face_index: number;
  bbox: [number, number, number, number]; // [x, y, w, h]
  prediction: 'REAL' | 'FAKE';
  confidence: number;
  prob_fake: number;
  prob_real: number;
  face_crop_path: string;
  heatmap_path: string;
  overlay_path: string;
  explanation: string;
}

export interface FrameDetail {
  frame_index: number;
  timestamp_ms: number;
  frame_path: string;
  has_faces: boolean;
  prediction: 'REAL' | 'FAKE';
  confidence: number;
  prob_fake: number;
  faces: FaceDetail[];
}

export interface AnalysisResults {
  overall_prediction: 'REAL' | 'FAKE';
  overall_confidence: number;
  avg_fake_probability: number;
  max_fake_probability: number;
  percentage_suspicious_frames: number;
  total_frames_analyzed: number;
  frames_with_faces_count: number;
  suspicious_frames_count: number;
  frames: FrameDetail[];
  top_suspicious_frames: FrameDetail[];
}

export interface Job {
  id: string;
  video_name: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  progress: number;
  progress_stage: string;
  prediction?: 'REAL' | 'FAKE';
  confidence?: number;
  frames_analyzed?: number;
  suspicious_frames_count?: number;
  created_at: string;
  results?: AnalysisResults;
  error_message?: string;
  report_path?: string;
}

export interface SystemSettings {
  sampling_rate: number;
  suspicious_threshold: number;
  face_min_size: number;
  max_upload_size_mb: number;
}
