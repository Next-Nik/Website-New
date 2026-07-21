-- 137_training.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- Training — the physical (and beyond) daily instrument on the becoming rail.
--
-- "Training" is domain-agnostic by design. A session type is filed under one of
-- the seven personal life domains (body, inner_game, spark, signal, path,
-- connection, finances), so the same readiness → work → log grammar serves a
-- Body strength session and an Inner Game sit alike. On the day you switch the
-- domain you are training in; what shows is whatever your week has scheduled
-- for that domain on that weekday. Authoring (building session types, arranging
-- the week) lives off the day.
--
-- Three tables:
--   training_session_types — the user's own session types (movements + scheme),
--                            filed by domain. Standard "blocks" (3x5, circuit,
--                            sit, …) are seeded client-side as adaptable
--                            templates; forking one writes a row here, leaving
--                            the template untouched.
--   training_schedule      — per (user, domain, weekday) ordered list of session
--                            type ids. weekday is 0=Mon … 6=Sun. More than one
--                            per day is allowed; an empty/absent day is rest.
--   training_sessions      — one row per logged session. Source of truth for the
--                            readout (count, energy shift, charge trend, domain
--                            split). A concise summary line is also written into
--                            journal_entries on log so the work joins the one
--                            continuous journal.
--
-- Consistency ("days you showed up") reuses the shared daily_tool_activity
-- primitive from 136 with tool_key = 'training'; nothing new is needed here.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Session types ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS training_session_types (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domain      text NOT NULL,            -- one of the seven personal domain keys
  name        text NOT NULL,
  kind        text,                     -- free descriptor, e.g. 'Your session'
  rows        jsonb NOT NULL DEFAULT '[]'::jsonb,  -- [{ n, bw?, flow?, sets?, reps?, cue?, sec? }]
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE training_session_types IS
  'User-authored Training session types, filed by personal life domain. rows is the ordered movement list with its rep scheme. Standard blocks are client-side templates; forking one creates a row here and leaves the template intact.';
COMMENT ON COLUMN training_session_types.domain IS
  'Personal life-domain key: body, inner_game, spark, signal, path, connection, finances. Stored as text so domains can be renamed without a migration.';
COMMENT ON COLUMN training_session_types.rows IS
  'Ordered array of movement rows. Each row: { n (name), bw|flow (kind flags), sets, reps, cue, sec (section header) }.';

CREATE INDEX IF NOT EXISTS idx_training_types_user_domain
  ON training_session_types (user_id, domain);

ALTER TABLE training_session_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own training session types" ON training_session_types;
CREATE POLICY "Users manage own training session types"
  ON training_session_types FOR ALL
  USING      (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── Weekly schedule ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS training_schedule (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domain           text NOT NULL,
  weekday          smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),  -- 0=Mon … 6=Sun
  session_type_ids jsonb NOT NULL DEFAULT '[]'::jsonb,                 -- ordered array of training_session_types.id
  updated_at       timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE training_schedule IS
  'Per (user, domain, weekday) ordered list of session type ids. weekday 0=Mon … 6=Sun. More than one id per day is allowed; an absent or empty row reads as rest. Kept per domain so each domain has its own rhythm; an all-domains calendar can be derived later without schema change.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_training_schedule_slot
  ON training_schedule (user_id, domain, weekday);

ALTER TABLE training_schedule ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own training schedule" ON training_schedule;
CREATE POLICY "Users manage own training schedule"
  ON training_schedule FOR ALL
  USING      (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── Logged sessions ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS training_sessions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domain          text NOT NULL,
  session_type_id uuid REFERENCES training_session_types(id) ON DELETE SET NULL,
  name            text,                 -- snapshot of the session name at log time
  readiness       jsonb,                -- { energy, sleep, soreness, readiness } each 0–10
  effort          smallint,             -- 0–10 session effort
  energy_after    smallint,             -- 0–10
  notes           text,
  occurred_at     timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE training_sessions IS
  'One row per logged Training session. Source of truth for the readout: count, energy shift (energy_after minus readiness.energy), charge trend (readiness.readiness), and domain split. A summary line is also written to journal_entries on log.';
COMMENT ON COLUMN training_sessions.readiness IS
  'The readiness reads at the start: { energy, sleep, soreness, readiness }, each 0–10. Pure logging — no interpretation is stored.';

CREATE INDEX IF NOT EXISTS idx_training_sessions_user_time
  ON training_sessions (user_id, occurred_at DESC);

ALTER TABLE training_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own training sessions" ON training_sessions;
CREATE POLICY "Users manage own training sessions"
  ON training_sessions FOR ALL
  USING      (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
