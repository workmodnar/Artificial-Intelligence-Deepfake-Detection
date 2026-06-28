import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar
} from 'recharts';
import { 
  Play, Pause, FileText, ChevronRight, Eye, ShieldAlert,
  ArrowLeft, Info, HelpCircle, Activity, LayoutGrid, Maximize2
} from 'lucide-react';
import { api } from '../services/api';
import { Job, FrameDetail, FaceDetail } from '../types';

export default function AnalysisPage() {
  const { jobId } = useParams<{ jobId: string }>();
  
  // State
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Interactive Video Player & Timeline states
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [selectedFrame, setSelectedFrame] = useState<FrameDetail | null>(null);
  const [activeFace, setActiveFace] = useState<FaceDetail | null>(null);
  const [activeTab, setActiveTab] = useState<'timeline' | 'charts' | 'gallery'>('timeline');

  // Load Job details
  useEffect(() => {
    const fetchJob = async () => {
      if (!jobId) return;
      try {
        setLoading(true);
        const data = await api.getJobStatus(jobId);
        setJob(data);
        if (data.results && data.results.frames.length > 0) {
          // Select first frame as default detail
          setSelectedFrame(data.results.frames[0]);
          if (data.results.frames[0].faces.length > 0) {
            setActiveFace(data.results.frames[0].faces[0]);
          }
        }
      } catch (err: any) {
        console.error(err);
        setError('Failed to load analysis details. Make sure the Job ID is valid.');
      } finally {
        setLoading(false);
      }
    };
    fetchJob();
  }, [jobId]);

  // Video playback controls
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration);
  };

  const jumpToFrame = (frame: FrameDetail) => {
    if (!videoRef.current) return;
    const timeInSeconds = frame.timestamp_ms / 1000.0;
    videoRef.current.currentTime = timeInSeconds;
    setCurrentTime(timeInSeconds);
    setSelectedFrame(frame);
    if (frame.faces.length > 0) {
      setActiveFace(frame.faces[0]);
    } else {
      setActiveFace(null);
    }
  };

  // Recharts Data Prep
  const getTimelineChartData = () => {
    if (!job?.results?.frames) return [];
    return job.results.frames.map(f => ({
      name: `F#${f.frame_index}`,
      time: (f.timestamp_ms / 1000).toFixed(1),
      probability: f.prob_fake,
      confidence: f.confidence
    }));
  };

  const getDistributionChartData = () => {
    if (!job?.results?.frames) return [];
    const bins = Array(10).fill(0);
    job.results.frames.forEach(f => {
      if (f.has_faces) {
        const binIndex = Math.min(Math.floor(f.prob_fake * 10), 9);
        bins[binIndex]++;
      }
    });
    return bins.map((count, index) => ({
      range: `${(index * 10)}%-${((index + 1) * 10)}%`,
      count
    }));
  };

  // Timeline dot styling based on fake probability
  const getTimelineDotColor = (probFake: number) => {
    if (probFake >= 0.75) return 'bg-brand-danger border-brand-danger/35'; // Highly Suspicious
    if (probFake >= 0.5) return 'bg-brand-warning border-brand-warning/35'; // Suspicious
    return 'bg-brand-success border-brand-success/35'; // Real
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-brand-primary" />
        <p className="text-sm text-slate-500 font-medium">Decoding audit trail...</p>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="glass-panel p-8 rounded-3xl text-center space-y-4 max-w-md mx-auto">
        <ShieldAlert className="w-12 h-12 text-brand-danger mx-auto" />
        <h3 className="text-lg font-bold">Analysis Audit Error</h3>
        <p className="text-sm text-slate-400">{error || 'Job data unavailable.'}</p>
        <Link to="/dashboard" className="inline-block py-2 px-4 bg-slate-800 rounded-xl text-slate-200">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Breadcrumb Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/history"
            className="p-2 rounded-xl border border-slate-800/40 glass-panel hover:bg-slate-800/30 text-slate-400 hover:text-slate-200"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight">{job.video_name}</h2>
            <p className="text-xs text-slate-500 font-mono">Job ID: {job.id}</p>
          </div>
        </div>

        <Link
          to={`/report/${job.id}`}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-primary hover:bg-indigo-500 text-white font-semibold text-sm shadow-md transition-all duration-200"
        >
          <FileText className="w-4 h-4" />
          Export Forensic PDF
        </Link>
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Columns: Video Player + Timeline Options */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Video Player Card */}
          <div className="glass-panel rounded-3xl overflow-hidden shadow-glass relative group border border-slate-800/20">
            <video
              ref={videoRef}
              src={`/api/video/${job.id}`}
              className="w-full aspect-video bg-black"
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onClick={togglePlay}
            />
            {/* Play/Pause hover overlay */}
            <div 
              className="absolute inset-0 flex items-center justify-center bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer pointer-events-none"
            >
              <button className="w-14 h-14 rounded-full bg-brand-primary flex items-center justify-center text-white shadow-lg pointer-events-auto">
                {isPlaying ? <Pause className="w-6 h-6 fill-white" /> : <Play className="w-6 h-6 fill-white translate-x-0.5" />}
              </button>
            </div>
            
            {/* Player custom status bar */}
            <div className="p-4 bg-slate-950/80 border-t border-slate-850 flex items-center justify-between text-xs text-slate-400 font-mono">
              <button 
                onClick={togglePlay}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
              <span>
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>
          </div>

          {/* Navigation Workspace tabs */}
          <div className="flex border-b border-slate-855 gap-6">
            {(['timeline', 'charts', 'gallery'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-3 px-1 font-bold text-sm tracking-wide capitalize border-b-2 -mb-0.5 transition-all duration-200 ${
                  activeTab === tab 
                    ? 'border-brand-primary text-slate-200' 
                    : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab Workspaces */}
          <div className="min-h-[280px]">
            {activeTab === 'timeline' && (
              <div className="glass-panel p-6 rounded-3xl space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-base">Ingested Timeline Sampling</h3>
                  <span className="text-xs text-slate-500">Click a node to jump playback</span>
                </div>
                {/* Horizontal Timeline Track */}
                <div className="relative pt-6 pb-2 overflow-x-auto">
                  <div className="flex items-center min-w-max px-2 gap-4">
                    {job.results?.frames.map((frame) => (
                      <button
                        key={frame.frame_index}
                        onClick={() => jumpToFrame(frame)}
                        className={`flex flex-col items-center gap-2 group p-2 rounded-xl transition-all duration-200 hover:bg-slate-800/30 ${
                          selectedFrame?.frame_index === frame.frame_index ? 'bg-slate-800/40 ring-1 ring-brand-primary/40' : ''
                        }`}
                      >
                        <span className="text-[10px] text-slate-500 font-mono">F#{frame.frame_index}</span>
                        <div 
                          className={`w-3.5 h-3.5 rounded-full border-4 shadow-sm transition-transform duration-200 group-hover:scale-125 ${getTimelineDotColor(frame.prob_fake)}`}
                        />
                        <span className="text-[10px] text-slate-400 font-mono">{(frame.timestamp_ms / 1000).toFixed(1)}s</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'charts' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Chart 1: Line Chart */}
                <div className="glass-panel p-5 rounded-3xl space-y-3">
                  <h3 className="font-bold text-sm text-slate-300">Confidence Trend Timeline</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={getTimelineChartData()} margin={{ top: 10, right: 25, left: -15, bottom: 15 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                        <XAxis 
                          dataKey="time" 
                          stroke="#64748b" 
                          fontSize={10} 
                          tickLine={false}
                          label={{ value: 'Time (s)', position: 'insideBottomRight', offset: -10, fill: '#64748b', fontSize: 10 }} 
                        />
                        <YAxis 
                          stroke="#64748b" 
                          fontSize={10} 
                          tickLine={false}
                          domain={[0, 1]} 
                          tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                        />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px' }} />
                        <Line type="monotone" dataKey="probability" name="AI Probability" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Chart 2: Histogram */}
                <div className="glass-panel p-5 rounded-3xl space-y-3">
                  <h3 className="font-bold text-sm text-slate-300">Anomaly Score Distribution</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={getDistributionChartData()} margin={{ top: 10, right: 15, left: -15, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                        <XAxis dataKey="range" stroke="#64748b" fontSize={9} tickLine={false} />
                        <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px' }} />
                        <Bar dataKey="count" name="Frame Count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'gallery' && (
              <div className="glass-panel p-6 rounded-3xl space-y-4">
                <h3 className="font-bold text-base">Key Suspicious Frames</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {job.results?.top_suspicious_frames.map((frame) => (
                    <div 
                      key={frame.frame_index}
                      onClick={() => jumpToFrame(frame)}
                      className="group cursor-pointer rounded-2xl overflow-hidden border border-slate-800 hover:border-brand-primary bg-slate-900/50 p-2 space-y-2 transition-all duration-300"
                    >
                      <img 
                        src={api.getFrameUrl(frame.frame_path)} 
                        alt={`Frame ${frame.frame_index}`}
                        className="w-full aspect-video object-cover rounded-xl group-hover:scale-[1.02] transition-transform duration-300"
                      />
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="font-bold text-slate-300">F#{frame.frame_index}</span>
                        <span className="text-brand-danger font-semibold">{(frame.prob_fake * 100).toFixed(0)}% AI</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Right 1 Column: Decision summary card & Explanations */}
        <div className="space-y-6">
          
          {/* Decision Aggregation Card */}
          <div className="glass-panel p-6 rounded-3xl space-y-6">
            <h3 className="font-bold text-lg border-b border-slate-800/40 pb-3 flex items-center gap-2">
              <Activity className="w-5 h-5 text-brand-accent animate-pulse" />
              Forensic Verdict
            </h3>

            <div className="text-center py-4 space-y-3">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">Calculated Integrity</span>
              <div className="flex flex-col items-center justify-center">
                <span 
                  className={`text-4xl md:text-5xl font-black tracking-wider ${
                    job.prediction === 'FAKE' ? 'text-brand-danger neon-glow-danger' : 'text-brand-success neon-glow-success'
                  }`}
                >
                  {job.prediction === 'REAL' ? 'Not AI' : 'AI Generated'}
                </span>
                <span className="text-sm font-semibold text-slate-400 mt-2">
                  {(job.confidence ? job.confidence * 100 : 0).toFixed(1)}% Confidence
                </span>
              </div>
            </div>

            <div className="space-y-3 text-xs border-t border-slate-800/40 pt-4">
              <div className="flex justify-between">
                <span className="text-slate-500">Average AI Probability</span>
                <span className="font-bold text-slate-300">{(job.results?.avg_fake_probability ? job.results.avg_fake_probability * 100 : 0).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Maximum Single-Frame AI Score</span>
                <span className="font-bold text-slate-300">{(job.results?.max_fake_probability ? job.results.max_fake_probability * 100 : 0).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Ingested Suspicious Frames Ratio</span>
                <span className="font-bold text-slate-300">{(job.results?.percentage_suspicious_frames || 0).toFixed(1)}%</span>
              </div>
            </div>
          </div>

          {/* Explainable AI overlay module */}
          <div className="glass-panel p-6 rounded-3xl space-y-6">
            <h3 className="font-bold text-base flex items-center justify-between border-b border-slate-800/40 pb-3">
              <span>Explainable AI Maps</span>
              {selectedFrame && (
                <span className="text-xs font-mono text-slate-500">F#{selectedFrame.frame_index}</span>
              )}
            </h3>

            {selectedFrame && selectedFrame.faces.length > 0 ? (
              <div className="space-y-6">
                
                {/* Face selectors (for multi face frames) */}
                {selectedFrame.faces.length > 1 && (
                  <div className="flex gap-2 border border-slate-850 p-1.5 rounded-xl">
                    {selectedFrame.faces.map((face, index) => (
                      <button
                        key={index}
                        onClick={() => setActiveFace(face)}
                        className={`flex-1 py-1 px-3 text-xs font-bold rounded-lg transition-all ${
                          activeFace?.face_index === face.face_index 
                            ? 'bg-brand-primary text-white' 
                            : 'text-slate-400 hover:bg-slate-800/30'
                        }`}
                      >
                        Face {index + 1}
                      </button>
                    ))}
                  </div>
                )}

                {activeFace && (
                  <div className="space-y-6">
                    {/* Visual Comparison: BGR face crop vs overlay */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Facial Extract</span>
                        <div className="aspect-square rounded-2xl border border-slate-800 overflow-hidden bg-black flex items-center justify-center">
                          <img 
                            src={api.getFrameUrl(activeFace.face_crop_path)} 
                            alt="Face crop" 
                            className="w-full h-full object-cover" 
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Grad-CAM Overlay</span>
                        <div className="aspect-square rounded-2xl border border-slate-800 overflow-hidden bg-black flex items-center justify-center">
                          {activeFace.overlay_path ? (
                            <img 
                              src={api.getHeatmapUrl(activeFace.overlay_path)} 
                              alt="CAM overlay" 
                              className="w-full h-full object-cover" 
                            />
                          ) : (
                            <div className="text-center p-3 text-[10px] text-slate-500">
                              No overlay: below threshold
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Scientific observations */}
                    <div className="p-4 rounded-2xl bg-slate-900/30 border border-slate-800/40 space-y-2">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
                        <Info className="w-3.5 h-3.5" /> Model Signature
                      </span>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {activeFace.explanation}
                      </p>
                    </div>
                  </div>
                )}

              </div>
            ) : (
              <div className="text-center py-12 text-slate-500 text-xs">
                {selectedFrame?.has_faces === false 
                  ? "No faces detected in this sampled frame."
                  : "Jump to a timeline node containing faces to display explainability maps."
                }
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}

// Helpers
function Loader2(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function formatTime(seconds: number) {
  if (isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}
