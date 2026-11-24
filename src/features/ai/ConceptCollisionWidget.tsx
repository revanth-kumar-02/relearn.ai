import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Icon from '../../components/ui/Icon';
import { generateConceptCollision, ConceptCollision } from '../../services/ai/conceptCollisionService';
import { useData } from '../../contexts/DataContext';

const ConceptCollisionWidget: React.FC = () => {
  const { tasks } = useData();
  const [collision, setCollision] = useState<ConceptCollision | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAnswer, setShowAnswer] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const userTopics = Array.from(new Set(tasks.filter(t => t.status === 'Completed').map(t => t.title))).slice(0, 20);

  const generateNew = async () => {
    setIsLoading(true);
    setError('');
    setShowAnswer(false);
    setShowHint(false);
    try {
      const result = await generateConceptCollision(userTopics);
      setCollision(result);
    } catch (err: any) {
      console.error('Concept Collision failed:', err);
      setError(err?.message || 'Failed to create concept collision. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="glass-card rounded-2xl sm:rounded-[1.75rem] p-4 sm:p-6 border border-border-light dark:border-border-dark">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-violet-500/10 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 flex items-center justify-center">
            <Icon name="merge_type" className="text-base sm:text-lg" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-text-primary-light dark:text-text-primary-dark">Concept Collision</h3>
            <p className="text-[9px] sm:text-[10px] text-text-secondary-light dark:text-text-secondary-dark font-medium">Cross-domain thinking challenge</p>
          </div>
        </div>
        <button
          onClick={generateNew}
          disabled={isLoading}
          className="p-2 rounded-xl hover:bg-stone-100 dark:hover:bg-white/5 transition-colors disabled:opacity-40 text-stone-500 dark:text-zinc-400"
          title="Generate new challenge"
        >
          <Icon name={isLoading ? 'progress_activity' : 'refresh'} className={`text-lg ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error ? (
        <div className="py-4 px-3 bg-red-50 dark:bg-red-950/20 rounded-xl border border-red-200 dark:border-red-900/40 text-center space-y-2">
          <p className="text-xs font-semibold text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={generateNew}
            disabled={isLoading}
            className="px-4 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-bold transition-all"
          >
            Retry
          </button>
        </div>
      ) : !collision && !isLoading ? (
        <button
          onClick={generateNew}
          disabled={isLoading}
          className="w-full py-6 sm:py-8 rounded-xl border border-dashed border-border-light dark:border-border-dark hover:border-violet-500/50 dark:hover:border-violet-500/50 transition-colors flex flex-col items-center gap-2 group disabled:opacity-50"
        >
          <Icon name="psychology" className="text-2xl sm:text-3xl text-violet-500 group-hover:scale-110 transition-transform" />
          <span className="text-xs font-semibold text-text-secondary-light dark:text-text-secondary-dark group-hover:text-violet-500 transition-colors">Generate a Concept Challenge</span>
        </button>
      ) : isLoading ? (
        <div className="py-6 sm:py-8 flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark">Generating challenge...</p>
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
              <Icon name="bolt" className="text-xs text-amber-500" />
              <span className="px-2.5 py-1 sm:px-3 sm:py-1.5 bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 rounded-full text-[10px] sm:text-xs font-bold">{collision.topicB}</span>
            </div>

            {/* Question */}
            <p className="text-xs sm:text-sm font-medium text-text-primary-light dark:text-text-primary-dark text-center leading-relaxed px-2">
              {collision.question}
            </p>

            {/* Hint */}
            {showHint && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="flex items-center justify-center gap-1.5 text-[10px] sm:text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 p-2.5 sm:p-3 rounded-xl text-center"
              >
                <Icon name="lightbulb" className="text-sm shrink-0" />
                <span>{collision.hint}</span>
              </motion.div>
            )}

            {/* Answer */}
            {showAnswer && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-emerald-50 dark:bg-emerald-950/20 p-3 sm:p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/40"
              >
                <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-1">Sample Answer</p>
                <p className="text-xs sm:text-sm text-emerald-700 dark:text-emerald-300 leading-relaxed">{collision.sampleAnswer}</p>
              </motion.div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-1">
              {!showHint && (
                <button
                  onClick={() => setShowHint(true)}
                  className="flex-1 py-2 sm:py-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] sm:text-xs font-semibold hover:bg-amber-500/20 transition-colors flex items-center justify-center gap-1"
                >
                  <Icon name="lightbulb" className="text-xs" />
                  <span>Hint</span>
                </button>
              )}
              {!showAnswer && (
                <button
                  onClick={() => setShowAnswer(true)}
                  className="flex-1 py-2 sm:py-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] sm:text-xs font-semibold hover:bg-emerald-500/20 transition-colors flex items-center justify-center gap-1"
                >
                  <Icon name="check_circle" className="text-xs" />
                  <span>Reveal Answer</span>
                </button>
              )}
              <button
                onClick={generateNew}
                disabled={isLoading}
                className="flex-1 py-2 sm:py-2.5 rounded-xl bg-stone-100 dark:bg-white/5 text-stone-700 dark:text-stone-300 text-[10px] sm:text-xs font-semibold hover:bg-stone-200 dark:hover:bg-white/10 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
              >
                <Icon name="refresh" className="text-xs" />
                <span>New</span>
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
};

export default ConceptCollisionWidget;
