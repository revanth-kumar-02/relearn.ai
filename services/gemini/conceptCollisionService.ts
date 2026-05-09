/**
 * Concept Collision Service
 * 
 * AI randomly smashes two unrelated topics together and asks:
 * "How is X similar to Y?" Forces cross-domain thinking.
 */

import { AI_MODELS, isRetryableError } from './config';
import { getProxyConfiguredGenAI } from './genai';
import { sanitizeInput } from '../utils/sanitize';
import { safeParseAIResponse } from '../utils/aiUtils';

export interface ConceptCollision {
  topicA: string;
  topicB: string;
  question: string;
  hint: string;
  sampleAnswer: string;
}

/**
 * Generate a concept collision from the user's learned topics
 */
export const generateConceptCollision = async (
  userTopics: string[],
  language: string = 'English'
): Promise<ConceptCollision> => {
  const ai = getProxyConfiguredGenAI('chat');

  // Pick two random topics if available, otherwise use general topics
  let topicA: string, topicB: string;
  if (userTopics.length >= 2) {
    const shuffled = [...userTopics].sort(() => Math.random() - 0.5);
    topicA = shuffled[0];
    topicB = shuffled[1];
  } else {
    const generalTopics = [
      'REST APIs', 'Photosynthesis', 'Music Theory', 'Supply & Demand',
      'Neural Networks', 'Shakespeare', 'Quantum Physics', 'Cooking',
      'Architecture', 'Game Theory', 'DNA Replication', 'Chess Strategy',
      'Typography', 'Blockchain', 'Evolution', 'Film Editing'
    ];
    const shuffled = generalTopics.sort(() => Math.random() - 0.5);
    topicA = userTopics[0] || shuffled[0];
    topicB = shuffled.find(t => t !== topicA) || shuffled[1];
  }

  const modelsToTry = [AI_MODELS.CHAT, ...AI_MODELS.FALLBACK_CHAIN.filter(m => m !== AI_MODELS.CHAT)];
  let lastError: any = null;

  for (const currentModel of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model: currentModel,
        contents: [{
          role: 'user',
          parts: [{ text: `Create a "Concept Collision" challenge. 

Topic A: <topic_input>${sanitizeInput(topicA)}</topic_input>
Topic B: <topic_input>${sanitizeInput(topicB)}</topic_input>

Generate a thought-provoking question that connects these two seemingly unrelated topics. 
Include a subtle hint and a sample answer.
Write everything in ${language}. Keep it fun and mind-bending.

Return ONLY valid JSON: { "topicA": "...", "topicB": "...", "question": "...", "hint": "...", "sampleAnswer": "..." }` }]
        }],
        config: {
          systemInstruction: `You are a creative educator who finds unexpected connections between different fields. Your goal is to make students think across domains. Be creative, surprising, and educational.`,
          responseMimeType: "application/json",
        }
      });

      const text = response.text;
      if (text) {
        const parsed = safeParseAIResponse<Partial<ConceptCollision>>(text);
        return {
          topicA: parsed.topicA || topicA,
          topicB: parsed.topicB || topicB,
          question: parsed.question || '',
          hint: parsed.hint || '',
          sampleAnswer: parsed.sampleAnswer || '',
        };
      }
    } catch (error: any) {
      lastError = error;
      if (!isRetryableError(error)) break;
    }
  }

  // Fallback if AI fails
  return {
    topicA,
    topicB,
    question: `How is ${topicA} similar to ${topicB}? Find an unexpected connection!`,
    hint: 'Think about the underlying structure or process, not surface features.',
    sampleAnswer: 'Both involve systematic processes that transform inputs into outputs.',
  };
};
