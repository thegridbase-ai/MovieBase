// A single watch provider (streaming service / storefront) for a title in a
// given region, as surfaced by TMDB's /watch/providers endpoint.
export interface WatchProvider {
  name: string;
  logoPath: string | null;
  // Which TMDB buckets this provider appeared in. Subscription-style buckets
  // (flatrate/free/ads) rank ahead of transactional ones (rent/buy).
  kinds: ('flatrate' | 'free' | 'ads' | 'rent' | 'buy')[];
}

export interface Movie {
  id: number;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  vote_average: number;
  release_date: string;
  genre_ids: number[];
  media_type?: 'movie' | 'tv';
  // Real subscription platform name from TMDB watch providers API
  // (e.g. 'Netflix', 'Prime Video'), or sentinel values:
  //   'Rent/Buy' -> only available transactionally (rent or buy)
  //   'Theatre'  -> released within last 60 days, no streaming yet
  // undefined -> no availability info known
  // NOTE: this remains the primary badge field and keeps the sentinel
  // contract exactly as before, so alert logic and color coding are unchanged.
  platform?: string;
  // Full, ordered list of relevant providers with logos (subscription first,
  // then rent/buy). Optional/additive — `platform` is derived from platforms[0].
  platforms?: WatchProvider[];
}

export interface Genre {
  id: number;
  name: string;
}

export interface ApiResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

export type SortOption = 'popularity.desc' | 'vote_average.desc' | 'release_date.desc';

// External ratings for a title (via OMDb), cached in Supabase.
export interface TitleRatings {
  imdbId: string | null;
  /** IMDb rating 0–10, null when unknown. */
  imdb: number | null;
  /** Rotten Tomatoes percentage 0–100, null when unknown. */
  rt: number | null;
}

// Client-side ordering of the loaded grid.
export type GridSort = 'default' | 'imdb' | 'rt' | 'tmdb' | 'date';
// Browse filter modes. 'now_playing' surfaces theatrical releases via TMDB's
// /movie/now_playing endpoint. All others map to media_type / trending as before.
export type MediaType = 'all' | 'movie' | 'tv' | 'now_playing';

// Supported watch-provider regions for the Navbar region selector.
export type WatchRegion = 'US' | 'GB' | 'CA' | 'AU' | 'DE' | 'FR' | 'TR' | 'IN';

// Personal verdict on a title. 'liked' / 'disliked' both imply "watched";
// 'watchlist' means "want to watch".
export type TasteStatus = 'liked' | 'disliked' | 'watchlist';

export interface TasteEntry {
  id: number;
  media_type: 'movie' | 'tv';
  status: TasteStatus;
  movie: Movie;
  updated_at: string;
}

export type WatchNextTab = 'me' | 'family' | 'kids' | 'watchlist';
