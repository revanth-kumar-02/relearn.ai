import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Icon from './common/Icon';
import { generateConceptCollision, ConceptCollision } from '../services/gemini/conceptCollisionService';
import { useData } from '../contexts/DataContext';

const ConceptCollisionWidget: React.FC = () => {
  const { tasks } = useData();
  const [collision, setCollision] = useState<ConceptCollision | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const userTopics = Array.from(new Set(tasks.filter(t => t.completed).map(t => t.title))).slice(0, 20);

  const generateNew = async () => {
    setIsLoading(true);
    setShowAnswer(false);
    setShowHint(false);
    try {
      const result = await generateConceptCollision(userTopics);
      setCollision(result);
    } catch (err) {
      console.error('Concept Collision failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-violet-50 via-fuchsia-50 to-pink-50 dark:from-violet-950/20 dark:via-fuchsia-950/20 dark:to-pink-950/20 rounded-2xl sm:rounded-[2rem] p-4 sm:p-6 border border-violet-200/50 dark:border-violet-800/30">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <Icon name="merge_type" className="text-white text-base sm:text-lg" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-text-primary-light dark:text-text-primary-dark">Concept Collision</h3>
            <p className="text-[9px] sm:text-[10px] text-text-secondary-light font-medium">Cross-domain thinking challenge</p>
          </div>
        </div>
        <button
          onClick={generateNew}
          disabled={isLoading}
          className="p-2 rounded-xl hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-colors disabled:opacity-40"
          title="Generate new collision"
        >
          <Icon name={isLoading ? 'progress_activity' : 'refresh'} className={`text-violet-600 text-lg ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {!collision && !isLoading ? (
        <button
          onClick={generateNew}
          className="w-full py-6 sm:py-8 rounded-2xl border-2 border-dashed border-violet-200 dark:border-violet-800 hover:border-violet-400 dark:hover:border-violet-600 transition-colors flex flex-col items-center gap-2 group"
        >
          <span className="text-2xl sm:text-3xl group-hover:scale-110 transition-transform">🤯</span>
          <span className="text-xs font-bold text-violet-500">Generate a Concept Collision</span>
        </button>
      ) : isLoading ? (
        <div className="py-6 sm:py-8 flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-violet-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold text-violet-500">Smashing concepts together...</p>
        </div>
      ) : collision && (
        <AnimatePresence mode="wait">
          <motion.div
            key={collision.question}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-3 sm:space-y-4"
          >
            {/* Topic Badges */}
            <div className="flex flex-wrap items-center gap-2 justify-center">
              <span className="px-2.5 py-1 sm:px-3 sm:py-1.5 bg-violet-500/10 text-violet-600 dark:text-violet-400 rounded-full text-[10px] sm:text-xs font-bold">{collision.topicA}</span>
              <span className="text-xs sm:text-sm text-violet-400">⚡</span>
              <span className="px-2.5 py-1 sm:px-3 sm:py-1.5 bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 rounded-full text-[10px] sm:text-xs font-bold">{collision.topicB}</span>
            </div>

            {/* Question */}
            <p className="text-xs sm:text-sm font-medium text-text-primary-light dark:text-text-primary-dark text-center leading-relaxed px-2">
              {collision.question}
            </p>

            {/* Hint */}
            {showHint && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="text-[10px] sm:text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 p-2.5 sm:p-3 rounded-xl text-center"
              >
                💡 {collision.hint}
              </motion.p>
            )}

            {/* Answer */}
            {showAnswer && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-emerald-50 dark:bg-emerald-950/20 p-3 sm:p-4 rounded-xl border border-emerald-200 dark:border-emerald-800"
              >
                <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-1">Sample Answer</p>
                <p className="text-xs sm:text-sm text-emerald-700 dark:text-emerald-400 leading-relaxed">{collision.sampleAnswer}</p>
              </motion.div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-1">
              {!showHint && (
                <button
                  onClick={() => setShowHint(true)}
                  className="flex-1 py-2 sm:py-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] sm:text-xs font-bold hover:bg-amber-500/20 transition-colors"
                >
                  💡 Hint
                </button>
              )}
              {!showAnswer && (
                <button
                  onClick={() => setShowAnswer(true)}
                  className="flex-1 py-2 sm:py-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] sm:text-xs font-bold hover:bg-emerald-500/20 transition-colors"
                >
                  ✅ Reveal Answer
                </button>
              )}
              <button
                onClick={generateNew}
                className="flex-1 py-2 sm:py-2.5 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 text-[10px] sm:text-xs font-bold hover:bg-violet-500/20 transition-colors"
              >
                🔄 New
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
};

export default ConceptCollisionWidget;
