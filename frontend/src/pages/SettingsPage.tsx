import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, Save, RotateCcw, ShieldAlert, Sliders, Info, CheckCircle } from 'lucide-react';
import { api } from '../services/api';
import { SystemSettings } from '../types';

const DEFAULT_SETTINGS: SystemSettings = {
  sampling_rate: 5,
  suspicious_threshold: 0.5,
  face_min_size: 40,
  max_upload_size_mb: 100,
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const data = await api.getSettings();
        setSettings(data);
      } catch (err) {
        console.error('Failed to load settings:', err);
        setErrorMsg('Failed to read system configurations from server.');
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSliderChange = (key: keyof SystemSettings, value: number) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    try {
      setErrorMsg('');
      setSaveSuccess(false);
      await api.updateSettings(settings);
      setSaveSuccess(true);
      // Fade out success indicator after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save settings:', err);
      setErrorMsg('Failed to write configurations to server.');
    }
  };

  const handleRestoreDefaults = () => {
    setSettings(DEFAULT_SETTINGS);
    setSaveSuccess(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-10 h-10 rounded-full border-4 border-slate-800 border-t-brand-primary animate-spin" />
        <p className="text-sm text-slate-500 font-medium">Reading configuration logs...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto py-4">
      {/* Title */}
      <div className="space-y-1 border-b border-slate-800/40 pb-5">
        <h2 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
          <Settings className="w-8 h-8 text-brand-primary" />
          Settings Panel
        </h2>
        <p className="text-sm text-slate-500">
          Modify the frame sampling rates, face isolation limits, and deepfake verification thresholds.
        </p>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-brand-danger/10 border border-brand-danger/20 text-brand-danger text-sm">
          <ShieldAlert className="w-5 h-5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Settings Cards */}
      <div className="space-y-6">
        
        {/* Sampling Settings */}
        <div className="glass-panel p-6 rounded-3xl space-y-6">
          <h3 className="font-bold text-base flex items-center gap-2">
            <Sliders className="w-5 h-5 text-indigo-400" />
            Video Frame Sampling
          </h3>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <span className="text-sm font-semibold text-slate-200">Sampling Rate</span>
                <p className="text-xs text-slate-500 max-w-md">
                  Examine one frame every <b>{settings.sampling_rate}</b> frames. Higher values analyze videos faster but reduce temporal precision.
                </p>
              </div>
              <div className="w-16 text-right">
                <span className="font-mono text-base font-bold text-indigo-300 bg-indigo-500/10 px-3 py-1 rounded-lg border border-indigo-500/20">
                  {settings.sampling_rate}x
                </span>
              </div>
            </div>
            
            <input
              type="range"
              min="1"
              max="60"
              value={settings.sampling_rate}
              onChange={(e) => handleSliderChange('sampling_rate', parseInt(e.target.value))}
              className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-brand-primary"
            />
          </div>
        </div>

        {/* AI Threshold Settings */}
        <div className="glass-panel p-6 rounded-3xl space-y-6">
          <h3 className="font-bold text-base flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-indigo-400" />
            Classifier Thresholds
          </h3>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <span className="text-sm font-semibold text-slate-200">Suspicious Cutoff</span>
                <p className="text-xs text-slate-500 max-w-md">
                  Scores above this threshold trigger the <b>FAKE</b> label and generate Grad-CAM heatmaps.
                </p>
              </div>
              <div className="w-16 text-right">
                <span className="font-mono text-base font-bold text-indigo-300 bg-indigo-500/10 px-2 py-1 rounded-lg border border-indigo-500/20">
                  {settings.suspicious_threshold.toFixed(2)}
                </span>
              </div>
            </div>
            
            <input
              type="range"
              min="0.1"
              max="0.9"
              step="0.05"
              value={settings.suspicious_threshold}
              onChange={(e) => handleSliderChange('suspicious_threshold', parseFloat(e.target.value))}
              className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-brand-primary"
            />
          </div>
        </div>

        {/* Face Bounding Box Settings */}
        <div className="glass-panel p-6 rounded-3xl space-y-6">
          <h3 className="font-bold text-base flex items-center gap-2">
            <Info className="w-5 h-5 text-indigo-400" />
            Face Extraction Boundaries
          </h3>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <span className="text-sm font-semibold text-slate-200">Minimum Bounding Box Dimension</span>
                <p className="text-xs text-slate-500 max-w-md">
                  Filters out small or blurry faces. Bounding boxes smaller than <b>{settings.face_min_size}px</b> will be skipped.
                </p>
              </div>
              <div className="w-16 text-right">
                <span className="font-mono text-base font-bold text-indigo-300 bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20">
                  {settings.face_min_size}px
                </span>
              </div>
            </div>
            
            <input
              type="range"
              min="20"
              max="200"
              step="10"
              value={settings.face_min_size}
              onChange={(e) => handleSliderChange('face_min_size', parseInt(e.target.value))}
              className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-brand-primary"
            />
          </div>
        </div>

      </div>

      {/* Button Controls */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-800/40">
        <button
          onClick={handleRestoreDefaults}
          className="inline-flex items-center gap-2 py-3 px-6 rounded-xl border border-slate-800/40 hover:bg-slate-800/20 text-slate-400 hover:text-slate-200 transition-all duration-200"
        >
          <RotateCcw className="w-4 h-4" />
          Restore Default Parameters
        </button>

        <div className="flex items-center gap-4">
          {saveSuccess && (
            <motion.span 
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-brand-success text-sm font-semibold flex items-center gap-1.5"
            >
              <CheckCircle className="w-4 h-4" />
              Configurations Saved
            </motion.span>
          )}
          
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-2 py-3 px-6 rounded-xl bg-brand-primary hover:bg-indigo-500 text-white font-bold transition-all duration-200 shadow-md shadow-brand-primary/10"
          >
            <Save className="w-4 h-4" />
            Apply Settings
          </button>
        </div>
      </div>
    </div>
  );
}
