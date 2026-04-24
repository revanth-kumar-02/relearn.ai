import React, { useState } from 'react';
import { generateQuiz, QuizQuestion, QuizResult } from '../services/gemini/quizService';
import { motion, AnimatePresence } from 'motion/react';
import {
  Brain,
  CheckCircle2,
  XCircle,
  Loader2,
  Trophy,
  RotateCcw,
  ChevronRight,
  Sparkles,
  Target
} from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { getVideoLanguageLabel } from '../services/youtubeService';
import { XP_REWARDS } from '../services/gamificationService';
import { useAuth } from '../contexts/AuthContext';

interface QuizModuleProps {
  topic: string;
  lessonContent: string;
  difficulty?: string;
}

type QuizState = 'idle' | 'loading' | 'active' | 'results';

const QuizModule: React.FC<QuizModuleProps> = ({
  topic,
  lessonContent,
  difficulty = 'Beginner'
}) => {
  const { user } = useAuth();
  const { videoLanguage, processGamificationReward, addNotification } = useData();
  const [quizState, setQuizState] = useState<QuizState>('idle');
  const [quiz, setQuiz] = useState<QuizResult | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<(number | null)[]>([]);
  const [showExplanation, setShowExplanation] = useState(false);
  const [error, setError] = useState('');

  const handleStartQuiz = async () => {
    setQuizState('loading');
    setError('');
    try {
      const result = await generateQuiz(topic, lessonContent, difficulty, getVideoLanguageLabel(videoLanguage));
      setQuiz(result);
      setSelectedAnswers(new Array(result.questions.length).fill(null));
      setCurrentIndex(0);
      setShowExplanation(false);
      setQuizState('active');
    } catch (err: any) {
      setError(err.message || 'Failed to generate quiz.');
      setQuizState('idle');
    }
  };

  const handleSelectAnswer = (optionIndex: number) => {
    if (showExplanation) return; // Already answered
    const updated = [...selectedAnswers];
    updated[currentIndex] = optionIndex;
    setSelectedAnswers(updated);
    setShowExplanation(true);
  };

  const handleNext = () => {
    if (!quiz) return;
    setShowExplanation(false);
    if (currentIndex < quiz.questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setQuizState('results');
      handleQuizCompletion();
    }
  };

  const handleQuizCompletion = async () => {
    if (!quiz) return;
    
    // Calculate final score
    const finalScore = selectedAnswers.reduce((acc, answer, i) => {
      return acc + (answer === quiz.questions[i]?.correctIndex ? 1 : 0);
    }, 0);
    const finalPercentage = Math.round((finalScore / quiz.questions.length) * 100);

    const statUpdates: any = {
      totalQuizzesCompleted: (user?.stats?.totalQuizzesCompleted || 0) + 1
    };

    if (finalPercentage === 100) {
      statUpdates.quizPerfectScores = (user?.stats?.quizPerfectScores || 0) + 1;
    }

    const result = await processGamificationReward(
      XP_REWARDS.COMPLETE_QUIZ,
      { quizPerfectScores: statUpdates.quizPerfectScores },
      statUpdates
    );

    if (result && result.newBadges.length > 0) {
      result.newBadges.forEach((badge: any) => {
        addNotification({
          type: 'achievement',
          title: `${badge.icon} Badge Earned: ${badge.name}`,
          message: badge.description,
          time: new Date().toISOString(),
          read: false,
        });
      });
    }
  };

  const handleRetry = () => {
    setQuizState('idle');
    setQuiz(null);
    setSelectedAnswers([]);
    setCurrentIndex(0);
    setShowExplanation(false);
  };

  const score = quiz
    ? selectedAnswers.reduce((acc, answer, i) => {
        return acc + (answer === quiz.questions[i]?.correctIndex ? 1 : 0);
      }, 0)
    : 0;

  const scorePercentage = quiz ? Math.round((score / quiz.questions.length) * 100) : 0;

  const getScoreMessage = () => {
    if (scorePercentage === 100) return { emoji: '🏆', text: 'Perfect Score!', color: 'text-amber-500' };
    if (scorePercentage >= 80) return { emoji: '🌟', text: 'Excellent!', color: 'text-emerald-500' };
    if (scorePercentage >= 60) return { emoji: '👍', text: 'Good Job!', color: 'text-blue-500' };
    if (scorePercentage >= 40) return { emoji: '📚', text: 'Keep Studying!', color: 'text-orange-500' };
    return { emoji: '💪', text: 'Don\'t Give Up!', color: 'text-red-500' };
  };

  // ── Idle / CTA State ──
  if (quizState === 'idle') {
    return (
      <div className="bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/30 dark:to-violet-950/30 p-6 rounded-2xl border border-indigo-200/60 dark:border-indigo-800/40 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
            <Brain className="text-indigo-500" size={20} />
          </div>
          <div>
            <h3 className="font-bold text-sm text-stone-800 dark:text-stone-200">Test Your Knowledge</h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">AI-generated quiz based on this lesson</p>
          </div>
        </div>
        {error && (
          <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 p-3 rounded-xl">{error}</p>
        )}
        <button
          onClick={handleStartQuiz}
          className="w-full py-3 bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 hover:bg-indigo-600 transition-all flex items-center justify-center gap-2 group"
        >
          <Sparkles size={16} className="group-hover:rotate-12 transition-transform" />
          Generate Quiz
        </button>
      </div>
    );
  }

  // ── Loading State ──
  if (quizState === 'loading') {
    return (
      <div className="bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/30 dark:to-violet-950/30 p-8 rounded-2xl border border-indigo-200/60 dark:border-indigo-800/40 flex flex-col items-center gap-4">
        <Loader2 className="animate-spin text-indigo-500" size={32} />
        <div className="text-center">
          <p className="font-bold text-sm text-stone-700 dark:text-stone-300">Generating your quiz...</p>
          <p className="text-xs text-stone-500 mt-1">AI is crafting questions from your lesson content</p>
        </div>
      </div>
    );
  }

  // ── Active Quiz State ──
  if (quizState === 'active' && quiz) {
    const question = quiz.questions[currentIndex];
    const selectedAnswer = selectedAnswers[currentIndex];
    const isCorrect = selectedAnswer === question.correctIndex;

    return (
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm overflow-hidden">
        {/* Progress Bar */}
        <div className="h-1.5 bg-stone-100 dark:bg-stone-800">
          <motion.div
            className="h-full bg-indigo-500"
            initial={{ width: 0 }}
            animate={{ width: `${((currentIndex + (showExplanation ? 1 : 0)) / quiz.questions.length) * 100}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>

        <div className="p-6 space-y-5">
          {/* Question Counter */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-indigo-500 uppercase tracking-widest">
              Question {currentIndex + 1} of {quiz.questions.length}
            </span>
            <Target size={16} className="text-stone-400" />
          </div>

          {/* Question Text */}
          <AnimatePresence mode="wait">
            <motion.p
              key={currentIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="text-base font-semibold leading-relaxed text-stone-800 dark:text-stone-200"
            >
              {question.question}
            </motion.p>
          </AnimatePresence>

          {/* Options */}
          <div className="space-y-2.5">
            {question.options.map((option, idx) => {
              let optionStyles = 'bg-stone-50 dark:bg-stone-800/50 border-stone-200 dark:border-stone-700 hover:border-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 cursor-pointer';

              if (showExplanation) {
                if (idx === question.correctIndex) {
                  optionStyles = 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-400 dark:border-emerald-600';
                } else if (idx === selectedAnswer && !isCorrect) {
                  optionStyles = 'bg-red-50 dark:bg-red-950/30 border-red-400 dark:border-red-600';
                } else {
                  optionStyles = 'bg-stone-50 dark:bg-stone-800/50 border-stone-200 dark:border-stone-700 opacity-50';
                }
              } else if (selectedAnswer === idx) {
                optionStyles = 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-400 dark:border-indigo-600';
              }

              return (
                <motion.button
                  key={idx}
                  onClick={() => handleSelectAnswer(idx)}
                  disabled={showExplanation}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`w-full p-4 rounded-xl border text-left text-sm font-medium transition-all flex items-center gap-3 ${optionStyles}`}
                >
                  <span className="w-7 h-7 rounded-full border-2 border-current flex items-center justify-center text-xs font-bold shrink-0 opacity-60">
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span className="flex-1">{option}</span>
                  {showExplanation && idx === question.correctIndex && (
                    <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                  )}
                  {showExplanation && idx === selectedAnswer && !isCorrect && idx !== question.correctIndex && (
                    <XCircle size={18} className="text-red-500 shrink-0" />
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Explanation */}
          <AnimatePresence>
            {showExplanation && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className={`p-4 rounded-xl border text-sm ${
                  isCorrect
                    ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'
                    : 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800'
                }`}>
                  <p className={`font-bold text-xs uppercase tracking-widest mb-1 ${
                    isCorrect ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                  }`}>
                    {isCorrect ? '✓ Correct!' : '✗ Not quite'}
                  </p>
                  <p className="text-stone-700 dark:text-stone-300 leading-relaxed">
                    {question.explanation}
                  </p>
                </div>

                <button
                  onClick={handleNext}
                  className="mt-3 w-full py-3 bg-indigo-500 text-white font-bold rounded-xl hover:bg-indigo-600 transition-all flex items-center justify-center gap-2"
                >
                  {currentIndex < quiz.questions.length - 1 ? (
                    <>Next Question <ChevronRight size={16} /></>
                  ) : (
                    <>See Results <Trophy size={16} /></>
                  )}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // ── Results State ──
  if (quizState === 'results' && quiz) {
    const result = getScoreMessage();
    return (
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm overflow-hidden">
        <div className="p-8 text-center space-y-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', bounce: 0.5 }}
            className="text-5xl"
          >
            {result.emoji}
          </motion.div>

          <div>
            <h3 className={`text-2xl font-bold ${result.color}`}>{result.text}</h3>
            <p className="text-sm text-stone-500 mt-1">
              You scored <span className="font-bold text-stone-700 dark:text-stone-300">{score}/{quiz.questions.length}</span> ({scorePercentage}%)
            </p>
          </div>

          {/* Score Bar */}
          <div className="w-full h-3 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${
                scorePercentage >= 80 ? 'bg-emerald-500' :
                scorePercentage >= 60 ? 'bg-blue-500' :
                scorePercentage >= 40 ? 'bg-orange-500' : 'bg-red-500'
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${scorePercentage}%` }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
            />
          </div>

          {/* Answer Summary */}
          <div className="grid grid-cols-5 gap-2 pt-2">
            {quiz.questions.map((q, i) => (
              <div
                key={i}
                className={`h-2 rounded-full ${
                  selectedAnswers[i] === q.correctIndex
                    ? 'bg-emerald-400'
                    : 'bg-red-400'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={handleRetry}
            className="flex-1 py-3 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 font-bold rounded-xl hover:bg-stone-50 dark:hover:bg-stone-800 transition-all flex items-center justify-center gap-2 text-sm"
          >
            <RotateCcw size={14} />
            New Quiz
          </button>
          <button
            onClick={handleStartQuiz}
            className="flex-1 py-3 bg-indigo-500 text-white font-bold rounded-xl hover:bg-indigo-600 transition-all flex items-center justify-center gap-2 text-sm"
          >
            <Sparkles size={14} />
            Retry Same Topic
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default QuizModule;
