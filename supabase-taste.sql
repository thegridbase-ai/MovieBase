-- ============================================
-- TASTE PROFILE (liked / disliked / want to watch)
-- ============================================
-- Run this SQL in Supabase SQL Editor.
-- Until it exists the app keeps the profile in localStorage only.
-- ============================================

CREATE TABLE IF NOT EXISTS public.title_feedback (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tmdb_id INTEGER NOT NULL,
    media_type TEXT NOT NULL DEFAULT 'movie' CHECK (media_type IN ('movie', 'tv')),
    status TEXT NOT NULL CHECK (status IN ('liked', 'disliked', 'watchlist')),
    movie_data JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    PRIMARY KEY (user_id, tmdb_id, media_type)
);

ALTER TABLE public.title_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own feedback"
    ON public.title_feedback FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own feedback"
    ON public.title_feedback FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own feedback"
    ON public.title_feedback FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own feedback"
    ON public.title_feedback FOR DELETE
    USING (auth.uid() = user_id);
