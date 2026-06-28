import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  FileText, Download, ArrowLeft, ShieldCheck, 
  Calendar, Film, Fingerprint, BarChart
} from 'lucide-react';
import { api } from '../services/api';
import { Job } from '../types';

export default function ReportPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchJob = async () => {
      if (!jobId) return;
      try {
        setLoading(true);
        const data = await api.getJobStatus(jobId);
        setJob(data);
      } catch (err: any) {
        console.error(err);
        setError('Failed to load report. Ensure the Job ID is valid.');
      } finally {
        setLoading(false);
      }
    };
    fetchJob();
  }, [jobId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-10 h-10 rounded-full border-4 border-slate-800 border-t-brand-primary animate-spin" />
        <p className="text-sm text-slate-500 font-medium">Generating Report Audit...</p>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="glass-panel p-8 rounded-3xl text-center space-y-4 max-w-md mx-auto">
        <ShieldCheck className="w-12 h-12 text-brand-danger mx-auto" />
        <h3 className="text-lg font-bold">Report Inaccessible</h3>
        <p className="text-sm text-slate-400">{error || 'Job not found.'}</p>
        <Link to="/history" className="inline-block py-2 px-4 bg-slate-800 rounded-xl text-slate-200">
          Back to History
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto py-4">
      {/* Header and buttons */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to={`/analysis/${job.id}`}
            className="p-2 rounded-xl border border-slate-800/40 glass-panel hover:bg-slate-800/30 text-slate-400 hover:text-slate-200"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Forensic Log</h2>
            <p className="text-xs text-slate-500">Examine details and download legal-grade PDF.</p>
          </div>
        </div>

        <a
          href={api.getReportUrl(job.id)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/10 hover:shadow-emerald-600/25 active:scale-98 transition-all duration-200"
        >
          <Download className="w-4 h-4" />
          Download Forensic PDF
        </a>
      </div>

      {/* Main summary view */}
      <div className="glass-panel p-8 rounded-3xl space-y-8">
        
        {/* Certificate title block */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-800/40 pb-8">
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-brand-primary uppercase tracking-widest">TruthLens AI Integrity Log</span>
            <h3 className="text-xl font-bold text-slate-200">Certificate of Media Authentication</h3>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
              <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {new Date(job.created_at).toLocaleString()}</span>
              <span className="flex items-center gap-1"><Film className="w-3.5 h-3.5" /> {job.video_name}</span>
            </div>
          </div>
          
          <div className={`py-3 px-6 rounded-2xl border text-center ${
            job.prediction === 'FAKE' 
              ? 'bg-brand-danger/10 border-brand-danger/20 text-brand-danger shadow-inner' 
              : 'bg-brand-success/10 border-brand-success/20 text-brand-success shadow-inner'
          }`}>
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">VERDICT</span>
            <span className="text-2xl font-black">{job.prediction === 'REAL' ? 'Not AI' : 'AI Generated'}</span>
          </div>
        </div>

        {/* Detailed audit stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wide flex items-center gap-2">
              <Fingerprint className="w-4 h-4 text-brand-accent" /> Ingestion Audit Details
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between text-sm py-2 border-b border-slate-900/60">
                <span className="text-slate-500">File Ingestion Name:</span>
                <span className="font-semibold text-slate-300">{job.video_name}</span>
              </div>
              <div className="flex justify-between text-sm py-2 border-b border-slate-900/60">
                <span className="text-slate-500">Transaction ID:</span>
                <span className="font-mono text-xs text-indigo-300">{job.id}</span>
              </div>
              <div className="flex justify-between text-sm py-2 border-b border-slate-900/60">
                <span className="text-slate-500">Sampling Rate:</span>
                <span className="font-semibold text-slate-300">1 frame / {job.results?.total_frames_analyzed ? Math.round(job.results.total_frames_analyzed / job.frames_analyzed) : 5} frames</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wide flex items-center gap-2">
              <BarChart className="w-4 h-4 text-brand-accent" /> Classifier Metric Logs
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between text-sm py-2 border-b border-slate-900/60">
                <span className="text-slate-500">Prediction Verdict:</span>
                <span className={`font-bold ${job.prediction === 'FAKE' ? 'text-brand-danger' : 'text-brand-success'}`}>
                  {job.prediction === 'REAL' ? 'Not AI' : 'AI Generated'} ({job.confidence ? (job.confidence * 100).toFixed(1) : 0}%)
                </span>
              </div>
              <div className="flex justify-between text-sm py-2 border-b border-slate-900/60">
                <span className="text-slate-500">Analyzed Frame Count:</span>
                <span className="font-semibold text-slate-300">{job.frames_analyzed} frames</span>
              </div>
              <div className="flex justify-between text-sm py-2 border-b border-slate-900/60">
                <span className="text-slate-500">Suspicious Frame Outliers:</span>
                <span className="font-semibold text-slate-300">{job.suspicious_frames_count} frames</span>
              </div>
            </div>
          </div>

        </div>

        {/* Suspicious Frames Preview section */}
        {job.results && job.results.top_suspicious_frames.length > 0 && (
          <div className="space-y-4 pt-6 border-t border-slate-800/40">
            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wide">
              Top Detected Anomaly Frames
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {job.results.top_suspicious_frames.slice(0, 4).map((frame) => {
                const face = frame.faces[0];
                if (!face) return null;
                return (
                  <div key={frame.frame_index} className="flex gap-4 p-4 rounded-2xl bg-slate-900/20 border border-slate-800/40">
                    <img 
                      src={api.getFrameUrl(face.face_crop_path)} 
                      alt={`Face crop F#${frame.frame_index}`} 
                      className="w-16 h-16 rounded-xl object-cover border border-slate-800"
                    />
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-bold text-slate-300">Frame #{frame.frame_index}</span>
                        <span className="text-brand-danger font-semibold">{(frame.prob_fake * 100).toFixed(1)}% AI</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-normal line-clamp-2">
                        {face.explanation}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
