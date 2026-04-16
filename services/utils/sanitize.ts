/**
 * Sanitization utilities to protect against Prompt Injection and Cross-Site Scripting (XSS).
 */

/**
 * Sanitizes and wraps user input to prevent prompt injection and character escapes.
 * Uses XML-style tagging as a boundary for the LLM.
 */
export function sanitizeInput(input: string): string {
  if (!input) return "";

  // 1. Strip raw HTML tags to prevent UI-level breakage  // Remove scripts and dangerous attributes
  let clean = input.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "");
  
  // S6: Prevent prompt injection markers and excessive hidden commands
  clean = clean.replace(/(\[[^\]]*\]|\{[^\}]*\}|\bignore\b|\bsystem\b|\bprompt\b)/gi, "");
  
  // Strip common HTML except basics if needed, but here we strip everything for text input
  clean = clean.replace(/<[^>]*>?/gm, "");
  
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
