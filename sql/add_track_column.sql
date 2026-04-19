-- ============================================================
-- add_track_column.sql
-- Adds the track column to nextus_actors.
-- Run this in Supabase SQL Editor.
-- Safe — additive only.
-- ============================================================

ALTER TABLE nextus_actors
  ADD COLUMN IF NOT EXISTS track text
  CHECK (track IN ('planet', 'self', 'both'));

-- Verify all four new columns exist:
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'nextus_actors'
  AND column_name IN (
    'alignment_reasoning',
    'placement_tier',
    'scale_notes',
    'track'
  )
ORDER BY column_name;
