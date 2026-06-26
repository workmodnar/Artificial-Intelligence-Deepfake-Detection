import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, FileVideo, AlertCircle, CheckCircle, BarChart2, ArrowRight } from 'lucide-react';
import { api } from '../services/api';
import { Job } from '../types';

export default function Dashboard() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State Management
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [jobState, setJobState] = useState<'idle' | 'uploading' | 'processing' | 'completed' | 'failed'>('idle');
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('');
  const [jobId, setJobId] = useState<string | null>(null);
  const [completedJob, setCompletedJob] = useState<Job | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Polling reference
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    const ext = selectedFile.name.split('.').pop()?.toLowerCase();
    if (ext !== 'mp4' && ext !== 'avi' && ext !== 'mov') {
      setErrorMsg('Unsupported file format. Please upload an MP4, AVI, or MOV video.');
      setJobState('failed');
      return;
    }
    
    setFile(selectedFile);
    setErrorMsg('');
    setJobState('idle');
    setProgress(0);
    setCompletedJob(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const startVideoAnalysis = async () => {
    if (!file) return;

    try {
      setJobState('uploading');
      setProgress(0);
      setStage('Uploading file...');
      setErrorMsg('');

      // 1. Upload Video
      const job = await api.uploadVideo(file, (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        // Upload caps at 100% in progress bar but stays in 'uploading' stage
        setProgress(Math.min(percentCompleted, 99));
      });

      setJobId(job.id);
      setJobState('processing');
      setProgress(0);
      setStage('Initiating analysis...');

      // 2. Trigger analysis API
      await api.startAnalysis(job.id);

      // 3. Poll Status
      pollJobStatus(job.id);

    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.detail || 'Failed to complete uploading/processing file.');
      setJobState('failed');
    }
  };

  const pollJobStatus = (id: string) => {
    pollingRef.current = setInterval(async () => {
      try {
        const jobStatus = await api.getJobStatus(id);
        
        setProgress(jobStatus.progress);
        setStage(jobStatus.progress_stage);

        if (jobStatus.status === 'COMPLETED') {
          if (pollingRef.current) clearInterval(pollingRef.current);
          setCompletedJob(jobStatus);
          setJobState('completed');
        } else if (jobStatus.status === 'FAILED') {
          if (pollingRef.current) clearInterval(pollingRef.current);
          setErrorMsg(jobStatus.error_message || 'Video analysis failed.');
          setJobState('failed');
        }
      } catch (err) {
        console.error('Polling error:', err);
        // Do not fail immediately on a minor polling connection hitch
      }
    }, 1500);
  };

  const getStageColor = (currentStage?: string) => {
    if (!currentStage) return 'text-indigo-400';
    if (currentStage.includes('Extract')) return 'text-amber-400';
    if (currentStage.includes('AI')) return 'text-indigo-400';
    if (currentStage.includes('Heatmap')) return 'text-violet-400';
    if (currentStage.includes('Report')) return 'text-pink-400';
    return 'text-indigo-400';
  };

  return (
    <div className="space-y-10 max-w-4xl mx-auto py-4">
      <div className="space-y-2">
        <h2 className="text-3xl font-extrabold tracking-tight">Upload Forensic Target</h2>
        <p className="text-sm text-slate-500">
          Analyze frames using pretrained Deepfake Detection classifiers and generate explainable Grad-CAM heatmaps.
        </p>
      </div>

      <AnimatePresence mode="wait">
        {jobState === 'idle' && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {/* Drag & Drop Card */}
            <div
              className={`relative border-2 border-dashed rounded-3xl p-12 text-center transition-all duration-300 ${
                dragActive 
                  ? 'border-brand-primary bg-brand-primary/5 shadow-glass-sm' 
                  : 'border-slate-800/80 bg-slate-900/10 hover:border-slate-700/80'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".mp4,.avi,.mov"
                onChange={handleFileInputChange}
              />
              
              <div className="space-y-6 max-w-md mx-auto">
                <div className="w-16 h-16 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary mx-auto shadow-md">
                  <UploadCloud className="w-8 h-8" />
                </div>
                
                {file ? (
                  <div className="space-y-2">
                    <p className="text-base font-bold text-slate-200 flex items-center justify-center gap-2">
                      <FileVideo className="w-5 h-5 text-indigo-400" />
                      {file.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      Size: {(file.size / (1024 * 1024)).toFixed(2)} MB • Ready for ingestion
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-base font-semibold text-slate-300">
                      Drag & Drop your video or{' '}
                      <button 
                        onClick={handleUploadClick}
                        className="text-brand-primary font-bold hover:underline bg-transparent border-0 cursor-pointer p-0"
                      >
                        browse local files
                      </button>
                    </p>
                    <p className="text-xs text-slate-500">
                      Supports high-resolution MP4, AVI, and MOV video files (Max 100MB)
                    </p>
                  </div>
                )}

                {file && (
                  <button
                    onClick={startVideoAnalysis}
                    className="w-full py-3 px-6 rounded-xl bg-brand-primary hover:bg-indigo-500 text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-brand-primary/20 hover:shadow-brand-primary/30 transition-all duration-200"
                  >
                    Analyze Target Video
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {(jobState === 'uploading' || jobState === 'processing') && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="glass-panel p-8 rounded-3xl space-y-6 text-center shadow-glass"
          >
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mx-auto shadow-inner">
              <svg className="w-8 h-8 animate-spin text-brand-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>

            <div className="space-y-2 max-w-sm mx-auto">
              <h3 className="font-bold text-lg text-slate-200">
                {jobState === 'uploading' ? 'Ingesting Video Target' : 'Executing Forensics Engine'}
              </h3>
              <p className="text-xs text-slate-400">
                Job ID: <span className="font-mono">{jobId || 'Allocating...'}</span>
              </p>
            </div>

            {/* Progress Area */}
            <div className="space-y-3 max-w-md mx-auto">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className={`transition-all duration-300 ${getStageColor(stage)}`}>
                  {stage}
                </span>
                <span className="text-slate-400">{progress}%</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 progress-bar-striped transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </motion.div>
        )}

        {jobState === 'completed' && completedJob && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="glass-panel p-8 rounded-3xl space-y-8 shadow-glass"
          >
            <div className="flex flex-col md:flex-row items-center gap-6 pb-6 border-b border-slate-800/40">
              <div className="w-16 h-16 rounded-2xl bg-brand-success/10 border border-brand-success/20 flex items-center justify-center text-brand-success shadow-inner">
                <CheckCircle className="w-8 h-8" />
              </div>
              <div className="space-y-1 text-center md:text-left flex-1">
                <h3 className="font-bold text-xl text-slate-200">Forensic Analysis Complete</h3>
                <p className="text-xs text-slate-500">
                  Target: <span className="font-semibold text-slate-400">{completedJob.video_name}</span>
                </p>
              </div>
            </div>

            {/* Aggregated Results summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-5 rounded-2xl bg-slate-900/30 border border-slate-800/40 text-center">
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Class Verdict</p>
                <span 
                  className={`text-2xl font-black ${
                    completedJob.prediction === 'FAKE' ? 'text-brand-danger neon-glow-danger' : 'text-brand-success neon-glow-success'
                  }`}
                >
                  {completedJob.prediction === 'REAL' ? 'REAL (Not AI)' : 'FAKE'}
                </span>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900/30 border border-slate-800/40 text-center">
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Confidence Score</p>
                <span className="text-2xl font-black text-slate-200">
                  {completedJob.confidence ? (completedJob.confidence * 100).toFixed(1) : 0}%
                </span>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900/30 border border-slate-800/40 text-center">
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Suspicious Frames</p>
                <span className="text-2xl font-black text-slate-200">
                  {completedJob.suspicious_frames_count} / {completedJob.frames_analyzed}
                </span>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => navigate(`/analysis/${completedJob.id}`)}
                className="flex-1 py-3 px-6 rounded-xl bg-brand-primary hover:bg-indigo-500 text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-brand-primary/20 transition-all duration-200"
              >
                <BarChart2 className="w-5 h-5" />
                View Detailed Timeline Workspace
              </button>
              
              <button
                onClick={() => {
                  setJobState('idle');
                  setFile(null);
                }}
                className="py-3 px-6 rounded-xl border border-slate-800/40 hover:bg-slate-800/20 text-slate-300 font-semibold transition-all duration-200"
              >
                Analyze Another Video
              </button>
            </div>
          </motion.div>
        )}

        {jobState === 'failed' && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="glass-panel p-8 rounded-3xl space-y-6 text-center shadow-glass"
          >
            <div className="w-16 h-16 rounded-2xl bg-brand-danger/10 border border-brand-danger/20 flex items-center justify-center text-brand-danger mx-auto shadow-inner animate-bounce">
              <AlertCircle className="w-8 h-8" />
            </div>

            <div className="space-y-2 max-w-md mx-auto">
              <h3 className="font-bold text-lg text-slate-200">Pipeline Execution Error</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                {errorMsg}
              </p>
            </div>

            <button
              onClick={() => {
                setJobState('idle');
                setFile(null);
              }}
              className="py-2.5 px-6 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold shadow-md transition-all duration-200"
            >
              Reset and Try Again
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
