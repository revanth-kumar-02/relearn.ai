import { Type } from "@google/genai";
import { getProxyConfiguredGenAI } from "./genai";
import { AI_MODELS } from "./config";
import { sanitizeInput } from "../utils/sanitize";

export interface SafetyValidationResult {
  isSafe: boolean;
  message?: string;
  redirectedTopic?: string;
}

const buildSafetyRequest = (topic: string) => ({
  contents: [{
    role: 'user',
    parts: [{ text: `Validate the following topic: ${sanitizeInput(topic)}` }]
  }],
  config: {
    systemInstruction: `You are a content safety system for an academic learning platform.
Your task is to validate user input topics before generating learning plans.

Safety Criteria:
- ONLY BLOCK: Content that is strictly sexual, explicit, adult-oriented (18+), or promotes illegal exploitation.
- ALWAYS ALLOW: Cybersecurity, Ethical Hacking, Penetration Testing, Malware Analysis, Forensic Science, and all other academic/technical subjects. Do NOT block these as "illegal acts" as they are educational.
- If the topic is borderline sexual (e.g., specific human reproductive biology): Redirect to a professional academic title (e.g., "Human Reproductive Systems").
- If the topic is strictly unsafe (18+): Provide a professional restriction message.

Your response MUST be a JSON object with the following schema:
{
  "isSafe": boolean (true if the topic is safe or educational, false if strictly sexual/18+),
  "message": string (If isSafe is false, provide a professional restriction message. If true, can be null/empty),
  "redirectedTopic": string (If the topic is borderline, provide the safer educational alternative. Otherwise, return the original safe topic. If isSafe is false, this can be null/empty)
}`,
    responseMimeType: "application/json",
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        isSafe: { type: Type.BOOLEAN },
        message: { type: Type.STRING },
        redirectedTopic: { type: Type.STRING }
      },
      required: ["isSafe"]
    }
  }
});

export const validateTopicSafety = async (
  topic: string,
  model: string = AI_MODELS.FAST_LITE,
  signal?: AbortSignal
): Promise<SafetyValidationResult> => {
  const ai = getProxyConfiguredGenAI('plan');
  const request = buildSafetyRequest(topic);

  // First try with the FAST model, then fallback to PRIMARY
  const modelsToTry = [model, AI_MODELS.PRIMARY];
  let lastError: any = null;

  for (const currentModel of modelsToTry) {
    if (signal?.aborted) throw new Error("AbortError");

    try {
      console.log(`[SafetyService] Validating topic with model: ${currentModel}`);

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
        try {
          const result = JSON.parse(text) as SafetyValidationResult;
          console.log(`[SafetyService] Topic validation result:`, result);
          return result;
        } catch (validationError) {
          console.warn(`[SafetyService] JSON Parse failed for ${currentModel}`, validationError);
          continue;
        }
      }
    } catch (error: any) {
      if (error.message === "AbortError" || signal?.aborted) {
        throw new Error("AbortError");
      }
      lastError = error;
      console.warn(`[SafetyService] Model ${currentModel} failed:`, error.message);
      continue;
    }
  }

  // If validation fails (e.g. network error), we degrade gracefully by allowing it through
  // or throwing the error. Given safety is paramount, we might want to let it pass
  // if it's just a network error, or block it. Let's block if we can't validate reliably.
  console.error(`[SafetyService] All validation attempts failed. Error:`, lastError);
  throw new Error("Unable to validate content safety. Please check your network and try again.");
};
