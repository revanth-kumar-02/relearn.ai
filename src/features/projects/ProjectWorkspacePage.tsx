import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Terminal, 
  Sparkles, 
  CheckCircle2, 
  Copy, 
  Check, 
  Play, 
  Cpu, 
  Layers, 
  Clock, 
  Award, 
  AlertCircle, 
  BookOpen, 
  ChevronRight, 
  Code2, 
  RefreshCw,
  ExternalLink,
  FileCode,
  Trash2,
  FolderTree,
  FilePlus,
  Maximize2,
  Minimize2,
  ChevronDown,
  Download,
  X,
  Bug,
  SlidersHorizontal
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { 
  getProjectById, 
  saveProject, 
  updateMilestoneProgress,
  deleteProject
} from '../../services/api/projectService';
import { 
  ProjectLab, 
  ProjectMilestone, 
  reviewProjectCode, 
  CodeReviewResult 
} from '../../services/ai/projectLabService';
import { ProjectVirtualFile } from '../../services/ai/projectBlueprintService';
import { executeCode } from '../../services/compiler/codeExecutionService';
import { triggerHaptic } from '../../utils/haptics';

interface EditorTab {
  id: string;
  name: string;
  path: string;
  language: string;
}

export const ProjectWorkspacePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { triggerXP } = useData();

  const [project, setProject] = useState<ProjectLab | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeMilestoneIndex, setActiveMilestoneIndex] = useState(0);

  // Virtual Filesystem State
  const [virtualFiles, setVirtualFiles] = useState<ProjectVirtualFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string>('');
  const [openTabs, setOpenTabs] = useState<EditorTab[]>([]);
  const [fileContents, setFileContents] = useState<Record<string, string>>({});
  const [newFileName, setNewFileName] = useState('');
  const [showNewFileInput, setShowNewFileInput] = useState(false);

  // IDE UI Panels State
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMilestoneDrawerOpen, setIsMilestoneDrawerOpen] = useState(true);
  const [isBottomTerminalOpen, setIsBottomTerminalOpen] = useState(true);
  const [bottomTab, setBottomTab] = useState<'terminal' | 'output' | 'diagnostics'>('terminal');
  const [terminalLogs, setTerminalLogs] = useState<Array<{ text: string; type: 'info' | 'success' | 'warn' | 'error' | 'cmd' }>>([]);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // AI Review State
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewResult, setReviewResult] = useState<CodeReviewResult | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);

  // Project Deletion State
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Eclipse Theia IDE Environment State
  const [ideMode, setIdeMode] = useState<'theia' | 'editor'>('editor');
  const theiaUrl = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_THEIA_URL) || 'http://localhost:3000';
  const [isTheiaHealthy, setIsTheiaHealthy] = useState<boolean | null>(null);

  // Ping Theia container on mount
  useEffect(() => {
    let active = true;
    fetch(theiaUrl, { method: 'HEAD', mode: 'no-cors' })
      .then(() => {
        if (active) setIsTheiaHealthy(true);
      })
      .catch(() => {
        if (active) setIsTheiaHealthy(false);
      });
    return () => {
      active = false;
    };
  }, [theiaUrl]);

  // Load project by ID and initialize virtual filesystem
  useEffect(() => {
    let isMounted = true;
    async function loadProject() {
      if (!user?.id || !id) return;
      setIsLoading(true);
      try {
        const loaded = await getProjectById(user.id, id);
        if (isMounted && loaded) {
          setProject(loaded);

          // Build virtual files: prioritize project.files if available, otherwise construct from milestones
          let initialFiles: ProjectVirtualFile[] = loaded.files && loaded.files.length > 0 
            ? [...loaded.files] 
            : [];

          if (initialFiles.length === 0) {
            // Scaffold default files from milestones and toolchains
            const primaryLanguage = loaded.milestones?.[0]?.starterCode?.language || 'text';
            const primaryFilename = loaded.milestones?.[0]?.starterCode?.filename || 'main';
            const primaryCode = loaded.milestones?.[0]?.starterCode?.code || '// Starter code\n';

            initialFiles.push({
              id: 'file-entry',
              name: primaryFilename.split('/').pop() || primaryFilename,
              path: primaryFilename,
              language: primaryLanguage,
              isEntrypoint: true,
              content: primaryCode,
            });

            // Add config file based on technology
            const tech = (loaded.technology || '').toLowerCase();
            if (tech.includes('rust')) {
              initialFiles.push({
                id: 'file-cargo',
                name: 'Cargo.toml',
                path: 'Cargo.toml',
                language: 'toml',
                content: `[package]\nname = "${loaded.topic.toLowerCase().replace(/[^a-z0-9]/g, '_')}"\nversion = "0.1.0"\nedition = "2021"\n\n[dependencies]\n`,
              });
            } else if (tech.includes('flutter') || tech.includes('dart')) {
              initialFiles.push({
                id: 'file-pubspec',
                name: 'pubspec.yaml',
                path: 'pubspec.yaml',
                language: 'yaml',
                content: `name: ${loaded.topic.toLowerCase().replace(/[^a-z0-9]/g, '_')}\nenvironment:\n  sdk: '>=3.0.0 <4.0.0'\ndependencies:\n  flutter:\n    sdk: flutter\n`,
              });
            }

            // Add README.md
            initialFiles.push({
              id: 'file-readme',
              name: 'README.md',
              path: 'README.md',
              language: 'markdown',
              content: `# ${loaded.title}\n\n${loaded.realWorldScenario}\n\n## Tech Stack\n${loaded.techStack?.map(t => `- ${t}`).join('\n') || ''}\n`,
            });
          }

          setVirtualFiles(initialFiles);

          // Initialize file contents map
          const contentsMap: Record<string, string> = {};
          initialFiles.forEach(f => {
            contentsMap[f.id] = f.content;
          });
          setFileContents(contentsMap);

          // Open entrypoint file by default
          const entry = initialFiles.find(f => f.isEntrypoint) || initialFiles[0];
          if (entry) {
            setActiveFileId(entry.id);
            setOpenTabs([{
              id: entry.id,
              name: entry.name,
              path: entry.path,
              language: entry.language,
            }]);
          }

          // Initial terminal log
          setTerminalLogs([
            { text: `[workspace] Relearn.ai Web IDE Studio initialized for ${loaded.title}`, type: 'info' },
            { text: `[toolchain] Technology environment set to ${loaded.technology || 'Universal'}`, type: 'info' },
            { text: `[status] Milestone 1 active. Run 'cargo check' or 'Run Code' to test syntax.`, type: 'success' },
          ]);
        }
      } catch (err) {
        console.error('Failed to load project in workspace:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadProject();
    return () => {
      isMounted = false;
    };
  }, [user?.id, id]);

  const activeMilestone: ProjectMilestone | undefined = useMemo(() => {
    if (!project?.milestones) return undefined;
    return project.milestones[activeMilestoneIndex] || project.milestones[0];
  }, [project, activeMilestoneIndex]);

  // Current active file object
  const activeFile: ProjectVirtualFile | undefined = useMemo(() => {
    return virtualFiles.find(f => f.id === activeFileId);
  }, [virtualFiles, activeFileId]);

  const currentCode = activeFileId ? (fileContents[activeFileId] ?? '') : '';

  // Handler: Switch or Open File Tab
  const handleOpenFile = (file: ProjectVirtualFile) => {
    triggerHaptic('light');
    setActiveFileId(file.id);
    if (!openTabs.some(t => t.id === file.id)) {
      setOpenTabs(prev => [...prev, {
        id: file.id,
        name: file.name,
        path: file.path,
        language: file.language,
      }]);
    }
  };

  // Handler: Close Tab
  const handleCloseTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('light');
    const remaining = openTabs.filter(t => t.id !== tabId);
    setOpenTabs(remaining);
    if (activeFileId === tabId && remaining.length > 0) {
      setActiveFileId(remaining[remaining.length - 1].id);
    }
  };

  // Handler: Add New File
  const handleCreateNewFile = () => {
    if (!newFileName.trim()) return;
    triggerHaptic('medium');
    const filename = newFileName.trim();
    const ext = filename.split('.').pop() || 'text';
    const newId = `file-${Date.now().toString(36)}`;
    const newFile: ProjectVirtualFile = {
      id: newId,
      name: filename,
      path: filename.includes('/') ? filename : `src/${filename}`,
      language: ext === 'rs' ? 'rust' : ext === 'dart' ? 'dart' : ext === 'py' ? 'python' : ext === 'json' ? 'json' : 'text',
      content: `// ${filename}\n`,
    };

    setVirtualFiles(prev => [...prev, newFile]);
    setFileContents(prev => ({ ...prev, [newId]: newFile.content }));
    setOpenTabs(prev => [...prev, {
      id: newFile.id,
      name: newFile.name,
      path: newFile.path,
      language: newFile.language,
    }]);
    setActiveFileId(newId);
    setNewFileName('');
    setShowNewFileInput(false);

    setTerminalLogs(prev => [
      ...prev,
      { text: `[fs] Created file: ${newFile.path}`, type: 'info' }
    ]);
  };

  // Handler: Update code content
  const handleCodeChange = (newVal: string) => {
    if (!activeFileId) return;
    setFileContents(prev => ({
      ...prev,
      [activeFileId]: newVal,
    }));
  };

  // Debounced auto-save: persist file edits back to project storage and Supabase
  useEffect(() => {
    if (!user?.id || !project || virtualFiles.length === 0) return;

    const timer = setTimeout(() => {
      const updatedFiles = virtualFiles.map(f => ({
        ...f,
        content: fileContents[f.id] !== undefined ? fileContents[f.id] : f.content,
      }));

      const hasChanged = updatedFiles.some((f, idx) => f.content !== virtualFiles[idx]?.content);
      if (hasChanged) {
        setVirtualFiles(updatedFiles);
        const updatedProject: ProjectLab = {
          ...project,
          files: updatedFiles,
        };
        setProject(updatedProject);
        saveProject(user.id, updatedProject);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [fileContents, user?.id, project?.id]);

  // Handler: Handle Tab Key indentation inside Code Editor
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const val = textarea.value;

      const updated = val.substring(0, start) + '  ' + val.substring(end);
      handleCodeChange(updated);

      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    }
  };

  // Handler: Toggle Criteria Checklist Item
  const handleToggleCriterion = async (criterion: string) => {
    if (!user?.id || !project || !activeMilestone) return;
    triggerHaptic('light');

    const currentCompleted = activeMilestone.completedCriteria || {};
    const updatedCompleted = {
      ...currentCompleted,
      [criterion]: !currentCompleted[criterion],
    };

    const allMet = activeMilestone.criteria.length > 0 &&
      activeMilestone.criteria.every(c => updatedCompleted[c]);

    const updatedProject = await updateMilestoneProgress(
      user.id,
      project.id,
      activeMilestone.id,
      allMet,
      updatedCompleted
    );

    if (updatedProject) {
      setProject({ ...updatedProject });
      if (allMet) {
        setTerminalLogs(prev => [
          ...prev,
          { text: `[milestone] ✓ ${activeMilestone.title} - All acceptance criteria verified!`, type: 'success' }
        ]);
      }
    }
  };

  // Handler: Execute code or run syntax check via real execution engine
  const handleRunCommand = async (cmd: string) => {
    triggerHaptic('medium');
    setIsBottomTerminalOpen(true);
    setBottomTab('terminal');

    setTerminalLogs(prev => [
      ...prev,
      { text: `$ ${cmd}`, type: 'cmd' }
    ]);

    // Prepare files array from current virtualFiles + active edits
    const filesToExecute = virtualFiles.map(f => ({
      name: f.name,
      content: fileContents[f.id] !== undefined ? fileContents[f.id] : f.content,
    }));

    const targetLang = activeFile?.language || project?.technology || 'csharp';

    setTerminalLogs(prev => [
      ...prev,
      { text: `[toolchain] Initializing ${targetLang} execution task...`, type: 'info' }
    ]);

    try {
      const result = await executeCode({
        language: targetLang,
        files: filesToExecute,
        args: cmd.split(' ').slice(1),
      });

      if (result.stdout) {
        setTerminalLogs(prev => [
          ...prev,
          ...result.stdout.split('\n').filter(Boolean).map(text => ({ text, type: 'info' as const }))
        ]);
      }

      if (result.stderr) {
        setTerminalLogs(prev => [
          ...prev,
          ...result.stderr.split('\n').filter(Boolean).map(text => ({ text, type: 'error' as const }))
        ]);
      }

      setTerminalLogs(prev => [
        ...prev,
        {
          text: `[process] Exited with status code ${result.exitCode} in ${result.executionTimeMs}ms (${result.runner})`,
          type: result.exitCode === 0 ? 'success' : 'warn'
        }
      ]);
    } catch (err: any) {
      setTerminalLogs(prev => [
        ...prev,
        { text: `[execution-error] ${err?.message || err}`, type: 'error' }
      ]);
    }
  };

  // Handler: Submit Code for AI Review
  const handleReviewCode = async () => {
    if (!project || !activeMilestone) return;
    triggerHaptic('medium');
    setIsReviewing(true);
    setShowReviewModal(true);
    setReviewResult(null);

    try {
      const result = await reviewProjectCode({
        projectTitle: project.title,
        milestoneTitle: activeMilestone.title,
        code: currentCode,
        criteria: activeMilestone.criteria,
        language: activeFile?.language || 'rust',
      });
      setReviewResult(result);

      if (result.verdict === 'Pass' || result.verdict === 'Outstanding') {
        if (user?.id) {
          const allCriteriaMap: Record<string, boolean> = {};
          activeMilestone.criteria.forEach(c => {
            allCriteriaMap[c] = true;
          });

          const updated = await updateMilestoneProgress(
            user.id,
            project.id,
            activeMilestone.id,
            true,
            allCriteriaMap
          );
          if (updated) {
            setProject({ ...updated });
          }
          if (result.xpEarned) {
            triggerXP(result.xpEarned);
          }
        }
      }
    } catch (err) {
      console.error('AI code review failed:', err);
    } finally {
      setIsReviewing(false);
    }
  };

  // Handler: Delete Project
  const handleConfirmDelete = async () => {
    if (!user?.id || !project) return;
    triggerHaptic('light');
    try {
      await deleteProject(user.id, project.id);
      navigate('/projects');
    } catch (err) {
      console.error('Failed to delete project:', err);
    }
  };

  const copyToClipboard = (text: string) => {
    triggerHaptic('light');
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen py-12 px-4 max-w-7xl mx-auto flex flex-col items-center justify-center space-y-4">
        <RefreshCw size={28} className="animate-spin text-primary" />
        <p className="text-sm text-stone-500 font-medium">Launching Web IDE Studio...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen py-12 px-4 max-w-2xl mx-auto text-center space-y-4">
        <AlertCircle size={40} className="text-rose-500 mx-auto" />
        <h2 className="text-xl font-black text-stone-900 dark:text-stone-100">Project Not Found</h2>
        <p className="text-sm text-stone-500">
          The requested project lab could not be found or has been removed.
        </p>
        <button
          onClick={() => navigate('/projects')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white font-bold text-xs"
        >
          <ArrowLeft size={14} />
          <span>Back to Projects</span>
        </button>
      </div>
    );
  }

  const completedMilestones = project.milestones.filter(m => m.completed).length;
  const totalMilestones = project.milestones.length;
  const progressPercent = project.progress ?? (totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0);

  // Line numbers calculation for active file
  const lineCount = Math.max(1, currentCode.split('\n').length);

  return (
    <div className={`min-h-screen py-4 px-3 sm:px-6 max-w-7xl mx-auto space-y-4 ${isFullScreen ? 'fixed inset-0 z-50 bg-stone-950 p-4 max-w-none overflow-y-auto' : ''}`}>
      
      {/* ─────────────────────────────────────────────────────────────
          TOP WORKSPACE HEADER & LOCAL VS CODE ACTIONS
      ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 dark:border-stone-800 pb-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              triggerHaptic('light');
              navigate('/projects');
            }}
            className="p-2 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors shadow-sm"
            title="Return to Projects List"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                {project.technology || 'Engineering Lab'}
              </span>
              <span className="text-xs text-stone-500 font-medium hidden sm:inline">
                {project.difficulty} • {completedMilestones}/{totalMilestones} Milestones ({progressPercent}%)
              </span>
            </div>
            <h1 className="text-lg sm:text-xl font-black text-stone-900 dark:text-stone-100 tracking-tight mt-0.5">
              {project.title}
            </h1>
          </div>
        </div>

        {/* Right Action Tools: Local VS Code Link, Fullscreen, Delete */}
        <div className="flex items-center gap-2 shrink-0">
          <a
            href={`vscode://vscode.git/clone?url=https://github.com/relearn-ai/${project.id}`}
            onClick={(e) => {
              // Graceful notification if protocol handler is not installed
              triggerHaptic('light');
              setTerminalLogs(prev => [
                ...prev,
                { text: `[vscode] Triggering protocol handler: vscode://file/...`, type: 'info' },
                { text: `[hint] If desktop VS Code did not pop up, continue coding directly in this Web IDE!`, type: 'warn' }
              ]);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 font-bold text-xs transition-colors"
            title="Open project inside your desktop VS Code application"
          >
            <Code2 size={13} className="text-primary" />
            <span className="hidden sm:inline">Open in Local VS Code</span>
            <ExternalLink size={11} className="text-stone-400" />
          </a>

          <button
            onClick={() => setIsFullScreen(prev => !prev)}
            className="p-2 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
            title={isFullScreen ? 'Exit Full Screen' : 'Full Screen IDE'}
          >
            {isFullScreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>

          <button
            onClick={() => setShowDeleteModal(true)}
            className="p-2 rounded-xl text-stone-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
            title="Delete Project"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          HIGH DWELL-TIME DEVELOPER SPONSOR BANNER SLOT
          Designed to capture high impressions during 45-90+ min sessions!
      ───────────────────────────────────────────────────────────── */}
      <div className="p-3 rounded-2xl bg-gradient-to-r from-stone-900 via-stone-900 to-stone-950 border border-stone-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-stone-300">
        <div className="flex items-center gap-3">
          <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-primary/20 text-primary border border-primary/30">
            Developer Sponsor
          </span>
          <p className="text-xs text-stone-300 font-medium">
            <span className="font-bold text-stone-100">Oracle Cloud Always Free Tier:</span> Run Piston execution sandboxes with 4 ARM OCPUs and 24 GB RAM for 0 cost.
          </p>
        </div>
        <a
          href="https://www.oracle.com/cloud/free/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary-light transition-colors self-end sm:self-center shrink-0"
        >
          <span>Explore Infrastructure</span>
          <ExternalLink size={12} />
        </a>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          BUILT-IN WEB IDE CANVAS (VS CODE EXPERIENCE)
      ───────────────────────────────────────────────────────────── */}
      <div className="bg-stone-950 rounded-3xl border border-stone-800 shadow-2xl overflow-hidden flex flex-col min-h-[700px]">
        {/* Workspace Body: Activity Bar + Explorer + Editor Pane + Milestone Drawer */}
        <div className="flex flex-1 overflow-hidden relative">
          
          {/* 1. SLIM ACTIVITY BAR (VS Code Left Strip) */}
          <div className="w-12 bg-stone-900 border-r border-stone-800 flex flex-col items-center py-3 space-y-4 shrink-0 text-stone-400">
            <button
              onClick={() => {
                triggerHaptic('light');
                setIsSidebarOpen(prev => !prev);
              }}
              className={`p-2 rounded-xl transition-colors ${
                isSidebarOpen ? 'text-primary bg-stone-800 shadow-sm' : 'hover:text-stone-200'
              }`}
              title="Toggle File Explorer (Ctrl+B)"
            >
              <FolderTree size={18} />
            </button>

            <button
              onClick={() => {
                triggerHaptic('light');
                setIsMilestoneDrawerOpen(prev => !prev);
              }}
              className={`p-2 rounded-xl transition-colors ${
                isMilestoneDrawerOpen ? 'text-amber-400 bg-stone-800 shadow-sm' : 'hover:text-stone-200'
              }`}
              title="Toggle Milestone Checklist"
            >
              <CheckCircle2 size={18} />
            </button>

            <button
              onClick={() => {
                triggerHaptic('light');
                setIsBottomTerminalOpen(prev => !prev);
              }}
              className={`p-2 rounded-xl transition-colors ${
                isBottomTerminalOpen ? 'text-emerald-400 bg-stone-800 shadow-sm' : 'hover:text-stone-200'
              }`}
              title="Toggle Terminal Drawer"
            >
              <Terminal size={18} />
            </button>

            <button
              onClick={handleReviewCode}
              disabled={isReviewing}
              className="p-2 rounded-xl text-primary hover:text-primary-light hover:bg-stone-800 transition-colors"
              title="AI Code Review & Verification"
            >
              <Sparkles size={18} />
            </button>
          </div>

          {/* 2. FILE EXPLORER SIDEBAR */}
          <AnimatePresence initial={false}>
            {isSidebarOpen && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 220, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="bg-stone-900/90 border-r border-stone-800 flex flex-col shrink-0 overflow-hidden"
              >
                {/* Explorer Header */}
                <div className="px-3.5 py-3 border-b border-stone-800 flex items-center justify-between text-xs font-bold text-stone-300">
                  <div className="flex items-center gap-1.5 uppercase tracking-wider text-[11px] text-stone-400">
                    <FolderTree size={13} />
                    <span>Explorer</span>
                  </div>
                  <button
                    onClick={() => setShowNewFileInput(prev => !prev)}
                    className="p-1 rounded text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors"
                    title="New File"
                  >
                    <FilePlus size={14} />
                  </button>
                </div>

                {/* Inline New File Input */}
                {showNewFileInput && (
                  <div className="p-2 border-b border-stone-800 bg-stone-950 flex items-center gap-1">
                    <input
                      type="text"
                      placeholder="filename.rs"
                      value={newFileName}
                      onChange={(e) => setNewFileName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleCreateNewFile()}
                      autoFocus
                      className="w-full text-xs bg-stone-900 border border-stone-700 rounded px-2 py-1 text-stone-200 focus:outline-none focus:border-primary"
                    />
                    <button
                      onClick={handleCreateNewFile}
                      className="px-2 py-1 rounded bg-primary text-white text-[10px] font-bold"
                    >
                      Add
                    </button>
                  </div>
                )}

                {/* File Tree List */}
                <div className="p-2 space-y-1 overflow-y-auto flex-1 font-mono text-xs">
                  <div className="text-[10px] text-stone-500 font-bold px-2 py-1 uppercase tracking-wider">
                    {project.topic.toLowerCase().replace(/[^a-z0-9]/g, '_')}
                  </div>

                  {virtualFiles.map(file => {
                    const isActive = activeFileId === file.id;
                    const ext = file.name.split('.').pop() || '';

                    return (
                      <button
                        key={file.id}
                        onClick={() => handleOpenFile(file)}
                        className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors text-xs ${
                          isActive
                            ? 'bg-stone-800 text-primary font-bold shadow-sm'
                            : 'text-stone-400 hover:bg-stone-800/50 hover:text-stone-200'
                        }`}
                      >
                        <FileCode size={14} className={
                          ext === 'rs' ? 'text-amber-500' :
                          ext === 'dart' ? 'text-sky-400' :
                          ext === 'toml' || ext === 'yaml' ? 'text-rose-400' :
                          'text-stone-400'
                        } />
                        <span className="truncate">{file.name}</span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 3. CENTRAL CODE EDITOR PANE */}
          <div className="flex-1 flex flex-col min-w-0 bg-stone-950">
            {/* Tabs Header Bar */}
            <div className="bg-stone-900 border-b border-stone-800 flex items-center justify-between overflow-x-auto no-scrollbar">
              <div className="flex items-center">
                {openTabs.map(tab => {
                  const isActive = activeFileId === tab.id;

                  return (
                    <div
                      key={tab.id}
                      onClick={() => {
                        triggerHaptic('light');
                        setActiveFileId(tab.id);
                      }}
                      className={`cursor-pointer flex items-center gap-2 px-3.5 py-2.5 border-r border-stone-800 text-xs font-mono transition-colors border-t-2 ${
                        isActive
                          ? 'bg-stone-950 text-stone-100 border-t-primary font-bold'
                          : 'bg-stone-900 text-stone-400 border-t-transparent hover:bg-stone-850 hover:text-stone-300'
                      }`}
                    >
                      <FileCode size={13} className="text-primary" />
                      <span>{tab.name}</span>
                      <button
                        onClick={(e) => handleCloseTab(tab.id, e)}
                        className="text-stone-500 hover:text-stone-300 p-0.5 rounded"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Editor Action Buttons: Run Code, Copy, Review */}
              <div className="flex items-center gap-2 px-3 shrink-0">
                <button
                  onClick={() => copyToClipboard(currentCode)}
                  className="p-1.5 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors"
                  title="Copy File Code"
                >
                  {copiedCode ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                </button>

                <button
                  onClick={() => handleRunCommand('cargo check')}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition-all active:scale-95"
                >
                  <Play size={12} />
                  <span>Run Check</span>
                </button>
              </div>
            </div>

            {/* Central Code Area with Line Numbers Gutter */}
            <div className="flex-1 flex overflow-hidden relative">
              {/* Line Numbers Gutter */}
              <div className="w-12 py-3 bg-stone-950 select-none text-right pr-3 font-mono text-xs text-stone-600 border-r border-stone-800/60 leading-6 shrink-0">
                {Array.from({ length: lineCount }).map((_, i) => (
                  <div key={i}>{i + 1}</div>
                ))}
              </div>

              {/* Code Textarea */}
              <textarea
                value={currentCode}
                onChange={(e) => handleCodeChange(e.target.value)}
                onKeyDown={handleKeyDown}
                spellCheck={false}
                placeholder="// Type or paste your code here..."
                className="flex-1 p-3 bg-stone-950 text-stone-100 font-mono text-xs sm:text-sm leading-6 resize-none focus:outline-none overflow-y-auto selection:bg-primary/30"
              />
            </div>

            {/* 4. COLLAPSIBLE BOTTOM TERMINAL DRAWER */}
            <AnimatePresence>
              {isBottomTerminalOpen && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: 190 }}
                  exit={{ height: 0 }}
                  transition={{ duration: 0.15 }}
                  className="border-t border-stone-800 bg-stone-950 flex flex-col shrink-0 overflow-hidden"
                >
                  {/* Terminal Header Tabs */}
                  <div className="px-4 py-1.5 bg-stone-900 border-b border-stone-800 flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => setBottomTab('terminal')}
                        className={`flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px] ${
                          bottomTab === 'terminal' ? 'text-primary' : 'text-stone-500 hover:text-stone-300'
                        }`}
                      >
                        <Terminal size={12} />
                        <span>Terminal</span>
                      </button>

                      <button
                        onClick={() => setBottomTab('output')}
                        className={`flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px] ${
                          bottomTab === 'output' ? 'text-primary' : 'text-stone-500 hover:text-stone-300'
                        }`}
                      >
                        <Play size={12} />
                        <span>Output</span>
                      </button>

                      <button
                        onClick={() => setBottomTab('diagnostics')}
                        className={`flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px] ${
                          bottomTab === 'diagnostics' ? 'text-primary' : 'text-stone-500 hover:text-stone-300'
                        }`}
                      >
                        <Bug size={12} />
                        <span>Diagnostics</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRunCommand('cargo test')}
                        className="text-[10px] px-2 py-0.5 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold transition-colors"
                      >
                        Run cargo test
                      </button>

                      <button
                        onClick={() => setIsBottomTerminalOpen(false)}
                        className="text-stone-500 hover:text-stone-300"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Terminal Logs View */}
                  <div className="flex-1 p-3 overflow-y-auto font-mono text-xs space-y-1 bg-black/60 text-stone-300">
                    {terminalLogs.map((log, lIdx) => (
                      <div
                        key={lIdx}
                        className={
                          log.type === 'cmd' ? 'text-primary font-bold' :
                          log.type === 'success' ? 'text-emerald-400' :
                          log.type === 'warn' ? 'text-amber-400' :
                          log.type === 'error' ? 'text-rose-400' :
                          'text-stone-400'
                        }
                      >
                        {log.text}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 5. RIGHT DOCKABLE MILESTONE & CRITERIA DRAWER */}
          <AnimatePresence initial={false}>
            {isMilestoneDrawerOpen && activeMilestone && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 330, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="bg-stone-900 border-l border-stone-800 flex flex-col shrink-0 overflow-y-auto p-4 space-y-4"
              >
                {/* Milestone Selector Tabs */}
                <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                  <div className="text-xs font-black uppercase tracking-wider text-primary">
                    Milestone Roadmap
                  </div>
                  <button
                    onClick={() => setIsMilestoneDrawerOpen(false)}
                    className="text-stone-500 hover:text-stone-300"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  {project.milestones.map((m, mIdx) => {
                    const isActive = mIdx === activeMilestoneIndex;
                    const isDone = !!m.completed;

                    return (
                      <button
                        key={m.id || mIdx}
                        onClick={() => {
                          triggerHaptic('light');
                          setActiveMilestoneIndex(mIdx);
                        }}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                          isActive
                            ? 'bg-primary text-white shadow-sm'
                            : isDone
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-stone-800 text-stone-400 hover:text-stone-200'
                        }`}
                      >
                        {isDone ? <Check size={12} /> : <span>{mIdx + 1}</span>}
                      </button>
                    );
                  })}
                </div>

                {/* Active Milestone Title & Objective */}
                <div className="space-y-2">
                  <h3 className="text-sm font-black text-stone-100">
                    {activeMilestone.title}
                  </h3>
                  <p className="text-xs text-stone-400 leading-relaxed bg-stone-950 p-3 rounded-xl border border-stone-800">
                    {activeMilestone.objective}
                  </p>
                </div>

                {/* Hint Card */}
                {activeMilestone.starterHint && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 leading-relaxed">
                    <span className="font-bold block mb-0.5">💡 Hint:</span>
                    {activeMilestone.starterHint}
                  </div>
                )}

                {/* Acceptance Criteria Checklist */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-xs font-bold text-stone-300">
                    <span>Acceptance Criteria</span>
                    <span className="text-[11px] text-stone-500">
                      {activeMilestone.criteria.filter(c => activeMilestone.completedCriteria?.[c]).length}/{activeMilestone.criteria.length}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {activeMilestone.criteria.map((criterion, cIdx) => {
                      const isChecked = !!activeMilestone.completedCriteria?.[criterion];

                      return (
                        <div
                          key={cIdx}
                          onClick={() => handleToggleCriterion(criterion)}
                          className={`cursor-pointer p-2.5 rounded-xl border text-xs transition-all flex items-start gap-2.5 ${
                            isChecked
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-stone-200'
                              : 'bg-stone-950 border-stone-800 hover:border-stone-700 text-stone-300'
                          }`}
                        >
                          <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                            isChecked
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : 'border-stone-600'
                          }`}>
                            {isChecked && <Check size={11} />}
                          </div>
                          <span className={`leading-relaxed ${
                            isChecked ? 'line-through text-stone-500' : 'text-stone-300'
                          }`}>
                            {criterion}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Review Code Button */}
                <div className="pt-3 border-t border-stone-800">
                  <button
                    onClick={handleReviewCode}
                    disabled={isReviewing}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary hover:bg-primary-dark disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-primary/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
                  >
                    {isReviewing ? (
                      <>
                        <RefreshCw size={13} className="animate-spin" />
                        <span>Auditing Code...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={14} />
                        <span>Run AI Code Review</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 6. BOTTOM STATUS BAR (VS Code Style) */}
        <div className="px-4 py-1.5 bg-primary/95 text-white flex items-center justify-between text-[11px] font-medium shrink-0">
          <div className="flex items-center gap-3">
            <span className="font-bold">Relearn IDE</span>
            <span>•</span>
            <span>{activeFile?.name || 'No file selected'}</span>
            <span>•</span>
            <span>UTF-8</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="capitalize">{activeFile?.language || 'Plain Text'}</span>
            <span>•</span>
            <span className="text-white/80">60 FPS</span>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          AI CODE REVIEW MODAL
      ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showReviewModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl space-y-6"
            >
              <div className="flex items-start justify-between border-b border-stone-200 dark:border-stone-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-stone-900 dark:text-stone-100">
                      AI Code Review & Audit
                    </h3>
                    <p className="text-xs text-stone-500">
                      Rigorous static & architectural feedback for {activeMilestone?.title}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowReviewModal(false)}
                  className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
                >
                  <X size={18} />
                </button>
              </div>

              {isReviewing ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-3">
                  <RefreshCw size={32} className="animate-spin text-primary" />
                  <p className="text-sm font-bold text-stone-800 dark:text-stone-200">
                    Analyzing code against acceptance criteria...
                  </p>
                  <p className="text-xs text-stone-400">
                    Checking memory safety, invariants, and syntax conventions.
                  </p>
                </div>
              ) : reviewResult ? (
                <div className="space-y-5">
                  {/* Score & Verdict Card */}
                  <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 flex items-center justify-between">
                    <div>
                      <div className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                        Audit Verdict
                      </div>
                      <div className={`text-xl font-black mt-0.5 ${
                        reviewResult.verdict === 'Outstanding' ? 'text-primary' :
                        reviewResult.verdict === 'Pass' ? 'text-emerald-500' :
                        'text-amber-500'
                      }`}>
                        {reviewResult.verdict}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                        Mastery Score
                      </div>
                      <div className="text-2xl font-black text-stone-900 dark:text-stone-100">
                        {reviewResult.score}/100
                      </div>
                    </div>
                  </div>

                  {/* Summary */}
                  <p className="text-xs sm:text-sm text-stone-700 dark:text-stone-300 leading-relaxed">
                    {reviewResult.summary}
                  </p>

                  {/* Strengths */}
                  {reviewResult.strengths?.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                        ✓ Architectural Strengths
                      </h4>
                      <ul className="space-y-1 text-xs text-stone-600 dark:text-stone-400 list-disc pl-4">
                        {reviewResult.strengths.map((s, idx) => (
                          <li key={idx}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Suggestions */}
                  {reviewResult.suggestions?.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                        ⚡ Improvement Opportunities
                      </h4>
                      <ul className="space-y-1 text-xs text-stone-600 dark:text-stone-400 list-disc pl-4">
                        {reviewResult.suggestions.map((s, idx) => (
                          <li key={idx}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="pt-3 border-t border-stone-200 dark:border-stone-800 flex justify-end">
                    <button
                      onClick={() => setShowReviewModal(false)}
                      className="px-5 py-2 rounded-xl bg-primary text-white text-xs font-bold shadow-md hover:bg-primary-dark transition-all"
                    >
                      Done & Return to Editor
                    </button>
                  </div>
                </div>
              ) : null}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─────────────────────────────────────────────────────────────
          CONFIRMATION MODAL: DELETE PROJECT
      ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-6 max-w-md w-full shadow-2xl space-y-5"
            >
              <div className="flex items-center gap-3 text-rose-500">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/10 flex items-center justify-center">
                  <AlertCircle size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-stone-900 dark:text-stone-100">
                    Delete Project Lab?
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    This will delete this project lab from your workspace.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold shadow-md shadow-rose-500/20 transition-all"
                >
                  Delete Project
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
export default ProjectWorkspacePage;
