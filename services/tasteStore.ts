// Local-first store for the user's taste profile (liked / disliked / want to
// watch). localStorage is the source of truth for rendering; when a user is
// logged in, entries are mirrored to the Supabase `title_feedback` table so
// the profile follows them across devices.

import { supabase } from './supabaseClient';
import { Movie, TasteEntry, TasteStatus } from '../types';

const STORAGE_KEY = 'moviebase.taste.v1';
const TABLE = 'title_feedback';

type TasteMap = Record<string, TasteEntry>;
type Listener = () => void;

export const tasteKey = (id: number, mediaType?: string): string =>
  `${mediaType === 'tv' ? 'tv' : 'movie'}-${id}`;

const readStorage = (): TasteMap => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as TasteMap) : {};
  } catch {
    return {};
  }
};

let state: TasteMap = readStorage();
let remoteUserId: string | null = null;
let remoteDisabled = false;
const listeners = new Set<Listener>();

const commit = (next: TasteMap): void => {
  state = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage full or blocked: keep the in-memory profile for this session.
  }
  listeners.forEach((l) => l());
};

export const subscribeTaste = (listener: Listener): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getTasteSnapshot = (): TasteMap => state;

// Keep only what cards and the recommender need; provider info goes stale.
const compactMovie = (movie: Movie): Movie => ({
  id: movie.id,
  title: movie.title,
  poster_path: movie.poster_path,
  backdrop_path: movie.backdrop_path,
  overview: movie.overview,
  vote_average: movie.vote_average,
  release_date: movie.release_date,
  genre_ids: movie.genre_ids ?? [],
  media_type: movie.media_type === 'tv' ? 'tv' : 'movie',
});

const toRow = (userId: string, e: TasteEntry) => ({
  user_id: userId,
  tmdb_id: e.id,
  media_type: e.media_type,
  status: e.status,
  movie_data: e.movie,
  updated_at: e.updated_at,
});

// A missing table or RLS failure must never break the local experience, so
// remote sync switches itself off for the session after the first error.
const handleRemoteError = (error: { message: string } | null): boolean => {
  if (!error) return false;
  remoteDisabled = true;
  console.warn('Taste sync disabled for this session:', error.message);
  return true;
};

/** Set a verdict for a title, or pass null to clear it. */
export const setTaste = (movie: Movie, status: TasteStatus | null): void => {
  const mediaType = movie.media_type === 'tv' ? 'tv' : 'movie';
  const key = tasteKey(movie.id, mediaType);
  const next = { ...state };

  if (status === null) {
    delete next[key];
  } else {
    next[key] = {
      id: movie.id,
      media_type: mediaType,
      status,
      movie: compactMovie(movie),
      updated_at: new Date().toISOString(),
    };
  }
  commit(next);

  if (!remoteUserId || remoteDisabled) return;
  const userId = remoteUserId;
  void (async () => {
    const { error } = status === null
      ? await supabase.from(TABLE).delete()
          .eq('user_id', userId).eq('tmdb_id', movie.id).eq('media_type', mediaType)
      : await supabase.from(TABLE).upsert(toRow(userId, next[key]));
    handleRemoteError(error);
  })();
};

/** Merge the remote profile into the local one (newest verdict wins). */
export const syncTasteWithRemote = async (): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  remoteUserId = user?.id ?? null;
  if (!user || remoteDisabled) return;

  const { data, error } = await supabase
    .from(TABLE)
    .select('tmdb_id, media_type, status, movie_data, updated_at')
    .eq('user_id', user.id);
  if (handleRemoteError(error) || !data) return;

  const merged: TasteMap = { ...state };
  const remoteKeys = new Set<string>();
  for (const row of data) {
    const key = tasteKey(row.tmdb_id, row.media_type);
    remoteKeys.add(key);
    const local = merged[key];
    if (!local || local.updated_at < row.updated_at) {
      merged[key] = {
        id: row.tmdb_id,
        media_type: row.media_type === 'tv' ? 'tv' : 'movie',
        status: row.status as TasteStatus,
        movie: row.movie_data as Movie,
        updated_at: row.updated_at,
      };
    }
  }
  commit(merged);

  // Push verdicts made while logged out (or newer than the remote copy).
  const toPush = Object.entries(merged)
    .filter(([key, e]) => !remoteKeys.has(key) || data.some(
      (r) => tasteKey(r.tmdb_id, r.media_type) === key && r.updated_at < e.updated_at,
    ))
    .map(([, e]) => toRow(user.id, e));
  if (toPush.length > 0) {
    const { error: pushError } = await supabase.from(TABLE).upsert(toPush);
    handleRemoteError(pushError);
  }
};

export const detachTasteRemote = (): void => {
  remoteUserId = null;
};
