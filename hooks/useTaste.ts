import { useMemo, useSyncExternalStore } from 'react';
import { Movie, TasteEntry, TasteStatus } from '../types';
import { getTasteSnapshot, setTaste, subscribeTaste, tasteKey } from '../services/tasteStore';

export const useTaste = () => {
  const map = useSyncExternalStore(subscribeTaste, getTasteSnapshot);

  return useMemo(() => {
    const entries: TasteEntry[] = Object.values(map);
    return {
      entries,
      count: entries.length,
      statusOf: (movie: Pick<Movie, 'id' | 'media_type'>): TasteStatus | null =>
        map[tasteKey(movie.id, movie.media_type)]?.status ?? null,
      // Clicking the active verdict again clears it.
      toggle: (movie: Movie, status: TasteStatus) => {
        const current = map[tasteKey(movie.id, movie.media_type)]?.status ?? null;
        setTaste(movie, current === status ? null : status);
      },
    };
  }, [map]);
};
