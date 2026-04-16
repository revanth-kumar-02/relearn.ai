import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { generateLessonContent } from '../services/gemini/learningWorkspaceService';
import { extractTextFromPDF, validatePDFFile } from '../services/pdfService';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  BookOpen,
  Brain,
  CheckCircle,
  Download,
  FileText,
  Play,
  Save,
  Timer,
  Video,
  Upload,
  X,
  FileUp,
  AlertTriangle,
  Sparkles,
  Loader2
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import StudyTimer from './StudyTimer';
import VideoResources from './VideoResources';
import QuizModule from './QuizModule';
import { analytics } from '../services/analyticsService';

const LearningWorkspace: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { tasks, plans, updateTask, addActivity } = useData();

  const taskId = location.state?.taskId;
  const task = tasks.find(t => t.id === taskId);
  const plan = plans.find(p => p.id === task?.planId);

  const [isLoading, setIsLoading] = useState(false);
  const [showTimer, setShowTimer] = useState(false);
  const [notes, setNotes] = useState(task?.notes || '');
  const [isSaving, setIsSaving] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // ── PDF Upload State ──
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfContent, setPdfContent] = useState<string>('');
  const [pdfError, setPdfError] = useState<string>('');
  const [isPdfProcessing, setIsPdfProcessing] = useState(false);
  const [showPdfPanel, setShowPdfPanel] = useState(!task?.aiExplanation);
  const [timeLeft, setTimeLeft] = useState(10);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const notesTimeout = useRef<any>(null);
  const sessionStartRef = useRef<number>(0);

  useEffect(() => {
    if (taskId && task) {
        sessionStartRef.current = analytics.startSession(taskId);
    }
    return () => {
        if (taskId && sessionStartRef.current) {
            analytics.endSession(taskId, sessionStartRef.current);
        }
    };
  }, [taskId, task]);

  // Countdown timer for auto-generation
  useEffect(() => {
    let timer: any;
    
    if (showPdfPanel && !pdfFile && !isLoading && !task?.aiExplanation && !isPdfProcessing) {
      if (timeLeft <= 0) {
        handleSkipPdf();
      } else {
        timer = setInterval(() => {
          setTimeLeft(prev => prev - 1);
        }, 1000);
      }
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [timeLeft, showPdfPanel, pdfFile, isLoading, !!task?.aiExplanation, isPdfProcessing]);

  useEffect(() => {
    if (!taskId || !task) {
      navigate('/dashboard');
      return;
    }

    const fetchSessionData = async () => {
      // If we already have content, we don't need to do anything
      if (task.aiExplanation) return;
    };

    fetchSessionData();
  }, [taskId, task?.id, plan?.title, navigate, pdfContent, showPdfPanel]);

  // ── PDF Handlers ──
  const processFile = async (file: File) => {
    setPdfError('');
    const validation = validatePDFFile(file);
    if (!validation.valid) {
      setPdfError("We couldn't read this document. Could you try a different PDF?");
      return;
    }

    setPdfFile(file);
    setIsPdfProcessing(true);

    try {
      const text = await extractTextFromPDF(file);
      setPdfContent(text);
    } catch (err: any) {
      setPdfError("We couldn't read this document. Could you try a different PDF?");
      setPdfFile(null);
    } finally {
      setIsPdfProcessing(false);
    }
  };

  const handlePdfSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type === 'application/pdf') {
      processFile(file);
    } else if (file) {
      setPdfError("Please upload a PDF file.");
    }
  };

  const handleGenerateWithPdf = async () => {
    if (!task) return;
    setIsLoading(true);
    setShowPdfPanel(false);
    try {
      const result = await generateLessonContent(
        task.title,
        plan?.title || 'General Study',
        pdfContent || undefined
      );
      if (!result) throw new Error("No content generated");
      const data = JSON.parse(result);

      updateTask(task.id, {
        learningObjective: data.learningObjective,
        aiExplanation: data.aiExplanation,
        practiceActivities: data.practiceActivities,
        resources: data.resources,
        practiceQuestion: data.practiceQuestion,
        status: 'In Progress'
      });
    } catch (error: any) {
      console.error("Failed to fetch session data:", error);
      alert('We’re having trouble preparing your workspace right now. Let’s try again in a moment.');
      setShowPdfPanel(true); // Let them try again
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkipPdf = (manualTrigger = false) => {
    if (isLoading || task?.aiExplanation) return;
    
    setShowPdfPanel(false);
    setIsLoading(true);
    
    if (manualTrigger) {
      analytics.track('manual_generation_skipped_pdf', { taskId: task?.id });
    }

    generateLessonContent(task!.title, plan?.title || 'General Study')
      .then(result => {
        if (!result) throw new Error("No content generated");
        const data = JSON.parse(result);
        updateTask(task!.id, {
          learningObjective: data.learningObjective,
          aiExplanation: data.aiExplanation,
          practiceActivities: data.practiceActivities,
          resources: data.resources,
          practiceQuestion: data.practiceQuestion,
          status: 'In Progress'
        });
      })
      .catch(err => {
        console.error("Failed to fetch session data:", err);
        alert('We’re having trouble preparing your workspace right now. Let’s try again in a moment.');
        setShowPdfPanel(true);
        setTimeLeft(10); // Reset timer on error
      })
      .finally(() => setIsLoading(false));
  };

  const clearPdf = () => {
    setPdfFile(null);
    setPdfContent('');
    setPdfError('');
    setTimeLeft(10); // Reset timer when PDF is removed
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newNotes = e.target.value;
    setNotes(newNotes);

    if (notesTimeout.current) clearTimeout(notesTimeout.current);

    setIsSaving(true);
    notesTimeout.current = setTimeout(() => {
      updateTask(task!.id, { notes: newNotes });
      setIsSaving(false);
    }, 1000);
  };

  const handleMarkComplete = () => {
    if (task) {
      updateTask(task.id, { status: 'Completed', completedAt: new Date().toISOString() });
      addActivity({
        id: crypto.randomUUID(),
        title: `Completed session: ${task.title}`,
        time: "Just now",
        icon: "check_circle",
        color: "text-green-500",
        bg: "bg-green-500/10"
      });
      analytics.track('session_completed', { taskId: task.id, title: task.title });
      navigate(-1);
    }
  };

  const exportToCSV = () => {
    if (!task) return;
    const headers = ["Field", "Content"];
    const rows = [
      ["Topic", task.title],
      ["Objective", task.learningObjective || ""],
      ["Explanation", task.aiExplanation || ""],
      ["Notes", notes]
    ];

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${task.title.replace(/\s+/g, '_')}_session.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToDOC = () => {
    if (!task) return;
    const content = `
      <h1>${task.title}</h1>
      <p><strong>Plan:</strong> ${plan?.title || 'General'}</p>
      <hr/>
      <h2>Learning Objective</h2>
      <p>${task.learningObjective || 'N/A'}</p>
      <h2>Explanation</h2>
      <p>${task.aiExplanation || 'N/A'}</p>
      <h2>My Notes</h2>
      <p>${notes.replace(/\n/g, '<br/>') || 'No notes taken.'}</p>
    `;

    const blob = new Blob(['\ufeff', content], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${task.title.replace(/\s+/g, '_')}_session.doc`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = () => {
    window.print();
  };

  if (!task) return null;

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-stone-900/80 backdrop-blur-md border-b border-stone-200 dark:border-stone-800 p-4 flex items-center justify-between print:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="font-serif text-lg font-bold line-clamp-1">{task.title}</h1>
            <p className="text-[10px] uppercase tracking-widest font-bold text-stone-500">{plan?.title}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTimer(!showTimer)}
            className={`p-2 rounded-full transition-colors ${showTimer ? 'bg-primary text-white' : 'hover:bg-stone-100 dark:hover:bg-stone-800'}`}
          >
            <Timer size={20} />
          </button>
          <div className="relative">
            <button 
              onClick={() => setShowExportMenu(!showExportMenu)}
              className={`p-2 rounded-full transition-colors ${showExportMenu ? 'bg-stone-100 dark:bg-stone-800' : 'hover:bg-stone-100 dark:hover:bg-stone-800'}`}
            >
              <Download size={20} />
            </button>
            <AnimatePresence>
              {showExportMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowExportMenu(false)}></div>
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    className="absolute right-0 top-full mt-2 w-44 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl shadow-xl z-50 overflow-hidden"
                  >
                    <button onClick={() => { exportToPDF(); setShowExportMenu(false); }} className="w-full px-4 py-3 text-left text-sm hover:bg-stone-50 dark:hover:bg-stone-800 flex items-center gap-2 transition-colors">
                      <FileText size={14} className="text-red-500" /> PDF Document
                    </button>
                    <button onClick={() => { exportToDOC(); setShowExportMenu(false); }} className="w-full px-4 py-3 text-left text-sm hover:bg-stone-50 dark:hover:bg-stone-800 flex items-center gap-2 transition-colors">
                      <FileText size={14} className="text-blue-500" /> Word (DOC)
                    </button>
                    <button onClick={() => { exportToCSV(); setShowExportMenu(false); }} className="w-full px-4 py-3 text-left text-sm hover:bg-stone-50 dark:hover:bg-stone-800 flex items-center gap-2 transition-colors">
                      <FileText size={14} className="text-green-500" /> CSV Spreadsheet
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full p-4 md:p-8 space-y-8 pb-32">
        {/* ── PDF Upload Panel (shown before content is generated) ── */}
        {showPdfPanel && !task.aiExplanation && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-stone-900 p-6 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm space-y-5"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary">
                <Upload size={18} />
                <h2 className="text-xs font-black uppercase tracking-widest">Upload Study Material (Optional)</h2>
              </div>
            </div>

            <p className="text-sm text-stone-500 dark:text-stone-400">
              Upload a PDF document and the AI will use it as the primary source to generate your lesson, summary, and practice activities.
            </p>

            {/* Drop Zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-primary bg-primary/10 scale-[1.02] shadow-inner'
                  : pdfFile
                  ? 'border-primary/40 bg-primary/5'
                  : 'border-stone-300 dark:border-stone-700 hover:border-primary/40 hover:bg-primary/5'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={handlePdfSelect}
              />
              {isPdfProcessing ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="animate-spin text-primary" size={32} />
                  <p className="text-sm font-medium text-stone-500">Extracting text from PDF...</p>
                </div>
              ) : pdfFile ? (
                <div className="flex flex-col items-center gap-3">
                  <FileUp size={32} className="text-primary" />
                  <p className="text-sm font-bold text-stone-700 dark:text-stone-300">{pdfFile.name}</p>
                  <p className="text-xs text-stone-400">{(pdfFile.size / 1024).toFixed(0)} KB · {pdfContent.length.toLocaleString()} chars extracted</p>
                  <button
                    onClick={(e) => { e.stopPropagation(); clearPdf(); }}
                    className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1 mt-1"
                  >
                    <X size={12} /> Remove
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className={`p-4 rounded-full ${isDragging ? 'bg-primary/20 text-primary' : 'bg-stone-100 dark:bg-stone-800 text-stone-400'} transition-colors duration-300`}>
                    <Upload size={32} />
                  </div>
                  <p className="text-sm font-bold text-stone-700 dark:text-stone-300">
                    {isDragging ? 'Drop it here!' : 'Click or drag PDF here'}
                  </p>
                  <p className="text-xs text-stone-400">Max 10MB · Text-based PDFs work best</p>
                </div>
              )}
            </div>

            {/* PDF Error */}
            {pdfError && (
              <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 dark:bg-red-950/30 p-3 rounded-xl">
                <AlertTriangle size={16} />
                <span>{pdfError}</span>
              </div>
            )}

            {/* Mode Switcher: Auto Mode (Subtle) vs Manual Mode (Button) */}
            <div className="pt-2">
              <AnimatePresence mode="wait">
                {!pdfFile ? (
                  /* AUTO MODE UI */
                  <motion.div
                    key="auto-mode"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="flex flex-col items-center gap-4"
                  >
                    <div className="flex items-center gap-3 px-4 py-2 bg-stone-100/50 dark:bg-stone-800/50 backdrop-blur-md rounded-full border border-stone-200/50 dark:border-stone-700/50 shadow-inner">
                      <div className="relative w-4 h-4">
                        <svg className="w-full h-full -rotate-90">
                          <circle
                            cx="8" cy="8" r="7"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className="text-stone-200 dark:text-stone-800"
                          />
                          <motion.circle
                            cx="8" cy="8" r="7"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className="text-sky-500"
                            strokeDasharray={44}
                            animate={{ strokeDashoffset: 44 - (44 * (10 - timeLeft)) / 10 }}
                            transition={{ duration: 1, ease: "linear" }}
                          />
                        </svg>
                      </div>
                      <span className="text-xs font-medium text-stone-500 dark:text-stone-400">
                        Auto-generating lesson in <span className="text-stone-900 dark:text-stone-100 font-bold">{timeLeft}s</span>
                      </span>
                    </div>
                    
                    <button 
                      onClick={() => handleSkipPdf(true)}
                      className="w-full py-3 bg-[#0ea5e9] text-white font-bold rounded-xl shadow-lg shadow-sky-500/20 hover:bg-[#0284c7] transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                    >
                      <Sparkles size={16} /> Generate Now
                    </button>
                  </motion.div>
                ) : (
                  /* MANUAL MODE UI */
                  <motion.div
                    key="manual-mode"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                  >
                    <button
                      onClick={handleGenerateWithPdf}
                      disabled={isPdfProcessing}
                      className="w-full py-4 bg-[#0ea5e9] text-white font-bold rounded-2xl shadow-xl shadow-sky-500/20 hover:bg-[#0284c7] transition-all flex items-center justify-center gap-3 group active:scale-[0.98] disabled:opacity-50"
                    >
                      <Sparkles size={20} className="group-hover:rotate-12 transition-transform" />
                      Generate from PDF
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <Loader2 className="animate-spin text-primary" size={40} />
            <div className="text-center">
              <h2 className="font-serif text-xl font-bold">Preparing your workspace...</h2>
              <p className="text-sm text-stone-500">
                {pdfContent ? 'AI is analyzing your PDF and generating a personalized session.' : 'AI is generating your guided learning session.'}
              </p>
            </div>
          </div>
        ) : task.aiExplanation ? (
          <AnimatePresence mode="wait">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              {/* Timer Overlay */}
              {showTimer && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden print:hidden"
                >
                  <div className="bg-stone-900 text-white p-6 rounded-2xl shadow-2xl mb-8">
                    <StudyTimer
                      initialMinutes={task.durationMinutes}
                      onStop={() => setShowTimer(false)}
                      onComplete={() => { }}
                    />
                  </div>
                </motion.div>
              )}

              <div className="space-y-8">
                {/* Main Content Area */}
                <div className="space-y-8">
                  {/* Objective */}
                  <section className="space-y-3">
                    <div className="flex items-center gap-2 text-primary">
                      <Sparkles size={18} />
                      <h2 className="text-xs font-black uppercase tracking-widest">Learning Objective</h2>
                    </div>
                    <p className="text-lg font-serif font-medium leading-relaxed italic text-stone-700 dark:text-stone-300">
                      "{task.learningObjective}"
                    </p>
                  </section>

                  {/* Explanation */}
                  <section className="bg-white dark:bg-stone-900 p-6 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 text-stone-500">
                      <BookOpen size={18} />
                      <h2 className="text-xs font-black uppercase tracking-widest">Concept Explanation</h2>
                    </div>
                    <div className="prose-content max-w-none">
                      <ReactMarkdown>{task.aiExplanation || ''}</ReactMarkdown>
                    </div>
                  </section>

                  {/* Practice Tasks */}
                  <section className="space-y-4">
                    <div className="flex items-center gap-2 text-stone-500">
                      <Play size={18} />
                      <h2 className="text-xs font-black uppercase tracking-widest">What To Practice Today</h2>
                    </div>
                    <div className="space-y-3">
                      {task.practiceActivities?.map((activity, index) => (
                        <div key={index} className="flex gap-4 p-4 bg-stone-100 dark:bg-stone-900/50 rounded-xl border border-stone-200 dark:border-stone-800">
                          <div className="h-6 w-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold shrink-0">
                            {index + 1}
                          </div>
                          <p className="text-sm font-medium">{activity}</p>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Curated Video Resources — Rebranded from "Video Generation" */}
                  <section className="space-y-4">
                    <div className="flex items-center gap-2 text-stone-500">
                      <Video size={18} />
                      <h2 className="text-xs font-black uppercase tracking-widest">Curated Video Mentorship</h2>
                    </div>
                    <p className="text-xs text-stone-400 dark:text-stone-500">
                      AI-selected educational videos from trusted channels, matched to your current topic.
                    </p>
                    <VideoResources topic={task.title} subject={plan?.subject || plan?.title} />
                  </section>

                  {/* Reflection */}
                  <section className="bg-primary/5 dark:bg-primary/10 p-6 rounded-2xl border border-primary/20 space-y-4">
                    <div className="flex items-center gap-2 text-primary">
                      <Sparkles size={18} />
                      <h2 className="text-xs font-black uppercase tracking-widest">Practice Activity</h2>
                    </div>
                    <p className="text-sm font-medium text-stone-800 dark:text-stone-200 leading-relaxed">
                      {task.practiceQuestion}
                    </p>
                  </section>

                  {/* Interactive Quiz Module — Phase 4 */}
                  <section className="space-y-4">
                    <div className="flex items-center gap-2 text-stone-500">
                      <Brain size={18} />
                      <h2 className="text-xs font-black uppercase tracking-widest">Test Your Knowledge</h2>
                    </div>
                    <QuizModule
                      topic={task.title}
                      lessonContent={task.aiExplanation || ''}
                      difficulty={plan?.difficulty || 'Beginner'}
                    />
                  </section>
                </div>

                {/* Notes Area */}
                <div className="space-y-6 pt-8 border-t border-stone-200 dark:border-stone-800">
                  <div className="bg-white dark:bg-stone-900 p-6 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm h-[600px] flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2 text-stone-500">
                        <FileText size={18} />
                        <h2 className="text-xs font-black uppercase tracking-widest">My Notes</h2>
                      </div>
                      {isSaving && <Loader2 size={14} className="animate-spin text-primary" />}
                    </div>
                    <textarea
                      value={notes}
                      onChange={handleNoteChange}
                      placeholder="Start typing your thoughts, summaries, or questions here..."
                      className="flex-1 w-full bg-transparent resize-none outline-none text-base leading-relaxed placeholder-stone-400 dark:placeholder-stone-600 font-serif"
                    />
                    <div className="pt-4 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                        {notes.split(/\s+/).filter(Boolean).length} Words
                      </span>
                      <div className="flex items-center gap-1 text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                        <Save size={10} />
                        Autosaved
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleMarkComplete}
                    className="w-full py-4 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all flex items-center justify-center gap-2 group print:hidden"
                  >
                    <CheckCircle size={20} className="group-hover:scale-110 transition-transform" />
                    Mark Session Complete
                  </button>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        ) : null}
      </main>

      {/* Mobile Action Bar */}
      {!isLoading && task.aiExplanation && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 dark:bg-stone-900/80 backdrop-blur-md border-t border-stone-200 dark:border-stone-800 md:hidden print:hidden z-40">
          <button
            onClick={handleMarkComplete}
            className="w-full py-4 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
          >
            <CheckCircle size={20} />
            Complete Session
          </button>
        </div>
      )}
    </div>
  );
};

export default LearningWorkspace;
