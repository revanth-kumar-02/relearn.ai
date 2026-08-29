import { AI_MODELS, IS_GROQ_MODEL, isRetryableError } from "../../config/gemini.config";
import { getProxyConfiguredGenAI } from "./genai";
import { sanitizeInput } from "../../utils/sanitize";
import { getAuthHeaders } from "../../utils/authUtils";

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
      if (IS_GROQ_MODEL(currentModel)) {
        const groqHistory = history.map(h => ({
          role: h.role === 'model' ? 'assistant' : 'user',
          content: h.parts.map(p => p.text).join('')
        }));

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
                content: `You are ReLearn.ai, a helpful AI study assistant. ${userContext ? `User Profile Context: ${userContext}` : ''} Be concise, encouraging, and professional. IMPORTANT: ALWAYS RESPOND IN ${language}. However, technical terms should remain in English for educational clarity.` 
              },
              ...groqHistory,
              { role: 'user', content: sanitizeInput(message) }
            ],
            temperature: 0.7
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error?.message || `Groq API error: ${response.status}`);
        }

        const data = await response.json();
        const text = data.choices?.[0]?.message?.content;
        if (text) return text;
      } else {
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
        if (response.text) return response.text;
      }
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
  userContext?: string,
  personaSystemPrompt?: string
): Promise<string> => {
  const ai = getProxyConfiguredGenAI('chat');
  const modelsToTry = [AI_MODELS.CHAT, ...AI_MODELS.FALLBACK_CHAIN.filter(m => m !== AI_MODELS.CHAT)];
  let lastError: any = null;

  // System instruction — use persona prompt if provided, otherwise default
  const systemInstruction = personaSystemPrompt 
    || `You are ReLearn.ai, a helpful AI study assistant. 
Your goal is to help students manage their time, understand complex topics, and stay motivated.
${userContext ? `User Profile Context: ${sanitizeInput(userContext)}` : ''}
Be concise, encouraging, and professional. Use markdown formatting for lists, bold, and headers where appropriate.
IMPORTANT: ALWAYS RESPOND IN ${language}. However, technical terms should remain in English for educational clarity.`;

  const contents = [
    ...history.map(h => ({
      role: h.role,
      parts: h.parts
    })),
    { role: 'user' as const, parts: [{ text: sanitizeInput(message) }] }
  ];

  for (const currentModel of modelsToTry) {
    try {
      if (IS_GROQ_MODEL(currentModel)) {
        const groqHistory = history.map(h => ({
          role: h.role === 'model' ? 'assistant' : 'user',
          content: h.parts.map(p => p.text).join('')
        }));

        const response = await fetch('/api/groq/chat/completions', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            ...getAuthHeaders()
          },
          body: JSON.stringify({
            model: currentModel,
            messages: [
              { role: 'system', content: systemInstruction },
              ...groqHistory,
              { role: 'user', content: sanitizeInput(message) }
            ],
            stream: true,
            temperature: 0.7
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error?.message || `Groq API error: ${response.status}`);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let accumulated = '';

        if (reader) {
          let done = false;
          let buffer = '';
          while (!done) {
            const { value, done: doneReading } = await reader.read();
            done = doneReading;
            if (value) {
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';
              for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.startsWith('data: ')) {
                  const jsonStr = trimmed.replace(/^data:\s*/, '');
                  if (jsonStr === '[DONE]') continue;
                  try {
                    const parsed = JSON.parse(jsonStr);
                    const chunkText = parsed.choices?.[0]?.delta?.content || '';
                    if (chunkText) {
                      accumulated += chunkText;
                      onChunk(accumulated);
                    }
                  } catch (e) {}
                }
              }
            }
          }
        }

        if (accumulated) return accumulated;
      } else {
        const stream = await ai.models.generateContentStream({
          model: currentModel,
          contents,
          config: {
            systemInstruction,
          }
        });

        let accumulated = '';
        for await (const chunk of stream) {
          const text = chunk.text;
          if (text) {
            accumulated += text;
            onChunk(accumulated);
          }
        }

        if (accumulated) return accumulated;
      }
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
