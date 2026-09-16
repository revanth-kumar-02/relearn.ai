import { generateAI, generateStreamAI } from "./pipeline";
import { sanitizeInput } from "../../utils/sanitize";

/**
 * Non-streaming chatbot
 */
export const sendChatMessage = async (
  message: string, 
  history: { role: 'user' | 'model', parts: { text: string }[] }[], 
  language: string = 'English', 
  userContext?: string
): Promise<string> => {
  const systemPrompt = `You are ReLearn.ai, a helpful AI study assistant. ${userContext ? `User Profile Context: ${userContext}` : ''} Be concise, encouraging, and professional. IMPORTANT: ALWAYS RESPOND IN ${language}. However, technical terms should remain in English for educational clarity.`;

  const prompt = history.length > 0
    ? `Previous conversation:\n${history.map(h => `${h.role === 'model' ? 'Assistant' : 'User'}: ${h.parts.map(p => p.text).join('')}`).join('\n')}\n\nUser: ${sanitizeInput(message)}`
    : sanitizeInput(message);

  try {
    const response = await generateAI({
      task: 'chatbot',
      prompt,
      systemPrompt,
      options: {
        temperature: 0.7,
      },
    });

    if (response.text) return response.text;
  } catch (error: any) {
    console.warn(`[ChatBot] AI generation failed:`, error?.message || error);
    return `I'm having trouble connecting to my brain right now (${error?.message || 'Unknown error'}). Please try again later!`;
  }

  return `I'm having trouble connecting to my brain right now. Please try again later!`;
};

/**
 * STREAMING chatbot
 */
export const sendChatMessageStreaming = async (
  message: string,
  history: { role: 'user' | 'model', parts: { text: string }[] }[],
  onChunk: (accumulatedText: string) => void,
  language: string = 'English',
  userContext?: string,
  personaSystemPrompt?: string
): Promise<string> => {
  // System instruction — use persona prompt if provided, otherwise default
  const systemPrompt = personaSystemPrompt 
    || `You are ReLearn.ai, a helpful AI study assistant. 
Your goal is to help students manage their time, understand complex topics, and stay motivated.
${userContext ? `User Profile Context: ${sanitizeInput(userContext)}` : ''}
Be concise, encouraging, and professional. Use markdown formatting for lists, bold, and headers where appropriate.
IMPORTANT: ALWAYS RESPOND IN ${language}. However, technical terms should remain in English for educational clarity.`;

  const prompt = history.length > 0
    ? `Previous conversation:\n${history.map(h => `${h.role === 'model' ? 'Assistant' : 'User'}: ${h.parts.map(p => p.text).join('')}`).join('\n')}\n\nUser: ${sanitizeInput(message)}`
    : sanitizeInput(message);

  try {
    let accumulated = '';
    for await (const chunk of generateStreamAI({
      task: 'chatbot',
      prompt,
      systemPrompt,
      options: {
        temperature: 0.7,
      },
    })) {
      if (chunk.textDelta) {
        accumulated += chunk.textDelta;
        onChunk(accumulated);
      }
    }

    if (accumulated) return accumulated;
  } catch (error: any) {
    console.warn(`[ChatBotStream] Streaming failed:`, error?.message || error);
  }

  const errorMsg = "I'm having trouble connecting to my brain right now. Please try again later!";
  onChunk(errorMsg);
  return errorMsg;
};
