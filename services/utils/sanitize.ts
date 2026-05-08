/**
 * Sanitization utilities to protect against Prompt Injection and Cross-Site Scripting (XSS).
 */

/**
 * Sanitizes and prepares user input for LLM requests.
 * 
 * DESIGN PATTERN: XML Tagging
 * When using this sanitized output in a prompt, ALWAYS wrap it in XML tags 
 * (e.g., <user_input>{sanitized}</user_input>) and instruct the model to
 * treat everything inside those tags as data, not instructions.
 */
export function sanitizeInput(input: string): string {
  if (!input) return "";

  // 1. Strip raw HTML tags to prevent UI-level breakage
  let clean = input.replace(/<[^>]*>?/gm, "");

  // 2. Neutralize common prompt injection techniques
  // We don't want to over-strip legitimate educational terms, but we block 
  // explicit "system override" phrases that are common in injection attacks.
  const injectionPatterns = [
    /\b(ignore (all )?previous instructions)\b/gi,
    /\b(system override)\b/gi,
    /\b(you are now a)\b/gi,
    /\b(forget what I said)\b/gi,
    /\b(disregard (all )?safety)\b/gi
  ];

  injectionPatterns.forEach(pattern => {
    clean = clean.replace(pattern, "[FILTERED]");
  });

  return clean.trim();
}

/**
 * Basic XSS prevention for rendering strings that might contain user/AI content.
 * Note: React's default interpolation is safe, but this is a secondary defense layer
 * when dealing with raw strings or dangerouslySetInnerHTML.
 */
export function sanitizeTextForUI(text: string): string {
    if (!text) return "";
    
    // Simple escape for basic HTML characters
    const map: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };

    return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Removes all HTML tags and invisible characters.
 */
export function stripHTML(text: string): string {
    return text.replace(/<[^>]*>?/gm, '').trim();
}
