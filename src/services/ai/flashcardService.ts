import { generateAI } from './pipeline';
import { sanitizeInput } from '../../utils/sanitize';
import { safeParseAIResponse } from '../../utils/aiUtils';

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  mnemonic?: string;
}

export const generateFlashcards = async (
  topic: string,
  content: string,
  language: string = 'English'
): Promise<Flashcard[]> => {
  const systemPrompt = `You are an expert memory coach. Generate high-quality flashcards for active recall.
Return ONLY valid JSON with this structure:
{
  "flashcards": [
    {
      "front": "string",
      "back": "string",
      "mnemonic": "string"
    }
  ]
}`;

  const prompt = `Generate 8 high-quality flashcards for the topic: ${topic}.
              
Content: ${sanitizeInput(content.slice(0, 6000))}
Language: ${language}

Requirements:
- Short, clear questions on the front
- Concise, accurate answers on the back
- Include a simple mnemonic device if helpful for retention
- Focus on key concepts, definitions, and "Why" questions.`;

  try {
    const response = await generateAI({
      task: 'flashcards',
      prompt,
      systemPrompt,
      options: {
        temperature: 0.3,
        responseFormat: 'json',
      },
    });

    if (response.text) {
      const parsed = safeParseAIResponse<any>(response.text);
      return (parsed.flashcards || []).map((f: any) => ({
        ...f,
        id: crypto.randomUUID(),
      }));
    }

    throw new Error('No content received from AI provider');
  } catch (error: any) {
    console.error(`[FlashcardService] AI generation failed:`, error?.message || error);
    throw new Error(`Failed to generate flashcards: ${error?.message || 'Unknown error'}`);
  }
};
