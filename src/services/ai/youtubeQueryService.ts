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
  'css', 'react', 'angular', 'vue', 'docker', 'git', 'linux', 'aws', 'azure',
  'gcc', 'clang', 'mingw', 'make', 'codeblocks'
];

/**
 * Accurately matches a word or symbol token in text respecting punctuation boundaries.
 * Correctly matches tokens containing symbols like 'c#', '.net', 'c++', while preventing
 * substring collisions like 'inputs' matching 'ts' or 'google' matching 'go'.
 */
export const matchWordOrSymbol = (text: string, token: string): boolean => {
  if (!text || !token) return false;
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(?:^|[^a-zA-Z0-9_#+.])${escaped}(?:[^a-zA-Z0-9_#+.]|$)`, 'i');
  return regex.test(text);
};

/**
 * Extracts explicit tool names from lesson title, objective, subject, or plan title
 */
export const extractLessonTools = (
  title: string = '',
  objective: string = '',
  subject: string = '',
  planTitle: string = ''
): string[] => {
  const cleanSubject = (subject && subject !== 'AI Generated') ? subject : '';
  const combined = `${title} ${objective} ${cleanSubject} ${planTitle}`.toLowerCase();
  const matched = new Set<string>();

  // Check special tech symbols and multi-word names first
  const hasCSharp = matchWordOrSymbol(combined, 'c#') || matchWordOrSymbol(combined, 'csharp') || matchWordOrSymbol(combined, '.net') || matchWordOrSymbol(combined, 'dotnet');
  const hasCPlusPlus = matchWordOrSymbol(combined, 'c++') || matchWordOrSymbol(combined, 'cpp');

  if (hasCSharp) matched.add('c#');
  if (hasCPlusPlus) matched.add('c++');
  if (matchWordOrSymbol(combined, 'power bi') || matchWordOrSymbol(combined, 'powerbi')) {
    matched.add('power bi');
  }

  // If not C# and not C++, check for C programming
  if (!hasCSharp && !hasCPlusPlus) {
    if (
      matchWordOrSymbol(combined, 'c programming') ||
      matchWordOrSymbol(combined, 'c language') ||
      matchWordOrSymbol(combined, 'learn c') ||
      matchWordOrSymbol(combined, 'c tutorial') ||
      matchWordOrSymbol(cleanSubject, 'c') ||
      matchWordOrSymbol(planTitle, 'c')
    ) {
      matched.add('c');
    }
  }

  for (const tool of KNOWN_TOOLS) {
    if (matchWordOrSymbol(combined, tool)) {
      matched.add(tool);
    }
  }

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
    const rawSub = topicOrContext.subject && topicOrContext.subject !== 'AI Generated' ? topicOrContext.subject : '';
    planSubject = rawSub || topicOrContext.planTitle || subject;
    learningObjective = topicOrContext.learningObjective || topicOrContext.lessonDescription || '';
    difficulty = topicOrContext.difficulty || 'Beginner';
    targetLang = topicOrContext.preferredLanguage || videoLanguage;
    tools = topicOrContext.requiredTools?.length
      ? topicOrContext.requiredTools
      : extractLessonTools(lessonTitle, learningObjective, planSubject, topicOrContext.planTitle);
  } else {
    lessonTitle = String(topicOrContext || '');
    planSubject = subject && subject !== 'AI Generated' ? subject : '';
    tools = extractLessonTools(lessonTitle, '', planSubject);
  }

  const cleanTopic = lessonTitle.replace(/^(Day|Module|Week|Section|Lesson)\s*\d+[:\-]?\s*/i, '').trim();
  const langSuffix = targetLang && targetLang !== 'English' 
    ? (targetLang.toLowerCase() === 'tamil' ? ' in Tamil தமிழ்' : ` in ${targetLang}`)
    : '';

  // Deterministic fallback query anchored around tool + specific lesson concept
  const primaryTool = tools[0] || (language || (planSubject && planSubject !== 'AI Generated' ? planSubject.split(/\s+/)[0] : ''));
  let baseConcept = cleanTopic;
  if (primaryTool && !cleanTopic.toLowerCase().includes(primaryTool.toLowerCase())) {
    const toolPrefix = primaryTool === 'c' ? 'C programming' : primaryTool;
    baseConcept = `${toolPrefix} ${cleanTopic}`;
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
3. TOOL & LANGUAGE-SPECIFIC: If a specific software/tool or programming language is named (${tools.join(', ') || planSubject || 'none specified'}), the query MUST include that tool/language (e.g. "${primaryTool || 'C#'} ${cleanTopic}").
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
