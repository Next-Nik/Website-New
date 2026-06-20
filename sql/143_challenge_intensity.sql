-- 143_challenge_intensity.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- Challenge intensity (June 2026).
--
-- The menu's spiciness scale. Optional, set by whoever authors the challenge,
-- so people can scan for what they can take on. Five rungs (see
-- src/constants/challengeIntensity.js). Searchable.
--
-- Inside voice: a level orients, it never ranks. Nothing here weights the
-- participation count by level — that stays one person, one tick.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE actor_calls
  ADD COLUMN IF NOT EXISTS intensity_level smallint
    CHECK (intensity_level IS NULL OR intensity_level BETWEEN 1 AND 5);

COMMENT ON COLUMN actor_calls.intensity_level IS
  'Optional 1–5 intensity, set by the author. Orientation for self-selection, never a ranking; never weights participation counts.';

CREATE INDEX IF NOT EXISTS idx_actor_calls_intensity
  ON actor_calls (intensity_level)
  WHERE intensity_level IS NOT NULL;
