import os
import cv2
import json
import numpy as np
import torch
from sqlalchemy.orm import Session
from datetime import datetime

from backend.app.database.models import JobHistory
from backend.app.services.video_service import VideoService
from ai.inference import InferencePipeline
from backend.app.services.report_service import ReportService

class AnalysisService:
    @staticmethod
    def analyze_video_task(job_id: str, db_session_factory, sampling_rate: int = 5, suspicious_threshold: float = 0.5, face_min_size: int = 40):
        """
        Background task to perform the full video analysis pipeline.
        Writes status and progress to the database, extracts frames, runs deepfake inference,
        generates Grad-CAM visual explanations, and compiles the final report.
        """
        db = db_session_factory()
        job = db.query(JobHistory).filter(JobHistory.id == job_id).first()
        if not job:
            db.close()
            return

        try:
            # 1. Update status to extraction
            job.status = "PROCESSING"
            job.progress_stage = "Extracting Frames"
            job.progress = 10
            db.commit()

            video_path = job.video_path
            
            # Extract frames using OpenCV
            frames_meta = VideoService.extract_frames(video_path, job_id, sampling_rate)
            
            # 2. Update status to AI analysis
            job.progress_stage = "Running AI Inference"
            job.progress = 30
            db.commit()

            # Initialize PyTorch Inference Pipeline
            pipeline = InferencePipeline()
            
            # Track analysis metrics
            analyzed_frames = []
            total_frames = len(frames_meta)
            frames_with_faces_count = 0
            suspicious_frames_count = 0
            
            # Setup folders for heatmaps and faces
            base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
            heatmaps_dir = os.path.join(base_dir, "heatmaps", job_id)
            os.makedirs(heatmaps_dir, exist_ok=True)
            
            for idx, frame_info in enumerate(frames_meta):
                frame_idx = frame_info["frame_index"]
                frame_path = frame_info["frame_path"]
                
                # Load frame
                frame_img = cv2.imread(frame_path)
                if frame_img is None:
                    continue
                
                # Detect and analyze faces in frame
                face_results = pipeline.analyze_frame(
                    frame_img, 
                    run_gradcam_on_suspicious=True, 
                    suspicious_threshold=suspicious_threshold
                )
                
                frame_has_face = len(face_results) > 0
                if frame_has_face:
                    frames_with_faces_count += 1
                
                # Save visual outputs (crops and heatmaps)
                saved_faces = []
                frame_is_suspicious = False
                
                for face_idx, res in enumerate(face_results):
                    # Write crop image to job folder
                    crop_filename = f"face_{frame_idx}_{face_idx}.jpg"
                    crop_path = os.path.join(os.path.dirname(frame_path), crop_filename)
                    
                    # Extract bounding box from result
                    x, y, w, h = res["bbox"]
                    pad_h, pad_w = int(h * 0.1), int(w * 0.1)
                    y1 = max(0, y - pad_h)
                    y2 = min(frame_img.shape[0], y + h + pad_h)
                    x1 = max(0, x - pad_w)
                    x2 = min(frame_img.shape[1], x + w + pad_w)
                    face_crop = frame_img[y1:y2, x1:x2]
                    
                    if face_crop.size > 0:
                        cv2.imwrite(crop_path, face_crop)
                    
                    # Check if face is suspicious
                    is_suspicious = res["prob_fake"] >= suspicious_threshold
                    if is_suspicious:
                        frame_is_suspicious = True
                    
                    # GradCAM overlay save path
                    overlay_path = ""
                    heatmap_path = ""
                    explanation = "No anomalies detected."
                    
                    if res["heatmap"] is not None:
                        overlay_filename = f"overlay_{frame_idx}_{face_idx}.jpg"
                        heatmap_filename = f"heatmap_{frame_idx}_{face_idx}.jpg"
                        
                        overlay_path = os.path.join(heatmaps_dir, overlay_filename)
                        heatmap_path = os.path.join(heatmaps_dir, heatmap_filename)
                        
                        # Save overlay
                        cv2.imwrite(overlay_path, res["overlay"])
                        # Save raw heatmap (convert to BGR for writing)
                        heatmap_u8 = np.uint8(255 * res["heatmap"])
                        heatmap_color = cv2.applyColorMap(heatmap_u8, cv2.COLORMAP_JET)
                        cv2.imwrite(heatmap_path, heatmap_color)
                        
                        # Generate scientific explanation based on heatmap attention distribution
                        explanation = AnalysisService._explain_heatmap(res["heatmap"])
                    
                    # Store details of this face
                    saved_faces.append({
                        "face_index": face_idx,
                        "bbox": res["bbox"],
                        "prediction": res["prediction"],
                        "confidence": res["confidence"],
                        "prob_fake": res["prob_fake"],
                        "prob_real": res["prob_real"],
                        "face_crop_path": os.path.relpath(crop_path, base_dir),
                        "heatmap_path": os.path.relpath(heatmap_path, base_dir) if heatmap_path else "",
                        "overlay_path": os.path.relpath(overlay_path, base_dir) if overlay_path else "",
                        "explanation": explanation
                    })
                
                if frame_is_suspicious:
                    suspicious_frames_count += 1
                
                # Determine frame-level prediction
                if face_results:
                    # Frame score is max of fake probs
                    frame_fake_prob = max(f["prob_fake"] for f in face_results)
                    frame_prediction = "FAKE" if frame_fake_prob >= suspicious_threshold else "REAL"
                    frame_confidence = frame_fake_prob if frame_prediction == "FAKE" else (1.0 - frame_fake_prob)
                else:
                    frame_fake_prob = 0.0
                    frame_prediction = "REAL"
                    frame_confidence = 1.0

                analyzed_frames.append({
                    "frame_index": frame_idx,
                    "timestamp_ms": frame_info["timestamp_ms"],
                    "frame_path": os.path.relpath(frame_path, base_dir),
                    "has_faces": frame_has_face,
                    "prediction": frame_prediction,
                    "confidence": frame_confidence,
                    "prob_fake": frame_fake_prob,
                    "faces": saved_faces
                })
                
                # Increment progress between 30 and 75
                progress_step = int(30 + (idx / total_frames) * 45)
                job.progress = progress_step
                db.commit()

            # Verify that we found faces
            if frames_with_faces_count == 0:
                raise ValueError("No faces detected in any of the analyzed video frames. Deepfake classification requires a face to be visible.")

            # 3. Update status to heatmap processing
            job.progress_stage = "Generating Heatmaps"
            job.progress = 80
            db.commit()

            # 4. Aggregations
            # Average frame-level fake probability across frames with faces
            frames_with_faces = [f for f in analyzed_frames if f["has_faces"]]
            avg_fake_prob = np.mean([f["prob_fake"] for f in frames_with_faces])
            max_fake_prob = np.max([f["prob_fake"] for f in frames_with_faces])
            
            overall_prediction = "FAKE" if avg_fake_prob >= suspicious_threshold else "REAL"
            
            if overall_prediction == "FAKE":
                # Confidence in AI Generated verdict is the average of fake probability of all suspicious frames
                suspicious_scores = [f["prob_fake"] for f in frames_with_faces if f["prob_fake"] >= suspicious_threshold]
                overall_confidence = np.mean(suspicious_scores) if suspicious_scores else avg_fake_prob
            else:
                # Confidence in Not AI verdict is the average of authentic probability of all non-suspicious frames
                authentic_scores = [(1.0 - f["prob_fake"]) for f in frames_with_faces if f["prob_fake"] < suspicious_threshold]
                overall_confidence = np.mean(authentic_scores) if authentic_scores else (1.0 - avg_fake_prob)
            
            percentage_suspicious = (suspicious_frames_count / len(frames_with_faces)) * 100

            # Sort frames by fake probability to get the most suspicious ones
            suspicious_frames_sorted = sorted(
                [f for f in analyzed_frames if f["has_faces"]],
                key=lambda x: x["prob_fake"],
                reverse=True
            )[:10]

            analysis_results = {
                "overall_prediction": overall_prediction,
                "overall_confidence": float(overall_confidence),
                "avg_fake_probability": float(avg_fake_prob),
                "max_fake_probability": float(max_fake_prob),
                "percentage_suspicious_frames": float(percentage_suspicious),
                "total_frames_analyzed": len(analyzed_frames),
                "frames_with_faces_count": frames_with_faces_count,
                "suspicious_frames_count": suspicious_frames_count,
                "frames": analyzed_frames,
                "top_suspicious_frames": suspicious_frames_sorted
            }

            # 5. Generate PDF report
            job.progress_stage = "Creating Report"
            job.progress = 90
            db.commit()
            
            reports_dir = os.path.join(base_dir, "reports")
            os.makedirs(reports_dir, exist_ok=True)
            report_filename = f"report_{job_id}.pdf"
            report_path = os.path.join(reports_dir, report_filename)
            
            ReportService.generate_pdf_report(
                report_path=report_path,
                video_name=job.video_name,
                prediction=overall_prediction,
                confidence=overall_confidence,
                frames_analyzed=len(analyzed_frames),
                suspicious_frames_count=suspicious_frames_count,
                analysis_results=analysis_results,
                job_id=job_id
            )

            # 6. Complete Job
            job.status = "COMPLETED"
            job.progress_stage = "Completed"
            job.progress = 100
            job.prediction = overall_prediction
            job.confidence = float(overall_confidence)
            job.frames_analyzed = len(analyzed_frames)
            job.suspicious_frames_count = suspicious_frames_count
            job.results_json = json.dumps(analysis_results)
            job.report_path = os.path.relpath(report_path, base_dir)
            db.commit()

        except Exception as e:
            import traceback
            error_trace = traceback.format_exc()
            print(f"Job {job_id} failed with error:\n{error_trace}")
            job.status = "FAILED"
            job.progress_stage = "Error"
            job.error_message = str(e)
            db.commit()
        finally:
            # 7. Explicitly release memory resources (very important for shared CPU/GPU hosts)
            if 'pipeline' in locals():
                try:
                    del pipeline
                except Exception:
                    pass
            try:
                import torch
                if torch.cuda.is_available():
                    torch.cuda.empty_cache()
            except Exception:
                pass
            db.close()

    @staticmethod
    def _explain_heatmap(heatmap: np.ndarray) -> str:
        """
        Analyzes a Grad-CAM heatmap grid to provide explainable AI observations.
        Identifies regions of highest model attention dynamically (e.g. eyes, mouth, boundaries).
        """
        h, w = heatmap.shape
        # Create masks for facial coordinates (normalized 0-1)
        # We assume heatmap corresponds to a cropped face image
        
        # Eyes mask (approx top-middle region)
        eyes_mask = np.zeros_like(heatmap)
        eyes_mask[int(h*0.2):int(h*0.5), int(w*0.15):int(w*0.85)] = 1.0
        
        # Mouth mask (approx bottom-middle region)
        mouth_mask = np.zeros_like(heatmap)
        mouth_mask[int(h*0.6):int(h*0.85), int(w*0.25):int(w*0.75)] = 1.0
        
        # Boundary mask (outer border)
        boundary_mask = np.ones_like(heatmap)
        boundary_mask[int(h*0.15):int(h*0.85), int(w*0.15):int(w*0.85)] = 0.0
        
        # Calculate mean activation in each region
        eyes_act = np.mean(heatmap * eyes_mask)
        mouth_act = np.mean(heatmap * mouth_mask)
        boundary_act = np.mean(heatmap * boundary_mask)
        
        # Determine region with max activation
        activations = {
            "eyes": eyes_act,
            "mouth": mouth_act,
            "boundary": boundary_act
        }
        
        max_region = max(activations, key=activations.get)
        max_value = activations[max_region]
        
        # Generate forensic explanation based on the maximum attention region
        if max_value > 0.15:
            if max_region == "eyes":
                return "High attention around eyes. Model focused on inconsistencies in the orbital region (pupil asymmetry, eyelid boundaries, or unnatural reflection patterns)."
            elif max_region == "mouth":
                return "High attention around mouth. Model highlighted lip boundaries and teeth structures, suggesting issues with phoneme matching or expression blending."
            elif max_region == "boundary":
                return "Boundary inconsistency. Model attention was drawn to outer facial edges, suggesting splicing borders or face blending artifacts."
        
        # Fallback explanation
        return "Model attention concentrated in this region. Attention map indicates localized skin texture anomalies, artificial color blending, or high-frequency neural network artifacts."
