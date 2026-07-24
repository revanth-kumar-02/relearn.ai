/**
 * Oops Mode — Mistake Museum
 * 
 * Tracks wrong quiz answers and resurfaces them as warm-up questions
 * before each study session. Turns failures into focused review.
 */

import { QuizQuestion } from '../ai/quizService';
import { createMistake, updateMistake, deleteMistake } from './dataService';
import { MistakeEntry } from '../../types/index';

const SESSION_KEY = 'relearn_session';

function getUserId(): string | null {
  try {
    return localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

/**
 * Get all stored mistakes
 */
export function getMistakes(): MistakeEntry[] {
  const userId = getUserId();
  if (!userId) return [];
  try {
    const raw = localStorage.getItem(`relearn_mistakes_${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Save a wrong quiz answer to the Mistake Museum
 */
export function addMistake(
  question: QuizQuestion,
  userAnswer: number,
  topic: string,
  planId?: string
): void {
  const userId = getUserId();
  if (!userId) return;

  const mistakes = getMistakes();
  
  // Don't duplicate the same question
  const exists = mistakes.find(m => 
    m.question === question.question && m.topic === topic
  );
  if (exists) return;

  const entry: MistakeEntry = {
    id: `mistake_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    question: question.question,
    options: question.options,
    correctIndex: question.correctIndex,
    explanation: question.explanation,
    userAnswer,
    topic,
    planId,
    timestamp: new Date().toISOString(),
    reviewCount: 0,
    lastReviewedAt: undefined,
    mastered: false,
  };

  mistakes.unshift(entry);
  
  // Keep max 100 mistakes
  if (mistakes.length > 100) mistakes.length = 100;
  
  try {
    localStorage.setItem(`relearn_mistakes_${userId}`, JSON.stringify(mistakes));
  } catch {}

  // Trigger background creation/sync to Supabase
  createMistake(userId, entry).catch(e => console.error('[MistakeSync] Failed to create mistake:', e));
}

/**
 * Get warm-up review questions (mistakes not yet mastered, prioritized by age)
 */
export function getWarmUpQuestions(count: number = 3, planId?: string): MistakeEntry[] {
  const mistakes = getMistakes()
    .filter(m => !m.mastered)
    .filter(m => !planId || m.planId === planId);

  // Sort: least reviewed first, then oldest first
  mistakes.sort((a, b) => {
    if (a.reviewCount !== b.reviewCount) return a.reviewCount - b.reviewCount;
    return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
  });

  return mistakes.slice(0, count);
}

/**
 * Mark a mistake as reviewed (user answered correctly this time)
 */
export function markMistakeReviewed(id: string, answeredCorrectly: boolean): void {
  const userId = getUserId();
  if (!userId) return;

  const mistakes = getMistakes();
  const idx = mistakes.findIndex(m => m.id === id);
  if (idx === -1) return;

  mistakes[idx].reviewCount++;
  mistakes[idx].lastReviewedAt = new Date().toISOString();
  
  // Mark as mastered after 3 correct reviews
  let mastered = mistakes[idx].mastered;
  if (answeredCorrectly && mistakes[idx].reviewCount >= 3) {
    mastered = true;
    mistakes[idx].mastered = true;
  }

  try {
    localStorage.setItem(`relearn_mistakes_${userId}`, JSON.stringify(mistakes));
  } catch {}

  // Trigger background update/sync to Supabase
  updateMistake(userId, id, { 
    reviewCount: mistakes[idx].reviewCount,
    lastReviewedAt: mistakes[idx].lastReviewedAt,
    mastered
  }).catch(e => console.error('[MistakeSync] Failed to update mistake:', e));
}

/**
 * Get stats about the mistake museum
 */
export function getMistakeStats() {
  const mistakes = getMistakes();
  return {
    total: mistakes.length,
    active: mistakes.filter(m => !m.mastered).length,
    mastered: mistakes.filter(m => m.mastered).length,
    topWeakTopics: getWeakTopics(mistakes),
  };
}

/**
 * Get the most common weak topics
 */
function getWeakTopics(mistakes: MistakeEntry[]): { topic: string; count: number }[] {
  const topicCounts: Record<string, number> = {};
  mistakes
    .filter(m => !m.mastered)
    .forEach(m => {
      topicCounts[m.topic] = (topicCounts[m.topic] || 0) + 1;
    });

  return Object.entries(topicCounts)
    .map(([topic, count]) => ({ topic, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

/**
 * Clear all mastered mistakes
 */
export function clearMasteredMistakes(): void {
  const userId = getUserId();
  if (!userId) return;

  const mistakes = getMistakes();
  const mastered = mistakes.filter(m => m.mastered);
  const active = mistakes.filter(m => !m.mastered);

  try {
    localStorage.setItem(`relearn_mistakes_${userId}`, JSON.stringify(active));
  } catch {}

  // Trigger background deletes for mastered mistakes
  mastered.forEach(m => {
    deleteMistake(userId, m.id).catch(e => console.error('[MistakeSync] Failed to delete mistake:', e));
  });
}
