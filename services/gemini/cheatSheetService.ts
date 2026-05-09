/**
 * AI Cheat Sheet Generator Service
 * 
 * Generates beautifully formatted, printable cheat sheets for any topic.
 * Output is structured Markdown optimized for PDF rendering.
 */

import { AI_MODELS, isRetryableError } from './config';
import { getProxyConfiguredGenAI } from './genai';
import { sanitizeInput } from '../utils/sanitize';
import { getAuthHeaders } from '../utils/auth';
import { safeParseAIResponse } from '../utils/aiUtils';

export interface CheatSheet {
  title: string;
  sections: {
    heading: string;
    content: string; // Markdown
  }[];
  quickReference: string[]; // Key formulas/patterns/commands
  commonMistakes: string[];
}

/**
 * Generate a comprehensive cheat sheet for a given topic
 */
export const generateCheatSheet = async (
  topic: string,
  lessonContent?: string,
  language: string = 'English'
): Promise<CheatSheet> => {
  const ai = getProxyConfiguredGenAI('learning');
  const modelsToTry = [AI_MODELS.PRIMARY, ...AI_MODELS.FALLBACK_CHAIN.filter(m => m !== AI_MODELS.PRIMARY)];
  let lastError: any = null;

  const contentSection = lessonContent
    ? `\n\nUse this lesson content as reference:\n<source_material>${sanitizeInput(lessonContent.slice(0, 8000))}</source_material>`
    : '';

  for (const currentModel of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model: currentModel,
        contents: [{
          role: 'user',
          parts: [{ text: `Generate a comprehensive, printable cheat sheet for: <topic_input>${sanitizeInput(topic)}</topic_input>${contentSection}

Write in ${language}. Keep technical terms in English.

The cheat sheet should be:
- Dense with information but scannable
- Include code examples where relevant (in fenced code blocks)
- Use tables for comparisons
- Include formulas, syntax patterns, or key commands
- List common mistakes and how to avoid them` }]
        }],
        config: {
          systemInstruction: `You are an expert educational content creator specializing in concise, high-density reference materials. Create cheat sheets that students can print and stick on their walls.

Return ONLY valid JSON with this structure:
{
  "title": "Cheat Sheet: [Topic Name]",
  "sections": [
    { "heading": "Section Title", "content": "Markdown content with code blocks, tables, bold terms" }
  ],
  "quickReference": ["Key formula/pattern 1", "Key formula/pattern 2"],
  "commonMistakes": ["Mistake 1 and how to avoid it", "Mistake 2"]
}`,
          responseMimeType: "application/json",
        }
      });

      const text = response.text;
      if (text) {
        return safeParseAIResponse(text);
      }
    } catch (error: any) {
      lastError = error;
      if (!isRetryableError(error)) break;
      continue;
    }
  }

  throw new Error(`Failed to generate cheat sheet: ${lastError?.message || 'Unknown error'}`);
};
