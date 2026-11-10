import React, { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shuffle, Dices } from 'lucide-react';
import { Movie } from '../types';
import { useTaste } from '../hooks/useTaste';
import { getTasteSnapshot } from '../services/tasteStore';
import { fetchRatingBatch } from '../services/recommendService';
import { getImageUrl } from '../services/tmdbService';
import TasteButtons from './TasteButtons';

interface RateTitlesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDone: () => void;
}

const RateTitlesModal: React.FC<RateTitlesModalProps> = ({ isOpen, onClose, onDone }) => {
  const { count, statusOf } = useTaste();
  const [batch, setBatch] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);

  // Every batch is random and skips everything already judged. Reads the
  // store directly so marking a tile does not trigger a reload.
  const loadBatch = useCallback(async () => {
    setLoading(true);
    const exclude = new Set(Object.keys(getTasteSnapshot()));
    setBatch(await fetchRatingBatch(exclude));
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isOpen) loadBatch();
  }, [isOpen, loadBatch]);

  const markedInBatch = batch.filter((m) => statusOf(m) !== null).length;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 50 }}
            className="fixed inset-0 m-auto w-full max-w-7xl h-[100dvh] md:h-[90vh] z-50 md:p-6"
            role="dialog"
            aria-modal="true"
            aria-label="Rate titles"
          >
            <div className="relative bg-cyber-panel border border-cyber-cyan/30 md:rounded-xl overflow-hidden shadow-neon-cyan h-full flex flex-col">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyber-cyan to-cyber-purple" />

              <div className="flex items-center justify-between gap-3 p-4 md:p-6 border-b border-white/10">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="hidden sm:flex w-12 h-12 shrink-0 rounded-full bg-cyber-cyan/10 items-center justify-center border border-cyber-cyan/50">
                    <Dices className="text-cyber-cyan" size={24} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-lg md:text-2xl font-mono font-bold text-white">SEEN THESE?</h2>
                    <p className="text-gray-400 text-xs md:text-sm font-mono">
                      {count} rated so far. Skip anything you have not seen.
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded min-w-[44px] min-h-[44px] flex items-center justify-center"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 md:p-6">
                {loading ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <div key={i} className="aspect-[2/3] bg-black/40 rounded-lg border border-cyber-cyan/10 animate-pulse" />
                    ))}
                  </div>
                ) : batch.length === 0 ? (
                  <div className="text-center py-20 text-gray-500 font-mono">
                    <p className="text-xl mb-2">NOTHING NEW IN THIS DRAW</p>
                    <p className="text-sm text-gray-600">Shuffle again for another batch.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
                    {batch.map((movie) => {
                      const marked = statusOf(movie) !== null;
                      return (
                        <div
                          key={`${movie.media_type}-${movie.id}`}
                          className={`flex flex-col rounded-lg border bg-black/40 overflow-hidden transition-colors duration-200 ${
                            marked ? 'border-cyber-cyan/60' : 'border-white/10'
                          }`}
                        >
                          <div className="relative aspect-[2/3]">
                            <img
                              src={getImageUrl(movie.poster_path)}
                              alt={movie.title}
                              loading="lazy"
                              className={`w-full h-full object-cover transition-opacity duration-200 ${marked ? 'opacity-60' : ''}`}
                            />
                            <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded-sm bg-black/80 border border-cyber-cyan/30 text-[10px] font-mono uppercase text-cyber-cyan">
                              {movie.media_type === 'tv' ? 'Series' : 'Movie'}
                            </span>
                          </div>
                          <div className="p-2 flex flex-col gap-2 flex-1">
                            <div className="min-h-[2.5rem]">
                              <p className="text-sm text-white font-semibold leading-tight line-clamp-2">{movie.title}</p>
                              <p className="text-[11px] text-gray-500 font-mono">{movie.release_date.slice(0, 4)}</p>
                            </div>
                            <div className="mt-auto">
                              <TasteButtons movie={movie} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-3 p-4 md:px-6 border-t border-white/10 bg-black/40">
                <span className="text-xs font-mono text-gray-400 whitespace-nowrap">
                  {markedInBatch} / {batch.length} marked
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={loadBatch}
                    disabled={loading}
                    className="inline-flex items-center gap-2 px-4 min-h-[44px] whitespace-nowrap rounded border border-cyber-cyan/50 bg-cyber-cyan/10 text-cyber-cyan font-mono text-xs uppercase font-bold hover:bg-cyber-cyan/20 transition-colors disabled:opacity-50"
                  >
                    <Shuffle size={16} />
                    New batch
                  </button>
                  <button
                    onClick={onDone}
                    className="inline-flex items-center px-4 min-h-[44px] whitespace-nowrap rounded border border-cyber-purple/60 bg-cyber-purple/20 text-cyber-purple font-mono text-xs uppercase font-bold hover:bg-cyber-purple/30 transition-colors"
                  >
                    Watch next
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default RateTitlesModal;
