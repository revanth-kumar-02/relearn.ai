/**
 * Extracts and parses a JSON object from a string that might contain markdown fences or other text.
 */
export function safeParseAIResponse<T>(text: string, fallback?: T): T {
  try {
    if (!text) throw new Error("Empty response");

    // 1. Try to find content between ```json and ```
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    const potentialJson = jsonMatch && jsonMatch[1] ? jsonMatch[1].trim() : "";

    if (potentialJson) {
      try {
        return JSON.parse(potentialJson) as T;
      } catch (e) {
        // Fall through to other methods if fenced content is invalid
      }
    }

    // 2. Find the first '{' and last '}'
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');

    if (start !== -1 && end !== -1 && end > start) {
      const extracted = text.substring(start, end + 1).trim();
      return JSON.parse(extracted) as T;
    }

    // 3. Try parsing the whole thing
    return JSON.parse(text) as T;
  } catch (error) {
    console.warn("[SafeParseAI] Failed to parse AI response:", error, text);
    if (fallback !== undefined) return fallback;
    throw error;
  }
}

/**
 * Strict sanitization for user inputs before they enter an AI prompt.
 * Implements a zero-trust heuristic to neutralize prompt injection,
 * token smuggling, and instruction overrides.
 */
export function sanitizeForAI(input: string, maxLength: number = 2000): string {
  if (!input) return "";
  
  // 1. Hard Truncate
  let sanitized = input.substring(0, maxLength);
  
  // 2. Block potential prompt injection delimiters and suspicious symbols
  // We block common escape sequences and markdown-breaking characters
  sanitized = sanitized.replace(/[<>{}|[\]\\]/g, ''); 
  
  // 3. Instruction Override Heuristic (Zero-Trust)
  // Detects patterns typical of jailbreaks and overrides
  const injectionPatterns = [
    /ignore previous/i,
    /system prompt/i,
    /you are now/i,
    /forget all/i,
    /acting as/i,
    /DAN/i,
    /do anything now/i,
    /instead of/i,
    /output as raw/i
  ];

  injectionPatterns.forEach(pattern => {
    if (pattern.test(sanitized)) {
      sanitized = "[REDACTED_SECURITY_POLICY]";
    }
  });

  // 4. Normalize whitespace
  sanitized = sanitized.replace(/\s+/g, ' ').trim();
  
  return sanitized;
}
