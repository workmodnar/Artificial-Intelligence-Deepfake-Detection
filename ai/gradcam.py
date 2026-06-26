import cv2
import numpy as np
import torch
import torch.nn as nn

class GradCAM:
    """
    Custom Grad-CAM implementation using PyTorch hooks.
    Designed for convolutional architectures such as EfficientNet.
    """
    def __init__(self, model: nn.Module, target_layer: nn.Module):
        self.model = model
        self.target_layer = target_layer
        self.activations = None
        self.gradients = None
        
        # Hooks
        self.forward_hook = self.target_layer.register_forward_hook(self._save_activation)
        # Use register_full_backward_hook for PyTorch 1.8+ compatibility
        if hasattr(self.target_layer, "register_full_backward_hook"):
            self.backward_hook = self.target_layer.register_full_backward_hook(self._save_gradient)
        else:
            self.backward_hook = self.target_layer.register_backward_hook(self._save_gradient)

    def _save_activation(self, module, input, output):
        # output shape: [batch_size, channels, height, width]
        self.activations = output

    def _save_gradient(self, module, grad_input, grad_output):
        # grad_output[0] is the gradient of the loss w.r.t the output of this layer
        self.gradients = grad_output[0]

    def generate_heatmap(self, input_tensor: torch.Tensor, class_idx: int = 1) -> tuple[np.ndarray, torch.Tensor]:
        """
        Generates raw 2D Grad-CAM heatmap for the given input_tensor and class_idx.
        Default class_idx is 1 (Fake).
        """
        self.model.eval()
        
        # Forward pass
        logits = self.model(input_tensor)
        
        # Clear gradients
        self.model.zero_grad()
        
        # Backward pass for the target class (e.g., Fake class)
        target_score = logits[0, class_idx]
        target_score.backward(retain_graph=True)
        
        if self.gradients is None or self.activations is None:
            # Fallback if hook was not triggered
            # Return blank heatmap
            return np.zeros((7, 7), dtype=np.float32), logits
            
        gradients = self.gradients.detach().cpu().numpy()[0]
        activations = self.activations.detach().cpu().numpy()[0]
        
        # Global average pooling of gradients
        weights = np.mean(gradients, axis=(1, 2))
        
        # Weighted sum of activations
        cam = np.zeros(activations.shape[1:], dtype=np.float32)
        for i, w in enumerate(weights):
            cam += w * activations[i]
            
        # Apply ReLU (only keep positive influences)
        cam = np.maximum(cam, 0)
        
        # Normalize between 0 and 1
        if cam.max() > 0:
            cam = cam / cam.max()
            
        return cam, logits

    def remove_hooks(self):
        """
        Removes the registered hooks to avoid memory leaks.
        """
        self.forward_hook.remove()
        self.backward_hook.remove()

def overlay_heatmap(heatmap: np.ndarray, original_img: np.ndarray, alpha: float = 0.5) -> np.ndarray:
    """
    Overlays a heat map on the original BGR image.
    heatmap: 2D float array in [0, 1]
    original_img: 3D uint8 BGR image
    """
    # Resize heatmap to match original image size
    heatmap_resized = cv2.resize(heatmap, (original_img.shape[1], original_img.shape[0]))
    
    # Scale to 0-255
    heatmap_u8 = np.uint8(255 * heatmap_resized)
    
    # Apply JET color map
    heatmap_color = cv2.applyColorMap(heatmap_u8, cv2.COLORMAP_JET)
    
    # Blend images
    overlay = cv2.addWeighted(heatmap_color, alpha, original_img, 1.0 - alpha, 0)
    return overlay
