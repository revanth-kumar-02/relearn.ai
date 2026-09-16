/**
 * AI Cheat Sheet Generator Service
 * 
 * Generates beautifully formatted, printable cheat sheets for any topic.
 * Output is structured Markdown optimized for PDF rendering.
 */

import { generateAI } from './pipeline';
import { sanitizeInput } from '../../utils/sanitize';
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
  const contentSection = lessonContent
    ? `\n\nUse this lesson content as reference:\n<source_material>${sanitizeInput(lessonContent.slice(0, 8000))}</source_material>`
    : '';

  const systemPrompt = `You are an expert educational content creator specializing in concise, high-density reference materials. Create cheat sheets that students can read and print.
                
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
}`;

  const prompt = `Generate a comprehensive, printable cheat sheet for: <topic_input>${sanitizeInput(topic)}</topic_input>${contentSection}
 
Write in ${language}. Keep technical terms in English.
 
The cheat sheet should be:
- Dense with information but extremely clean and scannable
- Include code examples where relevant (in fenced code blocks)
- Use bold lists for comparisons (do NOT use tables)
- Include formulas, syntax patterns, or key commands
- List common mistakes and how to avoid them`;

  try {
    const response = await generateAI({
      task: 'cheat_sheet',
      prompt,
      systemPrompt,
      options: {
        temperature: 0.2,
        responseFormat: 'json',
      },
    });

    if (response.text) {
      return safeParseAIResponse(response.text);
    }
    throw new Error('No content received from AI provider');
  } catch (error: any) {
    console.error(`[CheatSheetGenerator] AI generation failed:`, error?.message || error);
    throw new Error(`Failed to generate cheat sheet: ${error?.message || 'Unknown error'}`);
  }
};
