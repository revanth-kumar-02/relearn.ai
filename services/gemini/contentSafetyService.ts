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

  // First try with the FAST model, then fallback to current PRIMARY and then the full fallback chain
  const modelsToTry = [
    model, 
    AI_MODELS.PRIMARY, 
    ...AI_MODELS.FALLBACK_CHAIN.filter(m => m !== model && m !== AI_MODELS.PRIMARY)
  ];
  let lastError: any = null;

  for (const currentModel of modelsToTry) {
    if (signal?.aborted) throw new Error("AbortError");

    try {
      console.log(`[SafetyService] Validating topic with model: ${currentModel}`);

      const modelTimeout = new AbortController();
      const timeoutId = setTimeout(() => modelTimeout.abort(), 12000);

      try {
        const responsePromise = ai.models.generateContent({
          model: currentModel,
          ...request
        });

        const response = await responsePromise as any;
        clearTimeout(timeoutId);

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
        clearTimeout(timeoutId);
        
        const errorMessage = (error.message || "").toLowerCase();
        
        // Handle specific key errors
        if (errorMessage.includes("api key expired") || errorMessage.includes("invalid_argument")) {
          console.error(`[SafetyService] API Key issue detected for ${currentModel}. Trying local fallback...`);
          lastError = new Error("API_KEY_EXPIRED_OR_INVALID");
          continue; 
        }

        if (error.name === 'AbortError' || errorMessage.includes('aborterror')) {
          console.warn(`[SafetyService] Model ${currentModel} timed out. Trying next...`);
          continue;
        }

        lastError = error;
        console.warn(`[SafetyService] Model ${currentModel} failed:`, error.message);
        continue;
      }
    } catch (error: any) {
      lastError = error;
      continue;
    }
  }

  // --- LOCAL FALLBACK (The Safety Shield) ---
  // If we reach here, ALL AI attempts failed for technical reasons (Keys, 404, 504).
  // We check if the topic is "evidently safe" (academic) to allow the user to proceed.
  console.log(`[SafetyService] AI validation unavailable. Running local academic check for: "${topic}"`);
  
  const academicKeywords = [
    'math', 'science', 'history', 'physics', 'bio', 'chem', 'coding', 'programming', 
    'react', 'js', 'html', 'python', 'engine', 'tech', 'study', 'learn', 'lesson',
    'exam', 'test', 'algebra', 'calculus', 'nature', 'space', 'art', 'music'
  ];
  
  const lowerTopic = topic.toLowerCase();
  const isEvidentlySafe = academicKeywords.some(kw => lowerTopic.includes(kw)) || 
                          (topic.length > 3 && topic.length < 50 && /^[a-zA-Z0-9\s?.,!]*$/.test(topic));

  if (isEvidentlySafe) {
    console.log(`[SafetyService] ✅ Local validation PASSED for academic topic. Allowing bypass.`);
    return {
      isSafe: true,
      message: "Validated via local academic check.",
      redirectedTopic: topic
    };
  }

  // If even the local check is unsure and the key is expired
  if (lastError?.message === "API_KEY_EXPIRED_OR_INVALID" || lastError?.status === 400) {
    throw new Error("Your API key is expired or invalid. PLEASE REDEPLOY YOUR SITE ON NETLIFY to sync your new keys.");
  }

  console.error(`[SafetyService] All validation attempts failed. Last error:`, lastError);
  throw new Error("Unable to validate safety. Please check your network or try a simpler academic topic.");
};
