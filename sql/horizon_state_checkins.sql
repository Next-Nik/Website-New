-- ─────────────────────────────────────────────────────────────────────────────
-- Horizon State: dedicated check-in table
-- ─────────────────────────────────────────────────────────────────────────────
-- The application has been writing to `pulse_entries` (a leftover from the
-- Pulse tool). The schema there does not match what HorizonState.jsx sends,
-- so every write has been failing silently inside try/catch blocks. This
-- creates a proper home for Horizon State data that matches the shape the
-- application is actually trying to write.
--
-- Design choices:
--   • Wide schema. One row per (user_id, period_id). Before and after live
--     on the same row. Simpler to read, no pairing logic needed downstream.
--   • period_id is the canonical day key (YYYY-MM-DD-foundation-baseline).
--     UNIQUE on (user_id, period_id) prevents duplicates and supports
--     ON CONFLICT upserts cleanly.
--   • Both value columns are numeric (no precision/scale) so 0.5 increments
--     from the slider are preserved exactly.
--   • RLS is enabled with the standard "users can only see their own rows"
--     policy. Matches the pattern used by other user-scoped tables in this
--     project.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS horizon_state_checkins (
  id              uuid                     PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid                     NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_id       text                     NOT NULL,
  audio_phase     text                     NOT NULL DEFAULT 'baseline',

  -- Before check-in (start of session)
  before_value    numeric,
  before_note     text,
  before_at       timestamptz,

  -- After check-in (end of session)
  after_value     numeric,
  after_note      text,
  after_at        timestamptz,

  -- Period bucket helpers (kept for analytics queries)
  week_id         text,
  month_id        text,
  quarter_id      text,
  year_id         text,

  created_at      timestamptz              NOT NULL DEFAULT now(),
  updated_at      timestamptz              NOT NULL DEFAULT now(),

  CONSTRAINT horizon_state_checkins_unique_period UNIQUE (user_id, period_id)
);

-- Index for the most common read pattern: a user's recent check-ins.
CREATE INDEX IF NOT EXISTS horizon_state_checkins_user_recent_idx
  ON horizon_state_checkins (user_id, created_at DESC);

-- Keep updated_at honest on every write.
CREATE OR REPLACE FUNCTION horizon_state_checkins_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS horizon_state_checkins_updated_at ON horizon_state_checkins;
CREATE TRIGGER horizon_state_checkins_updated_at
  BEFORE UPDATE ON horizon_state_checkins
  FOR EACH ROW
  EXECUTE FUNCTION horizon_state_checkins_touch_updated_at();

-- ─── Row Level Security ──────────────────────────────────────────────────────
ALTER TABLE horizon_state_checkins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own horizon_state_checkins"
  ON horizon_state_checkins;
CREATE POLICY "Users can read own horizon_state_checkins"
  ON horizon_state_checkins
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own horizon_state_checkins"
  ON horizon_state_checkins;
CREATE POLICY "Users can insert own horizon_state_checkins"
  ON horizon_state_checkins
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own horizon_state_checkins"
  ON horizon_state_checkins;
CREATE POLICY "Users can update own horizon_state_checkins"
  ON horizon_state_checkins
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own horizon_state_checkins"
  ON horizon_state_checkins;
CREATE POLICY "Users can delete own horizon_state_checkins"
  ON horizon_state_checkins
  FOR DELETE
  USING (auth.uid() = user_id);

-- ─── Cleanup: remove the Apr 4 debris row from pulse_entries ─────────────────
-- This row is the only foundation-source row in pulse_entries. It was written
-- partially during a schema mismatch and has 10.0/10.0 with null notes. It
-- doesn't represent real data and should not pollute the Pulse tool's table.
DELETE FROM pulse_entries
WHERE id = 'fdf7ef19-d761-4a90-bc24-e55cba0f5570'
  AND user_id = '304f778f-f859-4c06-972c-f37ae8042457'
  AND source = 'foundation';

-- ─── Verify ─────────────────────────────────────────────────────────────────
-- Run these after the above to confirm the new table exists and the debris
-- row is gone:
--
--   SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_name = 'horizon_state_checkins' ORDER BY ordinal_position;
--
--   SELECT COUNT(*) FROM pulse_entries
--   WHERE user_id = '304f778f-f859-4c06-972c-f37ae8042457' AND source = 'foundation';
--   -- expected: 0
