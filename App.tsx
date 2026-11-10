import React, { useEffect, useState, useCallback } from 'react';
import { HashRouter, Routes, Route, useParams, useNavigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import HeroSection from './components/HeroSection';
import InfiniteScrollGrid from './components/InfiniteScrollGrid';
import ForYouSection from './components/ForYouSection';
import LoginModal from './components/LoginModal';
import FavoritesModal from './components/FavoritesModal';
import RateTitlesModal from './components/RateTitlesModal';
import MovieDetailModal from './components/MovieDetailModal';
import { Movie, MediaType } from './types';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RegionProvider, useRegion } from './context/RegionContext';
import { syncTasteWithRemote, detachTasteRemote } from './services/tasteStore';
import { fetchMovieById } from './services/tmdbService';

// Genre mapping: Category name -> TMDB Genre ID
const GENRE_MAP: Record<string, number> = {
  'Action': 28,
  'Comedy': 35,
  'Drama': 18,
  'Horror': 27,
  'Romance': 10749,
  'Adventure': 12,
  'Kids': 10751,
};

// Resolves the deep-link route `#/:mediaType/:id`. If the title isn't already
// open in state, it fetches it (with providers) and opens the modal. Rendered
// inside the router so it can read params and navigate.
const DeepLinkResolver: React.FC<{
  selectedMovie: Movie | null;
  onResolve: (movie: Movie) => void;
}> = ({ selectedMovie, onResolve }) => {
  const { mediaType, id } = useParams<{ mediaType: string; id: string }>();
  const { region } = useRegion();

  useEffect(() => {
    const numericId = Number(id);
    if (!mediaType || (mediaType !== 'movie' && mediaType !== 'tv') || !numericId) return;
    // Already showing this title — nothing to fetch.
    if (selectedMovie && selectedMovie.id === numericId) return;

    let cancelled = false;
    (async () => {
      const movie = await fetchMovieById(numericId, mediaType, region);
      if (!cancelled && movie) onResolve(movie);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediaType, id, region]);

  return null;
};

const AppContent: React.FC = () => {
  const { isLoggedIn, checkSession } = useAuth();
  const { region, setRegion } = useRegion();
  const [activeFilter, setActiveFilter] = useState<MediaType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [forYouActive, setForYouActive] = useState(false);

  const [isRateOpen, setIsRateOpen] = useState(false);

  // Mirror the local taste profile to the account while logged in.
  useEffect(() => {
    if (isLoggedIn) void syncTasteWithRemote();
    else detachTasteRemote();
  }, [isLoggedIn]);

  const handleLogin = async () => {
    await checkSession();
    setIsLoginOpen(false);
  };

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    if (q) {
      setActiveFilter('all');
      setForYouActive(false);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setActiveFilter('all');
    setActiveCategory(null);
    setForYouActive(false);
  };

  const handleCategoryFilter = (category: string | null) => {
    setActiveCategory(category);
    setSearchQuery('');
    setForYouActive(false);
  };

  const handleForYouToggle = () => {
    setForYouActive((on) => {
      const next = !on;
      if (next) {
        setSearchQuery('');
        setActiveCategory(null);
      }
      return next;
    });
  };

  const genreId = activeCategory ? GENRE_MAP[activeCategory] : undefined;

  const navigate = useNavigate();

  // Opening a title updates the URL to a shareable deep link.
  const handleMovieClick = useCallback((movie: Movie) => {
    setSelectedMovie(movie);
    const mediaType = movie.media_type === 'tv' ? 'tv' : 'movie';
    navigate(`/${mediaType}/${movie.id}`);
  }, [navigate]);

  // Closing the modal returns to the home route.
  const handleCloseModal = useCallback(() => {
    setSelectedMovie(null);
    navigate('/');
  }, [navigate]);

  return (
      <motion.div
        className="min-h-screen bg-cyber-black text-gray-100 font-sans selection:bg-cyber-cyan selection:text-black"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Decorative Grid Background */}
        <div className="fixed inset-0 bg-cyber-grid bg-[length:40px_40px] z-0 pointer-events-none opacity-20" />

        {/* Meteors Effect */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
          {Array.from({ length: 10 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute h-0.5 rounded-full bg-gradient-to-r from-cyber-cyan to-transparent"
              style={{
                left: `${Math.random() * 100}%`,
                top: '-5%',
                width: `${Math.random() * 100 + 50}px`,
                transform: 'rotate(215deg)',
                boxShadow: '0 0 10px rgba(0, 243, 255, 0.5)'
              }}
              initial={{ y: -100, opacity: 0 }}
              animate={{
                y: ['0vh', '120vh'],
                opacity: [0, 1, 1, 0]
              }}
              transition={{
                duration: Math.random() * 3 + 2,
                delay: Math.random() * 10,
                repeat: Infinity,
                repeatDelay: Math.random() * 15 + 5,
                ease: 'linear'
              }}
            />
          ))}
        </div>
        
        <Navbar
          onFilterChange={setActiveFilter}
          activeFilter={activeFilter}
          onOpenLogin={() => setIsLoginOpen(true)}
          onOpenFavorites={() => setIsFavoritesOpen(true)}
          region={region}
          onRegionChange={setRegion}
        />

        <main className="relative z-10 pt-20">
          {/* Home content is shared across the home route and deep-link route
              so opening a title never blanks the page behind the modal. */}
          <HeroSection
              onSearch={handleSearch}
              searchQuery={searchQuery}
              onClearSearch={handleClearSearch}
              onCategoryFilter={handleCategoryFilter}
              activeCategory={activeCategory}
              forYouActive={forYouActive}
              onForYouToggle={handleForYouToggle}
              onOpenRate={() => setIsRateOpen(true)}
          />
          {forYouActive ? (
            <ForYouSection onMovieClick={handleMovieClick} onOpenRate={() => setIsRateOpen(true)} />
          ) : (
            <InfiniteScrollGrid
                onMovieClick={handleMovieClick}
                searchQuery={searchQuery}
                filterType={activeFilter}
                onClearSearch={handleClearSearch}
                genreId={genreId}
                region={region}
            />
          )}

          <Routes>
            <Route path="/" element={null} />
            <Route
              path="/:mediaType/:id"
              element={
                <DeepLinkResolver
                  selectedMovie={selectedMovie}
                  onResolve={setSelectedMovie}
                />
              }
            />
          </Routes>
        </main>

        {/* Modals */}
        <LoginModal
            isOpen={isLoginOpen}
            onClose={() => setIsLoginOpen(false)}
            onLogin={handleLogin}
        />

        <RateTitlesModal
            isOpen={isRateOpen}
            onClose={() => setIsRateOpen(false)}
            onDone={() => {
              setIsRateOpen(false);
              setSearchQuery('');
              setActiveCategory(null);
              setForYouActive(true);
            }}
        />

        {isLoggedIn && (
          <FavoritesModal
            isOpen={isFavoritesOpen}
            onClose={() => setIsFavoritesOpen(false)}
            onMovieClick={handleMovieClick}
          />
        )}

        <AnimatePresence>
            {selectedMovie && (
                <MovieDetailModal
                    movie={selectedMovie}
                    onClose={handleCloseModal}
                />
            )}
        </AnimatePresence>
      </motion.div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <RegionProvider>
        <HashRouter>
          <AppContent />
        </HashRouter>
      </RegionProvider>
    </AuthProvider>
  );
};

export default App;