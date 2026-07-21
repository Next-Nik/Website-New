-- 111_stretch_scale_siblings.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- Target Stretch sibling sessions (June 2026, Phase B1).
--
-- A person can run TWO stretches with independent clocks:
--   scale 'self' — the personal arena (one domain, Horizon Self framing)
--   scale 'civ'  — the Planet Sprint (the outer arc, own timeline)
--
-- The Planet Sprint graduates from an embedded blob inside the personal
-- session's domain_data to a sibling row. Civ rows carry domains = '{}' so
-- any consumer that maps over domains renders nothing rather than garbage.
--
-- Forward slots for Phase B2 (Actor Calls):
--   challenge_id — the designed stretch this session was created from
--   designed_by  — the Atlas actor that authored that challenge
-- challenge_id gets its FK in B2 when actor_calls exists.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE target_sprint_sessions
  ADD COLUMN IF NOT EXISTS scale text NOT NULL DEFAULT 'self';

ALTER TABLE target_sprint_sessions
  DROP CONSTRAINT IF EXISTS target_sprint_sessions_scale_check;

ALTER TABLE target_sprint_sessions
  ADD CONSTRAINT target_sprint_sessions_scale_check
  CHECK (scale IN ('self', 'civ'));

ALTER TABLE target_sprint_sessions
  ADD COLUMN IF NOT EXISTS challenge_id uuid NULL;

ALTER TABLE target_sprint_sessions
  ADD COLUMN IF NOT EXISTS designed_by uuid NULL REFERENCES nextus_actors(id) ON DELETE SET NULL;

COMMENT ON COLUMN target_sprint_sessions.scale IS
  'self = personal stretch (one domain, Horizon Self framing). civ = Planet Sprint sibling session with its own clock.';
COMMENT ON COLUMN target_sprint_sessions.challenge_id IS
  'Designed stretch (actor_calls.id) this session was created from. FK added in migration that creates actor_calls (Phase B2).';
COMMENT ON COLUMN target_sprint_sessions.designed_by IS
  'Atlas actor that authored the challenge this session was created from.';

-- All existing rows are personal stretches.
UPDATE target_sprint_sessions SET scale = 'self' WHERE scale IS NULL;

-- One active/draft session per user per scale is the working assumption;
-- index supports the split loads.
CREATE INDEX IF NOT EXISTS idx_tss_user_scale_status
  ON target_sprint_sessions (user_id, scale, status);
