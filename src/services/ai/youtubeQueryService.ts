import { generateAI } from "./pipeline";
import { sanitizeInput } from "../../utils/sanitize";

export interface QueryGenerationContext {
  lessonTitle: string;
  planTitle?: string;
  subject?: string;
  difficulty?: string;
  learningObjective?: string;
  lessonDescription?: string;
  requiredTools?: string[];
  tags?: string[];
  preferredLanguage?: string;
}

// Common tech keywords to extract tools from lesson metadata
const KNOWN_TOOLS = [
  'excel', 'power bi', 'tableau', 'sql', 'mysql', 'postgresql', 'pandas', 'numpy',
  'python', 'javascript', 'typescript', 'c#', 'c++', 'java', 'rust', 'go', 'html',
  'css', 'react', 'angular', 'vue', 'docker', 'git', 'linux', 'aws', 'azure'
];

/**
 * Extracts explicit tool names from lesson title, objective, or subject
 */
export const extractLessonTools = (
  title: string = '',
  objective: string = '',
  subject: string = ''
): string[] => {
  const combined = `${title} ${objective} ${subject}`.toLowerCase();
  const matched = new Set<string>();

  for (const tool of KNOWN_TOOLS) {
    const regex = new RegExp(`\\b${tool.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(combined)) {
      matched.add(tool);
    }
  }

  // Handle special case for C# and C++
  if (/\bc#\b|\bcsharp\b|\b\.net\b/i.test(combined)) matched.add('c#');
  if (/\bc\+\+\b|\bcpp\b/i.test(combined)) matched.add('c++');
  if (/\bpower\s*bi\b/i.test(combined)) matched.add('power bi');

  return Array.from(matched);
};

/**
 * Uses AI to generate a laser-focused YouTube search query anchored to the
 * current lesson's exact objectives, tools, and educational concepts.
 *
 * Provider: Groq (openai/gpt-oss-20b)
 */
export const generateYouTubeSearchQuery = async (
  topicOrContext: string | QueryGenerationContext,
  subject: string = '',
  language: string = '',
  videoLanguage: string = 'English'
): Promise<string> => {
  // Normalize parameters
  let lessonTitle = '';
  let planSubject = subject;
  let learningObjective = '';
  let difficulty = 'Beginner';
  let targetLang = videoLanguage;
  let tools: string[] = [];

  if (typeof topicOrContext === 'object' && topicOrContext !== null) {
    lessonTitle = topicOrContext.lessonTitle || '';
    planSubject = topicOrContext.subject || topicOrContext.planTitle || subject;
    learningObjective = topicOrContext.learningObjective || topicOrContext.lessonDescription || '';
    difficulty = topicOrContext.difficulty || 'Beginner';
    targetLang = topicOrContext.preferredLanguage || videoLanguage;
    tools = topicOrContext.requiredTools || extractLessonTools(lessonTitle, learningObjective, planSubject);
  } else {
    lessonTitle = String(topicOrContext || '');
    tools = extractLessonTools(lessonTitle, '', planSubject);
  }

  const cleanTopic = lessonTitle.replace(/^(Day|Module|Week|Section|Lesson)\s*\d+[:\-]?\s*/i, '').trim();
  const langSuffix = targetLang && targetLang !== 'English' 
    ? (targetLang.toLowerCase() === 'tamil' ? ' in Tamil தமிழ்' : ` in ${targetLang}`)
    : '';

  // Deterministic fallback query anchored around tool + specific lesson concept
  const primaryTool = tools[0] || (language || (planSubject ? planSubject.split(/\s+/)[0] : ''));
  let baseConcept = cleanTopic;
  if (primaryTool && !cleanTopic.toLowerCase().includes(primaryTool.toLowerCase())) {
    baseConcept = `${primaryTool} ${cleanTopic}`;
  }
  const fallbackQuery = `${sanitizeInput(baseConcept)} tutorial${langSuffix}`;

  const langInstruction = targetLang && targetLang !== 'English'
    ? `\n- The user wants tutorials in ${sanitizeInput(targetLang)}. Append "in ${sanitizeInput(targetLang)}${targetLang.toLowerCase() === 'tamil' ? ' தமிழ்' : ''}" to the query.`
    : '';

  const systemPrompt = `You are a YouTube search query optimizer for educational content.
Given a specific lesson title, its learning objectives, tools, and the broader subject, return a single search query (4-8 words) that will find the best tutorial on YouTube.

CRITICAL RULES:
1. ANCHOR TO THE LESSON: Focus strictly on the exact skill, concept, and tool taught in THIS lesson.
2. REJECT GENERALITIES: If the lesson is "Data Cleaning Using Excel", the query MUST include "Excel data cleaning", NEVER general "Data Analyst" or "Big Data".
3. TOOL-SPECIFIC: If a specific software/tool is named (${tools.join(', ') || 'none specified'}), the query MUST include that tool.
4. TARGET AUDIENCE: Include "tutorial", "beginners", or "step by step" if difficulty is Beginner.
5. NO FLUFF: Return ONLY the query string (no quotes, no markdown, no explanations).${langInstruction}`;

  const prompt = `<lesson_title>${sanitizeInput(cleanTopic)}</lesson_title>
<subject>${sanitizeInput(planSubject) || "general education"}</subject>
<learning_objective>${sanitizeInput(learningObjective) || "Master the core lesson concept"}</learning_objective>
<difficulty>${sanitizeInput(difficulty)}</difficulty>
<required_tools>${tools.join(', ') || 'None'}</required_tools>
<preferred_language>${sanitizeInput(targetLang)}</preferred_language>`;

  try {
    const response = await generateAI({
      task: 'youtube_query',
      prompt,
      systemPrompt,
      options: {
        temperature: 0.1,
        maxTokens: 150,
      },
    });

    const query = response.text?.trim().replace(/^["']|["']$/g, '') || "";
    if (query && query.length >= 5 && query.length <= 120) {
      return query;
    }
  } catch (error) {
    console.warn('[YouTubeQueryService] Query generation via pipeline failed, using fallback query:', error);
  }

  return fallbackQuery;
};
