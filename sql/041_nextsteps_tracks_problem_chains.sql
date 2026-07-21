-- 041_nextsteps_tracks_problem_chains.sql
--
-- Add problem_chains to nextsteps_tracks so a Track stores not only the
-- toward-sentence and domain, but also the away-from chains the
-- person's concern resonated with. This is the inbound bridge — when
-- the path engine surfaces actors, it can now match on both the toward
-- (domain alignment) AND the away-from (chain overlap).
--
-- The chat endpoint's Reflection output is extended to include the
-- chains it detected; the Track stores them at creation time.
--
-- Idempotent.

ALTER TABLE public.nextsteps_tracks
  ADD COLUMN IF NOT EXISTS problem_chains text[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_nextsteps_tracks_problem_chains
  ON public.nextsteps_tracks USING gin (problem_chains);

-- Note: no FK constraint to nextus_problem_chains.slug — that's deliberate.
-- A Track may reference a chain that gets retired later, and that's a soft
-- relationship, not a hard one. We accept that gracefully.
