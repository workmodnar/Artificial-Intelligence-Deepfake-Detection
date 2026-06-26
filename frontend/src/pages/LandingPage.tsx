import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, Eye, FileText, Database, Settings, ArrowRight } from 'lucide-react';

export default function LandingPage() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15 }
    }
  };

  const itemVariants = {
    hidden: { y: 25, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.6, ease: 'easeOut' }
    }
  };

  return (
    <div className="space-y-16 py-8">
      {/* Hero Section */}
      <motion.section 
        className="relative overflow-hidden rounded-3xl glass-panel p-8 md:p-16 text-center space-y-8"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7 }}
      >
        {/* Decorative glowing gradient elements */}
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-brand-accent/20 blur-[100px] pointer-events-none" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-brand-primary/20 blur-[100px] pointer-events-none" />
        
        <div className="space-y-4 max-w-3xl mx-auto relative z-10">
          <motion.div 
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-brand-primary/30 bg-brand-primary/10 text-xs font-semibold tracking-wider text-indigo-300 uppercase mb-4"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <ShieldCheck className="w-4 h-4" /> Next-Generation Verification
          </motion.div>
          
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight">
            Verify Visual Truth with{' '}
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-500 bg-clip-text text-transparent neon-glow-primary">
              TruthLens AI
            </span>
          </h1>
          
          <p className="text-base md:text-xl text-slate-400 font-normal leading-relaxed max-w-2xl mx-auto">
            An advanced, explainable forensic deepfake detection system. Upload videos to expose synthetic manipulations, examine activation heatmaps, and generate detailed PDF reports.
          </p>
        </div>

        <motion.div 
          className="flex justify-center pt-4 relative z-10"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2.5 px-8 py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-lg shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/35 active:scale-98 transition-all duration-200"
          >
            Start Analyzing Video
            <ArrowRight className="w-5 h-5" />
          </Link>
        </motion.div>
      </motion.section>

      {/* Features Grid */}
      <section className="space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Core Forensic Suite Capabilities</h2>
          <p className="text-sm md:text-base text-slate-500 max-w-lg mx-auto">
            Built using industry-standard machine learning models and visual analysis algorithms.
          </p>
        </div>

        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          {/* Card 1 */}
          <motion.div className="glass-panel p-6 rounded-2xl space-y-4 hover:border-brand-primary/40 transition-colors duration-300" variants={itemVariants}>
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Eye className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg">Explainable AI</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Grad-CAM activation mapping projects visual overlays directly onto detected face boundaries, highlighting which regions led the network to its classification.
            </p>
          </motion.div>

          {/* Card 2 */}
          <motion.div className="glass-panel p-6 rounded-2xl space-y-4 hover:border-brand-primary/40 transition-colors duration-300" variants={itemVariants}>
            <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/30 flex items-center justify-center text-violet-400">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg">Forensic PDF Reports</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Generate PDF summaries compiled using ReportLab. Includes timestamped confidence charts, frame snapshots, and local explanation logs.
            </p>
          </motion.div>

          {/* Card 3 */}
          <motion.div className="glass-panel p-6 rounded-2xl space-y-4 hover:border-brand-primary/40 transition-colors duration-300" variants={itemVariants}>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Database className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg">Analysis History</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Maintains an offline database of past verification runs. Instantly search results, delete old logs to free space, and export data as CSV/JSON formats.
            </p>
          </motion.div>

          {/* Card 4 */}
          <motion.div className="glass-panel p-6 rounded-2xl space-y-4 hover:border-brand-primary/40 transition-colors duration-300" variants={itemVariants}>
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Settings className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg">Custom Adjustments</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Tailor the verification thresholds, modify frame sampling intervals, and configure face bounding-box parameters to fit specific audit criteria.
            </p>
          </motion.div>
        </motion.div>
      </section>

      {/* Project Architecture Info */}
      <section className="glass-panel p-8 rounded-3xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        <div className="space-y-4">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Standardized Machine Learning Pipeline</h2>
          <p className="text-sm md:text-base text-slate-400 leading-relaxed">
            TruthLens AI utilizes an EfficientNet-B0 network fine-tuned on the benchmark FaceForensics++ (FF++) dataset. Frame extraction and SSD Haar face classifiers isolate regions of interest before feeding them to the prediction head.
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            {['FastAPI', 'React', 'PyTorch', 'Grad-CAM', 'SQLite', 'ReportLab'].map((tag) => (
              <span key={tag} className="px-3 py-1 rounded-lg bg-slate-800/50 border border-slate-700/40 text-xs font-semibold text-slate-300">
                {tag}
              </span>
            ))}
          </div>
        </div>
        <div className="relative border border-slate-800/40 rounded-2xl p-6 bg-slate-900/50 overflow-hidden font-mono text-xs space-y-2 text-indigo-300 shadow-inner">
          <p><span className="text-slate-500">1</span> <span className="text-emerald-400">POST</span> /api/upload {"→"} Upload video file</p>
          <p><span className="text-slate-500">2</span> <span className="text-emerald-400">POST</span> /api/analyze/job_id {"→"} Extract frames & detect faces</p>
          <p><span className="text-slate-500">3</span> <span className="text-slate-500">Processing stage:</span> Running AI Inference on face crops</p>
          <p><span className="text-slate-500">4</span> <span className="text-slate-500">Explainability:</span> Custom Grad-CAM feature hooks active</p>
          <p><span className="text-slate-500">5</span> <span className="text-slate-500">Report Engine:</span> Exporting ReportLab PDF...</p>
          <p><span className="text-slate-500">6</span> <span className="text-emerald-400">200 OK</span> {"→"} Results aggregated. Video classified.</p>
        </div>
      </section>
    </div>
  );
}
