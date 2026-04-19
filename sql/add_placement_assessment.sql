-- ============================================================
-- NextUs Placement Assessment Fields
-- Migration: add_placement_assessment.sql
--
-- Adds three new columns to nextus_actors:
--   alignment_reasoning  JSONB  — stores HAL signals, SFP patterns,
--                                  score reasoning from org-extract
--   placement_tier       text   — pattern_instance | contested |
--                                  qualified | exemplar
--   scale_notes          text   — reach/delivery scale distinctions
--
-- All columns are nullable. No breaking changes.
-- Safe to run on existing data.
-- ============================================================

-- ── alignment_reasoning ──────────────────────────────────────
-- Stores the full structured output from org-extract:
-- {
--   hal_signals:     ["Mission Coherence", "Structural Honesty", ...],
--   sfp_patterns:    ["Metric Substitution", ...],
--   score_reasoning: "plain language explanation",
--   confidence:      85,
--   confidence_note: "what was clear vs inferred",
--   extracted_at:    "2026-04-18T...",
--   reviewed_by:     "uuid of reviewer",
--   reviewed_at:     "2026-04-18T..."
-- }

ALTER TABLE nextus_actors
  ADD COLUMN IF NOT EXISTS alignment_reasoning jsonb;

-- ── placement_tier ────────────────────────────────────────────
-- Mirrors the alignment score thresholds:
--   pattern_instance  score 0–4  named SFP example, not actor entry
--   contested         score 5–6  visible if filtered, not default map
--   qualified         score 7–8  full placement, default map
--   exemplar          score 9    elevated placement, Seal candidacy

ALTER TABLE nextus_actors
  ADD COLUMN IF NOT EXISTS placement_tier text
  CHECK (placement_tier IN (
    'pattern_instance',
    'contested',
    'qualified',
    'exemplar'
  ));

-- ── scale_notes ───────────────────────────────────────────────
-- Free text field for reach/delivery distinctions.
-- Primary scale = coherence bandwidth of the work.
-- scale_notes holds the honest complexity:
-- e.g. "Podcast reaches global audience. Core work is local 1:1."

ALTER TABLE nextus_actors
  ADD COLUMN IF NOT EXISTS scale_notes text;

-- ── Backfill placement_tier from existing alignment_score ─────
-- Any actor with alignment_score already set gets a tier assigned.
-- This keeps existing data coherent with the new column.

UPDATE nextus_actors
SET placement_tier = CASE
  WHEN alignment_score IS NULL        THEN NULL
  WHEN alignment_score <= 4           THEN 'pattern_instance'
  WHEN alignment_score <= 6           THEN 'contested'
  WHEN alignment_score <= 8           THEN 'qualified'
  ELSE                                     'exemplar'
END
WHERE placement_tier IS NULL
  AND alignment_score IS NOT NULL;

-- ── Index on placement_tier ───────────────────────────────────
-- The actor directory filters by placement_tier frequently.

CREATE INDEX IF NOT EXISTS idx_actors_placement_tier
  ON nextus_actors(placement_tier);

-- ── Verify ────────────────────────────────────────────────────
-- Uncomment to check after running:
--
-- SELECT
--   column_name,
--   data_type,
--   is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'nextus_actors'
--   AND column_name IN (
--     'alignment_reasoning',
--     'placement_tier',
--     'scale_notes'
--   )
-- ORDER BY column_name;
