import os
import sys
import subprocess
import time
import signal

# Color print utilities
def print_success(msg):
    print(f"\033[92m[✓] {msg}\033[0m")

def print_info(msg):
    print(f"\033[94m[*] {msg}\033[0m")

def print_error(msg):
    print(f"\033[91m[✗] {msg}\033[0m")

BANNER = """
======================================================================
  ████████╗██████╗ ██╗   ██╗████████╗██╗  ██╗██╗     ███████╗███╗   ██╗███████╗
  ╚══██╔══╝██╔══██╗██║   ██║╚══██╔══╝██║  ██║██║     ██╔════╝████╗  ██║██╔════╝
     ██║   ██████╔╝██║   ██║   ██║   ███████║██║     █████╗  ██╔██╗ ██║███████╗
     ██║   ██╔══██╗██║   ██║   ██║   ██╔══██║██║     ██╔══╝  ██║╚██╗██║╚════██║
     ██║   ██║  ██║╚██████╔╝   ██║   ██║  ██║███████╗███████╗██║ ╚████║███████║
     ╚═╝   ╚═╝  ╚═╝ ╚═════╝    ╚═╝   ╚═╝  ╚═╝╚══════╝╚══════╝╚═╝  ╚═══╝╚══════╝
                     EXPLAINABLE DEEPFAKE VIDEO FORENSICS
======================================================================
"""

def main():
    print(BANNER)
    
    base_dir = os.path.abspath(os.path.dirname(__file__))
    
    # 1. Verify standard folders
    print_info("Verifying workspace storage directories...")
    folders = ["uploads", "frames", "heatmaps", "reports", "models"]
    for folder in folders:
        path = os.path.join(base_dir, folder)
        os.makedirs(path, exist_ok=True)
    print_success("Storage folders verified.")

    # 2. Check and Download PyTorch model weights
    print_info("Verifying deepfake detection model weights...")
    weights_path = os.path.join(base_dir, "models", "efficientnet_b0_ffpp_c23.pth")
    if not os.path.exists(weights_path):
        # We can download weights using our model downloader
        sys.path.append(base_dir)
        try:
            from ai.model import download_weights
            download_weights(weights_path)
            print_success("Model weights loaded successfully.")
        except Exception as e:
            print_error(f"Failed to load or download model weights: {e}")
            print_info("We will attempt to download them again during runtime.")
    else:
        print_success("Model weights already cached locally.")

    # 3. Verify Frontend Node Packages
    frontend_dir = os.path.join(base_dir, "frontend")
    node_modules_dir = os.path.join(frontend_dir, "node_modules")
    
    if not os.path.exists(node_modules_dir):
        print_info("Frontend dependencies missing. Running 'npm install'...")
        try:
            subprocess.run("npm install", cwd=frontend_dir, shell=True, check=True)
            print_success("Frontend packages installed successfully.")
        except subprocess.CalledProcessError as e:
            print_error(f"Failed to install frontend dependencies: {e}")
            print_info("Ensure Node.js and npm are installed on your path.")
            sys.exit(1)
    else:
        print_success("Frontend packages verified.")

    # 4. Spawning Backend Server (Port 8000)
    print_info("Spawning FastAPI backend server...")
    # Add root dir to PYTHONPATH so backend can resolve absolute imports
    env = os.environ.copy()
    env["PYTHONPATH"] = base_dir + os.pathsep + env.get("PYTHONPATH", "")
    
    backend_proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "backend.app.main:app", "--host", "127.0.0.1", "--port", "8000"],
        cwd=base_dir,
        env=env
    )

    # 5. Spawning Frontend Dev Server (Port 5173)
    print_info("Spawning Vite React development server...")
    frontend_proc = subprocess.Popen(
        "npm run dev",
        cwd=frontend_dir,
        shell=True
    )

    print_success("TruthLens AI started successfully!")
    print("----------------------------------------------------------------------")
    print("  Backend API:   http://127.0.0.1:8000/")
    print("  Frontend App:  http://127.0.0.1:5173/")
    print("----------------------------------------------------------------------")
    print("Press Ctrl+C to terminate both servers.")

    try:
        # Keep runner script alive and monitor subprocesses
        while True:
            time.sleep(1)
            # Check if either process failed
            if backend_proc.poll() is not None:
                print_error("FastAPI backend server terminated unexpectedly.")
                break
            if frontend_proc.poll() is not None:
                print_error("Vite React development server terminated unexpectedly.")
                break
    except KeyboardInterrupt:
        print("\n" + "[*] Shutting down TruthLens AI servers...")
    finally:
        # Graceful cleanup
        try:
            backend_proc.terminate()
            backend_proc.wait(timeout=3)
        except Exception:
            pass
            
        try:
            # On Windows, npm run dev spawns child shells. Kill process group if possible.
            if sys.platform == "win32":
                subprocess.run(f"taskkill /F /T /PID {frontend_proc.pid}", shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            else:
                frontend_proc.terminate()
                frontend_proc.wait(timeout=3)
        except Exception:
            pass
            
        print_success("All servers stopped. Goodbye.")

if __name__ == "__main__":
    main()
