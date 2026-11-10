import React from 'react';
import { ThumbsUp, ThumbsDown, Bookmark } from 'lucide-react';
import { Movie, TasteStatus } from '../types';
import { useTaste } from '../hooks/useTaste';

interface TasteButtonsProps {
  movie: Movie;
  /** 'compact' = icon-only row for poster tiles, 'full' = labelled buttons. */
  size?: 'compact' | 'full';
}

const OPTIONS: {
  status: TasteStatus;
  label: string;
  title: string;
  Icon: typeof ThumbsUp;
  active: string;
}[] = [
  {
    status: 'liked',
    label: 'Liked',
    title: 'Watched it, liked it',
    Icon: ThumbsUp,
    active: 'border-cyber-green bg-cyber-green/20 text-cyber-green shadow-[0_0_12px_rgba(0,255,136,0.35)]',
  },
  {
    status: 'disliked',
    label: 'Not for me',
    title: 'Watched it, did not like it',
    Icon: ThumbsDown,
    active: 'border-cyber-red bg-cyber-red/20 text-cyber-red shadow-[0_0_12px_rgba(220,20,60,0.35)]',
  },
  {
    status: 'watchlist',
    label: 'Want to watch',
    title: 'Want to watch',
    Icon: Bookmark,
    active: 'border-cyber-purple bg-cyber-purple/20 text-cyber-purple shadow-[0_0_12px_rgba(255,0,255,0.35)]',
  },
];

const TasteButtons: React.FC<TasteButtonsProps> = ({ movie, size = 'compact' }) => {
  const { statusOf, toggle } = useTaste();
  const current = statusOf(movie);
  const isFull = size === 'full';

  return (
    <div className={`flex ${isFull ? 'flex-wrap gap-2' : 'gap-1.5'}`}>
      {OPTIONS.map(({ status, label, title, Icon, active }) => {
        const isActive = current === status;
        return (
          <button
            key={status}
            type="button"
            title={title}
            aria-label={title}
            aria-pressed={isActive}
            onClick={(e) => {
              e.stopPropagation();
              toggle(movie, status);
            }}
            className={`inline-flex items-center justify-center gap-2 rounded border font-mono text-xs uppercase font-bold transition-all duration-200 min-h-[44px] ${
              isFull ? 'px-4' : 'flex-1'
            } ${
              isActive
                ? active
                : 'border-white/15 bg-black/40 text-gray-400 hover:text-white hover:border-white/40'
            }`}
          >
            <Icon size={16} className={isActive ? 'fill-current' : ''} />
            {isFull && <span>{label}</span>}
          </button>
        );
      })}
    </div>
  );
};

export default TasteButtons;
