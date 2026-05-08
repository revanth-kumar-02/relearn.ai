import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Flashcard, generateFlashcards } from '../services/gemini/flashcardService';
import { 
  Brain, 
  RotateCcw, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  Loader2,
  Lightbulb
} from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { getContentLanguageLabel } from '../services/youtubeService';

interface FlashcardModuleProps {
  topic: string;
  content: string;
}

const FlashcardModule: React.FC<FlashcardModuleProps> = ({ topic, content }) => {
  const { contentLanguage } = useData();
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    try {
      const generated = await generateFlashcards(topic, content, getContentLanguageLabel(contentLanguage));
      setCards(generated);
      setCurrentIndex(0);
      setIsFlipped(false);
    } catch (err: any) {
      setError('Failed to generate flashcards. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const nextCard = () => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setIsFlipped(false);
    }
  };

  const prevCard = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setIsFlipped(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-stone-50 dark:bg-stone-900/50 p-8 rounded-2xl border border-dashed border-stone-200 dark:border-stone-800 flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-primary" size={32} />
        <p className="text-sm font-bold text-stone-500">Crafting your memory deck...</p>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 p-6 rounded-2xl border border-amber-200/50 dark:border-amber-800/40">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <Brain className="text-amber-500" size={20} />
          </div>
          <div>
            <h3 className="font-bold text-sm">Active Recall Deck</h3>
            <p className="text-xs text-stone-500">Convert this lesson into interactive flashcards</p>
          </div>
        </div>
        <button
          onClick={handleGenerate}
          className="w-full py-3 bg-amber-500 text-white font-bold rounded-xl shadow-lg shadow-amber-500/20 hover:bg-amber-600 transition-all flex items-center justify-center gap-2 group"
        >
          <Sparkles size={16} /> Generate Flashcards
        </button>
      </div>
    );
  }

  const currentCard = cards[currentIndex];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest bg-amber-500/10 px-2 py-1 rounded-md">
          Card {currentIndex + 1} / {cards.length}
        </span>
        <div className="flex gap-2">
            <button 
                onClick={() => { setCards([]); setCurrentIndex(0); }}
                className="p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-400"
            >
                <RotateCcw size={14} />
            </button>
        </div>
      </div>

      {/* Flashcard Container */}
      <div 
        className="relative h-64 w-full perspective-1000 cursor-pointer group"
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <motion.div
          className="w-full h-full relative"
          initial={false}
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.6, type: 'spring', stiffness: 260, damping: 20 }}
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Front */}
          <div 
            className="absolute inset-0 w-full h-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-sm backface-hidden"
          >
            <span className="text-[9px] font-black text-stone-400 uppercase tracking-[0.2em] mb-4">Question</span>
            <p className="text-lg font-serif font-bold text-stone-800 dark:text-stone-200 leading-relaxed">
              {currentCard.front}
            </p>
            <div className="absolute bottom-6 text-[10px] text-stone-400 font-bold uppercase tracking-widest flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              Tap to reveal <RotateCcw size={10} />
            </div>
          </div>

          {/* Back */}
          <div 
            className="absolute inset-0 w-full h-full bg-amber-50 dark:bg-stone-800 border border-amber-200 dark:border-amber-700 rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-inner backface-hidden"
            style={{ transform: 'rotateY(180deg)' }}
          >
            <span className="text-[9px] font-black text-amber-500 uppercase tracking-[0.2em] mb-4">Answer</span>
            <p className="text-base font-medium text-stone-800 dark:text-stone-100 leading-relaxed">
              {currentCard.back}
            </p>
            
            {currentCard.mnemonic && (
              <div className="mt-4 p-3 bg-white/50 dark:bg-black/20 rounded-xl flex items-center gap-2 text-[10px] text-amber-600 dark:text-amber-400 font-bold text-left italic border border-amber-200/50">
                <Lightbulb size={12} className="shrink-0" />
                <span>Mnemonic: {currentCard.mnemonic}</span>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Navigation */}
      <div className="flex gap-3">
        <button
          onClick={(e) => { e.stopPropagation(); prevCard(); }}
          disabled={currentIndex === 0}
          className="flex-1 py-3 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-30 transition-all hover:bg-stone-200 dark:hover:bg-stone-700"
        >
          <ChevronLeft size={18} /> Prev
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); nextCard(); }}
          disabled={currentIndex === cards.length - 1}
          className="flex-1 py-3 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-30 transition-all hover:bg-stone-200 dark:hover:bg-stone-700"
        >
          Next <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
};

export default FlashcardModule;
