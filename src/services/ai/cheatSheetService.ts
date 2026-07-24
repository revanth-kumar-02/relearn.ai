/**
 * AI Cheat Sheet Generator Service
 * 
 * Generates beautifully formatted, printable cheat sheets for any topic.
 * Output is structured Markdown optimized for PDF rendering.
 */

import { AI_MODELS, IS_GROQ_MODEL, isRetryableError } from '../../config/gemini.config';
import { getProxyConfiguredGenAI } from './genai';
import { sanitizeInput } from '../../utils/sanitize';
import { getAuthHeaders } from '../../utils/authUtils';
import { safeParseAIResponse } from '../../utils/aiUtils';

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
      let text = "";

      if (IS_GROQ_MODEL(currentModel)) {
        // Groq Integration for Cheat Sheets
        const response = await fetch('/api/groq/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders()
          },
          body: JSON.stringify({
            model: currentModel,
            messages: [
              {
                role: 'system',
                content: `You are an expert educational content creator specializing in concise, high-density reference materials. Create cheat sheets that students can read and print.
                
                CRITICAL FORMATTING RULES inside the "content" JSON string value:
                1. DOUBLE NEWLINES (\\n\\n): You MUST use double newlines (\\n\\n) before and after all headers, list items, and code blocks. This is required for proper markdown rendering.
                2. NO PIPE TABLES: Do NOT use pipe-delimited tables (e.g. | col1 | col2 |). Instead, perform comparisons using descriptive bold bullet lists or standard definition lists (e.g. "* **Term**: Definition").
                3. MULTI-LINE CODE: All code examples, syntax configurations, and markup samples must be strictly wrapped inside standard fenced markdown code blocks with triple backticks and the language name (e.g. \`\`\`html\\n[code]\\n\`\`\`). Place double newlines (\\n\\n) before and after the code blocks.
                
                Return ONLY valid JSON with this structure:
                {
                  "title": "Cheat Sheet: [Topic Name]",
                  "sections": [
                    { "heading": "Section Title", "content": "Markdown content string with double newlines (\\n\\n) before lists and code blocks" }
                  ],
                  "quickReference": ["Key formula/pattern 1", "Key formula/pattern 2"],
                  "commonMistakes": ["Mistake 1 and how to avoid it", "Mistake 2"]
                }`
              },
              {
                role: 'user',
                content: `Generate a comprehensive, printable cheat sheet for: <topic_input>${sanitizeInput(topic)}</topic_input>${contentSection}
 
Write in ${language}. Keep technical terms in English.
 
The cheat sheet should be:
- Dense with information but extremely clean and scannable
- Include code examples where relevant (in fenced code blocks)
- Use bold lists for comparisons (do NOT use tables)
- Include formulas, syntax patterns, or key commands
- List common mistakes and how to avoid them`
              }
            ],
            response_format: { type: "json_object" },
            temperature: 0.7
          })
        });
 
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error?.message || `Groq API error: ${response.status}`);
        }
 
        const data = await response.json();
        text = data.choices?.[0]?.message?.content || "";
      } else {
        // Gemini Integration for Cheat Sheets
        const response = await ai.models.generateContent({
          model: currentModel,
          contents: [{
            role: 'user',
            parts: [{ text: `Generate a comprehensive, printable cheat sheet for: <topic_input>${sanitizeInput(topic)}</topic_input>${contentSection}
 
Write in ${language}. Keep technical terms in English.
 
The cheat sheet should be:
- Dense with information but extremely clean and scannable
- Include code examples where relevant (in fenced code blocks)
- Use bold lists for comparisons (do NOT use tables)
- Include formulas, syntax patterns, or key commands
- List common mistakes and how to avoid them` }]
          }],
          config: {
            systemInstruction: `You are an expert educational content creator specializing in concise, high-density reference materials. Create cheat sheets that students can read and print.
            
            CRITICAL FORMATTING RULES inside the "content" JSON string value:
            1. DOUBLE NEWLINES (\\n\\n): You MUST use double newlines (\\n\\n) before and after all headers, list items, and code blocks. This is required for proper markdown rendering.
            2. NO PIPE TABLES: Do NOT use pipe-delimited tables (e.g. | col1 | col2 |). Instead, perform comparisons using descriptive bold bullet lists or standard definition lists (e.g. "* **Term**: Definition").
            3. MULTI-LINE CODE: All code examples, syntax configurations, and markup samples must be strictly wrapped inside standard fenced markdown code blocks with triple backticks and the language name (e.g. \`\`\`html\\n[code]\\n\`\`\`). Place double newlines (\\n\\n) before and after the code blocks.
            
            Return ONLY valid JSON with this structure:
            {
              "title": "Cheat Sheet: [Topic Name]",
              "sections": [
                { "heading": "Section Title", "content": "Markdown content string with double newlines (\\n\\n) before lists and code blocks" }
              ],
              "quickReference": ["Key formula/pattern 1", "Key formula/pattern 2"],
              "commonMistakes": ["Mistake 1 and how to avoid it", "Mistake 2"]
            }`,
            responseMimeType: "application/json",
          }
        });

        text = response.text || "";
      }

      if (text) {
        return safeParseAIResponse(text);
      }
    } catch (error: any) {
      lastError = error;
      console.warn(`[CheatSheetGenerator] Model ${currentModel} failed:`, error?.message || error);
      
      const isLastModel = modelsToTry.indexOf(currentModel) === modelsToTry.length - 1;
      if (!isLastModel) {
        console.log(`[CheatSheetGenerator] Attempting fallback to next model...`);
        continue;
      }
      break;
    }
  }

  throw new Error(`Failed to generate cheat sheet: ${lastError?.message || 'Unknown error'}`);
};
