import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { 
  Eye, 
  UploadCloud, 
  History, 
  Settings as SettingsIcon, 
  Sun, 
  Moon, 
  ShieldAlert, 
  FileText, 
  Home
} from 'lucide-react';

// Import Pages
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import AnalysisPage from './pages/AnalysisPage';
import ReportPage from './pages/ReportPage';
import HistoryPage from './pages/HistoryPage';
import SettingsPage from './pages/SettingsPage';

function AppContent() {
  const location = useLocation();
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('truthlens-theme');
    return (saved as 'dark' | 'light') || 'dark';
  });

  useEffect(() => {
    localStorage.setItem('truthlens-theme', theme);
    if (theme === 'light') {
      document.body.classList.add('light');
      document.body.classList.remove('bg-slate-950', 'text-slate-100');
      document.body.classList.add('bg-slate-50', 'text-slate-900');
    } else {
      document.body.classList.remove('light');
      document.body.classList.remove('bg-slate-50', 'text-slate-900');
      document.body.classList.add('bg-slate-950', 'text-slate-100');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen flex bg-grid-pattern transition-colors duration-300">
      {/* Sidebar Navigation */}
      <aside className="w-64 glass-panel border-r border-slate-800/40 hidden md:flex flex-col sticky top-0 h-screen z-20">
        <div className="p-6 flex items-center gap-3 border-b border-slate-800/40">
          <div className="w-10 h-10 rounded-xl bg-brand-primary flex items-center justify-center shadow-lg shadow-brand-primary/30">
            <Eye className="w-6 h-6 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              TruthLens AI
            </h1>
            <p className="text-[10px] text-slate-500 font-medium tracking-wide">DEEPFAKE ANALYSIS</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <Link
            to="/"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
              isActive('/') 
                ? 'bg-brand-primary text-white font-medium shadow-md shadow-brand-primary/20' 
                : 'text-slate-400 hover:bg-slate-800/20 hover:text-slate-200'
            }`}
          >
            <Home className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" />
            Home
          </Link>
          <Link
            to="/dashboard"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
              isActive('/dashboard') 
                ? 'bg-brand-primary text-white font-medium shadow-md shadow-brand-primary/20' 
                : 'text-slate-400 hover:bg-slate-800/20 hover:text-slate-200'
            }`}
          >
            <UploadCloud className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" />
            Upload & Analyze
          </Link>
          <Link
            to="/history"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
              isActive('/history') 
                ? 'bg-brand-primary text-white font-medium shadow-md shadow-brand-primary/20' 
                : 'text-slate-400 hover:bg-slate-800/20 hover:text-slate-200'
            }`}
          >
            <History className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" />
            Analysis History
          </Link>
          <Link
            to="/settings"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
              isActive('/settings') 
                ? 'bg-brand-primary text-white font-medium shadow-md shadow-brand-primary/20' 
                : 'text-slate-400 hover:bg-slate-800/20 hover:text-slate-200'
            }`}
          >
            <SettingsIcon className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" />
            Settings
          </Link>
        </nav>

        <div className="p-4 border-t border-slate-800/40 flex items-center justify-between text-xs text-slate-500">
          <span>v1.0.0 (Production)</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-brand-success animate-ping"></span>
            <span>API Online</span>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header Bar */}
        <header className="h-16 border-b border-slate-800/40 glass-panel flex items-center justify-between px-6 md:px-8 z-10 sticky top-0">
          <div className="flex items-center md:hidden gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-primary flex items-center justify-center">
              <Eye className="w-5 h-5 text-white" />
            </div>
            <h1 className="font-bold text-sm tracking-tight bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              TruthLens AI
            </h1>
          </div>
          
          {/* Page Indicator (Optional placeholder) */}
          <div className="hidden md:flex items-center gap-2 text-sm text-slate-400">
            <ShieldAlert className="w-4 h-4 text-brand-accent" />
            <span>Forensic Video Auditing Dashboard</span>
          </div>

          <div className="flex items-center gap-4">
            {/* Quick Navigation Links for Mobile */}
            <div className="flex md:hidden items-center gap-2">
              <Link to="/" className="p-2 text-slate-400 hover:text-slate-200"><Home className="w-5 h-5" /></Link>
              <Link to="/dashboard" className="p-2 text-slate-400 hover:text-slate-200"><UploadCloud className="w-5 h-5" /></Link>
              <Link to="/history" className="p-2 text-slate-400 hover:text-slate-200"><History className="w-5 h-5" /></Link>
            </div>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl border border-slate-800/40 glass-panel hover:bg-slate-800/30 transition-all duration-200 text-slate-400 hover:text-brand-accent"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 p-6 md:p-8 max-w-[1400px] w-full mx-auto">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/analysis/:jobId" element={<AnalysisPage />} />
            <Route path="/report/:jobId" element={<ReportPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
