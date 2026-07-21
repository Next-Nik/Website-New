-- ─────────────────────────────────────────────────────────────────────────────
-- 063 — Horizon State phase tracking
-- ─────────────────────────────────────────────────────────────────────────────
-- Adds horizon_state_phase to the users table so the platform knows which
-- phase audio to serve and which phase tab to surface as current.
--
-- Values: 'baseline' | 'calibration' | 'embodiment'
-- Default: 'baseline' — all existing users stay on Phase 1 until they
-- explicitly advance.
--
-- Phase advancement is user-initiated. The platform offers the option once
-- the session threshold is met (40 sessions ≈ 8 weeks × 5 days); the user
-- taps "Begin Phase N" to write this column. The platform never auto-advances.
--
-- The horizon_state_checkins.audio_phase column already exists (from the
-- horizon_state_checkins.sql migration) and records which phase was active
-- at the time of each check-in. This column is the source of truth for
-- historical session scoping; users.horizon_state_phase is the source of
-- truth for the current active phase.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS horizon_state_phase TEXT NOT NULL DEFAULT 'baseline'
  CHECK (horizon_state_phase IN ('baseline', 'calibration', 'embodiment'));

-- Index for the audio-load query (hook reads this on every page mount)
CREATE INDEX IF NOT EXISTS users_horizon_state_phase_idx
  ON users (id, horizon_state_phase);

-- ─── Verify ──────────────────────────────────────────────────────────────────
-- Run after migration to confirm:
--
--   SELECT column_name, data_type, column_default
--   FROM information_schema.columns
--   WHERE table_name = 'users' AND column_name = 'horizon_state_phase';
--   -- expected: text, 'baseline'
--
--   SELECT COUNT(*) FROM users WHERE horizon_state_phase NOT IN ('baseline','calibration','embodiment');
--   -- expected: 0
