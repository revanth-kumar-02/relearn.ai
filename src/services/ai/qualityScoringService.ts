import { Type } from "@google/genai";
import { AI_MODELS, IS_GROQ_MODEL } from "../../config/gemini.config";
import { getProxyConfiguredGenAI } from "./genai";
import { getAuthHeaders } from "../../utils/authUtils";
import { safeParseAIResponse } from "../../utils/aiUtils";

export interface QualityScore {
  overall: number;
  structure: number;
  depth: number;
  clarity: number;
  engagement: number;
  feedback: string;
  recommendations: string[];
}

/**
 * Uses AI to analyze and score the quality of a generated learning plan.
 */
export const scorePlanQuality = async (plan: any): Promise<QualityScore> => {
  try {
    const ai = getProxyConfiguredGenAI('plan');

    const systemInstruction = `You are an Educational Quality Auditor.
Your task is to critically analyze the learning plan provided and score it across 4 dimensions:
1. Structure: How logical is the progression of topics?
2. Depth: Does it provide enough material for mastery?
3. Clarity: How easy is it to understand the objectives?
4. Engagement: How interactive and practical are the tasks?

Scoring: Each dimension is from 0-100.
Overall: The average of the 4 dimensions.

Return ONLY a JSON object.`;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        overall: { type: Type.NUMBER },
        structure: { type: Type.NUMBER },
        depth: { type: Type.NUMBER },
        clarity: { type: Type.NUMBER },
        engagement: { type: Type.NUMBER },
        feedback: { type: Type.STRING },
        recommendations: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ["overall", "structure", "depth", "clarity", "engagement", "feedback", "recommendations"]
    };

    const prompt = `Analyze this learning plan:
Title: ${plan.title}
Subject: ${plan.subject}
Description: ${plan.description}
Tasks: ${plan.tasks?.map((t: any) => t.title).join(', ') || 'No tasks'}

Provide a detailed quality score.`;

    const modelsToTry = [AI_MODELS.PRIMARY, ...AI_MODELS.FALLBACK_CHAIN.filter(m => m !== AI_MODELS.PRIMARY)];
    let lastError: any = null;

    for (const currentModel of modelsToTry) {
      try {
        if (IS_GROQ_MODEL(currentModel)) {
          const response = await fetch('/api/groq/chat/completions', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              ...getAuthHeaders()
            },
            body: JSON.stringify({
              model: currentModel,
              messages: [
                { role: 'system', content: systemInstruction },
                { role: 'user', content: prompt }
              ],
              response_format: { type: 'json_object' },
              temperature: 0.3,
            })
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `Groq API error: ${response.status}`);
          }

          const data = await response.json();
          const content = data.choices[0]?.message?.content;
          if (content) {
            return safeParseAIResponse<QualityScore>(content);
          }
        } else {
          const result = await ai.models.generateContent({
            model: currentModel,
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: {
              systemInstruction,
              responseMimeType: "application/json",
              responseSchema
            }
          });

          if (result.text) {
            return safeParseAIResponse<QualityScore>(result.text);
          }
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[QualityScoring] Model ${currentModel} failed:`, err?.message || err);
        continue;
      }
    }

    throw lastError || new Error("All models failed to score quality");
  } catch (error) {
    console.error('[QualityScoring] Failed to score plan:', error);
    return {
      overall: 0,
      structure: 0,
      depth: 0,
      clarity: 0,
      engagement: 0,
      feedback: 'Failed to analyze quality.',
      recommendations: []
    };
  }
};
