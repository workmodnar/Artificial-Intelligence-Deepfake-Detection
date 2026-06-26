import os
import cv2
import numpy as np
import torch
import torchvision.transforms as T
from PIL import Image

from ai.model import load_classifier
from ai.gradcam import GradCAM, overlay_heatmap

# Standard ImageNet normalization for torchvision models
TRANSFORM = T.Compose([
    T.ToPILImage(),
    T.Resize((224, 224)),
    T.ToTensor(),
    T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])

class InferencePipeline:
    def __init__(self, weights_path=None, device=None):
        self.device = device or torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model = load_classifier(weights_path=weights_path, device=self.device)
        
        # Load Haar cascade classifier for face detection
        cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        self.face_cascade = cv2.CascadeClassifier(cascade_path)
        if self.face_cascade.empty():
            raise RuntimeError("Failed to load OpenCV face cascade classifier xml.")

    def detect_faces(self, frame_bgr: np.ndarray) -> list[tuple[int, int, int, int]]:
        """
        Detects all face bounding boxes in a BGR image.
        Returns list of (x, y, w, h).
        """
        gray = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2GRAY)
        # Parameters optimized for detection accuracy vs speed
        faces = self.face_cascade.detectMultiScale(
            gray, 
            scaleFactor=1.15, 
            minNeighbors=5, 
            minSize=(40, 40)
        )
        return [tuple(f) for f in faces]

    def preprocess_face(self, face_bgr: np.ndarray) -> torch.Tensor:
        """
        Preprocesses a BGR face crop into a PyTorch tensor ready for model input.
        """
        # Convert BGR to RGB
        face_rgb = cv2.cvtColor(face_bgr, cv2.COLOR_BGR2RGB)
        # Apply standard transformations
        tensor = TRANSFORM(face_rgb)
        # Add batch dimension [1, 3, 224, 224]
        tensor = tensor.unsqueeze(0).to(self.device)
        return tensor

    def analyze_face(self, face_bgr: np.ndarray, run_gradcam: bool = False) -> dict:
        """
        Analyzes a single BGR face crop.
        Returns prediction details and optional Grad-CAM visual overlays.
        """
        tensor = self.preprocess_face(face_bgr)
        
        if run_gradcam:
            # We want to examine the gradients for class 1 (Fake)
            target_layer = self.model.network.features[-1]
            grad_cam = GradCAM(self.model, target_layer)
            
            try:
                heatmap, logits = grad_cam.generate_heatmap(tensor, class_idx=1)
                grad_cam.remove_hooks()
            except Exception as e:
                grad_cam.remove_hooks()
                print(f"GradCAM failed: {e}")
                heatmap = np.zeros((7, 7), dtype=np.float32)
                # Re-run model normally
                with torch.no_grad():
                    logits = self.model(tensor)
        else:
            with torch.no_grad():
                logits = self.model(tensor)
            heatmap = None

        # Softmax to get probabilities
        probabilities = torch.softmax(logits, dim=1)[0]
        prob_real = probabilities[0].item()
        prob_fake = probabilities[1].item()
        
        # Determine prediction label
        label = "FAKE" if prob_fake >= 0.5 else "REAL"
        confidence = prob_fake if label == "FAKE" else prob_real

        result = {
            "prediction": label,
            "confidence": float(confidence),
            "prob_real": float(prob_real),
            "prob_fake": float(prob_fake),
        }

        if heatmap is not None:
            # Create composite images
            # original_img: BGR face crop
            # heatmap: normalized 2D grid
            overlay = overlay_heatmap(heatmap, face_bgr, alpha=0.5)
            result["heatmap"] = heatmap
            result["overlay"] = overlay

        return result

    def analyze_frame(self, frame_bgr: np.ndarray, run_gradcam_on_suspicious: bool = True, suspicious_threshold: float = 0.5) -> list[dict]:
        """
        Processes a full video frame. Detects all faces, analyzes each face,
        and generates Grad-CAM overlays if a face is suspicious (prob_fake >= threshold).
        """
        faces = self.detect_faces(frame_bgr)
        face_results = []

        for idx, (x, y, w, h) in enumerate(faces):
            # Expand crop boundary slightly to get context (10% padding)
            pad_h = int(h * 0.1)
            pad_w = int(w * 0.1)
            
            img_h, img_w = frame_bgr.shape[:2]
            y1 = max(0, y - pad_h)
            y2 = min(img_h, y + h + pad_h)
            x1 = max(0, x - pad_w)
            x2 = min(img_w, x + w + pad_w)
            
            face_crop = frame_bgr[y1:y2, x1:x2]
            if face_crop.size == 0:
                continue

            # First, check model prediction without Grad-CAM for speed
            temp_res = self.analyze_face(face_crop, run_gradcam=False)
            
            # If suspicious or requested, run Grad-CAM
            if run_gradcam_on_suspicious and temp_res["prob_fake"] >= suspicious_threshold:
                analysis = self.analyze_face(face_crop, run_gradcam=True)
            else:
                analysis = temp_res
                analysis["heatmap"] = None
                analysis["overlay"] = None

            analysis["bbox"] = [int(x), int(y), int(w), int(h)]
            analysis["face_index"] = idx
            face_results.append(analysis)

        return face_results
