export function safeParseAIResponse<T>(text: string, fallback?: T): T {
  try {
    if (!text) throw new Error("Empty response");

    // 1. Try parsing the whole thing first (handles native JSON responses from APIs like Groq)
    try {
      return JSON.parse(text.trim()) as T;
    } catch (e) {
      // Not plain JSON, continue to extraction
    }

    // 2. Find the outermost '{' and '}' OR '[' and ']'
    const startObj = text.indexOf('{');
    const endObj = text.lastIndexOf('}');
    const startArr = text.indexOf('[');
    const endArr = text.lastIndexOf(']');
    
    let start = -1;
    let end = -1;
    
    // Choose the outermost structure
    if (startObj !== -1 && endObj !== -1 && (startArr === -1 || startObj < startArr)) {
        start = startObj;
        end = endObj;
    } else if (startArr !== -1 && endArr !== -1) {
        start = startArr;
        end = endArr;
    }

    if (start !== -1 && end !== -1 && end > start) {
      const extracted = text.substring(start, end + 1).trim();
      try {
        return JSON.parse(extracted) as T;
      } catch (e) {
        // Fall through
      }
    }

    // 3. Try to find content between ```json and ``` as a last resort
    // Specifically require 'json' to prevent matching generic code blocks (like ```python)
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/i);
    const potentialJson = jsonMatch && jsonMatch[1] ? jsonMatch[1].trim() : "";

    if (potentialJson) {
      try {
        return JSON.parse(potentialJson) as T;
      } catch (e) {
        // Fall through
      }
    }
    
    // 4. Try generic code fences just in case
    const genericMatch = text.match(/```\s*([\s\S]*?)\s*```/);
    if (genericMatch && genericMatch[1]) {
      try {
        return JSON.parse(genericMatch[1].trim()) as T;
      } catch (e) {
        // Fall through
      }
    }

    throw new Error("Could not parse AI response as JSON");
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
