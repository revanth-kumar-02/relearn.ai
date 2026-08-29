import { Type } from "@google/genai";
import { AI_MODELS, IS_GROQ_MODEL } from "../../config/gemini.config";
import { getProxyConfiguredGenAI } from "./genai";
import { sanitizeInput } from "../../utils/sanitize";
import { getAuthHeaders } from "../../utils/authUtils";
import { safeParseAIResponse } from "../../utils/aiUtils";

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
  const ai = getProxyConfiguredGenAI('learning');
  const modelsToTry = [AI_MODELS.FAST_LITE, ...AI_MODELS.FALLBACK_CHAIN.filter(m => m !== AI_MODELS.FAST_LITE)];
  let lastError: any = null;

  for (const currentModel of modelsToTry) {
    try {
      let text = "";
      
      if (IS_GROQ_MODEL(currentModel)) {
        const response = await fetch('/api/groq/chat/completions', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            ...getAuthHeaders()
          },
          body: JSON.stringify({
            model: currentModel,
            messages: [
              { role: 'system', content: `You are an expert memory coach. Generate high-quality flashcards for active recall. 
              Returns ONLY valid JSON: { "flashcards": [{ "front": "string", "back": "string", "mnemonic": "string" }] }.` },
              { role: 'user', content: `Generate 8 flashcards for: ${topic} in ${language} using this content: ${content.slice(0, 4000)}.` }
            ],
            response_format: { type: "json_object" }
          })
        });
        const data = await response.json();
        text = data.choices?.[0]?.message?.content || "";
      } else {
        const response = await ai.models.generateContent({
          model: currentModel,
          contents: [{
            role: 'user',
            parts: [{
              text: `Generate 8 high-quality flashcards for the topic: ${topic}.
              
              Content: ${sanitizeInput(content.slice(0, 6000))}
              Language: ${language}
              
              Requirements:
              - Short, clear questions on the front
              - Concise, accurate answers on the back
              - Include a simple mnemonic device if helpful for retention
              - Focus on key concepts, definitions, and "Why" questions.`
            }]
          }],
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                flashcards: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      front: { type: Type.STRING },
                      back: { type: Type.STRING },
                      mnemonic: { type: Type.STRING }
                    },
                    required: ["front", "back"]
                  }
                }
              },
              required: ["flashcards"]
            }
          }
        });
        text = response.text;
      }

      const parsed = safeParseAIResponse<any>(text);
      return (parsed.flashcards || []).map((f: any) => ({
        ...f,
        id: crypto.randomUUID()
      }));
    } catch (err) {
      lastError = err;
      continue;
    }
  }

  throw lastError || new Error("Failed to generate flashcards");
};
