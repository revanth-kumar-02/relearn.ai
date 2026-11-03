import { generateAI } from "./pipeline";
import { Plan, Task } from "../../types/index";
import { safeParseAIResponse } from "../../utils/aiUtils";

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

  const systemPrompt = `You are an expert educational translator. 
Your task is to accurately translate the provided Learning Plan (including its title, description, and all task titles/descriptions) into ${targetLanguage}.
CRITICAL RULES:
1. Maintain the exact same meaning, educational tone, and difficulty level.
2. DO NOT alter the "id" fields of the tasks; they must remain exactly as provided.
3. Proprietary or technical terms (e.g., "React", "JavaScript", "API") should generally remain in English or be conventionally adapted.
4. Your response MUST be ONLY valid JSON matching this schema:
{
  "title": "string",
  "description": "string",
  "tasks": [
    {
      "id": "string",
      "title": "string",
      "description": "string"
    }
  ]
}`;

  const prompt = `Translate this learning plan to ${targetLanguage}:\n\n${JSON.stringify(payload)}`;

  try {
    const response = await generateAI({
      task: 'translation',
      prompt,
      systemPrompt,
      options: {
        temperature: 0.3,
        responseFormat: 'json',
      },
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from AI");

    const result = safeParseAIResponse<TranslatedPlanResult>(text);

    // Basic validation
    if (!result.title || !result.tasks || !Array.isArray(result.tasks)) {
      throw new Error("Invalid translation format");
    }

    return result;
  } catch (error: any) {
    console.error('[TranslationService] Translation failed:', error?.message || error);
    throw new Error(`Failed to translate plan: ${error?.message || 'Unknown error'}`);
  }
};
