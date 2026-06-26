import os
import cv2
import numpy as np

class VideoService:
    @staticmethod
    def extract_frames(video_path: str, job_id: str, sampling_rate: int = 5) -> list[dict]:
        """
        Extracts frames from a video file at a given sampling rate.
        Saves each sampled frame to a directory named frames/{job_id}/.
        Returns a list of dictionaries with frame metadata: index, file path, timestamp.
        """
        # Create output directory for this job's frames
        base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
        frames_dir = os.path.join(base_dir, "frames", job_id)
        os.makedirs(frames_dir, exist_ok=True)

        if not os.path.exists(video_path):
            raise FileNotFoundError(f"Video file not found at: {video_path}")

        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError(f"Failed to open video file: {video_path}. It might be corrupted or in an unsupported format.")

        fps = cap.get(cv2.CAP_PROP_FPS)
        if fps <= 0:
            fps = 25.0  # Fallback FPS
            
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        
        extracted_metadata = []
        frame_idx = 0
        
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            
            # Sample frame according to the sampling rate
            if frame_idx % sampling_rate == 0:
                timestamp_ms = (frame_idx / fps) * 1000
                frame_filename = f"frame_{frame_idx}.jpg"
                frame_save_path = os.path.join(frames_dir, frame_filename)
                
                # Save frame image using OpenCV
                cv2.imwrite(frame_save_path, frame)
                
                extracted_metadata.append({
                    "frame_index": frame_idx,
                    "frame_path": frame_save_path,
                    "timestamp_ms": timestamp_ms,
                    "width": frame.shape[1],
                    "height": frame.shape[0]
                })
                
            frame_idx += 1
            
        cap.release()
        
        if not extracted_metadata:
            raise ValueError("No frames could be extracted from the video. The video file might be empty or corrupted.")
            
        return extracted_metadata
