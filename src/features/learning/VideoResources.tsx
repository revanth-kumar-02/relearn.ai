import React, { useState, useEffect, useCallback } from 'react';
import { 
  fetchEducationalVideos, 
  clearVideosCache, 
  YouTubeVideo, 
  StructuredLessonContext, 
  RelevanceTier,
  getVideoLanguageLabel,
  getVideoLanguagePreference
} from '../../services/api/youtubeService';
import { useData } from '../../contexts/DataContext';

type ErrorCategory = 'quota' | 'config' | 'network' | 'general';

interface VideoResourcesProps {
  topic: string;
  subject?: string;
  learningObjective?: string;
  lessonDescription?: string;
  difficulty?: string;
  tags?: string[];
  context?: StructuredLessonContext;
}

const VideoResources: React.FC<VideoResourcesProps> = ({ 
  topic, 
  subject, 
  learningObjective, 
  lessonDescription, 
  difficulty, 
  tags,
  context 
}) => {
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCategory, setErrorCategory] = useState<ErrorCategory>('general');
  const [loaded, setLoaded] = useState(false);

  // Read current video language from global context so we re-fetch when user changes it in Settings
  const { videoLanguage, updateVideoLanguage } = useData();

  const loadVideos = useCallback(async (isRefresh = false) => {
    if (!topic) return;
    setLoading(true);
    setError(null);
    setLoaded(false);

    // Build or use full structured context
    const structuredContext: StructuredLessonContext = {
      lessonTitle: topic,
      subject: subject || '',
      learningObjective: learningObjective || '',
      lessonDescription: lessonDescription || '',
      difficulty: difficulty || 'Beginner',
      tags: tags || [],
      ...context,
      preferredLanguage: videoLanguage || context?.preferredLanguage || getVideoLanguagePreference(),
      userId: context?.userId,
    };

    try {
      const results = await fetchEducationalVideos(structuredContext, isRefresh);
      setVideos(results);
    } catch (err: any) {
      console.error('Failed to load videos', err);
      if (err.reason === 'quotaExceeded' || err.status === 403 || err.message?.toLowerCase().includes('quota')) {
        setErrorCategory('quota');
        setError('YouTube search quota has been reached for today. Video mentorship will resume tomorrow.');
      } else if (err.status === 400 || err.message?.toLowerCase().includes('api key') || err.message?.includes('API_KEY_INVALID')) {
        setErrorCategory('config');
        setError('YouTube API key is misconfigured or invalid on the server.');
      } else {
        setErrorCategory('network');
        setError('Could not connect to video service. Please check your network and try again.');
      }
    } finally {
      setLoading(false);
      requestAnimationFrame(() => setLoaded(true));
    }
  }, [topic, subject, learningObjective, lessonDescription, difficulty, tags, context, videoLanguage]);

  useEffect(() => {
    loadVideos();
  }, [loadVideos]);

  // ── Loading Skeleton ─────────────────────────────────────
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            className="rounded-2xl overflow-hidden bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800"
          >
            {/* Thumbnail skeleton */}
            <div className="relative aspect-video bg-gradient-to-br from-stone-200 to-stone-100 dark:from-stone-800 dark:to-stone-700 animate-pulse">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-10 h-10 rounded-full bg-stone-300 dark:bg-stone-600 animate-pulse" />
              </div>
            </div>
            {/* Text skeleton */}
            <div className="p-4 space-y-3">
              <div className="h-4 bg-stone-200 dark:bg-stone-700 rounded-full w-[85%] animate-pulse" />
              <div className="h-3 bg-stone-200 dark:bg-stone-700 rounded-full w-[60%] animate-pulse" />
              <div className="flex items-center justify-between pt-1">
                <div className="h-3 bg-stone-100 dark:bg-stone-800 rounded-full w-[40%] animate-pulse" />
                <div className="h-3 bg-stone-100 dark:bg-stone-800 rounded-full w-[20%] animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ── Error State ──────────────────────────────────────────
  if (error) {
    const isQuota = errorCategory === 'quota';
    const isConfig = errorCategory === 'config';
    return (
      <div className={`p-5 rounded-2xl flex items-center justify-between text-sm border ${
        isQuota 
          ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/40'
          : isConfig
          ? 'bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-900/40'
          : 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/40'
      }`}>
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-lg">
            {isQuota ? 'hourglass_bottom' : isConfig ? 'key_off' : 'cloud_off'}
          </span>
          <span className="font-medium">{error}</span>
        </div>
        {!isQuota && (
          <button
            onClick={() => loadVideos(true)}
            className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            aria-label="Retry loading videos"
            title="Retry"
          >
            <span className="material-symbols-outlined text-base">refresh</span>
          </button>
        )}
      </div>
    );
  }

  // ── Empty State ──────────────────────────────────────────
  if (videos.length === 0) {
    const currentLangLabel = getVideoLanguageLabel(videoLanguage);
    const isNonEnglish = videoLanguage && videoLanguage !== 'en';

    return (
      <div className="p-8 text-center bg-stone-50 dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 space-y-3">
        <span className="material-symbols-outlined text-4xl text-stone-300 dark:text-stone-600 mx-auto block">
          verified
        </span>
        <h3 className="font-bold text-sm text-stone-800 dark:text-stone-200">
          Strict Educational Relevance Filter
        </h3>
        <p className="text-stone-500 text-xs max-w-md mx-auto leading-relaxed">
          {isNonEnglish
            ? `No verified ${currentLangLabel} tutorials directly teach "${topic}". We strictly filter out generic or mismatched videos to preserve curriculum focus.`
            : `All available videos failed our strict educational relevance filter for "${topic}". We reject general filler to protect your study time.`}
        </p>

        <div className="flex items-center justify-center gap-3 pt-2">
          {isNonEnglish && (
            <button
              onClick={() => updateVideoLanguage('en')}
              className="text-xs bg-primary text-white hover:bg-primary/90 px-4 py-2 rounded-xl flex items-center gap-1.5 transition-colors font-bold shadow-sm"
            >
              <span className="material-symbols-outlined text-sm">translate</span>
              Search in English
            </button>
          )}
          <button
            onClick={() => {
              clearVideosCache(topic, subject, context?.userId);
              loadVideos(true);
            }}
            className="text-xs text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 border border-stone-200 dark:border-stone-700 px-4 py-2 rounded-xl flex items-center gap-1.5 transition-colors font-semibold"
          >
            <span className="material-symbols-outlined text-sm">refresh</span>
            Retry search
          </button>
        </div>
      </div>
    );
  }

  // ── Relevance badge styling based on 4-tier classification ──
  const getBadgeStyle = (tier: RelevanceTier) => {
    switch (tier) {
      case 'DIRECTLY_RELEVANT':
        return {
          bg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300',
          icon: 'check_circle',
          label: 'DIRECTLY RELEVANT',
        };
      case 'CONCEPTUALLY_RELEVANT':
        return {
          bg: 'bg-sky-500/15 border-sky-500/30 text-sky-700 dark:text-sky-300',
          icon: 'psychology',
          label: 'PREREQUISITE',
        };
      default:
        return {
          bg: 'bg-stone-500/15 border-stone-500/30 text-stone-600 dark:text-stone-400',
          icon: 'school',
          label: 'RELEVANT',
        };
    }
  };

  // ── Video Grid ───────────────────────────────────────────
  const langLabel = getVideoLanguageLabel(videoLanguage);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-stone-100 dark:bg-stone-800/80 rounded-full border border-stone-200 dark:border-stone-700/60 backdrop-blur-sm">
          <span className="material-symbols-outlined text-sm text-primary filled">verified</span>
          <span className="text-[10px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-tight">
            Curriculum Match: <span className="text-primary font-black">{langLabel}</span>
          </span>
        </div>
        <span className="text-[11px] text-stone-400 dark:text-stone-500 font-medium">
          {videos.length} precision-filtered {videos.length === 1 ? 'tutorial' : 'tutorials'}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {videos.map((video, index) => {
          const badge = getBadgeStyle(video.relevanceTier);
          return (
            <div
              key={video.id}
              className="group bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 overflow-hidden hover:shadow-xl hover:shadow-primary/5 transition-all duration-500 hover:border-primary/30 flex flex-col"
              style={{
                opacity: loaded ? 1 : 0,
                transform: loaded ? 'translateY(0)' : 'translateY(16px)',
                transition: `opacity 0.5s ease ${index * 0.1}s, transform 0.5s ease ${index * 0.1}s`,
              }}
            >
              {/* ── Thumbnail ── */}
              <a
                href={`https://www.youtube.com/watch?v=${video.videoId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="relative aspect-video bg-stone-100 dark:bg-stone-800 overflow-hidden block"
              >
                <img
                  src={video.thumbnail}
                  alt={video.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  loading="lazy"
                />
                {/* Gradient overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                {/* Play button */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-12 h-12 bg-white/95 dark:bg-stone-900/95 rounded-full flex items-center justify-center text-primary opacity-0 group-hover:opacity-100 transform scale-50 group-hover:scale-100 transition-all duration-300 shadow-2xl backdrop-blur-sm">
                    <span className="material-symbols-outlined text-2xl ml-0.5 filled">play_arrow</span>
                  </div>
                </div>

                {/* 4-Tier Relevance Badge — top right */}
                <div className={`absolute top-2.5 right-2.5 ${badge.bg} border text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full backdrop-blur-md flex items-center gap-1 shadow-sm`}>
                  <span className="material-symbols-outlined text-xs filled">{badge.icon}</span>
                  {badge.label}
                </div>
              </a>

              {/* ── Content ── */}
              <div className="p-4 flex flex-col flex-1 gap-2.5">
                <a
                  href={`https://www.youtube.com/watch?v=${video.videoId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-sm line-clamp-2 group-hover:text-primary transition-colors leading-snug hover:underline text-stone-900 dark:text-stone-100"
                  title={video.title}
                >
                  {video.title}
                </a>

                {/* Pedagogical reason tag */}
                {video.reason && (
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-xs text-primary filled">school</span>
                    <p className="text-[11px] font-semibold text-stone-600 dark:text-stone-300 line-clamp-1">
                      {video.reason}
                    </p>
                  </div>
                )}

                {/* Channel + views */}
                <div className="mt-auto flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 pt-1 border-t border-stone-100 dark:border-stone-800/60">
                  <span className="font-medium truncate max-w-[60%]">{video.channelTitle}</span>
                  <span className="shrink-0 tabular-nums text-[11px]">{video.viewCount}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Refresh Button ── */}
      <div className="flex justify-center pt-1">
        <button
          onClick={() => {
            clearVideosCache(topic, subject);
            loadVideos(true);
          }}
          className="text-xs text-stone-400 hover:text-primary flex items-center gap-1.5 transition-colors py-2 px-4 rounded-xl hover:bg-primary/5 font-semibold"
        >
          <span className="material-symbols-outlined text-sm">refresh</span>
          Refresh recommendations
        </button>
      </div>

      {/* Animation styles */}
      <style>{`
        .filled {
          font-variation-settings: 'FILL' 1;
        }
      `}</style>
    </div>
  );
};

export default VideoResources;
