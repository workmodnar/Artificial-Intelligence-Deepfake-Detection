import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Search, Trash2, Eye, FileText, Download, 
  Database, HelpCircle, AlertTriangle, ArrowDownToLine 
} from 'lucide-react';
import { api } from '../services/api';
import { Job } from '../types';

export default function HistoryPage() {
  const navigate = useNavigate();
  const [history, setHistory] = useState<Job[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const fetchHistory = async (searchQuery?: string) => {
    try {
      setLoading(true);
      const data = await api.getHistory(searchQuery);
      setHistory(data);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory(search);
  }, [search]);

  const handleDelete = async (jobId: string) => {
    try {
      await api.deleteJob(jobId);
      setHistory(prev => prev.filter(item => item.id !== jobId));
      setDeleteConfirmId(null);
    } catch (err) {
      console.error('Failed to delete job:', err);
      alert('Error deleting job from database.');
    }
  };

  return (
    <div className="space-y-6 py-4">
      {/* Page Title */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <h2 className="text-3xl font-extrabold tracking-tight">Audit Trail Database</h2>
          <p className="text-sm text-slate-500">
            Audit logs, historic verdicts, and forensic details for previously analyzed video files.
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-3">
          <a
            href={api.getExportJsonUrl()}
            download
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-800/40 glass-panel hover:bg-slate-800/30 text-xs font-bold text-slate-300 transition-all duration-200"
          >
            <ArrowDownToLine className="w-3.5 h-3.5 text-indigo-400" />
            Export JSON
          </a>
          <a
            href={api.getExportCsvUrl()}
            download
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-800/40 glass-panel hover:bg-slate-800/30 text-xs font-bold text-slate-300 transition-all duration-200"
          >
            <ArrowDownToLine className="w-3.5 h-3.5 text-indigo-400" />
            Export CSV
          </a>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
        <input
          type="text"
          placeholder="Search by video filename..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-800/40 glass-panel bg-slate-900/10 focus:outline-none focus:border-brand-primary text-sm transition-all duration-200"
        />
      </div>

      {/* History Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3">
          <div className="w-8 h-8 rounded-full border-4 border-slate-800 border-t-brand-primary animate-spin" />
          <span className="text-xs text-slate-500">Querying database...</span>
        </div>
      ) : history.length === 0 ? (
        <div className="glass-panel rounded-3xl p-16 text-center max-w-md mx-auto space-y-4">
          <Database className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-lg font-bold text-slate-300">No Audits Found</h3>
          <p className="text-sm text-slate-500">
            {search ? 'No video name matches your search query.' : 'Upload videos in the dashboard to populate history logs.'}
          </p>
          {!search && (
            <Link to="/dashboard" className="inline-block py-2.5 px-5 bg-brand-primary hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-md">
              Go to Analyzer
            </Link>
          )}
        </div>
      ) : (
        <div className="glass-panel rounded-3xl overflow-hidden shadow-glass border border-slate-800/20">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm text-slate-300">
              <thead className="bg-slate-900/45 border-b border-slate-800/40 text-xs text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Video Source</th>
                  <th className="px-6 py-4">Analyzed Date</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Verdict</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {history.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-900/10 transition-colors duration-200">
                    <td className="px-6 py-4">
                      <div className="space-y-0.5">
                        <span className="font-semibold text-slate-200 block truncate max-w-xs">{job.video_name}</span>
                        <span className="text-[10px] text-slate-500 font-mono block truncate max-w-xs">{job.id}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400 whitespace-nowrap">
                      {new Date(job.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                        job.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        job.status === 'FAILED' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                        job.status === 'PROCESSING' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse' :
                        'bg-slate-800 text-slate-400'
                      }`}>
                        {job.status === 'PROCESSING' && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />}
                        {job.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {job.status === 'COMPLETED' ? (
                        <span className={`font-bold ${job.prediction === 'FAKE' ? 'text-brand-danger' : 'text-brand-success'}`}>
                          {job.prediction === 'REAL' ? 'Not AI' : 'AI Generated'} ({job.confidence ? (job.confidence * 100).toFixed(0) : 0}%)
                        </span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2.5">
                        {job.status === 'COMPLETED' && (
                          <>
                            <button
                              onClick={() => navigate(`/analysis/${job.id}`)}
                              className="p-2 rounded-lg border border-slate-800/40 glass-panel text-slate-400 hover:text-brand-accent hover:border-brand-accent/30 transition-all duration-200"
                              title="Open Analysis workspace"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <a
                              href={api.getReportUrl(job.id)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 rounded-lg border border-slate-800/40 glass-panel text-slate-400 hover:text-brand-success hover:border-brand-success/30 transition-all duration-200"
                              title="Download PDF Report"
                            >
                              <FileText className="w-4 h-4" />
                            </a>
                          </>
                        )}
                        
                        {/* Delete button */}
                        {deleteConfirmId === job.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(job.id)}
                              className="px-2.5 py-1 text-xs font-bold rounded-lg bg-brand-danger text-white hover:bg-red-500 transition-colors"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="px-2 py-1 text-xs rounded-lg bg-slate-800 text-slate-400 hover:text-slate-200"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirmId(job.id)}
                            className="p-2 rounded-lg border border-slate-800/40 glass-panel text-slate-400 hover:text-brand-danger hover:border-brand-danger/30 transition-all duration-200"
                            title="Delete audit trail"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
