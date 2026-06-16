-- 133_challenge_participation_tracking.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- Challenge participation tracking — Phase 3 (June 2026).
--
-- When someone takes on a challenge, the participation row becomes the source
-- of truth for their run of it, independent of the two Target Stretch slots
-- (a person's own personal stretch and their own Planet Sprint). A taken-on
-- challenge is its own tracked thing:
--   • a clock (started_on / ends_on), starting the day they joined
--   • the scale it counts toward (internal; never shown)
--   • a frozen snapshot of the protocol, so an author can't change the rules
--     out from under someone mid-run
--
-- Beneath that, a daily strand log records the actual doing. A packaged
-- challenge like 75 Hard means checking each strand every day for the window;
-- one row per (participant, strand, day) is what makes streaks and daily
-- completion real. Rows are created lazily on first check — joining a 90-day,
-- five-strand challenge does NOT pre-seed 450 rows.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Participant clock / scale / snapshot ──────────────────────────────────────

ALTER TABLE actor_call_participants
  ADD COLUMN IF NOT EXISTS scale text NOT NULL DEFAULT 'civ'
    CHECK (scale IN ('self', 'civ'));

ALTER TABLE actor_call_participants
  ADD COLUMN IF NOT EXISTS started_on date;

ALTER TABLE actor_call_participants
  ADD COLUMN IF NOT EXISTS ends_on date;

ALTER TABLE actor_call_participants
  ADD COLUMN IF NOT EXISTS protocol_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN actor_call_participants.protocol_snapshot IS
  'Frozen copy of actor_calls.protocol at the moment of taking on. The participant runs this, not the live challenge, so edits never change a run in flight.';
COMMENT ON COLUMN actor_call_participants.scale IS
  'Which scale this run counts toward (self|civ). Internal plumbing; never shown to anyone.';

-- ── Daily strand log ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS actor_call_strand_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  participant_id  uuid NOT NULL REFERENCES actor_call_participants(id) ON DELETE CASCADE,
  strand_id       text NOT NULL,          -- matches a strand id in the snapshot
  log_date        date NOT NULL,
  done            boolean NOT NULL DEFAULT true,
  UNIQUE (participant_id, strand_id, log_date)
);

COMMENT ON TABLE actor_call_strand_log IS
  'One row per strand per day a participant marks it done. Powers streaks and daily completion. Created lazily on check.';

CREATE INDEX IF NOT EXISTS idx_strand_log_participant_date
  ON actor_call_strand_log (participant_id, log_date);

-- ── RLS ─────────────────────────────────────────────────────────────────────
-- A participant's log is private to them. The API runs as service role and
-- does its own ownership checks; this policy covers direct client reads.

ALTER TABLE actor_call_strand_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own strand log" ON actor_call_strand_log;
CREATE POLICY "Users manage own strand log"
  ON actor_call_strand_log FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM actor_call_participants p
      WHERE p.id = actor_call_strand_log.participant_id
        AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM actor_call_participants p
      WHERE p.id = actor_call_strand_log.participant_id
        AND p.user_id = auth.uid()
    )
  );
