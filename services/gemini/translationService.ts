import { Type } from "@google/genai";
import { AI_MODELS, IS_GROQ_MODEL, isRetryableError } from "./config";
import { getAuthHeaders } from "../utils/auth";
import { getProxyConfiguredGenAI } from "./genai";
import { Plan, Task } from "../../types";
import { safeParseAIResponse } from "../utils/aiUtils";
import { sanitizeInput } from "../utils/sanitize";

export interface TranslatedPlanResult {
  title: string;
  description: string;
  tasks: Array<{
    id: string;
    title: string;
    description: string;
  }>;
}

export const translatePlan = async (
  plan: Plan,
  tasks: Task[],
  targetLanguage: string
): Promise<TranslatedPlanResult> => {
  const ai = getProxyConfiguredGenAI('plan');
  
  // Create a minimal payload to send to the AI
  const payload = {
    title: plan.title,
    description: plan.description || "",
    tasks: tasks.map(t => ({
      id: t.id,
      title: t.title,
      description: t.description || ""
    }))
  };

  const systemInstruction = `You are an expert educational translator. 
Your task is to accurately translate the provided Learning Plan (including its title, description, and all task titles/descriptions) into ${targetLanguage}.
CRITICAL RULES:
1. Maintain the exact same meaning, educational tone, and difficulty level.
2. DO NOT alter the "id" fields of the tasks; they must remain exactly as provided.
3. Proprietary or technical terms (e.g., "React", "JavaScript", "API") should generally remain in English or be conventionally adapted.
4. Your response MUST be ONLY valid JSON matching the exact structure provided.`;

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING },
      description: { type: Type.STRING },
      tasks: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            title: { type: Type.STRING },
            description: { type: Type.STRING }
          },
          required: ["id", "title", "description"]
        }
      }
    },
    required: ["title", "description", "tasks"]
  };

  const modelsToTry = [AI_MODELS.PRIMARY, ...AI_MODELS.FALLBACK_CHAIN.filter(m => m !== AI_MODELS.PRIMARY)];
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
              { role: 'system', content: systemInstruction + ` Response MUST be valid JSON: { "title": "string", "description": "string", "tasks": [{ "id": "string", "title": "string", "description": "string" }] }.` },
              { role: 'user', content: `Translate this learning plan to ${targetLanguage}:\n\n${JSON.stringify(payload)}` }
            ],
            response_format: { type: "json_object" },
            temperature: 0.3
          })
        });

        if (!response.ok) throw new Error(`Groq API error: ${response.status}`);
        const data = await response.json();
        text = data.choices[0].message.content;
      } else {
        const response = await ai.models.generateContent({
          model: currentModel,
          contents: [{ role: 'user', parts: [{ text: `Translate this learning plan to ${targetLanguage}:\n\n${JSON.stringify(payload)}` }] }],
          config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema,
            temperature: 0.3
          }
        });
        text = response.text;
      }

      if (!text) throw new Error("Empty response from AI");

      const result = safeParseAIResponse<TranslatedPlanResult>(text);
      
      // Basic validation
      if (!result.title || !result.tasks || !Array.isArray(result.tasks)) {
        throw new Error("Invalid translation format");
      }

      return result;
    } catch (error: any) {
      lastError = error;
      console.warn(`[TranslationService] Model ${currentModel} failed:`, error?.message || error);
      
      if (isRetryableError(error)) {
        continue;
      }
      break;
    }
  }

  throw new Error(`Failed to translate plan: ${lastError?.message || 'Unknown error'}`);
};
