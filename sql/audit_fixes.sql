-- ============================================================
-- NextUs — Audit Fixes Migration
-- April 2026
--
-- What this does:
--   1. Adds 'creative' to the need_type check constraint
--   2. Adds contribution_mode column to nextus_needs
--   3. Adds alignment_score_computed column to nextus_actors
--      (cron already writes this field — column may already exist)
--
-- Safe to run on existing data.
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 1. Add 'creative' to need_type
-- ────────────────────────────────────────────────────────────

-- Drop existing check constraint and replace with updated version
-- (constraint name may vary — use DO block to handle gracefully)

DO $$
BEGIN
  -- Try to drop the existing check constraint
  ALTER TABLE nextus_needs DROP CONSTRAINT IF EXISTS nextus_needs_need_type_check;
EXCEPTION WHEN OTHERS THEN
  NULL; -- constraint didn't exist or had a different name, continue
END $$;

ALTER TABLE nextus_needs
  ADD CONSTRAINT nextus_needs_need_type_check
  CHECK (need_type IN (
    'skills',
    'creative',
    'capital',
    'time',
    'resources',
    'partnerships',
    'data',
    'other'
  ));


-- ────────────────────────────────────────────────────────────
-- 2. Add contribution_mode to nextus_needs
-- ────────────────────────────────────────────────────────────
-- Allows orgs to tag what kind of contributor they need.
-- The matching engine reads this field to score mode alignment.
-- Nullable — existing needs unaffected.

ALTER TABLE nextus_needs
  ADD COLUMN IF NOT EXISTS contribution_mode text
  CHECK (contribution_mode IN (
    'functional',
    'expressive',
    'relational',
    'intellectual',
    'mixed'
  ));


-- ────────────────────────────────────────────────────────────
-- 3. Add alignment_score_computed to nextus_actors
-- ────────────────────────────────────────────────────────────
-- The integrity cron already writes this field when it computes
-- an evidence-based score. Adding the column here in case it
-- doesn't already exist.

ALTER TABLE nextus_actors
  ADD COLUMN IF NOT EXISTS alignment_score_computed boolean DEFAULT false;

ALTER TABLE nextus_actors
  ADD COLUMN IF NOT EXISTS alignment_score_updated_at timestamptz;

-- Backfill: any existing actors with non-null alignment scores
-- are assumed to be self-declared until the cron runs.
-- Set computed = false so they show "Not yet established" on the
-- public profile until 3 loops are closed.
UPDATE nextus_actors
  SET alignment_score_computed = false
  WHERE alignment_score IS NOT NULL
    AND alignment_score_computed IS NULL;


-- ────────────────────────────────────────────────────────────
-- Verify
-- ────────────────────────────────────────────────────────────

-- Run after migration to confirm:
--
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'nextus_needs'
--   AND column_name IN ('need_type', 'contribution_mode')
-- ORDER BY column_name;
--
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'nextus_actors'
--   AND column_name IN ('alignment_score', 'alignment_score_computed', 'alignment_score_updated_at')
-- ORDER BY column_name;
