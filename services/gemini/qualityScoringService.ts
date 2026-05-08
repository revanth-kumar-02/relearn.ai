import { Type } from "@google/genai";
import { AI_MODELS, IS_GROQ_MODEL } from "./config";
import { getProxyConfiguredGenAI } from "./genai";
import { Plan } from "../../types";
import { getAuthHeaders } from "../utils/auth";

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
export const scorePlanQuality = async (plan: Plan): Promise<QualityScore> => {
  try {
    const ai = getProxyConfiguredGenAI('analysis');

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
Tasks: ${plan.tasks.map(t => t.title).join(', ')}

Provide a detailed quality score.`;

    const currentModel = AI_MODELS.PRIMARY;

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

      if (!response.ok) throw new Error(`Groq API error: ${response.status}`);
      const data = await response.json();
      return JSON.parse(data.choices[0].message.content);
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

      return JSON.parse(result.text);
    }
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
