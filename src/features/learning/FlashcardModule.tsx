import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Flashcard, generateFlashcards } from '../../services/ai/flashcardService';
import { 
  Brain, 
  RotateCcw, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  Loader2,
  Lightbulb,
  CheckCircle2,
  Zap,
  History,
  Target
} from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { getContentLanguageLabel } from '../../services/api/youtubeService';
import { triggerHaptic } from '../../utils/haptics';

interface FlashcardModuleProps {
  topic: string;
  content: string;
}

type Confidence = 'hard' | 'good' | 'easy';

const GRADE_CONFIG = {
  hard: {
    type: 'hard' as Confidence,
    icon: RotateCcw,
    label: 'Need Review',
    buttonClass: 'bg-rose-500/10 border-rose-500/20 hover:bg-rose-500/20',
    iconClass: 'bg-rose-500 shadow-rose-500/40 text-white',
    textClass: 'text-rose-600 dark:text-rose-400',
    statTextClass: 'text-rose-500'
  },
  good: {
    type: 'good' as Confidence,
    icon: CheckCircle2,
    label: 'Encoded',
    buttonClass: 'bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20',
    iconClass: 'bg-amber-500 shadow-amber-500/40 text-white',
    textClass: 'text-amber-600 dark:text-amber-400',
    statTextClass: 'text-amber-500'
  },
  easy: {
    type: 'easy' as Confidence,
    icon: Zap,
    label: 'Mastered',
    buttonClass: 'bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20',
    iconClass: 'bg-emerald-500 shadow-emerald-500/40 text-white',
    textClass: 'text-emerald-600 dark:text-emerald-400',
    statTextClass: 'text-emerald-500'
  }
};

const FlashcardLoadingState: React.FC = React.memo(() => (
  <div className="glass-card noise-overlay p-12 rounded-3xl flex flex-col items-center justify-center gap-6 overflow-hidden transform-gpu">
    <div className="relative">
      <motion.div 
        className="absolute inset-0 bg-primary/20 blur-2xl rounded-full transform-gpu"
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        style={{ willChange: "transform, opacity" }}
      />
      <Loader2 className="animate-spin text-primary relative z-10 transform-gpu" size={48} />
    </div>
    <div className="text-center space-y-2 relative z-10">
      <p className="text-lg font-black tracking-tight">Quantum Memory Synthesis</p>
      <p className="text-xs text-stone-500 font-bold uppercase tracking-widest animate-pulse">
        Encoding concepts into active recall nodes...
      </p>
    </div>
  </div>
));

FlashcardLoadingState.displayName = 'FlashcardLoadingState';

const FlashcardModule: React.FC<FlashcardModuleProps> = ({ topic, content }) => {
  const { contentLanguage } = useData();
  const [cards, setCards] = useState<(Flashcard & { confidence?: Confidence })[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [, setError] = useState('');
  const [showSummary, setShowSummary] = useState(false);

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      triggerHaptic('medium');
      const generated = await generateFlashcards(topic, content, getContentLanguageLabel(contentLanguage));
      setCards(generated);
      setCurrentIndex(0);
      setIsFlipped(false);
      setShowSummary(false);
    } catch (err: any) {
      setError('Failed to generate flashcards. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [topic, content, contentLanguage]);

  const handleGrade = useCallback((confidence: Confidence) => {
    triggerHaptic(confidence === 'easy' ? 'success' : 'light');
    setCards(prevCards => {
      const updated = [...prevCards];
      if (updated[currentIndex]) {
        updated[currentIndex] = { ...updated[currentIndex], confidence };
      }
      return updated;
    });

    if (currentIndex < cards.length - 1) {
      setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
        setIsFlipped(false);
      }, 300);
    } else {
      setTimeout(() => setShowSummary(true), 500);
    }
  }, [currentIndex, cards.length]);

  const resetDeck = useCallback(() => {
    setCards(prevCards => prevCards.map(c => ({ ...c, confidence: undefined })));
    setCurrentIndex(0);
    setIsFlipped(false);
    setShowSummary(false);
    triggerHaptic('medium');
  }, []);

  const summaryData = useMemo(() => {
    if (!showSummary || cards.length === 0) {
      return { easyCount: 0, goodCount: 0, hardCount: 0, mastery: 0 };
    }
    const easyCount = cards.filter(c => c.confidence === 'easy').length;
    const goodCount = cards.filter(c => c.confidence === 'good').length;
    const hardCount = cards.filter(c => c.confidence === 'hard').length;
    const mastery = Math.round((easyCount * 100 + goodCount * 60 + hardCount * 20) / cards.length);
    return { easyCount, goodCount, hardCount, mastery };
  }, [showSummary, cards]);

  if (loading) {
    return <FlashcardLoadingState />;
  }

  if (cards.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="group relative overflow-hidden glass-card noise-overlay p-10 rounded-[3rem] border-primary/10 transition-all hover:shadow-2xl hover:shadow-primary/5 transform-gpu"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        
        <div className="flex items-center gap-5 mb-8 relative">
          <div className="w-16 h-16 rounded-[2rem] bg-primary/10 flex items-center justify-center glow-primary">
            <Brain className="text-primary" size={32} />
          </div>
          <div>
            <h3 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white">Active Recall Deck</h3>
            <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Neural Retention Engine Active</p>
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleGenerate}
          className="w-full py-6 bg-gradient-to-r from-primary to-secondary text-white font-black rounded-[2rem] shadow-2xl shadow-primary/30 flex items-center justify-center gap-4 overflow-hidden relative group/btn transform-gpu"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000" />
          <Sparkles size={22} className="glow-primary" /> 
          <span className="uppercase tracking-[0.2em] text-sm">Initialize Synthesis</span>
        </motion.button>
      </motion.div>
    );
  }

  if (showSummary) {
    const { easyCount, goodCount, hardCount, mastery } = summaryData;

    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="glass-card noise-overlay p-10 rounded-[3rem] text-center space-y-10 relative overflow-hidden transform-gpu"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
        
        <div className="space-y-4 relative">
          <div className="inline-flex p-5 rounded-[2rem] bg-emerald-500/10 text-emerald-500 mb-2 glow-secondary">
            <CheckCircle2 size={48} />
          </div>
          <h3 className="text-3xl font-black tracking-tight text-slate-800 dark:text-white">Session Complete</h3>
          <p className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Neural Mastery Synthesized</p>
        </div>

        <div className="grid grid-cols-3 gap-4 relative">
          {[
            { label: 'Mastered', count: easyCount, config: GRADE_CONFIG.easy },
            { label: 'Encoded', count: goodCount, config: GRADE_CONFIG.good },
            { label: 'Need Review', count: hardCount, config: GRADE_CONFIG.hard }
          ].map((stat) => (
            <div key={stat.label} className="p-6 rounded-3xl bg-white/50 dark:bg-white/5 border border-white/20 dark:border-white/5 shadow-xl">
              <p className={`text-3xl font-black ${stat.config.statTextClass} mb-1`}>{stat.count}</p>
              <p className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="space-y-4 relative">
          <div className="flex justify-between text-[11px] font-bold uppercase tracking-[0.2em] text-slate-600 dark:text-slate-400 px-2">
            <span>Neural Retention</span>
            <span className="text-primary">{mastery}%</span>
          </div>
          <div className="h-4 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden p-1 border border-white/20 dark:border-white/5">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${mastery}%` }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className="h-full rounded-full bg-gradient-to-r from-primary via-secondary to-primary bg-[length:200%_auto] animate-gradient shadow-[0_0_20px_rgba(19,164,236,0.4)]"
            />
          </div>
        </div>

        <div className="flex gap-4 relative">
          <motion.button
            whileHover={{ scale: 1.02, x: -5 }}
            whileTap={{ scale: 0.98 }}
            onClick={resetDeck}
            className="flex-1 py-5 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-200 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-white/10 transition-all flex items-center justify-center gap-3 transform-gpu"
          >
            <History size={18} /> Re-run Neural Loop
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02, x: 5 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleGenerate}
            className="flex-1 py-5 bg-gradient-to-r from-primary to-secondary text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-2xl shadow-primary/20 flex items-center justify-center gap-3 transform-gpu"
          >
            <Zap size={18} /> New Matrix
          </motion.button>
        </div>
      </motion.div>
    );
  }

  const currentCard = cards[currentIndex];

  const getDotColor = (c: (Flashcard & { confidence?: Confidence }), i: number) => {
    if (i === currentIndex) return '#13a4ec';
    if (c.confidence === 'easy') return '#10b981';
    if (c.confidence === 'good') return '#f59e0b';
    if (c.confidence === 'hard') return '#f43f5e';
    return 'rgba(148, 163, 184, 0.35)';
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5 items-center">
            {cards.map((c, i) => (
              <motion.div 
                key={i}
                initial={false}
                animate={{ 
                  width: i === currentIndex ? 24 : 8,
                  backgroundColor: getDotColor(c, i)
                }}
                className="h-2 rounded-full border border-black/5 dark:border-white/10 transform-gpu"
              />
            ))}
          </div>
          <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
            {currentIndex + 1} of {cards.length}
          </span>
        </div>
        <motion.button 
          whileHover={{ rotate: 180, scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={resetDeck}
          aria-label="Reset Deck"
          className="p-2 rounded-xl bg-slate-100 dark:bg-stone-800 text-slate-600 dark:text-slate-300 hover:text-primary transition-colors transform-gpu"
          title="Reset Deck"
        >
          <RotateCcw size={16} />
        </motion.button>
      </div>

      {/* 3D Flashcard */}
      <div 
        tabIndex={0}
        role="button"
        aria-label={`Flashcard ${currentIndex + 1} of ${cards.length}: ${isFlipped ? 'Answer showing. Click or press Space or Enter to flip to prompt.' : 'Question showing. Click or press Space or Enter to flip to answer.'}`}
        onKeyDown={(e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            setIsFlipped(f => !f);
            triggerHaptic('light');
          }
        }}
        className="relative min-h-[22rem] w-full perspective-1000 cursor-pointer group transform-gpu focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-[2.5rem]"
        onClick={() => { setIsFlipped(!isFlipped); triggerHaptic('light'); }}
      >
        <motion.div
          className="w-full h-full min-h-[22rem] relative transform-gpu"
          initial={false}
          animate={{ 
            rotateY: isFlipped ? 180 : 0,
            rotateX: isFlipped ? 3 : 0
          }}
          whileHover={{ scale: 1.01 }}
          transition={{ duration: 0.6, type: 'spring', stiffness: 220, damping: 25 }}
          style={{ transformStyle: 'preserve-3d', willChange: 'transform' }}
        >
          {/* Front */}
          <div 
            className="w-full h-full min-h-[22rem] bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 noise-overlay rounded-[2.5rem] p-8 sm:p-10 flex flex-col justify-between text-center backface-hidden shadow-xl transform-gpu"
          >
            <div className="flex items-center justify-center">
              <div className="flex items-center gap-2 px-4 py-1.5 bg-primary/10 rounded-full border border-primary/20">
                <Brain size={14} className="text-primary" />
                <span className="text-[11px] font-bold text-primary uppercase tracking-wider">Neural Probe</span>
              </div>
            </div>
            
            <div className="my-auto py-6 flex items-center justify-center">
              <p className="text-xl sm:text-2xl md:text-3xl font-black text-slate-800 dark:text-white leading-relaxed tracking-tight max-w-xl">
                {currentCard?.front}
              </p>
            </div>
            
            <div className="flex items-center justify-center gap-2 text-xs text-primary font-bold tracking-wide">
              <Target size={14} /> Tap card or click Show Synthesis
            </div>
          </div>

          {/* Back */}
          <div 
            className="absolute inset-0 w-full h-full min-h-[22rem] bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 noise-overlay bg-gradient-to-br from-primary/5 to-secondary/5 rounded-[2.5rem] p-8 sm:p-10 flex flex-col justify-between text-center backface-hidden shadow-inner overflow-hidden transform-gpu"
            style={{ transform: 'rotateY(180deg)' }}
          >
            <div className="flex items-center justify-center">
              <div className="flex items-center gap-2 px-4 py-1.5 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                <Zap size={14} className="text-emerald-500" />
                <span className="text-[11px] font-bold text-emerald-500 uppercase tracking-wider">Synthesis Engine</span>
              </div>
            </div>

            <div className="my-auto py-4 max-h-48 overflow-y-auto no-scrollbar scroll-smooth">
              <p className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-100 leading-relaxed max-w-xl mx-auto">
                {currentCard?.back}
              </p>
            </div>
            
            {currentCard?.mnemonic ? (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2 p-4 bg-white/60 dark:bg-black/30 rounded-2xl flex items-start gap-3 text-xs text-slate-700 dark:text-slate-300 font-medium text-left border border-white/20 dark:border-white/5 shadow-md backdrop-blur-md transform-gpu"
              >
                <div className="p-1.5 rounded-xl bg-amber-500/20 shrink-0">
                  <Lightbulb size={16} className="text-amber-500" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Memory Anchor</p>
                  <p className="leading-snug opacity-90">{currentCard.mnemonic}</p>
                </div>
              </motion.div>
            ) : <div className="h-2" />}
          </div>
        </motion.div>
      </div>

      {/* Grading Controls */}
      <div className="space-y-4">
        <AnimatePresence mode="wait">
          {!isFlipped ? (
            <motion.div 
              key="controls-nav"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="flex gap-4 transform-gpu"
            >
              <motion.button
                whileHover={{ x: -3 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => { setCurrentIndex(prev => Math.max(0, prev - 1)); setIsFlipped(false); }}
                disabled={currentIndex === 0}
                aria-label="Previous Card"
                className="flex-1 py-4 glass-card text-slate-700 dark:text-slate-300 rounded-2xl font-bold text-xs uppercase tracking-widest disabled:opacity-30 transition-colors duration-200 transform-gpu hover:bg-slate-100 dark:hover:bg-stone-800"
                title="Previous Card"
              >
                <ChevronLeft size={20} className="mx-auto" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => { setIsFlipped(true); triggerHaptic('light'); }}
                className="flex-[3] py-4 bg-gradient-to-r from-primary to-secondary text-white rounded-2xl font-bold text-xs uppercase tracking-[0.2em] shadow-xl shadow-primary/30 transform-gpu"
              >
                Show Synthesis
              </motion.button>
              <motion.button
                whileHover={{ x: 3 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => { setCurrentIndex(prev => Math.min(cards.length - 1, prev + 1)); setIsFlipped(false); }}
                disabled={currentIndex === cards.length - 1}
                aria-label="Next Card"
                className="flex-1 py-4 glass-card text-slate-700 dark:text-slate-300 rounded-2xl font-bold text-xs uppercase tracking-widest disabled:opacity-30 transition-colors duration-200 transform-gpu hover:bg-slate-100 dark:hover:bg-stone-800"
                title="Next Card"
              >
                <ChevronRight size={20} className="mx-auto" />
              </motion.button>
            </motion.div>
          ) : (
            <motion.div 
              key="controls-grade"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="grid grid-cols-3 gap-4 transform-gpu"
            >
              {[GRADE_CONFIG.hard, GRADE_CONFIG.good, GRADE_CONFIG.easy].map((grade) => {
                const Icon = grade.icon;
                return (
                  <motion.button
                    key={grade.type}
                    whileHover={{ y: -4 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleGrade(grade.type)}
                    className={`group flex flex-col items-center gap-2 p-5 border rounded-2xl transition-colors duration-200 ${grade.buttonClass} transform-gpu`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg ${grade.iconClass}`}>
                      <Icon size={18} />
                    </div>
                    <span className={`text-xs font-bold uppercase tracking-wider ${grade.textClass}`}>
                      {grade.label}
                    </span>
                  </motion.button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default React.memo(FlashcardModule);
