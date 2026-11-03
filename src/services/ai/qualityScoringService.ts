import { generateAI } from "./pipeline";
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
 * Powered by Groq (primary) and OpenRouter (fallback).
 */
export const scorePlanQuality = async (plan: any): Promise<QualityScore> => {
  try {
    const systemPrompt = `You are an Educational Quality Auditor.
Your task is to critically analyze the learning plan provided and score it across 4 dimensions:
1. Structure: How logical is the progression of topics?
2. Depth: Does it provide enough material for mastery?
3. Clarity: How easy is it to understand the objectives?
4. Engagement: How interactive and practical are the tasks?

Scoring: Each dimension is from 0-100.
Overall: The average of the 4 dimensions.

Return ONLY a JSON object with this schema:
{
  "overall": number,
  "structure": number,
  "depth": number,
  "clarity": number,
  "engagement": number,
  "feedback": "string",
  "recommendations": ["string"]
}`;

    const prompt = `Analyze this learning plan:
Title: ${plan.title || "Untitled Plan"}
Subject: ${plan.subject || "General"}
Description: ${plan.description || "No description provided"}
Tasks: ${plan.tasks?.map((t: any) => t.title).join(', ') || 'No tasks'}

Provide a detailed quality score.`;

    const response = await generateAI({
      task: 'quality_scoring',
      prompt,
      systemPrompt,
      options: {
        temperature: 0.3,
        responseFormat: 'json',
      },
    });

    if (response.text) {
      const parsed = safeParseAIResponse<QualityScore>(response.text);
      if (parsed && typeof parsed.overall === 'number') {
        return parsed;
      }
    }

    throw new Error("Invalid quality score payload returned");
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
