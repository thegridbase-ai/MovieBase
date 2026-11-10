import React, { useEffect, useState } from 'react';
import { Sparkles, User, Users, Baby, Bookmark, Dices } from 'lucide-react';
import { Movie, WatchNextTab } from '../types';
import { useAuth } from '../context/AuthContext';
import { useRegion } from '../context/RegionContext';
import { useFavorites } from '../hooks/useFavorites';
import { useStreamingAlerts } from '../hooks/useStreamingAlerts';
import { useTaste } from '../hooks/useTaste';
import { supabase } from '../services/supabaseClient';
import { enrichMoviesWithProviders } from '../services/tmdbService';
import { fetchWatchNext, MediaScope, SeedRef } from '../services/recommendService';
import MovieCard from './MovieCard';

interface ForYouSectionProps {
  onMovieClick: (m: Movie) => void;
  onOpenRate: () => void;
  /** Bumped by the parent to force a fresh list (e.g. after a rating session). */
  refreshSignal?: number;
  /** Navbar media filter: all titles, movies only, or series only. */
  scope?: MediaScope;
}

const TABS: { id: WatchNextTab; label: string; hint: string; Icon: typeof User }[] = [
  { id: 'me', label: 'For Me', hint: 'BASED ON WHAT YOU LIKED', Icon: User },
  { id: 'family', label: 'Family', hint: 'PG-13 AND UNDER, NO HORROR', Icon: Users },
  { id: 'kids', label: 'With Kids', hint: 'G / PG ANIMATION + FAMILY', Icon: Baby },
  { id: 'watchlist', label: 'Watchlist', hint: 'TITLES YOU WANT TO WATCH', Icon: Bookmark },
];

// Favorites and streaming alerts count as extra "liked" signals.
const loadExtraSeeds = async (): Promise<SeedRef[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const [favRes, alertRes] = await Promise.all([
    supabase.from('favorites').select('movie_id, movie_data').eq('user_id', user.id),
    supabase.from('streaming_alerts').select('movie_id, media_type').eq('user_id', user.id),
  ]);
  const seeds: SeedRef[] = [];
  for (const f of favRes.data ?? []) {
    const m = f.movie_data as Movie | null;
    seeds.push({
      id: m?.id ?? f.movie_id,
      media_type: m?.media_type === 'tv' ? 'tv' : 'movie',
      genre_ids: m?.genre_ids,
    });
  }
  for (const a of alertRes.data ?? []) {
    seeds.push({ id: a.movie_id, media_type: a.media_type === 'tv' ? 'tv' : 'movie' });
  }
  return seeds;
};

const ForYouSection: React.FC<ForYouSectionProps> = ({ onMovieClick, onOpenRate, refreshSignal = 0, scope = 'all' }) => {
  const { isLoggedIn } = useAuth();
  const { region } = useRegion();
  const { favoriteIds } = useFavorites(isLoggedIn);
  const { alertIds } = useStreamingAlerts(isLoggedIn);
  const { entries, count, statusOf } = useTaste();
  const accountSignals = isLoggedIn ? favoriteIds.size + alertIds.size : 0;

  const [tab, setTab] = useState<WatchNextTab>('me');
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [topUp, setTopUp] = useState(0);

  useEffect(() => {
    setMovies([]);
  }, [tab, scope]);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const extraSeeds = accountSignals > 0 ? await loadExtraSeeds() : [];
        const hasSignals = entries.length + extraSeeds.length > 0;
        // "For Me" needs a profile; the family and kids tabs still work
        // without one, they are just not personalised yet.
        const list = tab === 'me' && !hasSignals ? [] : await fetchWatchNext(tab, entries, extraSeeds, scope);
        const enriched = await enrichMoviesWithProviders(list, region);
        if (isMounted) setMovies(enriched);
      } catch (err) {
        console.error('Watch Next load failed:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    load();
    return () => { isMounted = false; };
    // Verdicts given on the cards do not refetch: the judged card just drops
    // out (see `visible`), so the rest of the list stays put. A fresh list is
    // loaded on tab change, on `refreshSignal`, or when the list runs low.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, scope, accountSignals, region, refreshSignal, topUp, tab === 'watchlist' ? count : 0]);

  // Recommendation tabs hide anything judged since the list loaded; the
  // watchlist keeps only titles still marked "want to watch".
  const visible = movies.filter((m) =>
    tab === 'watchlist' ? statusOf(m) === 'watchlist' : statusOf(m) === null,
  );

  useEffect(() => {
    if (tab !== 'watchlist' && !loading && movies.length >= 8 && visible.length < 8) {
      setTopUp((n) => n + 1);
    }
  }, [tab, loading, movies.length, visible.length]);

  const active = TABS.find((t) => t.id === tab) ?? TABS[0];
  const showSkeleton = loading && visible.length === 0;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h2 className="text-2xl font-mono text-white flex items-center gap-2">
          <span className="w-2 h-8 bg-cyber-cyan block shadow-[0_0_10px_#00F3FF]"></span>
          <Sparkles className="text-cyber-cyan drop-shadow-[0_0_6px_rgba(0,243,255,0.6)]" size={22} />
          Watch Next
        </h2>
        <button
          onClick={onOpenRate}
          className="inline-flex items-center gap-2 px-4 min-h-[44px] rounded border border-cyber-cyan/50 bg-cyber-cyan/10 text-cyber-cyan font-mono text-xs uppercase font-bold hover:bg-cyber-cyan/20 hover:shadow-neon-cyan transition-all"
        >
          <Dices size={16} />
          Rate titles
          <span className="text-cyber-cyan/60">{count}</span>
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-2 [scrollbar-width:thin] [scrollbar-color:rgba(0,243,255,0.3)_transparent]" role="tablist">
        {TABS.map(({ id, label, Icon }) => {
          const isActive = id === tab;
          return (
            <button
              key={id}
              role="tab"
              aria-selected={isActive}
              onClick={() => setTab(id)}
              className={`shrink-0 inline-flex items-center gap-2 px-4 min-h-[44px] rounded-sm border font-mono text-xs uppercase font-bold transition-all duration-300 ${
                isActive
                  ? 'border-cyber-cyan bg-cyber-cyan/20 text-cyber-cyan shadow-neon-cyan'
                  : 'border-cyber-cyan/20 text-cyber-cyan/60 hover:border-cyber-cyan/50 hover:text-cyber-cyan'
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          );
        })}
      </div>
      <p className="text-[11px] font-mono text-cyber-cyan/60 mb-6">{active.hint}</p>

      {showSkeleton ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] bg-cyber-panel rounded-xl border border-cyber-cyan/10 animate-pulse" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-cyber-cyan/20 rounded-xl font-mono">
          <p className="text-lg text-gray-300 mb-2">
            {tab === 'watchlist'
              ? `NO ${scope === 'tv' ? 'SERIES' : scope === 'movie' ? 'MOVIES' : 'TITLES'} ON YOUR WATCHLIST YET`
              : 'TELL ME WHAT YOU HAVE SEEN'}
          </p>
          <p className="text-sm text-gray-500 mb-6 px-4">
            {tab === 'watchlist'
              ? 'Mark titles as "want to watch" and they show up here.'
              : 'Rate a few random titles and this list starts to fit you.'}
          </p>
          <button
            onClick={onOpenRate}
            className="inline-flex items-center gap-2 px-5 min-h-[44px] rounded border border-cyber-cyan/50 bg-cyber-cyan/10 text-cyber-cyan text-xs uppercase font-bold hover:bg-cyber-cyan/20 transition-colors"
          >
            <Dices size={16} />
            Rate titles
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 auto-rows-auto grid-flow-dense">
          {visible.map((m, index) => {
            // Same bento rhythm as the main grid: hero, large, then flow.
            let gridClass = 'col-span-1 aspect-[2/3]';
            let cardVariant: 'standard' | 'featured' | 'large' = 'standard';
            if (index === 0) {
              gridClass = 'col-span-2 md:col-span-4 h-[50vh] md:h-[600px]';
              cardVariant = 'featured';
            } else if (index === 1) {
              gridClass = 'col-span-2 md:col-span-2 md:row-span-2 aspect-[2/3] md:aspect-auto';
              cardVariant = 'large';
            }
            return (
              <div key={`${m.media_type}-${m.id}`} className={gridClass}>
                <MovieCard movie={m} onClick={onMovieClick} variant={cardVariant} showTaste featuredBadge="TOP PICK" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ForYouSection;
