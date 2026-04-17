import { Type } from "@google/genai";
import { AI_MODELS, isRetryableError } from "./config";
import { getProxyConfiguredGenAI } from "./genai";
import { sanitizeInput } from "../utils/sanitize";

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface QuizResult {
  questions: QuizQuestion[];
  topic: string;
  difficulty: string;
}

/**
 * Quiz Generator — Phase 4
 */
export const generateQuiz = async (
  topic: string,
  lessonContent: string,
  difficulty: string = 'Beginner'
): Promise<QuizResult> => {
  const ai = getProxyConfiguredGenAI('learning');
  const modelsToTry = [AI_MODELS.PRIMARY, ...AI_MODELS.FALLBACK_CHAIN.filter(m => m !== AI_MODELS.PRIMARY)];
  let lastError: any = null;

  for (const currentModel of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model: currentModel,
        contents: [{
          role: 'user',
          parts: [{
            text: `Generate a 5-question multiple-choice quiz about the topic "${sanitizeInput(topic)}".

Use the following lesson content as your PRIMARY source for creating questions:

--- BEGIN LESSON CONTENT ---
${sanitizeInput(lessonContent.slice(0, 6000))}
--- END LESSON CONTENT ---

Difficulty level: ${difficulty}

Requirements:
- Each question must have exactly 4 options
- Only one correct answer per question
- correctIndex is 0-based (0, 1, 2, or 3)
- Explanation should be 1-2 sentences explaining WHY the correct answer is right
- Questions should test understanding, not just recall
- Vary question difficulty slightly within the set`
          }]
        }],
        config: {
          systemInstruction: `You are an expert educational assessment designer. Generate high-quality multiple-choice questions that test genuine understanding of concepts, not just rote memorization. Questions should be clear, unambiguous, and have plausible distractors.`,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    question: { type: Type.STRING },
                    options: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING }
                    },
                    correctIndex: { type: Type.INTEGER },
                    explanation: { type: Type.STRING }
                  },
                  required: ["question", "options", "correctIndex", "explanation"]
                }
              }
            },
            required: ["questions"]
          }
        }
      });

      const text = response.text;
      if (!text) throw new Error("Empty response from AI");

      const parsed = JSON.parse(text);
      return {
        topic,
        difficulty,
        questions: parsed.questions || []
      };
    } catch (error: any) {
      lastError = error;
      console.warn(`[QuizGenerator] Model ${currentModel} failed:`, error?.message || error);
      if (isRetryableError(error)) continue;
      break;
    }
  }

  throw new Error(`Failed to generate quiz: ${lastError?.message || 'Unknown error'}`);
};
