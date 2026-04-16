import { Type } from "@google/genai";
import { AI_MODELS, isNetworkError, isRetryableError } from "./config";
import { getProxyConfiguredGenAI } from "./genai";
import { sanitizeInput } from "../utils/sanitize";

// Schema validation interface for runtime checks
interface ValidatedPlan {
    title: string;
    description: string;
    days: Array<{
        day: number;
        topic: string;
        guidance: string;
    }>;
}

/**
 * Validates the structure of the AI-generated JSON response.
 * Prevents UI crashes and data schema drift.
 */
function validatePlanStructure(data: any): ValidatedPlan {
    if (typeof data !== 'object' || data === null) {
        throw new Error("Invalid response format: Not an object");
    }

    if (typeof data.title !== 'string' || !data.title) {
        data.title = "New Learning Plan";
    }

    if (typeof data.description !== 'string') {
        data.description = "";
    }

    if (!Array.isArray(data.days) && !Array.isArray(data.dailyTopics)) {
        throw new Error("Invalid response format: Missing days array");
    }

    const days = data.days || data.dailyTopics;
    const validatedDays = days.map((day: any, index: number) => ({
        day: typeof day.day === 'number' ? day.day : index + 1,
        topic: typeof day.topic === 'string' ? day.topic : (day.title || `Topic ${index + 1}`),
        guidance: typeof day.guidance === 'string' ? day.guidance : (day.description || day.summary || "No guidance provided.")
    }));

    return {
        title: data.title,
        description: data.description,
        days: validatedDays
    };
}

const buildPlanRequest = (goal: string, days: number, difficulty: string, userContext?: string) => ({
  contents: [{
    role: 'user',
    parts: [{ text: `Generate a structured learning plan for the topic: ${sanitizeInput(goal)}. Difficulty Level: ${difficulty}. ${userContext ? `User Context: ${sanitizeInput(userContext)}` : ''}` }]
  }],
  config: {
    systemInstruction: `You are an expert educational consultant.
Your response MUST be a JSON object.
Do not include any introductory text, closing text, or markdown code fences.
The plan should cover exactly ${days} days.
The difficulty level should be strictly "${difficulty}".
Guidance for each day should be concise, actionable, and approximately 15-20 words.
${userContext ? `Tailor the plan to the user's academic level, goals, and preferred study time mentioned in the context.` : ''}`,
    responseMimeType: "application/json",
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        description: { type: Type.STRING },
        days: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              day: { type: Type.INTEGER },
              topic: { type: Type.STRING },
              guidance: { type: Type.STRING }
            },
            required: ["day", "topic", "guidance"]
          }
        }
      },
      required: ["title", "description", "days"]
    }
  }
});


export const generateLearningPlan = async (
    goal: string, 
    days: number = 30, 
    difficulty: string = 'Beginner', 
    model: string = AI_MODELS.PRIMARY, 
    userContext?: string,
    signal?: AbortSignal
): Promise<string> => {
  const ai = getProxyConfiguredGenAI();
  const request = buildPlanRequest(goal, days, difficulty, userContext);

  const modelsToTry = [model, ...AI_MODELS.FALLBACK_CHAIN.filter(m => m !== model)];
  let lastError: any = null;

  for (const currentModel of modelsToTry) {
    if (signal?.aborted) throw new Error("AbortError");

    try {
      console.log(`Attempting plan generation with model: ${currentModel}`);
      
      const responsePromise = ai.models.generateContent({
        model: currentModel,
        ...request
      });

      const response = await (signal ? Promise.race([
          responsePromise,
          new Promise((_, reject) => {
              signal.addEventListener('abort', () => reject(new Error("AbortError")), { once: true });
          })
      ]) : responsePromise) as any;

      const text = response.text;
      if (text) {
        // Runtime Structure Validation
        try {
            // A2: Robust JSON extraction (handles markdown backticks)
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            const jsonText = jsonMatch ? jsonMatch[0] : text;
            const rawData = JSON.parse(jsonText);
            const validated = validatePlanStructure(rawData);
            console.log(`Plan generated and validated with model: ${currentModel}`);
            return JSON.stringify(validated);
        } catch (validationError) {
            console.warn(`[PlanGenerator] Validation failed for ${currentModel}, trying next model...`, validationError);
            continue;
        }
      }
    } catch (error: any) {
      if (error.message === "AbortError" || signal?.aborted) {
          console.log("[PlanGenerator] Request aborted by user.");
          throw new Error("AbortError");
      }

      lastError = error;
      const errorMsg = error?.message || error?.toString() || 'Unknown error';
      console.warn(`[PlanGenerator] Model ${currentModel} failed:`, errorMsg);

      if (isRetryableError(error)) {
        const isRateLimited = errorMsg.includes('429') || errorMsg.includes('RESOURCE_EXHAUSTED');
        
        if (isRateLimited) {
          const delay = (Math.pow(2, modelsToTry.indexOf(currentModel)) * 4000) + Math.random() * 2000;
          console.warn(`[PlanGenerator] Rate limit hit on ${currentModel}. Waiting ${Math.round(delay/1000)}s before trying next model...`);
          
          await new Promise((resolve, reject) => {
              const timer = setTimeout(resolve, delay);
              signal?.addEventListener('abort', () => {
                  clearTimeout(timer);
                  reject(new Error("AbortError"));
              }, { once: true });
          });
        }
        continue;
      }
      break;
    }
  }

  if (isNetworkError(lastError)) {
    throw new Error("No internet connection. Please check your network and try again.");
  }
  if (isRetryableError(lastError)) {
    throw new Error("All AI models are currently experiencing high demand. Please wait a moment and try again.");
  }
  const errorMsg = lastError?.message || 'Unknown error';
  throw new Error(`Plan generation failed: ${errorMsg}`);
};
