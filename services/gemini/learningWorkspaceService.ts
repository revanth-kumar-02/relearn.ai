import { Type } from "@google/genai";
import { AI_MODELS, IS_GROQ_MODEL, isRetryableError } from "./config";
import { getProxyConfiguredGenAI } from "./genai";
import { sanitizeInput } from "../utils/sanitize";

/**
 * Extracts a JSON object from a string that might contain markdown fences or other text.
 */
const extractJson = (text: string): string => {
  // Try to find content between ```json and ```
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch && jsonMatch[1]) {
    return jsonMatch[1].trim();
  }
  
  // If no fences, find the first '{' and last '}'
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  
  if (start !== -1 && end !== -1 && end > start) {
    return text.substring(start, end + 1).trim();
  }
  
  return text.trim();
};

/**
 * Generates a guided learning session.
 * When pdfContent is provided, the AI uses it as primary source material
 * instead of relying solely on the topic name.
 */
export const generateLessonContent = async (
  topic: string,
  planTitle: string,
  language: string = 'English',
  pdfContent?: string
): Promise<string> => {
  try {
    const ai = getProxyConfiguredGenAI('learning');

    // Build the prompt dynamically based on whether PDF content is available
    const pdfSection = pdfContent
      ? `\n\nThe student has uploaded a PDF document. Use the following extracted content as PRIMARY source material for the lesson. Base the explanation, activities, and questions directly on this material:\n\n--- BEGIN PDF CONTENT ---\n${sanitizeInput(pdfContent)}\n--- END PDF CONTENT ---`
      : '';

    const systemInstruction = `You are a Senior UI/UX Content Formatter and Expert AI Tutor.
Your task is to generate a premium, structured learning session in JSON format.
${pdfContent ? `The student has provided PDF content — use it as the PRIMARY source material. Base the explanation, activities, and questions directly on this material. Reference specific sections using "(Source: ...)" markers.` : ''}

CRITICAL FORMATTING RULES FOR 'aiExplanation':
1. STRUCTURE: Use clear Markdown sections with titles (##) and subheadings (###).
2. SPACING: Ensure double line breaks between paragraphs and sections. 
3. BREVITY: Keep paragraphs short (maximum 2-4 lines). Break complex ideas into small, digestible chunks.
4. TYPOGRAPHY: 
   - **Bold** key terms and essential concepts to improve visual scanning.
   - Use bullet points for lists of features, steps, or components.
5. CODE: 
   - ALL code must be in separate, triple-backtick fenced blocks.
   - Add a brief explanation BEFORE and AFTER each code block.
   - Use monospaced styling for inline code using single backticks (\`code\`).
6. VISUAL SCANNING: The content must be easy to scan. No "walls of text".
7. LANGUAGE: All explanations, activities, and guidance must be written in **${language}**.
8. TECHNICAL TERMS: Keep technical terms (e.g., "Variables", "DOM", "State") in English to ensure professional terminology is retained.
9. VARIETY: Ensure the content is unique and specifically tailored to the topic: "${sanitizeInput(topic)}". Avoid generic introductions.

Include:
1. learningObjective: A clear, concise goal for the session (written in ${language}).
2. aiExplanation: The formatted Markdown content (written in ${language}) following the rules above.
3. practiceActivities: An array of 3-4 step-by-step learning tasks (written in ${language}). IMPORTANT: Each item must be a simple STRING, not an object.
4. resources: An array of 2-3 relevant resource objects. Each object MUST have: "title" (string), "url" (string), and "type" (string, one of: 'video', 'article', 'link').
5. practiceQuestion: A high-quality reflection question (written in ${language}) or small challenge.

Do not include markdown code fences (like \`\`\`json) outside the JSON structure. Returns ONLY valid JSON.`;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        learningObjective: { type: Type.STRING },
        aiExplanation: { type: Type.STRING },
        practiceActivities: { type: Type.ARRAY, items: { type: Type.STRING } },
        resources: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              url: { type: Type.STRING },
              type: { type: Type.STRING, enum: ['video', 'article', 'link'] }
            },
            required: ["title", "url", "type"]
          }
        },
        practiceQuestion: { type: Type.STRING }
      },
      required: ["learningObjective", "aiExplanation", "practiceActivities", "resources", "practiceQuestion"]
    };

    const modelsToTry = [AI_MODELS.PRIMARY, ...AI_MODELS.FALLBACK_CHAIN.filter(m => m !== AI_MODELS.PRIMARY)];
    let lastError: any = null;

    for (const currentModel of modelsToTry) {
      try {
        console.log(`[LearningWorkspace] Attempting session generation with model: ${currentModel}`);
        
        if (IS_GROQ_MODEL(currentModel)) {
          const response = await fetch('/api/groq/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: currentModel,
              messages: [
                { role: 'system', content: systemInstruction },
                { role: 'user', content: `Generate a guided learning session for the topic: "${sanitizeInput(topic)}" as part of the plan "${sanitizeInput(planTitle)}".${pdfSection}` }
              ],
              response_format: { type: 'json_object' },
              temperature: 0.7,
            })
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `Groq API error: ${response.status}`);
          }

          const data = await response.json();
          const content = data.choices[0]?.message?.content;
          if (content) {
            const extracted = extractJson(content);
            console.log(`[LearningWorkspace] Session generated successfully with Groq model: ${currentModel}`);
            return extracted;
          }
        } else {
          const response = await ai.models.generateContent({
            model: currentModel,
            contents: [{
              role: 'user',
              parts: [{ text: `Generate a guided learning session for the topic: "${sanitizeInput(topic)}" as part of the plan "${sanitizeInput(planTitle)}".${pdfSection}` }]
            }],
            config: {
              systemInstruction,
              responseMimeType: "application/json",
              responseSchema
            }
          });

          const text = response.text;
          if (text) {
            const extracted = extractJson(text);
            console.log(`[LearningWorkspace] Session generated successfully with model: ${currentModel}`);
            return extracted;
          }
        }
      } catch (error: any) {
        lastError = error;
        const errorMsg = error?.message || error?.toString() || 'Unknown error';
        console.warn(`[LearningWorkspace] Model ${currentModel} failed:`, errorMsg);

        // For fallback chain, we want to try the next model for almost any error
        // except when we've run out of models.
        const isLastModel = modelsToTry.indexOf(currentModel) === modelsToTry.length - 1;
        
        if (!isLastModel) {
          console.log(`[LearningWorkspace] Attempting fallback to next model...`);
          continue;
        }
        break;
      }
    }

    throw lastError || new Error("All models failed");
  } catch (error) {
    console.error("Gemini Session Generation Error:", error);
    throw error;
  }
};
