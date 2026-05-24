import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Flashcard, generateFlashcards } from '../services/gemini/flashcardService';
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
import { useData } from '../contexts/DataContext';
import { getContentLanguageLabel } from '../services/youtubeService';
import { triggerHaptic } from '../utils/haptics';

interface FlashcardModuleProps {
  topic: string;
  content: string;
}

type Confidence = 'hard' | 'good' | 'easy';

const FlashcardModule: React.FC<FlashcardModuleProps> = ({ topic, content }) => {
  const { contentLanguage } = useData();
  const [cards, setCards] = useState<(Flashcard & { confidence?: Confidence })[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [error, setError] = useState('');
  const [showSummary, setShowSummary] = useState(false);

  const handleGenerate = async () => {
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
  };

  const handleGrade = (confidence: Confidence) => {
    triggerHaptic(confidence === 'easy' ? 'success' : 'light');
    const updatedCards = [...cards];
    updatedCards[currentIndex] = { ...updatedCards[currentIndex], confidence };
    setCards(updatedCards);

    if (currentIndex < cards.length - 1) {
      setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
        setIsFlipped(false);
      }, 300);
    } else {
      setTimeout(() => setShowSummary(true), 500);
    }
  };

  const resetDeck = () => {
    setCards(cards.map(c => ({ ...c, confidence: undefined })));
    setCurrentIndex(0);
    setIsFlipped(false);
    setShowSummary(false);
    triggerHaptic('medium');
  };

  if (loading) {
    return (
      <div className="glass-card noise-overlay p-12 rounded-3xl flex flex-col items-center justify-center gap-6 overflow-hidden">
        <div className="relative">
          <motion.div 
            className="absolute inset-0 bg-primary/20 blur-2xl rounded-full"
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <Loader2 className="animate-spin text-primary relative z-10" size={48} />
        </div>
        <div className="text-center space-y-2">
          <p className="text-lg font-black tracking-tight">Quantum Memory Synthesis</p>
          <p className="text-xs text-stone-500 font-bold uppercase tracking-widest animate-pulse">Encoding concepts into active recall nodes...</p>
        </div>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="group relative overflow-hidden glass-card noise-overlay p-10 rounded-[3rem] border-primary/10 transition-all hover:shadow-2xl hover:shadow-primary/5"
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
          className="w-full py-6 bg-gradient-to-r from-primary to-secondary text-white font-black rounded-[2rem] shadow-2xl shadow-primary/30 flex items-center justify-center gap-4 overflow-hidden relative group/btn"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000" />
          <Sparkles size={22} className="glow-primary" /> 
          <span className="uppercase tracking-[0.2em] text-sm">Initialize Synthesis</span>
        </motion.button>
      </motion.div>
    );
  }

  if (showSummary) {
    const easyCount = cards.filter(c => c.confidence === 'easy').length;
    const goodCount = cards.filter(c => c.confidence === 'good').length;
    const hardCount = cards.filter(c => c.confidence === 'hard').length;
    const mastery = Math.round((easyCount * 100 + goodCount * 60 + hardCount * 20) / cards.length);

    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="glass-card noise-overlay p-10 rounded-[3rem] text-center space-y-10 relative overflow-hidden"
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
            { label: 'Mastered', count: easyCount, color: 'emerald', icon: Zap },
            { label: 'Encoded', count: goodCount, color: 'amber', icon: CheckCircle2 },
            { label: 'Recall Fail', count: hardCount, color: 'rose', icon: RotateCcw }
          ].map((stat) => (
            <div key={stat.label} className="p-6 rounded-3xl bg-white/50 dark:bg-white/5 border border-white/20 dark:border-white/5 shadow-xl">
              <p className={`text-3xl font-black text-${stat.color}-500 mb-1`}>{stat.count}</p>
              <p className="text-[9px] font-black uppercase text-slate-400 tracking-tighter">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="space-y-4 relative">
          <div className="flex justify-between text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 px-2">
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
            className="flex-1 py-5 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-white/10 transition-all flex items-center justify-center gap-3"
          >
            <History size={18} /> Re-run Neural Loop
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02, x: 5 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleGenerate}
            className="flex-1 py-5 bg-gradient-to-r from-primary to-secondary text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-primary/20 flex items-center justify-center gap-3"
          >
            <Zap size={18} /> New Matrix
          </motion.button>
        </div>
      </motion.div>
    );
  }

  const currentCard = cards[currentIndex];

  return (
    <div className="space-y-8">
      {/* Header Info */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            {cards.map((c, i) => (
              <motion.div 
                key={i}
                initial={false}
                animate={{ 
                  width: i === currentIndex ? 24 : 8,
                  backgroundColor: i === currentIndex ? '#13a4ec' : c.confidence ? '#10b981' : 'rgba(148, 163, 184, 0.2)'
                }}
                className="h-2 rounded-full border border-white/10 dark:border-white/5 transition-colors"
              />
            ))}
          </div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            {currentIndex + 1} of {cards.length}
          </span>
        </div>
        <motion.button 
          whileHover={{ rotate: 180, scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={resetDeck}
          className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-400 hover:text-primary transition-colors"
        >
          <RotateCcw size={16} />
        </motion.button>
      </div>

      {/* 3D Flashcard */}
      <div 
        className="relative h-96 w-full perspective-1000 cursor-pointer group"
        onClick={() => { setIsFlipped(!isFlipped); triggerHaptic('light'); }}
      >
        <motion.div
          className="w-full h-full relative"
          initial={false}
          animate={{ 
            rotateY: isFlipped ? 180 : 0,
            rotateX: isFlipped ? 5 : 0
          }}
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.7, type: 'spring', stiffness: 200, damping: 25 }}
          style={{ transformStyle: 'preserve-3d', willChange: 'transform' }}
        >
          {/* Front */}
          <div 
            className="absolute inset-0 w-full h-full glass-card noise-overlay rounded-[3rem] p-12 flex flex-col items-center justify-center text-center backface-hidden"
          >
            <div className="absolute top-10 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-1.5 bg-primary/10 rounded-full border border-primary/20">
              <Brain size={12} className="text-primary" />
              <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Neural Probe</span>
            </div>
            
            <p className="text-3xl font-black text-slate-800 dark:text-white leading-tight tracking-tight">
              {currentCard.front}
            </p>
            
            <div className="absolute bottom-10 flex items-center gap-2 text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] animate-pulse">
              <Target size={14} className="text-primary" /> Tap to reveal synthesis
            </div>
          </div>

          {/* Back */}
          <div 
            className="absolute inset-0 w-full h-full glass-card noise-overlay bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20 rounded-[3rem] p-12 flex flex-col items-center justify-center text-center backface-hidden shadow-inner overflow-hidden"
            style={{ transform: 'rotateY(180deg)' }}
          >
            <div className="absolute top-10 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-1.5 bg-emerald-500/10 rounded-full border border-emerald-500/20">
              <Zap size={12} className="text-emerald-500" />
              <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em]">Synthesis Engine</span>
            </div>

            <div className="max-h-52 overflow-y-auto no-scrollbar scroll-smooth">
              <p className="text-xl font-bold text-slate-800 dark:text-slate-100 leading-relaxed">
                {currentCard.back}
              </p>
            </div>
            
            {currentCard.mnemonic && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-8 p-5 bg-white/40 dark:bg-black/20 rounded-[2rem] flex items-start gap-4 text-xs text-slate-700 dark:text-slate-300 font-bold text-left border border-white/20 dark:border-white/5 shadow-xl backdrop-blur-md"
              >
                <div className="p-2 rounded-2xl bg-amber-500/20">
                    <Lightbulb size={18} className="shrink-0 text-amber-500 glow-secondary" />
                </div>
                <div className="space-y-1">
                    <p className="text-[9px] font-black uppercase tracking-widest text-amber-500">Memory Anchor</p>
                    <p className="leading-relaxed opacity-80">{currentCard.mnemonic}</p>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Grading Controls */}
      <div className="space-y-6">
        <AnimatePresence mode="wait">
          {!isFlipped ? (
            <motion.div 
              key="controls-nav"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="flex gap-4"
            >
              <motion.button
                whileHover={{ x: -5 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => { setCurrentIndex(prev => Math.max(0, prev - 1)); setIsFlipped(false); }}
                disabled={currentIndex === 0}
                className="flex-1 py-5 glass-card text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest disabled:opacity-20 transition-all"
              >
                <ChevronLeft size={20} className="mx-auto" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => { setIsFlipped(true); triggerHaptic('light'); }}
                className="flex-[3] py-5 bg-gradient-to-r from-primary to-secondary text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-primary/30"
              >
                Show Synthesis
              </motion.button>
              <motion.button
                whileHover={{ x: 5 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => { setCurrentIndex(prev => Math.min(cards.length - 1, prev + 1)); setIsFlipped(false); }}
                disabled={currentIndex === cards.length - 1}
                className="flex-1 py-5 glass-card text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest disabled:opacity-20 transition-all"
              >
                <ChevronRight size={20} className="mx-auto" />
              </motion.button>
            </motion.div>
          ) : (
            <motion.div 
              key="controls-grade"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-3 gap-4"
            >
              {[
                { type: 'hard', color: 'rose', icon: RotateCcw, label: 'Recall Fail' },
                { type: 'good', color: 'amber', icon: CheckCircle2, label: 'Encoded' },
                { type: 'easy', color: 'emerald', icon: Zap, label: 'Mastered' }
              ].map((grade) => (
                <motion.button
                  key={grade.type}
                  whileHover={{ y: -5 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleGrade(grade.type as Confidence)}
                  className={`group flex flex-col items-center gap-3 p-6 bg-${grade.color}-500/10 border border-${grade.color}-500/20 rounded-[2rem] transition-all hover:bg-${grade.color}-500/20`}
                >
                  <div className={`w-12 h-12 rounded-full bg-${grade.color}-500 text-white flex items-center justify-center shadow-2xl shadow-${grade.color}-500/40`}>
                    <grade.icon size={20} />
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-widest text-${grade.color}-600 dark:text-${grade.color}-400`}>
                    {grade.label}
                  </span>
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default FlashcardModule;
