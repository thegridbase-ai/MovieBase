import React, { useState, useEffect } from 'react';
import { Search, SlidersHorizontal, X, Sparkles, Dices } from 'lucide-react';
import { motion } from 'framer-motion';

interface HeroSectionProps {
  onSearch: (query: string) => void;
  searchQuery?: string;
  onClearSearch?: () => void;
  onCategoryFilter?: (category: string | null) => void;
  activeCategory?: string | null;
  forYouActive?: boolean;
  onForYouToggle?: () => void;
  onOpenRate?: () => void;
}

const HeroSection: React.FC<HeroSectionProps> = ({
  onSearch,
  searchQuery,
  onClearSearch,
  onCategoryFilter,
  activeCategory,
  forYouActive = false,
  onForYouToggle,
  onOpenRate,
}) => {
  const [query, setQuery] = useState('');
  const [strokeWidth, setStrokeWidth] = useState('2px');

  // Sync local query state with searchQuery prop
  useEffect(() => {
    if (searchQuery !== undefined) {
      setQuery(searchQuery);
    }
  }, [searchQuery]);

  // Set responsive stroke width
  useEffect(() => {
    const updateStrokeWidth = () => {
      setStrokeWidth(window.innerWidth >= 768 ? '4px' : '2px');
    };
    updateStrokeWidth();
    window.addEventListener('resize', updateStrokeWidth);
    return () => window.removeEventListener('resize', updateStrokeWidth);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query);
  };

  const handleClear = () => {
    setQuery('');
    if (onClearSearch) {
      onClearSearch();
    }
  };

  const handleCategoryClick = (category: string) => {
    if (onCategoryFilter) {
      // Toggle: if same category clicked, reset to null (All)
      if (activeCategory === category) {
        onCategoryFilter(null);
      } else {
        onCategoryFilter(category);
      }
    }
  };

  return (
    <div className="relative w-full h-[60vh] flex flex-col items-center justify-center overflow-hidden">
      {/* Background Image - Retro Video Store Theme */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-cyber-black/70 z-10 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-t from-cyber-black via-cyber-black/50 to-transparent z-10" />
        
        {/* Neon Glow Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-cyber-cyan/10 via-transparent to-cyber-purple/10 z-10 pointer-events-none" />
        
        <video
            src="/store.mp4"
            poster="/store-poster.jpg"
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            className="w-full h-full object-cover opacity-80"
        />
        
        {/* Enhanced VHS Scanline Overlay with Neon Tint */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(0,243,255,0.08),rgba(255,0,255,0.03),rgba(220,20,60,0.08))] z-10 bg-[length:100%_2px,3px_100%] pointer-events-none opacity-50" />
      </div>

      <div className="relative z-20 w-full max-w-4xl px-4 flex flex-col items-center text-center">
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-2"
        >
            <div className="relative inline-block group cursor-default">
                {/* Enhanced Bloom Effect with Red & Blue Neon Colors */}
                <div className="absolute inset-0 bg-red-600/40 blur-3xl opacity-30 group-hover:opacity-80 transition-opacity duration-500 -z-10" />
                <div className="absolute inset-0 bg-blue-600/40 blur-3xl opacity-30 group-hover:opacity-80 transition-opacity duration-500 -z-10 translate-x-4" />
                <div className="absolute inset-0 bg-red-500/30 blur-2xl opacity-20 group-hover:opacity-50 transition-opacity duration-500 -z-10 -translate-x-4" />
                
                {/* Main Text - Retro Red & Blue Style with Outline */}
                <h1 
                    className="relative z-10 text-5xl md:text-8xl font-retro font-normal tracking-tight hero-title-outline"
                    style={{
                        fontFamily: "'Bungee', 'Bebas Neue', sans-serif",
                        letterSpacing: '-0.02em'
                    } as React.CSSProperties}
                >
                    <span 
                        className="hero-title-movie"
                        style={{
                            WebkitTextStrokeWidth: strokeWidth,
                            WebkitTextStrokeColor: '#DC143C',
                            color: 'transparent',
                            WebkitTextFillColor: 'transparent',
                            filter: 'drop-shadow(0 0 10px rgba(220, 20, 60, 0.8)) drop-shadow(0 0 20px rgba(220, 20, 60, 0.5)) drop-shadow(0 0 30px rgba(220, 20, 60, 0.3))'
                        } as React.CSSProperties}
                    >
                        MOVIE
                    </span>
                    <span 
                        className="hero-title-base"
                        style={{
                            WebkitTextStrokeWidth: strokeWidth,
                            WebkitTextStrokeColor: '#0066FF',
                            color: 'transparent',
                            WebkitTextFillColor: 'transparent',
                            filter: 'drop-shadow(0 0 10px rgba(0, 102, 255, 0.8)) drop-shadow(0 0 20px rgba(0, 102, 255, 0.5)) drop-shadow(0 0 30px rgba(0, 102, 255, 0.3))'
                        } as React.CSSProperties}
                    >
                        BASE
                    </span>
                </h1>

                {/* Glitch Layer 1 (Red Shift) */}
                <h1 className="absolute top-0 left-0 z-0 text-5xl md:text-8xl font-retro font-normal opacity-0 group-hover:opacity-70 group-hover:animate-glitch-1 select-none pointer-events-none mix-blend-screen tracking-tight" style={{
                    fontFamily: "'Bungee', 'Bebas Neue', sans-serif",
                    color: '#FF0000',
                    textShadow: '0 0 20px rgba(255, 0, 0, 0.8)',
                    letterSpacing: '-0.02em'
                } as React.CSSProperties}>
                    MOVIEBASE
                </h1>
                
                {/* Glitch Layer 2 (Blue Shift) */}
                <h1 className="absolute top-0 left-0 z-0 text-5xl md:text-8xl font-retro font-normal opacity-0 group-hover:opacity-70 group-hover:animate-glitch-2 select-none pointer-events-none mix-blend-screen tracking-tight" style={{
                    fontFamily: "'Bungee', 'Bebas Neue', sans-serif",
                    color: '#0066FF',
                    textShadow: '0 0 20px rgba(0, 102, 255, 0.8)',
                    letterSpacing: '-0.02em'
                } as React.CSSProperties}>
                    MOVIEBASE
                </h1>
            </div>
            
            <p className="text-cyber-green font-mono text-sm md:text-base tracking-[0.3em] mb-10 opacity-90 uppercase mt-4 font-bold drop-shadow-[0_0_8px_rgba(0,255,136,0.6)]">
            /// Neural Network Connected ///
            </p>
        </motion.div>

        {/* Search Bar */}
        <motion.form 
            onSubmit={handleSearch}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="w-full max-w-2xl relative group"
        >
            <div className="absolute inset-0 bg-gradient-to-r from-red-600 via-blue-600 to-cyber-purple blur-xl opacity-30 group-hover:opacity-60 group-focus-within:opacity-60 transition-opacity duration-500 rounded-full" />
            <div className="relative flex items-center bg-cyber-black/90 backdrop-blur-xl border border-cyber-cyan/30 rounded-full p-2 pl-6 focus-within:border-cyber-cyan focus-within:shadow-neon-cyan transition-all duration-300 group-hover:border-cyber-cyan/50">
                <Search className="text-gray-400 w-5 h-5 mr-3 group-focus-within:text-cyber-cyan transition-colors drop-shadow-[0_0_4px_rgba(0,243,255,0.6)]" />
                <input 
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search the archive..."
                    className="bg-transparent border-none outline-none text-white w-full font-mono placeholder-gray-500 placeholder:font-normal"
                />
                {(query || searchQuery) && (
                    <button 
                        type="button" 
                        onClick={handleClear}
                        className="mr-2 p-2 text-gray-400 hover:text-cyber-cyan hover:bg-cyber-cyan/10 rounded-full transition-all duration-300"
                        title="Clear search"
                    >
                        <X size={18} className="drop-shadow-[0_0_4px_rgba(0,243,255,0.5)]" />
                    </button>
                )}
                <button type="button" aria-label="Search filters" className="p-3 text-gray-400 hover:text-cyber-cyan hover:bg-cyber-cyan/10 rounded-full transition-all duration-300">
                    <SlidersHorizontal size={20} className="drop-shadow-[0_0_4px_rgba(0,243,255,0.5)]" />
                </button>
            </div>
        </motion.form>

        {/* Categories / Tags - Enhanced with stagger animation */}
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-8 flex flex-wrap justify-center gap-3"
        >
            {['All', 'Action', 'Comedy', 'Drama', 'Horror', 'Romance', 'Adventure', 'Kids'].map((tag, index) => {
                const isActive = tag === 'All' ? !activeCategory && !forYouActive : activeCategory === tag;
                return (
                    <motion.span
                        key={tag}
                        onClick={() => tag === 'All' ? onCategoryFilter?.(null) : handleCategoryClick(tag)}
                        className={`px-3 py-1 rounded-sm border text-xs font-mono uppercase font-bold cursor-pointer transition-all duration-300 ${
                            isActive
                                ? 'border-cyber-cyan bg-cyber-cyan/30 text-cyber-cyan shadow-neon-cyan'
                                : 'border-cyber-cyan/30 text-cyber-cyan/70'
                        }`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 + index * 0.05, duration: 0.3 }}
                        whileHover={{
                            scale: 1.1,
                            y: -3,
                            backgroundColor: 'rgba(0, 243, 255, 0.2)',
                            borderColor: 'rgba(0, 243, 255, 0.6)',
                            boxShadow: '0 0 20px rgba(0, 243, 255, 0.4)'
                        }}
                        whileTap={{ scale: 0.95 }}
                    >
                        {tag}
                    </motion.span>
                );
            })}
            {onForYouToggle && (
                <motion.span
                    onClick={onForYouToggle}
                    className={`px-3 py-1 rounded-sm border text-xs font-mono uppercase font-bold cursor-pointer transition-all duration-300 inline-flex items-center gap-1.5 ${
                        forYouActive
                            ? 'border-cyber-purple bg-cyber-purple/30 text-cyber-purple shadow-neon-purple'
                            : 'border-cyber-purple/40 text-cyber-purple/80'
                    }`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 + 8 * 0.05, duration: 0.3 }}
                    whileHover={{
                        scale: 1.1,
                        y: -3,
                        backgroundColor: 'rgba(168, 85, 247, 0.2)',
                        borderColor: 'rgba(168, 85, 247, 0.6)',
                        boxShadow: '0 0 20px rgba(168, 85, 247, 0.4)'
                    }}
                    whileTap={{ scale: 0.95 }}
                    title="What to watch next, based on what you rated"
                >
                    <Sparkles size={12} />
                    Watch Next
                </motion.span>
            )}
            {onOpenRate && (
                <motion.span
                    onClick={onOpenRate}
                    className="px-3 py-1 rounded-sm border border-cyber-green/40 text-cyber-green/80 text-xs font-mono uppercase font-bold cursor-pointer transition-all duration-300 inline-flex items-center gap-1.5"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 + 9 * 0.05, duration: 0.3 }}
                    whileHover={{
                        scale: 1.1,
                        y: -3,
                        backgroundColor: 'rgba(0, 255, 136, 0.15)',
                        borderColor: 'rgba(0, 255, 136, 0.6)',
                        boxShadow: '0 0 20px rgba(0, 255, 136, 0.35)'
                    }}
                    whileTap={{ scale: 0.95 }}
                    title="Get a random list and mark what you have seen"
                >
                    <Dices size={12} />
                    Rate Titles
                </motion.span>
            )}
        </motion.div>
      </div>
    </div>
  );
};

export default HeroSection;