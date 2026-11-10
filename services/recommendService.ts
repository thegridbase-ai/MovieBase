// Taste-driven recommendations: a random "have you seen this?" batch for
// collecting verdicts, and the Watch Next lists built from those verdicts.

import { tmdbFetch } from './tmdbClient';
import { tasteKey } from './tasteStore';
import { Movie, TasteEntry, WatchNextTab } from '../types';

type MediaKind = 'movie' | 'tv';
export type MediaScope = 'all' | MediaKind;

export interface SeedRef {
  id: number;
  media_type: MediaKind;
  genre_ids?: number[];
}

const GENRE_HORROR = 27;
const LIST_SIZE = 20;

const shuffle = <T,>(arr: T[]): T[] => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const randomPages = (max: number, count: number): number[] =>
  shuffle(Array.from({ length: max }, (_, i) => i + 1)).slice(0, count);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toMovie = (item: any, mediaType: MediaKind): Movie => ({
  id: item.id,
  title: item.title || item.name,
  poster_path: item.poster_path,
  backdrop_path: item.backdrop_path,
  overview: item.overview,
  vote_average: item.vote_average,
  release_date: item.release_date || item.first_air_date || 'TBA',
  genre_ids: item.genre_ids ?? [],
  media_type: mediaType,
});

const fetchList = async (
  path: string,
  mediaType: MediaKind,
  params: Record<string, string | number | undefined>,
): Promise<Movie[]> => {
  try {
    const r = await tmdbFetch(path, { language: 'en-US', include_adult: 'false', ...params });
    if (!r.ok) return [];
    const data = await r.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data.results ?? []).filter((i: any) => i.poster_path).map((i: any) => toMovie(i, mediaType));
  } catch {
    return [];
  }
};

const dedupe = (movies: Movie[]): Movie[] => {
  const seen = new Set<string>();
  return movies.filter((m) => {
    const key = tasteKey(m.id, m.media_type);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

/**
 * A fresh random batch of well-known titles the user has not judged yet.
 * Samples from the ~800 most-voted movies and ~240 most-voted shows so the
 * batch is mostly titles people recognise.
 */
export const fetchRatingBatch = async (
  excludeKeys: Set<string>,
  size: number = 18,
): Promise<Movie[]> => {
  const moviePages = randomPages(40, 3);
  const tvPages = randomPages(12, 1);
  const lists = await Promise.all([
    ...moviePages.map((page) =>
      fetchList('/discover/movie', 'movie', { sort_by: 'vote_count.desc', page })),
    ...tvPages.map((page) =>
      fetchList('/discover/tv', 'tv', { sort_by: 'vote_count.desc', page })),
  ]);
  return shuffle(dedupe(lists.flat()))
    .filter((m) => !excludeKeys.has(tasteKey(m.id, m.media_type)))
    .slice(0, size);
};

// Genre affinity: liked +1, want-to-watch +0.5, disliked -1 per genre.
const buildAffinity = (entries: TasteEntry[], extraSeeds: SeedRef[]): Map<number, number> => {
  const affinity = new Map<number, number>();
  const add = (genres: number[] | undefined, weight: number) => {
    for (const g of genres ?? []) affinity.set(g, (affinity.get(g) ?? 0) + weight);
  };
  for (const e of entries) {
    add(e.movie.genre_ids, e.status === 'liked' ? 1 : e.status === 'watchlist' ? 0.5 : -1);
  }
  for (const s of extraSeeds) add(s.genre_ids, 1);
  return affinity;
};

const affinityScore = (movie: Movie, affinity: Map<number, number>, total: number): number => {
  if (total === 0 || movie.genre_ids.length === 0) return 0;
  const sum = movie.genre_ids.reduce((acc, g) => acc + (affinity.get(g) ?? 0), 0);
  // Average per genre, normalised by profile size so it stays within ~[-1, 1].
  return sum / movie.genre_ids.length / Math.max(1, total / 4);
};

const scoreOf = (
  m: Movie,
  affinity: Map<number, number>,
  total: number,
  bonus?: Map<string, number>,
): number =>
  affinityScore(m, affinity, total) * 2 +
  (m.vote_average ?? 0) / 10 +
  (bonus?.get(tasteKey(m.id, m.media_type)) ?? 0);

const rank = (
  candidates: Movie[],
  affinity: Map<number, number>,
  total: number,
  bonus?: Map<string, number>,
): Movie[] =>
  [...candidates].sort(
    (a, b) => scoreOf(b, affinity, total, bonus) - scoreOf(a, affinity, total, bonus),
  );

// Take the best remaining title from each list in turn, so one liked seed
// cannot fill the whole result with its own neighbours.
const interleave = (lists: Movie[][]): Movie[] => {
  const out: Movie[] = [];
  const seen = new Set<string>();
  const longest = Math.max(0, ...lists.map((l) => l.length));
  for (let i = 0; i < longest; i++) {
    for (const list of lists) {
      const m = list[i];
      if (!m) continue;
      const key = tasteKey(m.id, m.media_type);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(m);
    }
  }
  return out;
};

const forMe = async (
  entries: TasteEntry[],
  extraSeeds: SeedRef[],
  affinity: Map<number, number>,
  total: number,
  known: Set<string>,
  scope: MediaScope,
): Promise<Movie[]> => {
  const liked: SeedRef[] = entries
    .filter((e) => e.status === 'liked')
    .map((e) => ({ id: e.id, media_type: e.media_type }));
  // TMDB recommendations stay within the seed's media type, so a Movies or
  // Series scope means seeding only from liked titles of that type.
  const seeds = shuffle([...liked, ...extraSeeds])
    .filter((s) => scope === 'all' || s.media_type === scope)
    .slice(0, 8);
  const isNew = (m: Movie) => !known.has(tasteKey(m.id, m.media_type));

  if (seeds.length === 0) {
    // No liked title to seed from (in this scope): fall back to popular
    // titles in the genres the profile leans towards, away from the ones it
    // rejects.
    const kind: MediaKind = scope === 'tv' ? 'tv' : 'movie';
    const sorted = [...affinity.entries()].sort((x, y) => y[1] - x[1]);
    const top = sorted.filter(([, v]) => v > 0).slice(0, 3).map(([g]) => g);
    const worst = sorted.filter(([, v]) => v < 0).slice(-2).map(([g]) => g);
    const candidates = await fetchList(`/discover/${kind}`, kind, {
      sort_by: 'popularity.desc',
      'vote_count.gte': 300,
      with_genres: top.join('|') || undefined,
      without_genres: worst.join(',') || undefined,
    });
    return rank(candidates.filter(isNew), affinity, total);
  }

  const lists = await Promise.all(
    seeds.map((s) => fetchList(`/${s.media_type}/${s.id}/recommendations`, s.media_type, { page: 1 })),
  );
  // Titles recommended by several liked seeds rank higher within each list.
  const bonus = new Map<string, number>();
  for (const m of lists.flat()) {
    const key = tasteKey(m.id, m.media_type);
    bonus.set(key, (bonus.get(key) ?? 0) + 0.75);
  }
  return interleave(lists.map((l) => rank(l.filter(isNew), affinity, total, bonus)));
};

const forFamily = async (): Promise<Movie[]> => {
  const lists = await Promise.all([
    ...[1, 2, 3].map((page) =>
      fetchList('/discover/movie', 'movie', {
        sort_by: 'popularity.desc',
        certification_country: 'US',
        'certification.lte': 'PG-13',
        without_genres: GENRE_HORROR,
        'vote_count.gte': 400,
        'vote_average.gte': 6.3,
        page,
      })),
    fetchList('/discover/tv', 'tv', {
      sort_by: 'popularity.desc',
      with_genres: 10751,
      'vote_count.gte': 100,
      'vote_average.gte': 6.3,
    }),
  ]);
  return dedupe(lists.flat());
};

const forKids = async (): Promise<Movie[]> => {
  const lists = await Promise.all([
    ...[1, 2, 3].map((page) =>
      fetchList('/discover/movie', 'movie', {
        sort_by: 'popularity.desc',
        certification_country: 'US',
        'certification.lte': 'PG',
        with_genres: '16|10751',
        without_genres: GENRE_HORROR,
        'vote_count.gte': 150,
        'vote_average.gte': 6,
        page,
      })),
    fetchList('/discover/tv', 'tv', {
      sort_by: 'popularity.desc',
      with_genres: 10762,
      'vote_count.gte': 30,
      'vote_average.gte': 6,
    }),
  ]);
  return dedupe(lists.flat());
};

/** Build one Watch Next tab from the taste profile. */
export const fetchWatchNext = async (
  tab: WatchNextTab,
  entries: TasteEntry[],
  extraSeeds: SeedRef[],
  scope: MediaScope = 'all',
): Promise<Movie[]> => {
  const inScope = (m: Pick<Movie, 'media_type'>) =>
    scope === 'all' || (m.media_type === 'tv' ? 'tv' : 'movie') === scope;

  if (tab === 'watchlist') {
    return entries
      .filter((e) => e.status === 'watchlist' && inScope(e))
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
      .map((e) => e.movie);
  }

  const affinity = buildAffinity(entries, extraSeeds);
  const total = entries.length + extraSeeds.length;
  const known = new Set<string>([
    ...entries.map((e) => tasteKey(e.id, e.media_type)),
    ...extraSeeds.map((s) => tasteKey(s.id, s.media_type)),
  ]);

  if (tab === 'me') {
    return (await forMe(entries, extraSeeds, affinity, total, known, scope)).slice(0, LIST_SIZE);
  }

  const candidates = tab === 'family' ? await forFamily() : await forKids();
  return rank(
    candidates.filter((m) => inScope(m) && !known.has(tasteKey(m.id, m.media_type))),
    affinity,
    total,
  ).slice(0, LIST_SIZE);
};
