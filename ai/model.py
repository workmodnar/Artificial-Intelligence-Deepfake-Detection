import os
import urllib.request
import torch
import torch.nn as nn
from torchvision import models

MODEL_URL = "https://huggingface.co/Xicor9/efficientnet-b0-ffpp-c23/resolve/main/efficientnet_b0_ffpp_c23.pth"
DEFAULT_WEIGHTS_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "models", "efficientnet_b0_ffpp_c23.pth"))

class DeepfakeClassifier(nn.Module):
    """
    EfficientNet-B0 trained on FaceForensics++ (FF++) dataset for Deepfake detection.
    Outputs logit scores for 2 classes: 0 -> Real, 1 -> Fake.
    """
    def __init__(self):
        super(DeepfakeClassifier, self).__init__()
        # Load backbone without default ImageNet weights (we load custom deepfake weights)
        self.network = models.efficientnet_b0(weights=None)
        # Modify the head classifier to output binary classes
        in_features = self.network.classifier[1].in_features
        self.network.classifier[1] = nn.Linear(in_features, 2)

    def forward(self, x):
        return self.network(x)

def download_weights(dest_path=DEFAULT_WEIGHTS_PATH):
    """
    Downloads pretrained weights from Hugging Face if they don't already exist.
    """
    os.makedirs(os.path.dirname(dest_path), exist_ok=True)
    if not os.path.exists(dest_path):
        print(f"Downloading pretrained deepfake weights from {MODEL_URL}...")
        print(f"Saving to: {dest_path}")
        try:
            # Add user-agent header to avoid potential bot blocking
            req = urllib.request.Request(
                MODEL_URL, 
                headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
            )
            with urllib.request.urlopen(req) as response, open(dest_path, 'wb') as out_file:
                # Read in chunks to print progress
                total_size = int(response.info().get('Content-Length', 0))
                downloaded = 0
                chunk_size = 1024 * 1024  # 1MB chunks
                while True:
                    chunk = response.read(chunk_size)
                    if not chunk:
                        break
                    out_file.write(chunk)
                    downloaded += len(chunk)
                    if total_size > 0:
                        percent = (downloaded / total_size) * 100
                        print(f"Progress: {percent:.1f}% ({downloaded / (1024*1024):.1f}MB / {total_size / (1024*1024):.1f}MB)", end="\r")
            print("\nDownload complete.")
        except Exception as e:
            print(f"Error downloading weights: {e}")
            raise e
    else:
        print(f"Pretrained weights already exist at: {dest_path}")

def load_classifier(weights_path=None, device=None):
    """
    Loads the classifier and restores state from weight checkpoint.
    """
    if weights_path is None:
        weights_path = DEFAULT_WEIGHTS_PATH
        
    if device is None:
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    
    # Download weights if missing
    if not os.path.exists(weights_path):
        download_weights(weights_path)
        
    model = DeepfakeClassifier()
    state_dict = torch.load(weights_path, map_location=device)
    
    # Strip any potential DataParallel 'module.' prefix
    state_dict = {k.replace("module.", ""): v for k, v in state_dict.items()}
    
    # Prepend 'network.' if state dict keys are named directly (e.g. starting with 'features.')
    first_key = next(iter(state_dict.keys()))
    if not first_key.startswith("network."):
        state_dict = {f"network.{k}": v for k, v in state_dict.items()}
        
    model.load_state_dict(state_dict)
    model.to(device)
    model.eval()
    return model
