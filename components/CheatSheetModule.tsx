import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheatSheet, generateCheatSheet } from '../services/gemini/cheatSheetService';
import { 
  FileText, 
  Download, 
  Printer, 
  Sparkles, 
  Loader2, 
  AlertTriangle,
  Zap,
  CheckCircle2
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useData } from '../contexts/DataContext';
import { getContentLanguageLabel } from '../services/youtubeService';
import { exportCheatSheetAsPDF } from '../services/documentService';

interface CheatSheetModuleProps {
  topic: string;
  content: string;
}

const CheatSheetModule: React.FC<CheatSheetModuleProps> = ({ topic, content }) => {
  const { contentLanguage } = useData();
  const [cheatSheet, setCheatSheet] = useState<CheatSheet | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    try {
      const generated = await generateCheatSheet(topic, content, getContentLanguageLabel(contentLanguage));
      setCheatSheet(generated);
    } catch (err: any) {
      setError('Failed to generate cheat sheet. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!cheatSheet) return;
    setIsDownloading(true);
    try {
      await exportCheatSheetAsPDF(cheatSheet);
    } catch (err) {
      console.error('Failed to export PDF:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-indigo-50 dark:bg-indigo-950/20 p-8 rounded-2xl border border-dashed border-indigo-200 dark:border-indigo-800 flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-indigo-500" size={32} />
        <p className="text-sm font-bold text-indigo-500/80">Designing your Master Reference...</p>
      </div>
    );
  }

  if (!cheatSheet) {
    return (
      <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/20 dark:to-blue-950/20 p-6 rounded-2xl border border-indigo-200/50 dark:border-indigo-800/40 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
            <FileText className="text-indigo-500" size={20} />
          </div>
          <div>
            <h3 className="font-bold text-sm">AI Cheat Sheet</h3>
            <p className="text-xs text-stone-500">Generate a printable master reference for this topic</p>
          </div>
        </div>
        
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-xl border border-red-200 dark:border-red-900/30 flex items-start gap-2.5 text-xs font-semibold leading-relaxed animate-fade-in">
            <AlertTriangle className="shrink-0 text-red-500" size={16} />
            <div className="space-y-1">
              <p className="font-bold">Generation Failed</p>
              <p className="opacity-90">{error}</p>
            </div>
          </div>
        )}

        <button
          onClick={handleGenerate}
          className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
        >
          <Sparkles size={16} /> {error ? 'Try Again' : 'Generate Cheat Sheet'}
        </button>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 print:p-0 print:bg-white print:text-black"
    >
      {/* Header Actions */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-500/10 px-2 py-1 rounded-md">
                Generated Ready
            </span>
        </div>
        <div className="flex gap-2">
            <button 
                onClick={handleDownload}
                disabled={isDownloading}
                className="p-2 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 transition-all disabled:opacity-50 flex items-center justify-center min-w-[32px] min-h-[32px]"
                title="Download PDF"
            >
                {isDownloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            </button>
            <button 
                onClick={() => setCheatSheet(null)}
                className="p-2 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 transition-all"
                title="Regenerate"
            >
                <Sparkles size={16} />
            </button>
        </div>
      </div>

      {/* Cheat Sheet Content */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-6 sm:p-8 shadow-sm print:shadow-none print:border-none print:p-0 overflow-hidden">
        <div className="flex items-center justify-between mb-8 border-b border-stone-100 dark:border-stone-800 pb-6">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shrink-0">
                    <FileText size={24} />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-stone-900 dark:text-white leading-tight">{cheatSheet.title}</h1>
                    <p className="text-xs text-stone-400 font-bold uppercase tracking-widest mt-1">ReLearn.ai Master Reference</p>
                </div>
            </div>
            <div className="hidden sm:block text-right">
                <div className="text-[10px] font-black text-stone-300 uppercase tracking-tighter">Generated by</div>
                <div className="text-sm font-black text-indigo-600">Advanced AI Engine</div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8 min-w-0 overflow-hidden">
                {cheatSheet.sections.map((section, idx) => (
                    <div key={idx} className="space-y-3">
                        <h3 className="text-xs font-black text-indigo-600 uppercase tracking-[0.2em] flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-600"></div>
                            {section.heading}
                        </h3>
                        <div className="w-full overflow-x-auto no-scrollbar scroll-smooth">
                            <div className="prose prose-stone dark:prose-invert prose-sm max-w-none prose-headings:text-stone-900 prose-headings:dark:text-white prose-p:text-stone-600 prose-p:dark:text-stone-400 prose-code:bg-black dark:prose-code:bg-black prose-code:text-indigo-600 dark:prose-code:text-indigo-400 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-pre:bg-black dark:prose-pre:bg-black prose-pre:border prose-pre:border-stone-800/80 prose-pre:p-4">
                                <ReactMarkdown>{section.content}</ReactMarkdown>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Sidebar Stats/Reference */}
            <div className="lg:col-span-1 space-y-8">
                {/* Quick Reference */}
                <div className="bg-stone-50 dark:bg-stone-800/50 rounded-2xl p-6 border border-stone-100 dark:border-stone-700">
                    <h3 className="text-xs font-black text-stone-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Zap size={14} className="text-amber-500" /> Quick Reference
                    </h3>
                    <ul className="space-y-3">
                        {cheatSheet.quickReference.map((ref, idx) => (
                            <li key={idx} className="flex gap-3 text-sm font-medium text-stone-700 dark:text-stone-300">
                                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0"></div>
                                {ref}
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Common Mistakes */}
                <div className="bg-red-50 dark:bg-red-950/20 rounded-2xl p-6 border border-red-100 dark:border-red-900/30">
                    <h3 className="text-xs font-black text-red-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <AlertTriangle size={14} /> Pitfalls to Avoid
                    </h3>
                    <ul className="space-y-3">
                        {cheatSheet.commonMistakes.map((mistake, idx) => (
                            <li key={idx} className="flex gap-3 text-sm font-medium text-red-700 dark:text-red-400/90 leading-relaxed">
                                <CheckCircle2 size={14} className="shrink-0 mt-0.5 text-red-400" />
                                {mistake}
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Print Tip */}
                <div className="bg-indigo-50/50 dark:bg-indigo-900/10 p-4 rounded-xl border border-indigo-100/50 dark:border-indigo-900/30 print:hidden">
                    <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest mb-1">Study Tip</p>
                    <p className="text-xs text-indigo-700/70 dark:text-indigo-400/70 italic">
                        "Print this out and stick it next to your monitor. Physical association builds faster recall."
                    </p>
                </div>
            </div>
        </div>
      </div>
    </motion.div>
  );
};

export default React.memo(CheatSheetModule);
