import { AI_MODELS, isRetryableError } from "./config";
import { getProxyConfiguredGenAI } from "./genai";
import { sanitizeInput } from "../utils/sanitize";

/**
 * Non-streaming chatbot
 */
export const sendChatMessage = async (
  message: string, 
  history: { role: 'user' | 'model', parts: { text: string }[] }[], 
  language: string = 'English', 
  userContext?: string
): Promise<string> => {
  const ai = getProxyConfiguredGenAI('chat');
  const modelsToTry = [AI_MODELS.CHAT, ...AI_MODELS.FALLBACK_CHAIN.filter(m => m !== AI_MODELS.CHAT)];
  let lastError: any = null;

  for (const currentModel of modelsToTry) {
    try {
      const chat = ai.chats.create({
        model: currentModel,
        config: {
          systemInstruction: `You are ReLearn.ai, a helpful AI study assistant. 
            ${userContext ? `User Profile Context: ${userContext}` : ''}
            Be concise, encouraging, and professional.
            IMPORTANT: ALWAYS RESPOND IN ${language}. However, technical terms should remain in English for educational clarity.`,
        },
        history: history
      });

      const response = await chat.sendMessage({ message: sanitizeInput(message) });
      return response.text || "I'm sorry, I couldn't process that.";
    } catch (error: any) {
      lastError = error;
      console.warn(`[ChatBot] Model ${currentModel} failed:`, error?.message || error);
      if (isRetryableError(error)) continue;
      break;
    }
  }

  return `I'm having trouble connecting to my brain right now (${lastError?.message || 'Unknown error'}). Please try again later!`;
};

/**
 * STREAMING chatbot — Phase 4
 */
export const sendChatMessageStreaming = async (
  message: string,
  history: { role: 'user' | 'model', parts: { text: string }[] }[],
  onChunk: (accumulatedText: string) => void,
  language: string = 'English',
  userContext?: string
): Promise<string> => {
  const ai = getProxyConfiguredGenAI('chat');
  const modelsToTry = [AI_MODELS.CHAT, ...AI_MODELS.FALLBACK_CHAIN.filter(m => m !== AI_MODELS.CHAT)];
  let lastError: any = null;

  // System instruction
  const systemInstruction = `You are ReLearn.ai, a helpful AI study assistant. 
Your goal is to help students manage their time, understand complex topics, and stay motivated.
${userContext ? `User Profile Context: ${sanitizeInput(userContext)}` : ''}
Be concise, encouraging, and professional. Use markdown formatting for lists, bold, and headers where appropriate.
IMPORTANT: ALWAYS RESPOND IN ${language}. However, technical terms should remain in English for educational clarity.`;

  const contents = [
    ...history.map(h => ({
      role: h.role,
      parts: h.parts // history should ideally be sanitized too, but it's safe to assume it's sanitized when coming in
    })),
    { role: 'user' as const, parts: [{ text: sanitizeInput(message) }] }
  ];

  for (const currentModel of modelsToTry) {
    try {
      const stream = await ai.models.generateContentStream({
        model: currentModel,
        contents,
        config: {
          systemInstruction,
        },
      });

      let accumulated = '';
      for await (const chunk of stream) {
        const text = chunk.text;
        if (text) {
          accumulated += text;
          onChunk(accumulated);
        }
      }

      return accumulated || "I'm sorry, I couldn't process that.";
    } catch (error: any) {
      lastError = error;
      console.warn(`[ChatBotStream] Model ${currentModel} failed:`, error?.message || error);
      if (isRetryableError(error)) continue;
      break;
    }
  }

  const errorMsg = "I'm having trouble connecting to my brain right now. Please try again later!";
  onChunk(errorMsg);
  return errorMsg;
};
