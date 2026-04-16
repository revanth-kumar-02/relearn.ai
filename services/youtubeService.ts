
import { generateYouTubeSearchQuery } from './gemini/youtubeQueryService';

/**
 * In production, YouTube requests are proxied through /api/youtube (Netlify Function)
 * so the API key never reaches the browser. In local dev, we fall back to the VITE key
 * since the Netlify function isn't available via `npm run dev`.
 */
const IS_DEV = import.meta.env.DEV;
const YOUTUBE_API_KEY_DEV = import.meta.env.VITE_YOUTUBE_API_KEY;
const YOUTUBE_API_URL = 'https://www.googleapis.com/youtube/v3';

// ═══════════════════════════════════════════════════════════════
//  Types
// ═══════════════════════════════════════════════════════════════

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
  videoId: string; // Raw YouTube video ID
}

/** Internal type used during filter/rank before stripping internal keys */
interface RankedVideo extends YouTubeVideo {
  _isRelevant: boolean;
  _isCompeting: boolean;
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
const MAX_RESULTS = 5;
const FETCH_POOL_SIZE = 15; // Fetch more to filter down

// Video language options
export const VIDEO_LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'Hindi' },
  { value: 'ta', label: 'Tamil' },
  { value: 'te', label: 'Telugu' },
  { value: 'ml', label: 'Malayalam' },
] as const;

export type VideoLanguageCode = typeof VIDEO_LANGUAGE_OPTIONS[number]['value'];

const VIDEO_LANG_LABEL_MAP: Record<string, string> = {
  en: 'English', hi: 'Hindi', ta: 'Tamil', te: 'Telugu', ml: 'Malayalam',
};

const LS_VIDEO_LANG_KEY = 'videoLanguagePreference';

/** Get the user's preferred video language code (defaults to 'en') */
export const getVideoLanguagePreference = (): VideoLanguageCode => {
  try {
    const val = localStorage.getItem(LS_VIDEO_LANG_KEY);
    if (val && VIDEO_LANG_LABEL_MAP[val]) return val as VideoLanguageCode;
  } catch { /* noop */ }
  return 'en';
};

/** Set the user's preferred video language code */
export const setVideoLanguagePreference = (code: VideoLanguageCode): void => {
  try { localStorage.setItem(LS_VIDEO_LANG_KEY, code); } catch { /* noop */ }
};

/** Get the human-readable label for a language code */
export const getVideoLanguageLabel = (code: string): string =>
  VIDEO_LANG_LABEL_MAP[code] || 'English';

// Known high-quality educational channels for programming
const PREFERRED_CHANNELS = [
  'freecodecamp', 'traversy media', 'the net ninja', 'fireship',
  'programming with mosh', 'academind', 'web dev simplified',
  'corey schafer', 'sentdex', 'tech with tim', 'clever programmer',
  'brocode', 'code with harry', 'telusko', 'apna college',
  'cs dojo', 'thenewboston', 'derek banas', 'kudvenkat',
  'caleb curry', 'edureka', 'simplilearn', 'great learning',
  'mycodeschool', 'abdul bari', 'jenny\'s lectures', 'gate smashers',
  'neso academy', 'mit opencourseware', 'khan academy',
  'crash course', '3blue1brown', 'the organic chemistry tutor'
];

// Common programming languages and their aliases
const LANGUAGE_ALIASES: Record<string, string[]> = {
  'javascript': ['javascript', 'js', 'es6', 'es2015', 'ecmascript', 'node.js', 'nodejs'],
  'typescript': ['typescript', 'ts'],
  'python': ['python', 'py', 'python3'],
  'java': ['java', 'jdk', 'jvm'],
  'c++': ['c++', 'cpp', 'c plus plus'],
  'c#': ['c#', 'csharp', 'c sharp', '.net', 'dotnet'],
  'c': ['c programming', 'c language'],
  'ruby': ['ruby', 'ruby on rails', 'rails'],
  'php': ['php', 'laravel'],
  'swift': ['swift', 'swiftui', 'ios development'],
  'kotlin': ['kotlin', 'android kotlin'],
  'go': ['golang', 'go programming', 'go language'],
  'rust': ['rust', 'rust programming', 'rust lang'],
  'dart': ['dart', 'flutter'],
  'r': ['r programming', 'r language', 'rstudio'],
  'sql': ['sql', 'mysql', 'postgresql', 'sqlite', 'database'],
  'html': ['html', 'html5'],
  'css': ['css', 'css3', 'scss', 'sass'],
  'react': ['react', 'reactjs', 'react.js'],
  'angular': ['angular', 'angularjs'],
  'vue': ['vue', 'vuejs', 'vue.js'],
  'next.js': ['next.js', 'nextjs', 'next js'],
};

// ═══════════════════════════════════════════════════════════════
//  1️⃣  Language Detection
// ═══════════════════════════════════════════════════════════════

const detectLanguage = (subject: string): string => {
  const lower = subject.toLowerCase().trim();
  for (const [canonical, aliases] of Object.entries(LANGUAGE_ALIASES)) {
    for (const alias of aliases) {
      if (lower.includes(alias)) return canonical;
    }
  }
  return subject;
};

// ═══════════════════════════════════════════════════════════════
//  2️⃣  Strict Relevance Filtering
// ═══════════════════════════════════════════════════════════════

/**
 * KEEP only if title OR description contains the target language.
 */
const isRelevantToLanguage = (
  title: string,
  description: string,
  language: string
): boolean => {
  const lowerTitle = title.toLowerCase();
  const lowerDesc = description.toLowerCase();
  const aliases = LANGUAGE_ALIASES[language.toLowerCase()] || [language.toLowerCase()];
  return aliases.some(alias => lowerTitle.includes(alias) || lowerDesc.includes(alias));
};

/**
 * REMOVE if title prominently features a DIFFERENT programming language.
 * e.g., if user is learning Python but video title says "JavaScript Loops Tutorial"
 */
const isCompetingLanguage = (
  title: string,
  language: string
): boolean => {
  const lowerTitle = title.toLowerCase();
  const lowerLang = language.toLowerCase();

  // If it's not a known programming language topic, don't filter
  if (!Object.keys(LANGUAGE_ALIASES).includes(lowerLang)) return false;

  for (const [lang, aliases] of Object.entries(LANGUAGE_ALIASES)) {
    if (lang === lowerLang) continue; // Skip target language

    for (const alias of aliases) {
      // Flag if a competing language appears in the title AND target language does NOT
      if (lowerTitle.includes(alias) && !isRelevantToLanguage(title, '', language)) {
        return true;
      }
    }
  }
  return false;
};

// ═══════════════════════════════════════════════════════════════
//  3️⃣  Ranking Logic — Relevance Scoring
// ═══════════════════════════════════════════════════════════════

const calculateRelevanceScore = (
  title: string,
  description: string,
  channelTitle: string,
  language: string,
  topic: string
): number => {
  let score = 0;
  const t = title.toLowerCase();
  const d = description.toLowerCase();
  const ch = channelTitle.toLowerCase();
  const tp = topic.toLowerCase();

  // Topic match (+30)
  if (t.includes(tp)) score += 30;
  if (d.includes(tp)) score += 10;

  // Educational keyword signals
  if (t.includes('tutorial'))                                     score += 20;
  if (t.includes('explained') || t.includes('explanation'))       score += 15;
  if (t.includes('beginner') || t.includes('beginners'))          score += 25;
  if (t.includes('introduction') || t.includes('intro'))          score += 20;
  if (t.includes('learn') || t.includes('basics'))                score += 15;
  if (t.includes('step by step') || t.includes('step-by-step'))   score += 20;
  if (t.includes('complete guide') || t.includes('full course'))  score += 15;

  // Preferred channel bonus (+15)
  if (PREFERRED_CHANNELS.some(ch2 => ch.includes(ch2))) score += 15;

  // Language appears in title (+10)
  const aliases = LANGUAGE_ALIASES[language.toLowerCase()] || [language.toLowerCase()];
  if (aliases.some(alias => t.includes(alias))) score += 10;

  // Penalty for advanced content
  if (t.includes('advanced') || t.includes('expert level')) score -= 10;

  // Penalty for compilation / multi-language comparison videos
  if (t.includes('vs') && t.includes('which')) score -= 15;

  return Math.max(0, score);
};

// ═══════════════════════════════════════════════════════════════
//  Reason Generator (UI display)
// ═══════════════════════════════════════════════════════════════

const generateReason = (
  title: string,
  channelTitle: string,
  language: string,
  topic: string
): string => {
  const t = title.toLowerCase();
  const ch = channelTitle.toLowerCase();
  const reasons: string[] = [];

  const aliases = LANGUAGE_ALIASES[language.toLowerCase()] || [language.toLowerCase()];
  if (aliases.some(a => t.includes(a))) reasons.push(`Covers ${language}`);
  if (t.includes(topic.toLowerCase())) reasons.push(`"${topic}"`);
  if (t.includes('beginner') || t.includes('introduction') || t.includes('basics'))
    reasons.push('Beginner-friendly');
  if (t.includes('step by step') || t.includes('tutorial'))
    reasons.push('Step-by-step');
  if (PREFERRED_CHANNELS.some(c => ch.includes(c)))
    reasons.push('Trusted channel');
  if (t.includes('full course') || t.includes('complete guide'))
    reasons.push('Comprehensive');

  if (reasons.length === 0) reasons.push(`Related to ${language} ${topic}`);
  return reasons.slice(0, 2).join(' · ');
};

// ═══════════════════════════════════════════════════════════════
//  5️⃣  localStorage Cache Layer
// ═══════════════════════════════════════════════════════════════

const buildCacheKey = (language: string, dayTitle: string): string => {
  const vidLang = getVideoLanguagePreference();
  return `relearn_videos_${vidLang}_${language.toLowerCase().replace(/\s+/g, '_')}_${dayTitle.toLowerCase().replace(/\s+/g, '_')}`;
};

const getCachedVideos = (language: string, dayTitle: string): YouTubeVideo[] | null => {
  try {
    const key = buildCacheKey(language, dayTitle);
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const cached: CachedResult = JSON.parse(raw);
    const age = Date.now() - cached.timestamp;

    if (age > CACHE_TTL_MS) {
      localStorage.removeItem(key); // Expired
      return null;
    }

    console.log(`[YouTube] Cache HIT for "${language} ${dayTitle}" (${Math.round(age / 60000)}min old)`);
    return cached.videos;
  } catch {
    return null;
  }
};

const setCachedVideos = (language: string, dayTitle: string, videos: YouTubeVideo[]): void => {
  try {
    const key = buildCacheKey(language, dayTitle);
    const entry: CachedResult = { videos, timestamp: Date.now() };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch (e) {
    console.warn('[YouTube] Failed to cache videos:', e);
  }
};

// ═══════════════════════════════════════════════════════════════
//  1️⃣  Dynamic Query Builder
// ═══════════════════════════════════════════════════════════════

const buildSearchQuery = (language: string, dayTitle: string): string =>
  `${language} ${dayTitle} tutorial for beginners`;

// ═══════════════════════════════════════════════════════════════
//  4️⃣  Fallback Query Strategy
// ═══════════════════════════════════════════════════════════════

/**
 * Returns a list of progressively broader search queries.
 * Step 1: AI-optimized query  (from Gemini)
 * Step 2: "${language} ${dayTitle}"
 * Step 3: "${language} basics tutorial"
 */
const buildFallbackQueries = (language: string, dayTitle: string): string[] => {
  const vidLangLabel = getVideoLanguageLabel(getVideoLanguagePreference());
  const langSuffix = vidLangLabel !== 'English' ? ` in ${vidLangLabel}` : '';
  return [
    `${language} ${dayTitle} tutorial${langSuffix}`,
    `${language} ${dayTitle}${langSuffix}`,
    `${language} basics tutorial${langSuffix}`,
  ];
};

// ═══════════════════════════════════════════════════════════════
//  Core YouTube Fetch
// ═══════════════════════════════════════════════════════════════

/**
 * Calls a YouTube Data API endpoint.
 * In production → POST to /api/youtube (Netlify Function proxy, key is server-side).
 * In dev        → Direct fetch with the VITE_YOUTUBE_API_KEY.
 */
async function callYouTubeAPI(endpoint: 'search', params: Record<string, string>): Promise<YTSearchResponse>;
async function callYouTubeAPI(endpoint: 'videos', params: Record<string, string>): Promise<YTVideoDetailResponse>;
async function callYouTubeAPI(
  endpoint: 'search' | 'videos',
  params: Record<string, string>
): Promise<YTSearchResponse | YTVideoDetailResponse> {
  if (IS_DEV && YOUTUBE_API_KEY_DEV) {
    // Direct call in development
    const searchParams = new URLSearchParams({ ...params, key: YOUTUBE_API_KEY_DEV });
    const res = await fetch(`${YOUTUBE_API_URL}/${endpoint}?${searchParams}`);
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.error?.message || `YouTube ${endpoint} failed (${res.status})`);
    }
    return res.json();
  }

  // Production → secure serverless proxy
  const res = await fetch('/api/youtube', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint, params }),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.error?.message || `YouTube ${endpoint} failed (${res.status})`);
  }
  return res.json();
}

const fetchFromYouTube = async (query: string): Promise<YTVideoDetail[]> => {
  const vidLang = getVideoLanguagePreference();

  const searchData = await callYouTubeAPI('search', {
    part: 'snippet',
    q: query,
    type: 'video',
    maxResults: String(FETCH_POOL_SIZE),
    order: 'relevance',
    videoDuration: 'medium',
    relevanceLanguage: vidLang,
  });

  if (!searchData.items?.length) return [];

  // Fetch full video details (view counts, full description)
  const videoIds = searchData.items.map((item) => item.id.videoId).join(',');

  const detailData = await callYouTubeAPI('videos', {
    part: 'snippet,statistics',
    id: videoIds,
  });

  return detailData.items || [];
};

// ═══════════════════════════════════════════════════════════════
//  Filter & Rank Pipeline
// ═══════════════════════════════════════════════════════════════

const filterAndRank = (
  rawItems: YTVideoDetail[],
  language: string,
  topic: string
): YouTubeVideo[] => {
  const ranked: RankedVideo[] = rawItems.map((item) => {
    const title = item.snippet.title;
    const description = item.snippet.description || '';
    const channelTitle = item.snippet.channelTitle;
    const score = calculateRelevanceScore(title, description, channelTitle, language || topic, topic);

    return {
      id: item.id,
      videoId: item.id,
      title,
      description: description.substring(0, 200),
      thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url || '',
      channelTitle,
      viewCount: formatViewCount(item.statistics?.viewCount || '0'),
      publishedAt: item.snippet.publishedAt,
      reason: generateReason(title, channelTitle, language || topic, topic),
      relevanceScore: score,
      _isRelevant: language ? isRelevantToLanguage(title, description, language) : true,
      _isCompeting: language ? isCompetingLanguage(title, language) : false,
      _viewCountRaw: parseInt(item.statistics?.viewCount || '0', 10),
    };
  });

  return ranked
    // Step 1: Remove videos about DIFFERENT languages
    .filter((v) => !v._isCompeting)
    // Step 2: Sort by relevance → language match → views
    .sort((a, b) => {
      if (a._isRelevant && !b._isRelevant) return -1;
      if (!a._isRelevant && b._isRelevant) return 1;
      if (b.relevanceScore !== a.relevanceScore) return b.relevanceScore - a.relevanceScore;
      return b._viewCountRaw - a._viewCountRaw;
    })
    .slice(0, MAX_RESULTS)
    // Strip internal keys
    .map(({ _isRelevant, _isCompeting, _viewCountRaw, ...video }) => video);
};

// ═══════════════════════════════════════════════════════════════
//  ★  Main Export — fetchEducationalVideos
// ═══════════════════════════════════════════════════════════════

/**
 * Fetches educational YouTube videos for a specific day title
 * within a learning plan.
 *
 * Flow:
 * 1. Check localStorage cache
 * 2. Build AI-optimized query via Gemini
 * 3. Fetch → Filter → Rank
 * 4. If <2 results, try Fallback queries
 * 5. Cache final results
 */
export const fetchEducationalVideos = async (
  topic: string,       // Day title (e.g., "Variables", "Loops")
  subject: string = '' // Plan subject (e.g., "Python", "JavaScript")
): Promise<YouTubeVideo[]> => {
  const language = subject ? detectLanguage(subject) : '';

  // ── 1. Check cache first ──────────────────────────────────
  const cached = getCachedVideos(language || 'general', topic);
  if (cached && cached.length > 0) {
    return cached;
  }

  // ── No API key in dev mode? Return mock data ──────────────
  // In production the key is server-side (proxy), so we always attempt the fetch.
  if (IS_DEV && !YOUTUBE_API_KEY_DEV) {
    console.warn('[YouTube] API Key missing in dev — returning mock data.');
    return new Promise(resolve =>
      setTimeout(() => resolve(getMockVideos(topic, language)), 800)
    );
  }

  try {
    // ── 2. Build primary search query (Gemini AI) ───────────
    const vidLangLabel = getVideoLanguageLabel(getVideoLanguagePreference());
    const primaryQuery = await generateYouTubeSearchQuery(topic, subject, language, vidLangLabel);
    console.log(`[YouTube] Primary query: "${primaryQuery}" (lang: ${vidLangLabel})`);

    let rawItems = await fetchFromYouTube(primaryQuery);
    let results = filterAndRank(rawItems, language, topic);

    // ── 4. Fallback strategy if results are sparse ──────────
    if (results.length < 2) {
      const fallbacks = buildFallbackQueries(language || subject, topic);

      for (const fbQuery of fallbacks) {
        if (results.length >= 2) break;
        console.log(`[YouTube] Fallback query: "${fbQuery}"`);
        const fbItems = await fetchFromYouTube(fbQuery);
        const fbResults = filterAndRank(fbItems, language, topic);

        // Merge (deduplicate by ID)
        const existingIds = new Set(results.map(v => v.id));
        const newVideos = fbResults.filter(v => !existingIds.has(v.id));
        results = [...results, ...newVideos].slice(0, MAX_RESULTS);
      }
    }

    // ── 5. Cache results ────────────────────────────────────
    if (results.length > 0) {
      setCachedVideos(language || 'general', topic, results);
    }

    return results;

  } catch (error) {
    console.error('[YouTube] API Error:', error);
    // Last resort: return cached even if expired
    try {
      const key = buildCacheKey(language || 'general', topic);
      const raw = localStorage.getItem(key);
      if (raw) {
        const cached: CachedResult = JSON.parse(raw);
        console.log('[YouTube] Returning expired cache after API failure');
        return cached.videos;
      }
    } catch { /* noop */ }
    return [];
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

const getMockVideos = (topic: string, language: string): YouTubeVideo[] => {
  const safe = topic.replace(/[^a-zA-Z0-9]/g, '');
  const lang = language || 'Programming';
  return [
    {
      id: 'mock-1', videoId: 'mock-1',
      title: `${lang} ${topic}: Complete Beginner Tutorial`,
      description: `Learn ${topic} in ${lang} from scratch with step-by-step examples and hands-on coding exercises.`,
      thumbnail: `https://picsum.photos/seed/${safe}1/320/180`,
      channelTitle: 'Education Hub',
      viewCount: '1.2M views',
      publishedAt: new Date().toISOString(),
      reason: `Beginner-friendly · Covers ${lang}`,
      relevanceScore: 85,
    },
    {
      id: 'mock-2', videoId: 'mock-2',
      title: `Understanding ${topic} in ${lang} - Step by Step`,
      description: `A step-by-step tutorial explaining ${topic} concepts in ${lang} with real-world examples.`,
      thumbnail: `https://picsum.photos/seed/${safe}2/320/180`,
      channelTitle: 'Quick Learning',
      viewCount: '850K views',
      publishedAt: new Date().toISOString(),
      reason: `Step-by-step · "${topic}"`,
      relevanceScore: 72,
    },
    {
      id: 'mock-3', videoId: 'mock-3',
      title: `${lang} ${topic} Explained for Beginners`,
      description: `A comprehensive guide to ${topic} in ${lang}, perfect for beginners starting their coding journey.`,
      thumbnail: `https://picsum.photos/seed/${safe}3/320/180`,
      channelTitle: 'Professor Smith',
      viewCount: '420K views',
      publishedAt: new Date().toISOString(),
      reason: `Beginner-friendly · Comprehensive`,
      relevanceScore: 65,
    },
    {
      id: 'mock-4', videoId: 'mock-4',
      title: `${lang} Tutorial: ${topic} with Examples`,
      description: `Master ${topic} in ${lang} with practical coding examples and exercises.`,
      thumbnail: `https://picsum.photos/seed/${safe}4/320/180`,
      channelTitle: 'University Online',
      viewCount: '125K views',
      publishedAt: new Date().toISOString(),
      reason: `Related to ${lang} ${topic}`,
      relevanceScore: 50,
    },
  ];
};
