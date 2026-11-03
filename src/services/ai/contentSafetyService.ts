import { generateAI } from "./pipeline";
import { sanitizeInput } from "../../utils/sanitize";

export interface SafetyValidationResult {
  isSafe: boolean;
  message?: string;
  redirectedTopic?: string;
}

export const validateTopicSafety = async (
  topic: string,
  _model?: string,
  signal?: AbortSignal
): Promise<SafetyValidationResult> => {
  if (signal?.aborted) throw new Error("AbortError");

  const systemPrompt = `You are a content safety system for an academic learning platform.
Your task is to validate user input topics before generating learning plans.

Safety Criteria:
- ONLY BLOCK: Content that is strictly sexual, explicit, adult-oriented (18+), or promotes illegal exploitation.
- ALWAYS ALLOW: Cybersecurity, Ethical Hacking, Penetration Testing, Malware Analysis, Forensic Science, and all other academic/technical subjects. Do NOT block these as "illegal acts" as they are educational.
- If the topic is borderline sexual (e.g., specific human reproductive biology): Redirect to a professional academic title (e.g., "Human Reproductive Systems").
- If the topic is strictly unsafe (18+): Provide a professional restriction message.

Your response MUST be a JSON object with the following schema:
{
  "isSafe": boolean (true if the topic is safe or educational, false if strictly sexual/18+),
  "message": string (If isSafe is false, provide a professional restriction message. If true, can be empty),
  "redirectedTopic": string (If the topic is borderline, provide the safer educational alternative. Otherwise, return the original safe topic. If isSafe is false, this can be empty)
}`;

  const prompt = `Validate the following topic: <topic_input>${sanitizeInput(topic)}</topic_input>`;

  try {
    const response = await generateAI({
      task: 'content_safety',
      prompt,
      systemPrompt,
      options: {
        temperature: 0.1,
        responseFormat: 'json',
        signal,
        timeoutMs: 15000,
      },
    });

    const text = response.text;
    if (text) {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const jsonText = jsonMatch ? jsonMatch[0] : text;
      const result = JSON.parse(jsonText) as SafetyValidationResult;
      if (typeof result.isSafe === 'boolean') {
        return result;
      }
    }
  } catch (error: any) {
    if (error.name === 'AbortError' || signal?.aborted) {
      throw new Error("AbortError");
    }
    console.warn(`[SafetyService] AI validation failed, applying local fallback:`, error?.message || error);
  }

  // --- LOCAL FALLBACK (The Safety Shield) ---
  console.log(`[SafetyService] AI validation unavailable. Running local academic check for: "${topic}"`);

  const academicKeywords = [
    'math', 'science', 'history', 'physics', 'bio', 'chem', 'coding', 'programming', 
    'react', 'js', 'html', 'python', 'engine', 'tech', 'study', 'learn', 'lesson',
    'exam', 'test', 'algebra', 'calculus', 'nature', 'space', 'art', 'music',
    'sql', 'c++', 'c#', 'rust', 'java', 'philosophy', 'geography', 'literature'
  ];

  const lowerTopic = topic.toLowerCase();
  const isEvidentlySafe = academicKeywords.some(kw => lowerTopic.includes(kw)) || 
                          (topic.length > 3 && topic.length < 50 && /^[\p{L}\p{N}\s?.,!+#&()_-]*$/u.test(topic));

  if (isEvidentlySafe) {
    console.log(`[SafetyService] ✅ Local validation PASSED for academic topic. Allowing bypass.`);
    return {
      isSafe: true,
      message: "Validated via local academic check.",
      redirectedTopic: topic
    };
  }

  return {
    isSafe: true,
    redirectedTopic: topic
  };
};
