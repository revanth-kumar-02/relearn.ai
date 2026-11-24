import { generateYouTubeSearchQuery, extractLessonTools, matchWordOrSymbol } from '../ai/youtubeQueryService';
import { getAuthHeaders } from '../../utils/authUtils';

/**
 * YouTube requests are proxied through /api/youtube (Netlify Function in production,
 * and Vite dev server middleware in local development) so the API key never reaches the browser.
 */

// ═══════════════════════════════════════════════════════════════
//  Types
// ═══════════════════════════════════════════════════════════════

export type RelevanceTier =
  | 'DIRECTLY_RELEVANT'
  | 'CONCEPTUALLY_RELEVANT'
  | 'RELATED_NOT_RELEVANT'
  | 'UNRELATED';

export interface StructuredLessonContext {
  planId?: string;
  taskId?: string;
  planTitle?: string;
  subject?: string;
  difficulty?: 'Beginner' | 'Intermediate' | 'Advanced' | string;
  lessonTitle: string;
  learningObjective?: string;
  lessonDescription?: string;
  requiredTools?: string[];
  tags?: string[];
  preferredLanguage?: string;
  userId?: string;
}

export interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  channelTitle: string;
  viewCount: string;
  publishedAt: string;
  reason: string;
  relevanceScore: number;
  relevanceTier: RelevanceTier;
  detectedLanguage?: string;
  isLanguageMatch?: boolean;
  videoId: string; // Raw YouTube video ID
}

/** Internal type used during filter/rank before stripping internal keys */
interface RankedVideo extends YouTubeVideo {
  _isEligible: boolean;
  _viewCountRaw: number;
}

interface CachedResult {
  videos: YouTubeVideo[];
  timestamp: number;
}

// ── YouTube Data API v3 response shapes ──────────────────────

interface YTSearchItem {
  id: { videoId: string };
  snippet: {
    title: string;
    description: string;
    channelTitle: string;
    publishedAt: string;
    thumbnails: {
      default?: { url: string };
      medium?: { url: string };
      high?: { url: string };
    };
  };
}

interface YTSearchResponse {
  items?: YTSearchItem[];
  pageInfo?: { totalResults: number; resultsPerPage: number };
}

interface YTVideoDetail {
  id: string;
  snippet: {
    title: string;
    description: string;
    channelTitle: string;
    publishedAt: string;
    thumbnails: {
      default?: { url: string };
      medium?: { url: string };
      high?: { url: string };
    };
  };
  statistics?: {
    viewCount?: string;
    likeCount?: string;
    commentCount?: string;
  };
}

interface YTVideoDetailResponse {
  items?: YTVideoDetail[];
}

// ═══════════════════════════════════════════════════════════════
//  Constants
// ═══════════════════════════════════════════════════════════════

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h cache validity
const CACHE_PREFIX = 'relearn_videos_v5_';
const MAX_RECOMMENDED_VIDEOS = 4;
const FETCH_POOL_SIZE = 15; // Fetch candidate pool for educational evaluation

// Minimum view count thresholds for educational credibility
export const MIN_RECOMMENDED_VIEWS = 5000;       // Reject unvetted, low-confidence recordings (< 5,000 views)
export const ACCEPTABLE_VIEW_THRESHOLD = 10000;  // Standard educational threshold (10,000+ views)
export const PREFERRED_VIEW_THRESHOLD = 50000;   // High popularity threshold (50,000+ views)

// Video language options
export const VIDEO_LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'Hindi' },
  { value: 'ta', label: 'Tamil' },
  { value: 'te', label: 'Telugu' },
  { value: 'ml', label: 'Malayalam' },
] as const;

export type VideoLanguageCode = typeof VIDEO_LANGUAGE_OPTIONS[number]['value'];
export type LanguageCode = VideoLanguageCode; // Alias for content language

const VIDEO_LANG_LABEL_MAP: Record<string, string> = {
  en: 'English', hi: 'Hindi', ta: 'Tamil', te: 'Telugu', ml: 'Malayalam',
};

const LS_VIDEO_LANG_KEY = 'videoLanguagePreference';
const LS_CONTENT_LANG_KEY = 'contentLanguagePreference';

const getScopedVideoKey = (userId?: string) => userId ? `relearn_video_lang_${userId}` : LS_VIDEO_LANG_KEY;
const getScopedContentKey = (userId?: string) => userId ? `relearn_content_lang_${userId}` : LS_CONTENT_LANG_KEY;

/** Get the user's preferred video language code (defaults to 'en') */
export const getVideoLanguagePreference = (userId?: string): VideoLanguageCode => {
  try {
    if (userId) {
      const userScoped = localStorage.getItem(getScopedVideoKey(userId));
      if (userScoped && VIDEO_LANG_LABEL_MAP[userScoped]) return userScoped as VideoLanguageCode;
    }
    const val = localStorage.getItem(LS_VIDEO_LANG_KEY);
    if (val && VIDEO_LANG_LABEL_MAP[val]) return val as VideoLanguageCode;
  } catch { /* noop */ }
  return 'en';
};

/** Set the user's preferred video language code */
export const setVideoLanguagePreference = (code: VideoLanguageCode, userId?: string): void => {
  try {
    if (userId) {
      localStorage.setItem(getScopedVideoKey(userId), code);
    }
    localStorage.setItem(LS_VIDEO_LANG_KEY, code);
  } catch { /* noop */ }
};

/** Get the human-readable label for a video language code */
export const getVideoLanguageLabel = (code: string): string =>
  VIDEO_LANG_LABEL_MAP[code] || 'English';

/** Get the user's preferred content (text) language code (defaults to 'en') */
export const getContentLanguagePreference = (userId?: string): LanguageCode => {
  try {
    if (userId) {
      const userScoped = localStorage.getItem(getScopedContentKey(userId));
      if (userScoped && VIDEO_LANG_LABEL_MAP[userScoped]) return userScoped as LanguageCode;
    }
    const val = localStorage.getItem(LS_CONTENT_LANG_KEY);
    if (val && VIDEO_LANG_LABEL_MAP[val]) return val as LanguageCode;
  } catch { /* noop */ }
  return 'en';
};

/** Set the user's preferred content (text) language code */
export const setContentLanguagePreference = (code: LanguageCode, userId?: string): void => {
  try {
    if (userId) {
      localStorage.setItem(getScopedContentKey(userId), code);
    }
    localStorage.setItem(LS_CONTENT_LANG_KEY, code);
  } catch { /* noop */ }
};

/** Clean up user-scoped preferences on logout */
export const clearUserLanguagePreferences = (userId?: string): void => {
  try {
    if (userId) {
      localStorage.removeItem(getScopedVideoKey(userId));
      localStorage.removeItem(getScopedContentKey(userId));
    }
    localStorage.removeItem(LS_VIDEO_LANG_KEY);
    localStorage.removeItem(LS_CONTENT_LANG_KEY);
  } catch { /* noop */ }
};

/** Get the human-readable label for a content language code */
export const getContentLanguageLabel = (code: string): string =>
  VIDEO_LANG_LABEL_MAP[code] || 'English';

// High-quality educational channels for programming & data
const PREFERRED_CHANNELS = [
  'freecodecamp', 'traversy media', 'the net ninja', 'fireship',
  'programming with mosh', 'academind', 'web dev simplified',
  'corey schafer', 'sentdex', 'tech with tim', 'clever programmer',
  'brocode', 'code with harry', 'telusko', 'apna college',
  'cs dojo', 'thenewboston', 'derek banas', 'kudvenkat',
  'chandoo', 'kevin stratvert', 'statquest', 'alex the analyst',
  'luke barousse', 'edureka', 'simplilearn', 'great learning',
  'mycodeschool', 'abdul bari', 'jenny\'s lectures', 'gate smashers',
  'neso academy', 'mit opencourseware', 'khan academy',
  '3blue1brown', 'the organic chemistry tutor', 'tim corey', 'nick chapsas',
  'iamtimcorey', 'raw coding', 'dometrain', 'claudio bernasconi'
];

// Common programming languages and aliases
export const LANGUAGE_ALIASES: Record<string, string[]> = {
  'javascript': ['javascript', 'js', 'es6', 'es2015', 'ecmascript', 'node.js', 'nodejs'],
  'typescript': ['typescript', 'ts'],
  'python': ['python', 'py', 'python3'],
  'java': ['java', 'jdk', 'jvm'],
  'c++': ['c++', 'cpp', 'c plus plus'],
  'c#': ['c#', 'csharp', 'c sharp', '.net', 'dotnet'],
  'c': ['c programming', 'c language', 'c compiler', 'learn c', 'c tutorial', 'ansi c'],
  'ruby': ['ruby', 'ruby on rails', 'rails'],
  'php': ['php', 'laravel'],
  'swift': ['swift', 'swiftui', 'ios development'],
  'kotlin': ['kotlin', 'android kotlin'],
  'go': ['golang', 'go programming', 'go language', 'go'],
  'rust': ['rust', 'rust programming', 'rust lang'],
  'dart': ['dart', 'flutter'],
  'r': ['r programming', 'r language', 'rstudio'],
  'sql': ['sql', 'mysql', 'postgresql', 'sqlite', 'database'],
  'html': ['html', 'html5', 'semantic html'],
  'css': ['css', 'css3', 'scss', 'sass', 'tailwind'],
  'react': ['react', 'reactjs', 'react.js'],
  'angular': ['angular', 'angularjs'],
  'vue': ['vue', 'vuejs', 'vue.js'],
  'next.js': ['next.js', 'nextjs', 'next js'],
  'excel': ['excel', 'microsoft excel', 'ms excel', 'spreadsheet', 'spreadsheets'],
  'power bi': ['power bi', 'powerbi', 'dax', 'power query'],
  'tableau': ['tableau'],
};

// AI coding assistant tools that frequently hijack search results for general programming lessons
export const GENERIC_AI_CODING_TOOLS = [
  'claude code', 'claude', 'opencode', 'ollama', 'cursor', 'cursor ai',
  'copilot', 'github copilot', 'chatgpt', 'kiro ide', 'kiro', 'windsurf',
  'v0.dev', 'bolt.new', 'devin'
];

// Unrelated specialized technology stacks that must not hijack general language lessons
export const UNRELATED_SPECIALIZED_STACKS = [
  'mern', 'mean stack', 'sharepoint', 'wordpress', 'salesforce', 'shopify',
  'sap', 'magento', 'drupal', 'laravel', 'django', 'rails'
];

export interface EcosystemDefinition {
  primary: string[];
  associated: string[];
  disallowed: string[];
}

export const TECH_ECOSYSTEMS: Record<string, EcosystemDefinition> = {
  'c': {
    primary: [
      'c programming', 'c language', 'c compiler', 'learn c', 'c tutorial',
      'ansi c', 'c code', 'c program', 'c'
    ],
    associated: ['gcc', 'clang', 'mingw', 'codeblocks', 'make', 'pointers', 'memory management', 'c setup', 'c programming tutorial', 'clion'],
    disallowed: [
      'c#', 'csharp', '.net', 'dotnet', 'c++', 'cpp', 'python', 'java', 'go',
      'golang', 'rust', 'javascript', 'typescript', 'mern', 'sharepoint', 'cursor', 'claude', 'kiro'
    ]
  },
  'c#': {
    primary: ['c#', 'csharp', 'c sharp', '.net', 'dotnet', 'visual studio'],
    associated: ['asp.net', 'wpf', 'entity framework', 'linq', 'blazor', 'c# 12', 'c# 11', 'c# 10', 'nuget'],
    disallowed: ['mern', 'mean stack', 'sharepoint', 'python', 'java', 'go', 'golang', 'rust', 'php', 'ruby', 'kiro', 'claude', 'flutter']
  },
  'python': {
    primary: ['python', 'python3', 'py'],
    associated: ['pip', 'jupyter', 'anaconda', 'pycharm', 'pandas', 'numpy', 'matplotlib'],
    disallowed: ['javascript', 'typescript', 'c#', 'java', 'go', 'rust', 'c++', 'php', 'mern', 'sharepoint', 'kiro', 'claude']
  },
  'javascript': {
    primary: ['javascript', 'js', 'ecmascript'],
    associated: ['node', 'nodejs', 'npm', 'es6', 'vanilla js'],
    disallowed: ['python', 'c#', 'java', 'c++', 'rust', 'go', 'php', 'kiro', 'claude']
  },
  'typescript': {
    primary: ['typescript', 'ts'],
    associated: ['tsc', 'ts-node', 'node', 'npm'],
    disallowed: ['python', 'c#', 'java', 'c++', 'rust', 'go', 'php', 'kiro', 'claude']
  },
  'go': {
    primary: ['golang', 'go language', 'go programming', 'go'],
    associated: ['goroutines', 'go modules'],
    disallowed: ['python', 'c#', 'java', 'rust', 'javascript', 'mern', 'sharepoint', 'kiro', 'claude']
  },
  'rust': {
    primary: ['rust', 'rustlang', 'rust programming'],
    associated: ['cargo', 'crates.io', 'borrow checker'],
    disallowed: ['python', 'c#', 'java', 'go', 'javascript', 'mern', 'kiro', 'claude']
  },
  'java': {
    primary: ['java', 'jdk', 'jvm'],
    associated: ['spring', 'spring boot', 'maven', 'gradle', 'intellij'],
    disallowed: ['python', 'c#', 'rust', 'go', 'javascript', 'php', 'kiro', 'claude']
  },
  'c++': {
    primary: ['c++', 'cpp', 'c plus plus'],
    associated: ['gcc', 'clang', 'cmake', 'visual studio'],
    disallowed: ['python', 'c#', 'java', 'rust', 'go', 'javascript', 'mern', 'kiro', 'claude']
  },
  'html': {
    primary: ['html', 'html5', 'semantic html'],
    associated: ['forms', 'tags', 'elements', 'web development'],
    disallowed: ['react', 'angular', 'vue', 'python', 'c#', 'rust', 'go', 'kiro', 'claude']
  },
  'css': {
    primary: ['css', 'css3', 'styling'],
    associated: ['flexbox', 'grid', 'tailwind', 'sass', 'responsive design'],
    disallowed: ['python', 'c#', 'sql', 'rust', 'go', 'kiro', 'claude']
  },
  'sql': {
    primary: ['sql', 'mysql', 'postgresql', 'postgres', 'sqlite', 'database'],
    associated: ['queries', 'table', 'relational', 'join', 'select'],
    disallowed: ['excel', 'html', 'css', 'react', 'python', 'c#', 'kiro', 'claude']
  },
  'excel': {
    primary: ['excel', 'microsoft excel', 'ms excel', 'spreadsheet'],
    associated: ['formulas', 'vlookup', 'xlookup', 'pivot table', 'data cleaning'],
    disallowed: ['cursor', 'power bi', 'python', 'tableau', 'jupyter', 'kiro', 'claude']
  },
  'power bi': {
    primary: ['power bi', 'powerbi', 'dax'],
    associated: ['power query', 'dashboard', 'pbi desktop'],
    disallowed: ['excel', 'python', 'tableau', 'cursor', 'kiro', 'claude']
  }
};

// Domain tool conflicts: When learning Tool A, videos focused on Tool B must be rejected
const CONFLICTING_TOOLS: Record<string, string[]> = {
  'c': ['c#', 'c++', 'python', 'java', 'javascript', 'rust', 'go', 'cursor', 'claude code', 'mern', 'sharepoint'],
  'excel': ['cursor', 'vscode', 'power bi', 'python', 'tableau', 'jupyter', 'claude code'],
  'power bi': ['cursor', 'vscode', 'excel', 'python', 'tableau', 'jupyter', 'claude code'],
  'tableau': ['cursor', 'vscode', 'power bi', 'excel'],
  'html': ['react', 'angular', 'vue', 'next.js', 'cursor', 'python', 'claude code'],
  'css': ['python', 'c#', 'sql', 'rust', 'go', 'claude code'],
  'python': ['javascript', 'c#', 'java', 'c++', 'rust', 'go', 'php', 'claude code', 'cursor', 'ollama', 'opencode'],
  'c#': ['c', 'python', 'javascript', 'rust', 'go', 'php', 'java', 'claude code', 'cursor', 'ollama', 'opencode'],
  'rust': ['python', 'javascript', 'c#', 'java', 'go', 'claude code', 'cursor', 'ollama'],
  'java': ['python', 'javascript', 'c#', 'rust', 'go', 'claude code', 'cursor', 'ollama'],
  'c++': ['c#', 'python', 'javascript', 'rust', 'go', 'claude code', 'cursor', 'ollama'],
  'sql': ['excel', 'cursor', 'html', 'css', 'claude code'],
};

// ═══════════════════════════════════════════════════════════════
//  1️⃣ Language Verification
// ═══════════════════════════════════════════════════════════════

export interface LanguageVerificationResult {
  isMatch: boolean;
  detectedScript: string;
  hasLanguageIndicator: boolean;
}

/**
 * Strictly verifies whether a video candidate is presented in the target language.
 * Checks Unicode character ranges and language indicator keywords in title, description, and channel.
 */
export const verifyLanguageMatch = (
  title: string,
  description: string,
  channelTitle: string,
  targetLangCode: string
): LanguageVerificationResult => {
  const lowerText = `${title} ${description} ${channelTitle}`.toLowerCase();
  const titleAndDesc = `${title} ${description}`;

  // Unicode Indic & non-Latin script detection:
  const hasBengaliScript = /[\u0980-\u09FF]/.test(titleAndDesc);
  const hasDevanagariScript = /[\u0900-\u097F]/.test(titleAndDesc);
  const hasTamilScript = /[\u0B80-\u0BFF]/.test(titleAndDesc);
  const hasTeluguScript = /[\u0C00-\u0C7F]/.test(titleAndDesc);
  const hasMalayalamScript = /[\u0D00-\u0D7F]/.test(titleAndDesc);
  const hasArabicUrduScript = /[\u0600-\u06FF]/.test(titleAndDesc);
  const hasCyrillicScript = /[\u0400-\u04FF]/.test(titleAndDesc);

  // Spoken language keywords in title, description, or channel:
  const hasBengaliKeyword = /\b(bangla|bengali|বাংলা|in bangla|in bengali|bangla tutorial)\b/i.test(lowerText);
  const hasHindiKeyword = /\b(hindi|हिंदी|in hindi|hindi tutorial)\b/i.test(lowerText);
  const hasTamilKeyword = /\b(tamil|தமிழ்|in tamil|tamil tutorial|tamilan)\b/i.test(lowerText);
  const hasTeluguKeyword = /\b(telugu|తెలుగు|in telugu|telugu tutorial)\b/i.test(lowerText);
  const hasMalayalamKeyword = /\b(malayalam|മലയാളം|in malayalam|malayalam tutorial)\b/i.test(lowerText);
  const hasUrduKeyword = /\b(urdu|اردو|in urdu)\b/i.test(lowerText);

  // English validation: MUST be free of foreign non-Latin scripts and foreign language keywords
  if (!targetLangCode || targetLangCode === 'en') {
    const isForeign = hasBengaliScript || hasBengaliKeyword ||
                      hasDevanagariScript || hasHindiKeyword ||
                      hasTamilScript || hasTamilKeyword ||
                      hasTeluguScript || hasTeluguKeyword ||
                      hasMalayalamScript || hasMalayalamKeyword ||
                      hasArabicUrduScript || hasUrduKeyword ||
                      hasCyrillicScript;

    if (isForeign) {
      let detected = 'foreign';
      if (hasBengaliScript || hasBengaliKeyword) detected = 'bengali';
      else if (hasDevanagariScript || hasHindiKeyword) detected = 'hindi';
      else if (hasTamilScript || hasTamilKeyword) detected = 'tamil';
      else if (hasTeluguScript || hasTeluguKeyword) detected = 'telugu';
      else if (hasMalayalamScript || hasMalayalamKeyword) detected = 'malayalam';
      else if (hasArabicUrduScript || hasUrduKeyword) detected = 'urdu';

      return {
        isMatch: false,
        detectedScript: detected,
        hasLanguageIndicator: true
      };
    }

    return { isMatch: true, detectedScript: 'latin', hasLanguageIndicator: true };
  }

  // Tamil (ta)
  if (targetLangCode === 'ta') {
    const isMatch = hasTamilScript || hasTamilKeyword;
    return { isMatch, detectedScript: hasTamilScript ? 'tamil' : 'latin', hasLanguageIndicator: hasTamilKeyword };
  }

  // Hindi (hi)
  if (targetLangCode === 'hi') {
    const isMatch = hasDevanagariScript || hasHindiKeyword;
    return { isMatch, detectedScript: hasDevanagariScript ? 'devanagari' : 'latin', hasLanguageIndicator: hasHindiKeyword };
  }

  // Telugu (te)
  if (targetLangCode === 'te') {
    const isMatch = hasTeluguScript || hasTeluguKeyword;
    return { isMatch, detectedScript: hasTeluguScript ? 'telugu' : 'latin', hasLanguageIndicator: hasTeluguKeyword };
  }

  // Malayalam (ml)
  if (targetLangCode === 'ml') {
    const isMatch = hasMalayalamScript || hasMalayalamKeyword;
    return { isMatch, detectedScript: hasMalayalamScript ? 'malayalam' : 'latin', hasLanguageIndicator: hasMalayalamKeyword };
  }

  // Bengali (bn)
  if (targetLangCode === 'bn') {
    const isMatch = hasBengaliScript || hasBengaliKeyword;
    return { isMatch, detectedScript: hasBengaliScript ? 'bengali' : 'latin', hasLanguageIndicator: hasBengaliKeyword };
  }

  return { isMatch: true, detectedScript: 'latin', hasLanguageIndicator: true };
};

export const detectLanguage = (subject: string): string => {
  const lower = subject.toLowerCase().trim();
  // Check multi-character / compound symbols first (c#, c++, etc.) before single-letter 'c'
  for (const [canonical, aliases] of Object.entries(LANGUAGE_ALIASES)) {
    if (canonical === 'c') continue;
    for (const alias of aliases) {
      if (matchWordOrSymbol(lower, alias)) return canonical;
    }
  }
  // Check 'c' specific multi-word aliases
  for (const alias of LANGUAGE_ALIASES['c'] || []) {
    if (matchWordOrSymbol(lower, alias)) return 'c';
  }
  // Standalone 'c'
  if (matchWordOrSymbol(lower, 'c')) return 'c';
  return subject;
};

// ═══════════════════════════════════════════════════════════════
//  2️⃣ Strict 4-Tier Educational Relevance Classification
// ═══════════════════════════════════════════════════════════════

export interface EvaluationResult {
  score: number;
  tier: RelevanceTier;
  reason: string;
  isEligible: boolean;
  isLanguageMatch: boolean;
}

/**
 * Generates dynamic, evidence-backed relevance subtext explaining exactly
 * why this video supports the current lesson objectives.
 */
export const generateDynamicReason = (
  title: string,
  context: StructuredLessonContext,
  tier: RelevanceTier,
  primaryTool?: string,
  matchedConcepts: string[] = []
): string => {
  const cleanTitle = context.lessonTitle
    .replace(/^(Day|Module|Week|Section|Lesson)\s*\d+[:\-]?\s*/i, '')
    .trim();

  const toolDisplay = primaryTool ? (primaryTool === 'c' ? 'C Programming' : primaryTool.toUpperCase()) : '';
  const highlight = matchedConcepts.length > 0 ? matchedConcepts[0] : '';

  if (tier === 'DIRECTLY_RELEVANT') {
    if (toolDisplay && highlight) {
      return `${toolDisplay} · Direct Walkthrough of ${highlight}`;
    }
    if (toolDisplay) {
      return `${toolDisplay} · Step-by-Step Hands-on Tutorial`;
    }
    return `Direct Tutorial for "${cleanTitle || context.lessonTitle}"`;
  }

  // CONCEPTUALLY_RELEVANT
  if (toolDisplay) {
    return `${toolDisplay} · Core Foundation & Prerequisite Setup`;
  }
  return `Foundational Prerequisite for ${cleanTitle || context.lessonTitle}`;
};

/**
 * Extracts key pedagogical concepts from lesson title & objective
 */
const extractConceptKeywords = (lessonTitle: string, learningObjective: string = ''): string[] => {
  const cleanTitle = lessonTitle
    .replace(/^(Day|Module|Week|Section|Lesson)\s*\d+[:\-]?\s*/i, '')
    .replace(/\b(introduction to|basics of|overview of|guide to)\b/gi, '')
    .trim()
    .toLowerCase();

  const combined = `${cleanTitle} ${learningObjective.toLowerCase()}`;
  const stopWords = new Set(['the', 'and', 'for', 'with', 'in', 'of', 'to', 'a', 'an', 'on', 'at', 'by', 'using', 'how', 'what', 'is', 'are']);

  const words = combined
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w));

  const phrases: string[] = [];
  if (cleanTitle.length > 3) {
    phrases.push(cleanTitle);
  }

  return Array.from(new Set([...phrases, ...words]));
};

/**
 * Classifies a candidate video according to strict educational criteria:
 * 1. DIRECTLY RELEVANT (Score >= 80): Teaches the exact concept, tool, or skill
 * 2. CONCEPTUALLY RELEVANT (Score 60-79): Teaches a prerequisite or supporting concept
 * 3. RELATED BUT NOT RELEVANT (Score 30-59): Broad subject overlap, but wrong lesson (REJECT)
 * 4. UNRELATED (Score < 30): Irrelevant tools, clickbait, different subject (REJECT)
 */
export const classifyEducationalRelevance = (
  item: YTVideoDetail,
  context: StructuredLessonContext
): EvaluationResult => {
  const title = item.snippet.title;
  const description = item.snippet.description || '';
  const channelTitle = item.snippet.channelTitle;
  const lowerTitle = title.toLowerCase();
  const lowerDesc = description.toLowerCase();
  const lowerChannel = channelTitle.toLowerCase();

  const targetLang = context.preferredLanguage || getVideoLanguagePreference();
  const langCheck = verifyLanguageMatch(title, description, channelTitle, targetLang);

  // Strict Language Verification Gate: Rejects any video that violates language constraints
  if (!langCheck.isMatch) {
    const detectedName = langCheck.detectedScript !== 'latin' ? ` (${langCheck.detectedScript})` : '';
    return {
      score: 0,
      tier: 'UNRELATED',
      reason: `Language mismatch (Requires ${getVideoLanguageLabel(targetLang)}${detectedName})`,
      isEligible: false,
      isLanguageMatch: false,
    };
  }

  // Combine all curriculum signals to accurately identify subject and tools
  const cleanSubjectText = [
    context.subject && context.subject !== 'AI Generated' ? context.subject : '',
    context.planTitle || '',
    context.lessonTitle || '',
    context.learningObjective || '',
    context.lessonDescription || '',
    ...(context.tags || []).filter(t => t !== 'AI Generated' && !t.startsWith('lang:'))
  ].join(' ');

  // 1. AI Tool Hijack Guard (Hard Rejection)
  // If candidate is an AI coding tool (Claude Code, Ollama, Cursor, Kiro, etc.),
  // but the lesson does NOT explicitly require AI tools
  const lessonMentionsAI = /\b(claude|ollama|cursor|copilot|ai editor|llm|opencode|kiro|windsurf)\b/i.test(cleanSubjectText);
  if (!lessonMentionsAI) {
    for (const aiTool of GENERIC_AI_CODING_TOOLS) {
      if (matchWordOrSymbol(lowerTitle, aiTool)) {
        return {
          score: 0,
          tier: 'UNRELATED',
          reason: `Focuses on ${aiTool} instead of curriculum topic`,
          isEligible: false,
          isLanguageMatch: langCheck.isMatch,
        };
      }
    }
  }

  // 2. Unrelated Specialized Tech Stacks Guard (Hard Rejection)
  // If candidate is focused on MERN, SharePoint, WordPress, etc., but lesson does not require it
  for (const stack of UNRELATED_SPECIALIZED_STACKS) {
    if (matchWordOrSymbol(lowerTitle, stack)) {
      const lessonMentionsStack = matchWordOrSymbol(cleanSubjectText.toLowerCase(), stack);
      if (!lessonMentionsStack) {
        return {
          score: 0,
          tier: 'UNRELATED',
          reason: `Covers ${stack.toUpperCase()} instead of curriculum topic`,
          isEligible: false,
          isLanguageMatch: langCheck.isMatch,
        };
      }
    }
  }

  // 3. Canonical Subject & Ecosystem Lock
  const canonicalSubject = detectLanguage(cleanSubjectText);
  const requiredTools = context.requiredTools?.length
    ? context.requiredTools
    : extractLessonTools(context.lessonTitle, context.learningObjective || '', context.subject || '', context.planTitle);

  const primaryTool = requiredTools[0]?.toLowerCase() || (Object.keys(LANGUAGE_ALIASES).includes(canonicalSubject) ? canonicalSubject : undefined);

  // Strict Ecosystem Lock for Target Technology
  const ecosystem = TECH_ECOSYSTEMS[canonicalSubject];
  if (ecosystem) {
    // 3a. Disallowed technologies for this ecosystem
    for (const disallowed of ecosystem.disallowed) {
      if (matchWordOrSymbol(lowerTitle, disallowed) && !matchWordOrSymbol(cleanSubjectText.toLowerCase(), disallowed)) {
        return {
          score: 0,
          tier: 'UNRELATED',
          reason: `Focuses on ${disallowed} instead of ${canonicalSubject.toUpperCase()}`,
          isEligible: false,
          isLanguageMatch: langCheck.isMatch,
        };
      }
    }

    // 3b. Must match primary ecosystem terms in title (or in description if title directly matches lesson topic)
    const matchesPrimaryTitle = ecosystem.primary.some(term => matchWordOrSymbol(lowerTitle, term));
    const matchesAssociatedTitle = ecosystem.associated.some(term => matchWordOrSymbol(lowerTitle, term));

    if (!matchesPrimaryTitle && !matchesAssociatedTitle) {
      const cleanTitle = context.lessonTitle.replace(/^(Day|Module|Week|Section|Lesson)\s*\d+[:\-]?\s*/i, '').trim().toLowerCase();
      const hasSpecificLessonConceptInTitle = cleanTitle.length > 3 && lowerTitle.includes(cleanTitle);
      const matchesPrimaryDesc = ecosystem.primary.some(term => matchWordOrSymbol(lowerDesc, term));

      if (!(hasSpecificLessonConceptInTitle && matchesPrimaryDesc)) {
        return {
          score: 10,
          tier: 'UNRELATED',
          reason: `Does not teach ${canonicalSubject.toUpperCase()} or its tools`,
          isEligible: false,
          isLanguageMatch: langCheck.isMatch,
        };
      }
    }
  }

  // 4. Tool Conflict Check (Hard Rejection)
  // If the lesson requires Tool A (e.g. Excel), but video features a conflicting Tool B (e.g. Cursor or Power BI)
  if (primaryTool && CONFLICTING_TOOLS[primaryTool]) {
    const conflicting = CONFLICTING_TOOLS[primaryTool];
    for (const badTool of conflicting) {
      if (matchWordOrSymbol(lowerTitle, badTool) && !matchWordOrSymbol(lowerTitle, primaryTool)) {
        return {
          score: 10,
          tier: 'UNRELATED',
          reason: `Covers ${badTool} instead of ${primaryTool}`,
          isEligible: false,
          isLanguageMatch: langCheck.isMatch,
        };
      }
    }
  }

  // 5. Competing Programming Language Check
  if (Object.keys(LANGUAGE_ALIASES).includes(canonicalSubject)) {
    for (const [lang, aliases] of Object.entries(LANGUAGE_ALIASES)) {
      if (lang === canonicalSubject) continue;
      for (const alias of aliases) {
        if (matchWordOrSymbol(lowerTitle, alias) && !matchWordOrSymbol(lowerTitle, canonicalSubject)) {
          return {
            score: 5,
            tier: 'UNRELATED',
            reason: `Covers ${lang} instead of ${canonicalSubject}`,
            isEligible: false,
            isLanguageMatch: langCheck.isMatch,
          };
        }
      }
    }
  }

  // 6. Popularity Gate (Reject unvetted / low-confidence recordings < 5,000 views)
  const viewCountRaw = parseInt(item.statistics?.viewCount || '0', 10);
  if (viewCountRaw < MIN_RECOMMENDED_VIEWS) {
    return {
      score: 10,
      tier: 'RELATED_NOT_RELEVANT',
      reason: `Insufficient view count (${formatViewCount(String(viewCountRaw))}) for verified quality`,
      isEligible: false,
      isLanguageMatch: langCheck.isMatch,
    };
  }

  // 7. Scoring Heuristics
  let score = 0;
  const concepts = extractConceptKeywords(context.lessonTitle, context.learningObjective);
  const matchedConcepts: string[] = [];

  // Exact full lesson concept match in title (+45)
  const cleanTitle = context.lessonTitle.replace(/^(Day|Module|Week|Section|Lesson)\s*\d+[:\-]?\s*/i, '').trim().toLowerCase();
  if (cleanTitle && lowerTitle.includes(cleanTitle)) {
    score += 45;
    matchedConcepts.push(cleanTitle);
  } else {
    // Sub-phrase matching (e.g., "for loops", "while loops" from "For Loops and While Loops in Python")
    const subPhrases = cleanTitle.split(/\s+(?:and|or|&|,)\s+/).map(p => p.trim()).filter(p => p.length > 3);
    let matchedSubphrase = false;
    for (const phrase of subPhrases) {
      if (lowerTitle.includes(phrase)) {
        score += 35;
        matchedSubphrase = true;
        matchedConcepts.push(phrase);
        break;
      }
    }

    if (!matchedSubphrase) {
      // Partial keyword matches
      for (const kw of concepts) {
        if (lowerTitle.includes(kw)) {
          score += 15;
          matchedConcepts.push(kw);
        } else if (lowerDesc.includes(kw)) {
          score += 5;
        }
        if (score >= 40) break;
      }
    }
  }

  // Tool Match (+25 in title, +10 in desc)
  let hasToolMatch = false;
  if (primaryTool) {
    if (matchWordOrSymbol(lowerTitle, primaryTool)) {
      score += 25;
      hasToolMatch = true;
    } else if (matchWordOrSymbol(lowerDesc, primaryTool)) {
      score += 10;
      hasToolMatch = true;
    } else if (ecosystem && ecosystem.primary.some(term => matchWordOrSymbol(lowerTitle, term))) {
      score += 25;
      hasToolMatch = true;
    }
  } else {
    // If no specific tool, broad subject match gives baseline
    hasToolMatch = true;
  }

  // Educational Signal Bonuses (Title & Description)
  if (/\b(tutorial|guide|walkthrough|crash course|how to|explained|explanation|install|installation|setup|configuring|configure)\b/i.test(lowerTitle)) {
    score += 15;
  } else if (/\b(tutorial|guide|walkthrough|crash course|how to|explained|explanation|install|installation|setup|configuring|configure)\b/i.test(lowerDesc)) {
    score += 10;
  }

  if (/\b(beginner|beginners|basics|step by step|101|introduction|intro|course|full course|in \d+\s*(minutes|mins))\b/i.test(lowerTitle)) {
    score += 15;
  } else if (/\b(beginner|beginners|basics|step by step|101|introduction|intro|course)\b/i.test(lowerDesc)) {
    score += 10;
  }

  // Established Popularity Bonus
  if (viewCountRaw >= PREFERRED_VIEW_THRESHOLD) {
    score += 15;
  } else if (viewCountRaw >= ACCEPTABLE_VIEW_THRESHOLD) {
    score += 10;
  }

  if (PREFERRED_CHANNELS.some(c => lowerChannel.includes(c))) {
    score += 10;
  }

  // Penalties for entertainment / clickbait / gossip / unrelated media
  if (/\b(reaction|drama|podcast|interview|news|vlog|salary|unboxing)\b/i.test(lowerTitle)) {
    score -= 35;
  }

  // Penalties for advanced content on beginner lessons
  if (context.difficulty?.toLowerCase() === 'beginner') {
    if (/\b(advanced|expert|senior level|system design|masterclass)\b/i.test(lowerTitle)) {
      score -= 20;
    }
  }

  score = Math.max(0, Math.min(100, score));

  // 7. Tier Assignment & Dynamic Reason Generation
  let tier: RelevanceTier;
  let isEligible = false;
  let reason = '';

  if (score >= 80 && (hasToolMatch || !primaryTool)) {
    tier = 'DIRECTLY_RELEVANT';
    isEligible = true;
    reason = generateDynamicReason(title, context, tier, primaryTool, matchedConcepts);
  } else if (score >= 60 && (hasToolMatch || !primaryTool)) {
    tier = 'CONCEPTUALLY_RELEVANT';
    isEligible = true;
    reason = generateDynamicReason(title, context, tier, primaryTool, matchedConcepts);
  } else if (score >= 30) {
    tier = 'RELATED_NOT_RELEVANT';
    isEligible = false; // REJECT
    reason = `Related to broad field, but misses specific lesson objectives`;
  } else {
    tier = 'UNRELATED';
    isEligible = false; // REJECT
    reason = `Unrelated topic or incompatible tools`;
  }

  return {
    score,
    tier,
    reason,
    isEligible,
    isLanguageMatch: langCheck.isMatch,
  };
};

// ═══════════════════════════════════════════════════════════════
//  3️⃣ Cache Layer (v4 Scoped with Plan, Lesson & Language Hash)
// ═══════════════════════════════════════════════════════════════

const buildCacheKey = (context: StructuredLessonContext): string => {
  const userScope = context.userId ? `${context.userId}_` : '';
  const planScope = context.planId ? `p_${context.planId}_` : (context.planTitle ? `pt_${context.planTitle.slice(0, 20)}_` : '');
  const taskScope = context.taskId ? `t_${context.taskId}_` : '';
  const vidLang = context.preferredLanguage || getVideoLanguagePreference(context.userId);
  const cleanLang = (context.subject && context.subject !== 'AI Generated' ? context.subject : detectLanguage(context.planTitle || '')).toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
  const cleanTopic = context.lessonTitle.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
  const tools = (context.requiredTools || []).join('_');
  return `${CACHE_PREFIX}${userScope}${planScope}${taskScope}${vidLang}_${cleanLang}_${cleanTopic}_${tools}`;
};

const memoryVideoCache = new Map<string, { videos: YouTubeVideo[]; timestamp: number }>();

const getCachedVideos = (context: StructuredLessonContext): YouTubeVideo[] | null => {
  const key = buildCacheKey(context);
  const mem = memoryVideoCache.get(key);
  if (mem && (Date.now() - mem.timestamp) < CACHE_TTL_MS && mem.videos?.length > 0) {
    // Re-verify cached videos to ensure no stale/polluted recommendations slip through
    const valid = mem.videos.filter(v => {
      const evalRes = classifyEducationalRelevance({
        id: v.id,
        snippet: {
          title: v.title,
          description: v.description,
          channelTitle: v.channelTitle,
          publishedAt: v.publishedAt,
          thumbnails: { medium: { url: v.thumbnail } }
        }
      } as any, context);
      return evalRes.isEligible;
    });
    if (valid.length > 0) return valid;
  }
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed: CachedResult = JSON.parse(raw);
      if ((Date.now() - parsed.timestamp) < CACHE_TTL_MS && parsed.videos?.length > 0) {
        const valid = parsed.videos.filter(v => {
          const evalRes = classifyEducationalRelevance({
            id: v.id,
            snippet: {
              title: v.title,
              description: v.description,
              channelTitle: v.channelTitle,
              publishedAt: v.publishedAt,
              thumbnails: { medium: { url: v.thumbnail } }
            }
          } as any, context);
          return evalRes.isEligible;
        });
        if (valid.length > 0) {
          memoryVideoCache.set(key, { videos: valid, timestamp: parsed.timestamp });
          return valid;
        }
      }
    }
  } catch { /* noop */ }
  return null;
};

const setCachedVideos = (context: StructuredLessonContext, videos: YouTubeVideo[]): void => {
  if (!videos || videos.length === 0) return;
  const key = buildCacheKey(context);
  const data: CachedResult = { videos, timestamp: Date.now() };
  memoryVideoCache.set(key, data);
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch { /* quota limit */ }
};

export const clearVideosCache = (topicOrContext: string | StructuredLessonContext, subject: string = '', userId?: string): void => {
  const context: StructuredLessonContext = typeof topicOrContext === 'object' && topicOrContext !== null
    ? topicOrContext
    : { lessonTitle: typeof topicOrContext === 'string' ? topicOrContext : '', subject, userId };
  const key = buildCacheKey(context);
  memoryVideoCache.delete(key);
  try {
    localStorage.removeItem(key);
    // Also clear any legacy v3/v2/v1 keys if present
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && (k.startsWith('relearn_videos_v3_') || k.startsWith('relearn_videos_v2_') || k.startsWith('relearn_videos_v1_'))) {
        localStorage.removeItem(k);
      }
    }
  } catch { /* noop */ }
  console.log(`[YouTube] Cleared cache for "${context.lessonTitle}"`);
};

// ═══════════════════════════════════════════════════════════════
//  4️⃣ API Calls via Dev / Netlify Proxy
// ═══════════════════════════════════════════════════════════════

const getYouTubeEndpoint = (): string => {
  if (typeof window !== 'undefined') return '/api/youtube';
  const port = (typeof process !== 'undefined' && process.env?.PORT) || '3000';
  return `http://localhost:${port}/api/youtube`;
};

async function callYouTubeAPI(endpoint: 'search', params: Record<string, string>): Promise<YTSearchResponse>;
async function callYouTubeAPI(endpoint: 'videos', params: Record<string, string>): Promise<YTVideoDetailResponse>;
async function callYouTubeAPI(
  endpoint: 'search' | 'videos',
  params: Record<string, string>
): Promise<YTSearchResponse | YTVideoDetailResponse> {
  const res = await fetch(getYouTubeEndpoint(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify({ endpoint, params }),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    const message = errBody.error?.message || `YouTube ${endpoint} failed (${res.status})`;
    const error: any = new Error(message);
    error.status = res.status;
    error.code = errBody.error?.code || res.status;
    error.reason = errBody.error?.errors?.[0]?.reason || (res.status === 403 ? 'quotaExceeded' : 'unknown');
    throw error;
  }
  return res.json();
}

const fetchFromYouTube = async (query: string, languageCode: string = 'en'): Promise<YTVideoDetail[]> => {
  const searchParams: Record<string, string> = {
    part: 'snippet',
    q: query,
    type: 'video',
    maxResults: String(FETCH_POOL_SIZE),
    order: 'relevance',
    videoDuration: 'medium',
  };

  if (languageCode && languageCode !== 'en') {
    searchParams.relevanceLanguage = languageCode;
  }

  const searchData = await callYouTubeAPI('search', searchParams);
  if (!searchData.items?.length) return [];

  const videoIds = searchData.items.map((item) => item.id.videoId).join(',');
  const detailData = await callYouTubeAPI('videos', {
    part: 'snippet,statistics',
    id: videoIds,
  });

  return detailData.items || [];
};

// ═══════════════════════════════════════════════════════════════
//  5️⃣ Two-Stage Filter & Deduplication Pipeline
// ═══════════════════════════════════════════════════════════════

/**
 * Stage 2: Evaluates all retrieved candidates against lesson objectives,
 * rejects unrelated content, enforces channel diversity, and ranks by relevance.
 */
export const filterAndRankCandidates = (
  rawItems: YTVideoDetail[],
  context: StructuredLessonContext
): YouTubeVideo[] => {
  const ranked: RankedVideo[] = [];
  const seenIds = new Set<string>();
  const seenTitles = new Set<string>();
  const channelCounts = new Map<string, number>();

  for (const item of rawItems) {
    if (!item.id || seenIds.has(item.id)) continue;

    // Normalize title to prevent identical duplicate video uploads
    const cleanTitle = item.snippet.title.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (seenTitles.has(cleanTitle)) continue;

    const evalResult = classifyEducationalRelevance(item, context);

    // Hard rejection gate: Discard any video not directly or conceptually relevant
    if (!evalResult.isEligible) {
      continue;
    }

    // Channel diversity cap: Max 2 videos from any single channel
    const channel = item.snippet.channelTitle.toLowerCase();
    const count = channelCounts.get(channel) || 0;
    if (count >= 2) {
      continue;
    }
    channelCounts.set(channel, count + 1);

    seenIds.add(item.id);
    seenTitles.add(cleanTitle);

    ranked.push({
      id: item.id,
      videoId: item.id,
      title: item.snippet.title,
      description: item.snippet.description || '',
      thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url || '',
      channelTitle: item.snippet.channelTitle,
      viewCount: formatViewCount(item.statistics?.viewCount || '0'),
      publishedAt: item.snippet.publishedAt,
      reason: evalResult.reason,
      relevanceScore: evalResult.score,
      relevanceTier: evalResult.tier,
      isLanguageMatch: evalResult.isLanguageMatch,
      _isEligible: true,
      _viewCountRaw: parseInt(item.statistics?.viewCount || '0', 10),
    });
  }

  // Sort order:
  // 1. Directly Relevant over Conceptually Relevant
  // 2. High relevance score
  // 3. Popularity tier preference (>= 50k > >= 10k > fallback)
  // 4. View count as tie-breaker
  return ranked
    .sort((a, b) => {
      if (a.relevanceTier === 'DIRECTLY_RELEVANT' && b.relevanceTier !== 'DIRECTLY_RELEVANT') return -1;
      if (b.relevanceTier === 'DIRECTLY_RELEVANT' && a.relevanceTier !== 'DIRECTLY_RELEVANT') return 1;

      // Group into popularity tiers: 3 = Strong (50k+), 2 = Standard (10k+), 1 = Fallback (5k+)
      const aPopTier = a._viewCountRaw >= PREFERRED_VIEW_THRESHOLD ? 3 : (a._viewCountRaw >= ACCEPTABLE_VIEW_THRESHOLD ? 2 : 1);
      const bPopTier = b._viewCountRaw >= PREFERRED_VIEW_THRESHOLD ? 3 : (b._viewCountRaw >= ACCEPTABLE_VIEW_THRESHOLD ? 2 : 1);

      // If relevance scores are close (within 15 points), prioritize higher credibility / popularity
      if (aPopTier !== bPopTier && Math.abs(a.relevanceScore - b.relevanceScore) < 15) {
        return bPopTier - aPopTier;
      }

      if (b.relevanceScore !== a.relevanceScore) return b.relevanceScore - a.relevanceScore;
      return b._viewCountRaw - a._viewCountRaw;
    })
    .slice(0, MAX_RECOMMENDED_VIDEOS)
    .map(({ _isEligible, _viewCountRaw, ...video }) => video);
};

// ═══════════════════════════════════════════════════════════════
//  ★  Main Export — fetchEducationalVideos
// ═══════════════════════════════════════════════════════════════

/**
 * Fetches educational YouTube videos for a specific lesson
 * within a learning plan using the Two-Stage Precision Pipeline.
 */
export const fetchEducationalVideos = async (
  topicOrContext: string | StructuredLessonContext,
  subjectOrRandomize: string | boolean = '',
  randomize: boolean = false
): Promise<YouTubeVideo[]> => {
  let context: StructuredLessonContext;
  let isRefresh = false;

  if (typeof topicOrContext === 'object' && topicOrContext !== null) {
    context = topicOrContext;
    isRefresh = typeof subjectOrRandomize === 'boolean' ? subjectOrRandomize : randomize;
  } else {
    const topic = String(topicOrContext || '');
    const subject = typeof subjectOrRandomize === 'string' ? subjectOrRandomize : '';
    isRefresh = randomize;
    context = {
      lessonTitle: topic,
      subject,
      preferredLanguage: getVideoLanguagePreference(),
    };
  }

  // Resolve tools & language
  if (!context.requiredTools || context.requiredTools.length === 0) {
    context.requiredTools = extractLessonTools(
      context.lessonTitle,
      context.learningObjective || '',
      context.subject || '',
      context.planTitle
    );
  }
  const targetLang = context.preferredLanguage || getVideoLanguagePreference();
  const targetLangLabel = getVideoLanguageLabel(targetLang);

  // 1. Check cache first
  if (!isRefresh) {
    const cached = getCachedVideos(context);
    if (cached && cached.length > 0) {
      return cached;
    }
  } else {
    clearVideosCache(context.lessonTitle, context.subject);
  }

  try {
    // 2. Generate Context-Aware Search Query
    const primaryQuery = await generateYouTubeSearchQuery(context, context.subject, '', targetLangLabel);
    console.log(`[YouTube] Precision Query: "${primaryQuery}" (lang: ${targetLangLabel})`);

    // 3. Stage 1: Candidate Pool Retrieval
    let rawItems = await fetchFromYouTube(primaryQuery, targetLang);

    // 4. Stage 2: Educational Relevance Classification & Gating
    let results = filterAndRankCandidates(rawItems, context);

    // 5. Fallback strategy if initial precision query returned insufficient eligible results
    if (results.length < 2) {
      const tool = context.requiredTools?.[0] || '';
      const cleanTitle = context.lessonTitle.replace(/^(Day|Module|Week|Section|Lesson)\s*\d+[:\-]?\s*/i, '').trim();
      const langSuffix = targetLang !== 'en' ? ` in ${targetLangLabel}` : '';

      const fallbacks = [
        tool ? `${tool} ${cleanTitle} tutorial${langSuffix}` : `${cleanTitle} tutorial${langSuffix}`,
        tool ? `${tool} tutorial for beginners${langSuffix}` : `${cleanTitle} for beginners${langSuffix}`,
      ];

      for (const fbQuery of fallbacks) {
        if (results.length >= 2) break;
        console.log(`[YouTube] Targeted Fallback Query: "${fbQuery}"`);
        const fbItems = await fetchFromYouTube(fbQuery, targetLang);
        const fbResults = filterAndRankCandidates(fbItems, context);

        const existingIds = new Set(results.map(v => v.id));
        const newVideos = fbResults.filter(v => !existingIds.has(v.id));
        results = [...results, ...newVideos].slice(0, MAX_RECOMMENDED_VIDEOS);
      }
    }

    // 6. Cache only valid educational results
    if (results.length > 0) {
      setCachedVideos(context, results);
    }

    return results;
  } catch (error: any) {
    console.error('[YouTube] Recommendation Pipeline Error:', error);

    // Fallback to expired cache if API is offline/rate-limited
    try {
      const key = buildCacheKey(context);
      const raw = localStorage.getItem(key);
      if (raw) {
        const cached: CachedResult = JSON.parse(raw);
        if (cached.videos?.length > 0) {
          console.log('[YouTube] Serving cached videos after API failure');
          return cached.videos;
        }
      }
    } catch { /* noop */ }

    throw error;
  }
};

// ═══════════════════════════════════════════════════════════════
//  Helpers
// ═══════════════════════════════════════════════════════════════

const formatViewCount = (viewCount: string): string => {
  const count = parseInt(viewCount, 10);
  if (isNaN(count)) return '0 views';
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M views`;
  if (count >= 1000) return `${(count / 1000).toFixed(0)}K views`;
  return `${count} views`;
};
