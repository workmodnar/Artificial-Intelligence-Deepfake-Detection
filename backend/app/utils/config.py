import os
import json
from backend.app.models.schemas import SystemSettings

SETTINGS_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "settings.json"))

def load_settings() -> SystemSettings:
    """
    Loads system settings from settings.json or returns default settings if file doesn't exist.
    """
    if os.path.exists(SETTINGS_PATH):
        try:
            with open(SETTINGS_PATH, "r") as f:
                data = json.load(f)
                return SystemSettings(**data)
        except Exception as e:
            print(f"Error reading settings.json: {e}. Falling back to default settings.")
            return SystemSettings()
    else:
        # Create default file
        settings = SystemSettings()
        save_settings(settings)
        return settings

def save_settings(settings: SystemSettings) -> None:
    """
    Saves system settings to settings.json.
    """
    try:
        with open(SETTINGS_PATH, "w") as f:
            json.dump(settings.model_dump(), f, indent=4)
    except Exception as e:
        print(f"Error saving settings.json: {e}")
