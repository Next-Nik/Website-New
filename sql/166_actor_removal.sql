-- ─────────────────────────────────────────────────────────────────────────────
-- 166_actor_removal.sql
--
-- Actor removal follows the platform's own challenge-delete semantics:
-- a tombstone, not a row deletion. status='suspended' already hides an actor
-- from every public surface (search, browse, compose, profiles); deleted_at
-- marks the tombstone as permanent-by-intent, distinguishing an owner or
-- admin DELETE from a reversible admin SUSPEND. Row deletion is deliberately
-- not offered: actor rows anchor message threads, challenge authorship,
-- offerings, and credential records across the schema.
--
-- Run manually in the Supabase SQL editor.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.nextus_actors
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;

COMMENT ON COLUMN public.nextus_actors.deleted_at IS
  'Tombstone timestamp. Set by owner self-removal or admin delete via api/actor-remove.js. status=suspended + deleted_at = deleted (permanent by intent); status=suspended alone = admin suspension (reversible).';
