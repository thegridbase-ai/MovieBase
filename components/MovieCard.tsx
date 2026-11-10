import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Heart, Bell, BellRing } from 'lucide-react';
import { Movie, TitleRatings } from '../types';
import { getImageUrl, getBackdropUrl } from '../services/tmdbService';
import ProviderChips, { subscriptionProviders } from './ProviderChips';
import { useFavorites } from '../hooks/useFavorites';
import { useStreamingAlerts } from '../hooks/useStreamingAlerts';
import { useAuth } from '../context/AuthContext';
import TasteButtons from './TasteButtons';

interface MovieCardProps {
  movie: Movie;
  onClick: (movie: Movie) => void;
  variant?: 'standard' | 'featured' | 'large';
  hideHeartButton?: boolean;
  /** External ratings (IMDb / RT); badges render only when present. */
  ratings?: TitleRatings | null;
  /** Show liked / not for me / want to watch buttons on the card. */
  showTaste?: boolean;
  /** Label for the featured card's badge. */
  featuredBadge?: string;
}

const MovieCard: React.FC<MovieCardProps> = ({ movie, onClick, variant = 'standard', hideHeartButton = false, ratings = null, showTaste = false, featuredBadge = 'TRENDING #1' }) => {
  const { isLoggedIn } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites(isLoggedIn);
  const { hasAlert, toggleAlert } = useStreamingAlerts(isLoggedIn);
  const [isAddingFavorite, setIsAddingFavorite] = useState(false);
  const [isTogglingAlert, setIsTogglingAlert] = useState(false);

  const movieIsFavorite = isFavorite(movie.id);
  const movieHasAlert = hasAlert(movie.id);
  const isUnavailable = !movie.platform || movie.platform === 'Theatre' || movie.platform === 'Rent/Buy';
  const showAlertButton = isLoggedIn && isUnavailable && !hideHeartButton;

  const handleAddToFavorites = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!isLoggedIn || isAddingFavorite) {
      return;
    }

    setIsAddingFavorite(true);
    try {
      await toggleFavorite(movie, movieIsFavorite);
    } catch (error: any) {
      console.error('Failed to update favorite:', error);
    } finally {
      setIsAddingFavorite(false);
    }
  };

  const handleToggleAlert = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isLoggedIn || isTogglingAlert) return;
    setIsTogglingAlert(true);
    try {
      await toggleAlert(movie, movieHasAlert);
    } catch (error: any) {
      console.error('Failed to toggle alert:', error);
    } finally {
      setIsTogglingAlert(false);
    }
  };

  // Calculate color based on score - Red & Blue theme
  const scoreColor = movie.vote_average >= 7.5 ? '#DC143C' : movie.vote_average >= 5 ? '#0066FF' : '#FF4D00';
  
  const getPlatformColor = (p?: string) => {
    // Subdued color for unknown / transactional-only availability
    if (!p) return 'text-gray-400';

    // Sentinel states from tmdbService — never mapped to a streaming brand color
    if (p === 'Rent/Buy') return 'text-gray-400';
    if (p === 'Theatre') return 'text-cyber-orange';

    // Normalize platform name for comparison
    const platformLower = p.toLowerCase();

    if (platformLower.includes('netflix')) return 'text-red-600';
    if (platformLower.includes('prime')) return 'text-blue-400';
    if (platformLower.includes('disney')) return 'text-blue-500';
    if (platformLower.includes('hbo')) return 'text-purple-500';
    if (platformLower.includes('hulu')) return 'text-green-500';
    if (platformLower.includes('apple')) return 'text-gray-300';
    if (platformLower.includes('paramount')) return 'text-blue-600';
    if (platformLower.includes('showtime')) return 'text-red-500';
    if (platformLower.includes('starz')) return 'text-purple-400';
    if (platformLower.includes('crunchyroll')) return 'text-orange-500';

    return 'text-cyber-cyan';
  };

  // Display label for the platform badge — handles sentinel states cleanly.
  const getPlatformLabel = (p?: string): string => {
    if (!p) return 'N/A';
    if (p === 'Rent/Buy') return 'RENT/BUY';
    if (p === 'Theatre') return 'THEATRE';
    return p;
  };

  // Determine Image Source and Style based on Variant
  const isFeatured = variant === 'featured';
  const isLarge = variant === 'large';
  
  const imageSrc = isFeatured ? getBackdropUrl(movie.backdrop_path) : getImageUrl(movie.poster_path);
  
  // Dynamic classes based on variant
  const titleSize = isFeatured ? 'text-4xl md:text-6xl' : isLarge ? 'text-2xl md:text-3xl' : 'text-lg';
  const infoSize = isFeatured || isLarge ? 'text-sm md:text-base' : 'text-xs';
  const containerClasses = isFeatured 
    ? 'w-full h-full' // Featured takes full container height defined in Grid
    : 'w-full h-full'; // Standard/Large take full height of their aspect ratio container

  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      whileHover={{ zIndex: 20, scale: isFeatured ? 1.01 : 1.05 }}
      transition={{ duration: 0.3 }}
      className={`group relative overflow-hidden cursor-pointer border border-cyber-cyan/20 hover:border-cyber-cyan/60 hover:shadow-neon-cyan transition-all duration-300 bg-cyber-panel rounded-xl ${containerClasses}`}
      onClick={() => onClick(movie)}
    >
      {/* Image */}
      <img
        src={imageSrc}
        alt={movie.title}
        className={`w-full h-full object-cover transition-transform duration-700 ${isFeatured ? 'group-hover:scale-105 opacity-60 group-hover:opacity-80' : 'opacity-80 group-hover:opacity-100'}`}
        loading="lazy"
      />

      {/* Enhanced Holographic Overlay with Neon Tint */}
      <div className={`absolute inset-0 bg-gradient-to-t ${isFeatured ? 'from-cyber-black via-cyber-black/50 to-transparent' : 'from-cyber-black via-transparent to-transparent'} opacity-90 transition-opacity`} />
      {/* Subtle Neon Glow Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyber-cyan/5 via-transparent to-cyber-purple/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      {/* Top Right: Circular Score and Add Button */}
      <div className="absolute top-3 right-3 flex items-center gap-2 z-20">
        {/* Streaming Alert Button — only for non-subscription titles (N/A, Theatre, Rent/Buy) */}
        {showAlertButton && (
          <button
            className={`w-10 h-10 flex items-center justify-center rounded-full transition-all duration-300 bg-cyber-black/90 backdrop-blur-md border ${
              movieHasAlert
                ? 'text-cyber-cyan bg-cyber-cyan/20 border-cyber-cyan/50 shadow-neon-cyan'
                : 'border-cyber-cyan/30 text-gray-300 hover:text-cyber-cyan hover:border-cyber-cyan hover:bg-cyber-cyan/10 hover:shadow-neon-cyan/50'
            } ${isTogglingAlert ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={handleToggleAlert}
            disabled={isTogglingAlert}
            title={movieHasAlert ? 'Stop notifying me when this hits streaming' : 'Notify me when this hits streaming'}
          >
            {isTogglingAlert ? (
              <div className="w-4 h-4 border-2 border-cyber-cyan border-t-transparent rounded-full animate-spin" />
            ) : movieHasAlert ? (
              <BellRing size={18} className="fill-cyber-cyan text-cyber-cyan drop-shadow-[0_0_8px_rgba(0,243,255,0.8)]" />
            ) : (
              <Bell size={18} className="group-hover:drop-shadow-[0_0_4px_rgba(0,243,255,0.6)]" />
            )}
          </button>
        )}

        {/* Add to Favorites Button - Hidden if hideHeartButton is true */}
        {!hideHeartButton && (
          <button
            className={`w-10 h-10 flex items-center justify-center rounded-full transition-all duration-300 bg-cyber-black/90 backdrop-blur-md border ${
              movieIsFavorite
                ? 'text-cyber-cyan bg-cyber-cyan/20 border-cyber-cyan/50 shadow-neon-cyan'
                : 'border-cyber-cyan/30 text-gray-300 hover:text-cyber-cyan hover:border-cyber-cyan hover:bg-cyber-cyan/10 hover:shadow-neon-cyan/50'
            } ${isAddingFavorite ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={handleAddToFavorites}
            disabled={isAddingFavorite || !isLoggedIn}
            title={isLoggedIn ? (movieIsFavorite ? 'Remove from favorites' : 'Add to favorites') : 'Login to add favorites'}
          >
            {isAddingFavorite ? (
              <div className="w-4 h-4 border-2 border-cyber-cyan border-t-transparent rounded-full animate-spin" />
            ) : (
              <Heart
                size={18}
                className={movieIsFavorite ? "fill-cyber-cyan text-cyber-cyan drop-shadow-[0_0_8px_rgba(0,243,255,0.8)]" : "group-hover:drop-shadow-[0_0_4px_rgba(0,243,255,0.6)]"}
              />
            )}
          </button>
        )}
        {/* Circular Score with Neon Glow */}
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-cyber-black/90 backdrop-blur-md border border-cyber-cyan/30 shadow-lg group-hover:border-cyber-cyan/50 group-hover:shadow-neon-cyan/50 transition-all duration-300">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
          <path
            className="text-gray-800"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
          />
          <path
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke={scoreColor}
            strokeWidth="3"
            strokeDasharray={`${movie.vote_average * 10}, 100`}
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 4px ${scoreColor}80)` }}
          />
        </svg>
        <span className={`absolute text-[10px] font-black font-mono ${
          movie.vote_average >= 7.5 ? 'text-red-600 drop-shadow-[0_0_4px_rgba(220,20,60,0.8)]' :
          movie.vote_average >= 5 ? 'text-blue-600 drop-shadow-[0_0_4px_rgba(0,102,255,0.8)]' :
          'text-cyber-orange drop-shadow-[0_0_4px_rgba(255,77,0,0.8)]'
        }`}>
          {movie.vote_average.toFixed(1)}
        </span>
        </div>
      </div>

      {/* Featured Specific: Big Play Button Center with Neon Glow */}
      {isFeatured && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-20 h-20 rounded-full bg-cyber-cyan/20 backdrop-blur-md border border-cyber-cyan/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 scale-50 group-hover:scale-100 shadow-neon-cyan group-hover:shadow-neon-cyan">
                <Play className="fill-cyber-cyan text-cyber-cyan ml-1 drop-shadow-[0_0_10px_rgba(0,243,255,0.8)]" size={40} />
            </div>
        </div>
      )}

      {/* Content Info */}
      <div className={`absolute bottom-0 left-0 right-0 p-4 md:p-6 z-20 transform ${isFeatured || showTaste ? 'translate-y-0' : 'translate-y-4 group-hover:translate-y-0'} transition-transform duration-300`}>
        {/* Platform Badge with Neon Styling */}
        <div className="flex items-center gap-2 mb-2">
            {/* When there are 2+ subscription providers with logos, show tiny logo
                chips alongside the text badge; otherwise the text badge alone. */}
            {(() => {
              const subs = subscriptionProviders(movie.platforms);
              const logoSubs = subs.filter((p) => p.logoPath);
              if (logoSubs.length >= 2) {
                return <ProviderChips providers={movie.platforms || []} max={3} size="sm" />;
              }
              return (
                <span className={`px-2 py-1 rounded-sm bg-cyber-black/80 backdrop-blur border border-cyber-cyan/30 text-xs font-bold font-mono uppercase tracking-wider ${getPlatformColor(movie.platform)} group-hover:border-cyber-cyan/50 transition-all duration-300`}>
                    {getPlatformLabel(movie.platform)}
                </span>
              );
            })()}
            {isFeatured && (
                <span className="px-2 py-1 rounded-sm bg-cyber-purple/30 border border-cyber-purple/50 text-cyber-purple text-xs font-mono font-black uppercase tracking-wider animate-pulse-neon shadow-neon-purple/50">
                    {featuredBadge}
                </span>
            )}
        </div>

        <h3 className={`${titleSize} text-white font-mono font-black leading-tight truncate md:whitespace-normal group-hover:text-cyber-cyan transition-all duration-300 drop-shadow-lg group-hover:drop-shadow-[0_0_10px_rgba(0,243,255,0.6)]`}>
          {movie.title}
        </h3>

        {/* Extra info for featured/large */}
        {(isFeatured || isLarge) && (
            <p className="text-gray-300 text-sm line-clamp-2 mt-2 max-w-2xl font-sans opacity-80 hidden md:block">
                {movie.overview}
            </p>
        )}
        
        <div className={`flex items-center gap-2 mt-2 ${infoSize} text-gray-400 font-mono group-hover:text-gray-300 transition-colors`}>
          <span>{movie.release_date?.split('-')[0]}</span>
          <span className="text-cyber-cyan/50">•</span>
          <span>{movie.media_type === 'tv' ? 'Series' : 'Movie'}</span>
          {ratings?.imdb != null && (
            <>
              <span className="text-cyber-cyan/50">•</span>
              <span className="text-yellow-400 font-bold drop-shadow-[0_0_4px_rgba(250,204,21,0.5)]">
                ★ {ratings.imdb.toFixed(1)}
              </span>
            </>
          )}
          {ratings?.rt != null && (
            <>
              <span className="text-cyber-cyan/50">•</span>
              <span className={`font-bold ${ratings.rt >= 60 ? 'text-red-500 drop-shadow-[0_0_4px_rgba(239,68,68,0.5)]' : 'text-green-500 drop-shadow-[0_0_4px_rgba(34,197,94,0.5)]'}`}>
                🍅 {ratings.rt}%
              </span>
            </>
          )}
          {isFeatured && (
            <>
                <span className="text-cyber-cyan/50">•</span>
                <span className="text-cyber-green font-bold drop-shadow-[0_0_4px_rgba(0,255,136,0.6)]">98% Match</span>
            </>
          )}
        </div>

        {showTaste && (
          <div className="mt-3 max-w-[240px]">
            <TasteButtons movie={movie} />
          </div>
        )}
      </div>
      
      {/* Enhanced Neon Glow Effect Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyber-cyan/10 via-transparent to-cyber-purple/10 mix-blend-overlay opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-500" />
    </motion.div>
  );
};

export default MovieCard;