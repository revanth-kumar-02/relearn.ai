import { AI_MODELS } from "./config";
import { getProxyConfiguredGenAI } from "./genai";
import { sanitizeInput } from "../utils/sanitize";

/**
 * Uses Gemini to generate an optimized YouTube search query
 * for finding educational videos on a given topic and subject.
 *
 * Falls back to a naive concatenation if the API key is missing or the call fails.
 */
export const generateYouTubeSearchQuery = async (
  topic: string,
  subject: string,
  language: string,
  videoLanguage: string = 'English'
): Promise<string> => {
  const cleanTopic = topic.replace(/^(Day|Module|Week|Section|Lesson)\s*\d+[:\-]?\s*/i, '').trim();
  const langSuffix = videoLanguage && videoLanguage !== 'English' ? ` in ${videoLanguage}` : '';
  const fallbackQuery = language
    ? `${sanitizeInput(language)} ${sanitizeInput(cleanTopic)} tutorial for beginners${langSuffix}`
    : `${sanitizeInput(cleanTopic)} explained lecture course${langSuffix}`;

  try {
    const ai = getProxyConfiguredGenAI('learning');
    const videoLangInstruction = videoLanguage && videoLanguage !== 'English'
      ? `\n- The user wants videos in ${sanitizeInput(videoLanguage)}. Append "in ${sanitizeInput(videoLanguage)}" to the query.`
      : '';
    const response = await ai.models.generateContent({
      model: AI_MODELS.PRIMARY,
      contents: `Topic: "${sanitizeInput(cleanTopic)}"\nSubject / Language: "${sanitizeInput(subject) || "general programming"}"\nPreferred Video Language: "${sanitizeInput(videoLanguage)}"`,
      config: {
        systemInstruction: `You are a YouTube search query optimizer for educational programming content.
Given a lesson topic and its subject/language, return a single search query (4-8 words) that will find the best beginner-friendly tutorial video on YouTube.

Rules:
- Return ONLY the query string, nothing else. Do not output anything like "Here is the query".
- Never include words like "AI", "Generated", "Day X", or conversational text.
- Include the programming language/subject if one is provided.
- Favor terms like "tutorial", "explained", "for beginners", "step by step".
- Be specific to the topic — don't be generic.${videoLangInstruction}`,
        temperature: 0.1,
        maxOutputTokens: 30,
      },
    });

    const query = response.text?.trim();

    if (!query || query.length < 5 || query.length > 120) {
      console.warn("Gemini returned an unusable query — using fallback.");
      return fallbackQuery;
    }

    console.log(`Gemini YouTube query: "${query}"`);
    return query;
  } catch (error) {
    console.warn("Gemini YouTube query generation failed — using fallback.", error);
    return fallbackQuery;
  }
};
