import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Play, Heart, Bell, BellRing, Link2, Check } from 'lucide-react';
import { Movie, TitleRatings } from '../types';
import { getBackdropUrl, fetchTrailer } from '../services/tmdbService';
import { getRatings, ratingsKey } from '../services/ratingsService';
import ProviderChips, { subscriptionProviders, hasOnlyTransactional } from './ProviderChips';
import { useFavorites } from '../hooks/useFavorites';
import TasteButtons from './TasteButtons';
import { useStreamingAlerts } from '../hooks/useStreamingAlerts';
import { useAuth } from '../context/AuthContext';

// Canonical share host for shareable deep links.
const SHARE_BASE_URL = 'https://moviebase.thegridbase.com';

const getPlatformColor = (platform?: string): string => {
  // Subdued color for unknown availability — neutral, not "streaming"
  if (!platform) return 'text-gray-400 border-gray-400/40';

  // Sentinel states from tmdbService — never mapped to a streaming brand color
  if (platform === 'Rent/Buy') return 'text-gray-400 border-gray-400/40';
  if (platform === 'Theatre') return 'text-cyber-orange border-cyber-orange/50';

  const platformLower = platform.toLowerCase();

  if (platformLower.includes('netflix')) return 'text-red-500 border-red-500/50';
  if (platformLower.includes('prime')) return 'text-blue-400 border-blue-400/50';
  if (platformLower.includes('disney')) return 'text-blue-500 border-blue-500/50';
  if (platformLower.includes('hbo')) return 'text-purple-500 border-purple-500/50';
  if (platformLower.includes('hulu')) return 'text-green-500 border-green-500/50';
  if (platformLower.includes('apple')) return 'text-gray-300 border-gray-300/50';
  if (platformLower.includes('paramount')) return 'text-blue-600 border-blue-600/50';
  if (platformLower.includes('showtime')) return 'text-red-500 border-red-500/50';
  if (platformLower.includes('starz')) return 'text-purple-400 border-purple-400/50';

  return 'text-cyber-cyan border-cyber-cyan/50';
};

// Display label for the platform badge — handles sentinel states cleanly.
const getPlatformLabel = (platform?: string): string => {
  if (!platform) return 'N/A';
  if (platform === 'Rent/Buy') return 'RENT/BUY';
  if (platform === 'Theatre') return 'THEATRE';
  return platform;
};

interface MovieDetailModalProps {
  movie: Movie;
  onClose: () => void;
}

export const MovieDetailModal: React.FC<MovieDetailModalProps> = ({ movie, onClose }) => {
  const [extRatings, setExtRatings] = useState<TitleRatings | null>(null);

  // External ratings (IMDb / RT) — cached, so usually instant.
  useEffect(() => {
    let cancelled = false;
    setExtRatings(null);
    (async () => {
      const map = await getRatings([movie]);
      if (!cancelled) setExtRatings(map.get(ratingsKey(movie)) ?? null);
    })();
    return () => { cancelled = true; };
  }, [movie]);

  const { isLoggedIn } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites(isLoggedIn);
  const { hasAlert, toggleAlert } = useStreamingAlerts(isLoggedIn);
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [isLoadingTrailer, setIsLoadingTrailer] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);
  const [isAddingFavorite, setIsAddingFavorite] = useState(false);
  const [isTogglingAlert, setIsTogglingAlert] = useState(false);
  const [copied, setCopied] = useState(false);

  const movieIsFavorite = isFavorite(movie.id);
  const movieHasAlert = hasAlert(movie.id);
  const isUnavailable = !movie.platform || movie.platform === 'Theatre' || movie.platform === 'Rent/Buy';
  const showAlertButton = isLoggedIn && isUnavailable;

  useEffect(() => {
    const loadTrailer = async () => {
      setIsLoadingTrailer(true);
      const key = await fetchTrailer(movie.id, movie.media_type || 'movie');
      setTrailerKey(key);
      setIsLoadingTrailer(false);
    };
    loadTrailer();
  }, [movie.id, movie.media_type]);

  const handleAddToFavorites = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!isLoggedIn || isAddingFavorite) {
      if (!isLoggedIn) {
        alert('Please login to add favorites');
      }
      return;
    }

    setIsAddingFavorite(true);
    try {
      await toggleFavorite(movie, movieIsFavorite);
    } catch (error: any) {
      console.error('Failed to update favorite:', error);
      alert(error.message || 'Failed to update favorite');
    } finally {
      setIsAddingFavorite(false);
    }
  };

  const handleToggleAlert = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isLoggedIn) {
      alert('Please login to track streaming notifications');
      return;
    }
    if (isTogglingAlert) return;
    setIsTogglingAlert(true);
    try {
      await toggleAlert(movie, movieHasAlert);
    } catch (error: any) {
      console.error('Failed to toggle alert:', error);
      alert(error.message || 'Failed to update notification');
    } finally {
      setIsTogglingAlert(false);
    }
  };

  const handlePlayClick = () => {
    if (trailerKey) {
      setShowTrailer(true);
    }
  };

  const mediaType = movie.media_type === 'tv' ? 'tv' : 'movie';
  const shareUrl = `${SHARE_BASE_URL}/#/${mediaType}/${movie.id}`;

  const handleCopyLink = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      // Fallback for browsers without async clipboard access.
      const el = document.createElement('textarea');
      el.value = shareUrl;
      document.body.appendChild(el);
      el.select();
      try { document.execCommand('copy'); } catch { /* ignore */ }
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const subProviders = subscriptionProviders(movie.platforms);
  const onlyTransactional = hasOnlyTransactional(movie.platforms);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative w-full max-w-5xl bg-cyber-dark rounded-xl overflow-hidden border border-white/10 shadow-2xl flex flex-col md:flex-row max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 bg-black/50 rounded-full text-white hover:bg-cyber-red hover:text-white transition-colors"
        >
          <X size={24} />
        </button>

        {/* Backdrop / Video Area */}
        <div className="relative w-full md:w-2/3 h-64 md:h-auto bg-black">
          {showTrailer && trailerKey ? (
            <iframe
              src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&rel=0`}
              title={`${movie.title} Trailer`}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <>
              <img
                src={getBackdropUrl(movie.backdrop_path)}
                alt={movie.title}
                className="w-full h-full object-cover opacity-60"
              />
              {/* Play Button Overlay */}
              <div
                className="absolute inset-0 flex items-center justify-center group cursor-pointer"
                onClick={handlePlayClick}
              >
                {isLoadingTrailer ? (
                  <div className="w-16 h-16 rounded-full bg-cyber-cyan/20 backdrop-blur border border-cyber-cyan/50 flex items-center justify-center">
                    <div className="w-8 h-8 border-2 border-cyber-cyan border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : trailerKey ? (
                  <div className="w-16 h-16 rounded-full bg-cyber-cyan/20 backdrop-blur border border-cyber-cyan/50 flex items-center justify-center group-hover:scale-110 transition-transform shadow-neon-cyan">
                    <Play className="text-white ml-1 fill-white" size={32} />
                  </div>
                ) : (
                  <div className="text-center p-4 bg-black/50 rounded backdrop-blur">
                    <p className="text-gray-400 text-sm font-mono">No trailer available</p>
                  </div>
                )}
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-cyber-dark to-transparent" />
            </>
          )}
        </div>

        {/* Info Area */}
        <div className="w-full md:w-1/3 p-8 overflow-y-auto">
          <div className="flex items-center gap-2 mb-4">
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${getPlatformColor(movie.platform)}`}>
              {getPlatformLabel(movie.platform)}
            </span>
            <span className="text-gray-400 text-xs font-mono">{movie.release_date}</span>
          </div>

          {/* All available providers as logo chips. Subscription logos are shown
              first; a subdued Rent/Buy chip appears when only transactional. */}
          {(subProviders.some((p) => p.logoPath) || onlyTransactional) && (
            <div className="mb-5">
              <p className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-2">
                {onlyTransactional && subProviders.length === 0 ? 'Available to' : 'Streaming on'}
              </p>
              <ProviderChips
                providers={movie.platforms || []}
                size="md"
                showRentBuyFallback
              />
            </div>
          )}

          <div className="flex items-start justify-between mb-4">
            <h2 className="text-3xl font-mono font-bold text-white leading-none flex-1 pr-4">{movie.title}</h2>
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Copy shareable deep link */}
              <button
                onClick={handleCopyLink}
                className={`w-10 h-10 flex items-center justify-center rounded transition-colors ${
                  copied ? 'text-cyber-green bg-cyber-green/10' : 'hover:text-cyber-cyan bg-white/5'
                }`}
                title={copied ? 'Link copied' : 'Copy link'}
              >
                {copied ? <Check size={20} /> : <Link2 size={20} />}
              </button>
              {showAlertButton && (
                <button
                  onClick={handleToggleAlert}
                  disabled={isTogglingAlert}
                  className={`w-10 h-10 flex items-center justify-center rounded transition-colors ${
                    movieHasAlert
                      ? 'text-cyber-cyan bg-cyber-cyan/10'
                      : 'hover:text-cyber-cyan bg-white/5'
                  } ${isTogglingAlert ? 'opacity-50 cursor-not-allowed' : ''}`}
                  title={movieHasAlert ? 'Stop notifying me when this hits streaming' : 'Notify me when this hits streaming'}
                >
                  {isTogglingAlert ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : movieHasAlert ? (
                    <BellRing size={20} className="fill-cyber-cyan text-cyber-cyan" />
                  ) : (
                    <Bell size={20} />
                  )}
                </button>
              )}
              <button
                onClick={handleAddToFavorites}
                disabled={isAddingFavorite || !isLoggedIn}
                className={`w-10 h-10 flex items-center justify-center rounded transition-colors ${
                  movieIsFavorite
                    ? 'text-cyber-cyan bg-cyber-cyan/10'
                    : 'hover:text-cyber-cyan bg-white/5'
                } ${isAddingFavorite ? 'opacity-50 cursor-not-allowed' : ''}`}
                title={isLoggedIn ? (movieIsFavorite ? 'Remove from favorites' : 'Add to favorites') : 'Login to add favorites'}
              >
                {isAddingFavorite ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Heart
                    size={20}
                    className={movieIsFavorite ? "fill-cyber-cyan text-cyber-cyan" : ""}
                  />
                )}
              </button>
            </div>
          </div>

          <div className="mb-5">
            <TasteButtons movie={movie} size="full" />
          </div>

          <div className="flex flex-wrap items-center gap-4 mb-6">
            <div className="flex items-center gap-1 text-cyber-cyan font-mono font-bold">
              <span className="text-lg">{movie.vote_average.toFixed(1)}</span>
              <span className="text-xs text-gray-500">TMDB</span>
            </div>
            {extRatings?.imdb != null && (
              <>
                <div className="h-4 w-px bg-gray-700" />
                <div className="flex items-center gap-1 text-yellow-400 font-mono font-bold">
                  <span className="text-lg">★ {extRatings.imdb.toFixed(1)}</span>
                  <span className="text-xs text-gray-500">IMDb</span>
                </div>
              </>
            )}
            {extRatings?.rt != null && (
              <>
                <div className="h-4 w-px bg-gray-700" />
                <div className={`flex items-center gap-1 font-mono font-bold ${extRatings.rt >= 60 ? 'text-red-500' : 'text-green-500'}`}>
                  <span className="text-lg">🍅 {extRatings.rt}%</span>
                  <span className="text-xs text-gray-500">RT</span>
                </div>
              </>
            )}
            <div className="h-4 w-px bg-gray-700" />
            <div className="text-xs text-gray-400 font-mono">
              {movie.media_type === 'tv' ? 'SERIES' : 'MOVIE'}
            </div>
          </div>

          <p className="text-gray-300 text-sm leading-relaxed font-light">
            {movie.overview}
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default MovieDetailModal;
