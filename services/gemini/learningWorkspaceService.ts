import { Type } from "@google/genai";
import { AI_MODELS } from "./config";
import { getProxyConfiguredGenAI } from "./genai";
import { sanitizeInput } from "../utils/sanitize";

/**
 * Generates a guided learning session.
 * When pdfContent is provided, the AI uses it as primary source material
 * instead of relying solely on the topic name.
 */
export const generateLessonContent = async (
  topic: string,
  planTitle: string,
  pdfContent?: string
): Promise<string> => {
  try {
    const ai = getProxyConfiguredGenAI();

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

Include:
1. learningObjective: A clear, concise goal for the session.
2. aiExplanation: The formatted Markdown content following the rules above.
3. practiceActivities: An array of 3-4 step-by-step learning tasks.
4. resources: An array of 2-3 relevant resource objects with title, url, and type ('video', 'article', 'link').
5. practiceQuestion: A high-quality reflection question or small challenge.

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
          console.log(`[LearningWorkspace] Session generated successfully with model: ${currentModel}`);
          return text;
        }
      } catch (error: any) {
        lastError = error;
        const errorMsg = error?.message || error?.toString() || 'Unknown error';
        console.warn(`[LearningWorkspace] Model ${currentModel} failed:`, errorMsg);

        // Very basic retryable check since importing isRetryableError might cause circular imports depending on how config.ts is structured
        if (errorMsg.includes('429') || errorMsg.includes('503') || errorMsg.includes('UNAVAILABLE') || errorMsg.includes('network') || errorMsg.includes('fetch')) {
          console.log(`[LearningWorkspace] Error is retryable, trying next fallback model...`);
          continue;
        }
        break; // Non-retryable
      }
    }

    throw lastError || new Error("All models failed");
  } catch (error) {
    console.error("Gemini Session Generation Error:", error);
    throw error;
  }
};
