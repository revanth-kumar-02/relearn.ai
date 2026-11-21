
import React, { useState, useEffect, useCallback } from 'react';
import { fetchEducationalVideos, clearVideosCache, YouTubeVideo } from '../../services/api/youtubeService';
import { useData } from '../../contexts/DataContext';

type ErrorCategory = 'quota' | 'config' | 'network' | 'general';

interface VideoResourcesProps {
  topic: string;
  subject?: string; // Plan subject / programming language
}

const VideoResources: React.FC<VideoResourcesProps> = ({ topic, subject }) => {
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCategory, setErrorCategory] = useState<ErrorCategory>('general');
  const [loaded, setLoaded] = useState(false); // for stagger animation

  // Read current video language from global context so we re-fetch when user changes it in Settings
  const { videoLanguage } = useData();

  const loadVideos = useCallback(async (isRefresh = false) => {
    if (!topic) return;
    setLoading(true);
    setError(null);
    setLoaded(false);
    try {
      const results = await fetchEducationalVideos(topic, subject, isRefresh);
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
      // Trigger stagger after a tiny delay for smoother transition
      requestAnimationFrame(() => setLoaded(true));
    }
  }, [topic, subject, videoLanguage]);

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
    return (
      <div className="p-10 text-center bg-stone-50 dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800">
        <span className="material-symbols-outlined text-4xl text-stone-300 dark:text-stone-600 mb-3 block">
          videocam_off
        </span>
        <p className="text-stone-500 text-sm font-medium">No video tutorials found matching this lesson topic.</p>
        <button
          onClick={() => loadVideos(true)}
          className="mt-4 text-xs text-primary hover:text-primary/80 flex items-center gap-1.5 mx-auto transition-colors font-bold"
        >
          <span className="material-symbols-outlined text-sm">refresh</span>
          Search again
        </button>
      </div>
    );
  }

  // ── Relevance badge color based on score ─────────────────
  const getScoreBadge = (score: number) => {
    if (score >= 70) return { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', label: 'Highly Relevant' };
    if (score >= 40) return { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', label: 'Relevant' };
    return { bg: 'bg-stone-100 dark:bg-stone-800', text: 'text-stone-500 dark:text-stone-400', label: 'Related' };
  };

  // ── Video Grid ───────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-stone-100 dark:bg-stone-800 rounded-full border border-stone-200 dark:border-stone-800 backdrop-blur-sm">
          <span className="material-symbols-outlined text-sm text-primary filled">language</span>
          <span className="text-[10px] font-bold text-stone-500 uppercase tracking-tight">
            Searching in: <span className="text-primary">{videoLanguage === 'en' ? 'English' : videoLanguage === 'hi' ? 'Hindi' : videoLanguage === 'ta' ? 'Tamil' : videoLanguage === 'te' ? 'Telugu' : 'Malayalam'}</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {videos.map((video, index) => {
          const badge = getScoreBadge(video.relevanceScore);
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
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  loading="lazy"
                />
                {/* Gradient overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                {/* Play button */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-14 h-14 bg-white/90 dark:bg-stone-900/90 rounded-full flex items-center justify-center text-primary opacity-0 group-hover:opacity-100 transform scale-50 group-hover:scale-100 transition-all duration-400 shadow-2xl backdrop-blur-sm">
                    <span className="material-symbols-outlined text-2xl ml-0.5 filled">play_arrow</span>
                  </div>
                </div>
                {/* Relevance badge — top right */}
                <div className={`absolute top-2.5 right-2.5 ${badge.bg} ${badge.text} text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full backdrop-blur-sm flex items-center gap-1`}>
                  <span className="material-symbols-outlined text-xs filled">star</span>
                  {badge.label}
                </div>
              </a>

              {/* ── Content ── */}
              <div className="p-4 flex flex-col flex-1 gap-2.5">
                <a
                  href={`https://www.youtube.com/watch?v=${video.videoId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-sm line-clamp-2 group-hover:text-primary transition-colors leading-snug hover:underline"
                  title={video.title}
                >
                  {video.title}
                </a>

                {/* Reason tag */}
                {video.reason && (
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-xs text-amber-500 filled">auto_awesome</span>
                    <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 line-clamp-1">
                      {video.reason}
                    </p>
                  </div>
                )}

                {/* Channel + views */}
                <div className="mt-auto flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 pt-1">
                  <span className="font-medium truncate max-w-[60%]">{video.channelTitle}</span>
                  <span className="shrink-0 tabular-nums">{video.viewCount}</span>
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
          className="text-xs text-stone-400 hover:text-primary flex items-center gap-1.5 transition-colors py-2.5 px-5 rounded-xl hover:bg-primary/5 font-bold"
        >
          <span className="material-symbols-outlined text-sm">refresh</span>
          Refresh recommendations
        </button>
      </div>

      {/* Animation styles injected here to avoid external CSS dependency */}
      <style>{`
        .filled {
          font-variation-settings: 'FILL' 1;
        }
      `}</style>
    </div>
  );
};

export default React.memo(VideoResources);
