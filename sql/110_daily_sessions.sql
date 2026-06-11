-- ─────────────────────────────────────────────────────────────
-- 110_daily_sessions.sql
--
-- The Daily session layer. One row per (user_id, session_date).
--
-- The Arrive / Embark slider values themselves continue to live in
-- horizon_state_checkins (wide schema, one row per day) so the
-- existing streak, summary, and reports pipelines keep working
-- untouched. This table carries everything the session adds on top:
--
--   • wins         — Win the Day selections, each pre-lived
--                    ("seen") in the morning and confirmed on
--                    effort ("showed_up") in the evening.
--                    [{ id, text, source, dom_id, seen, showed_up }]
--                    source: 'stretch' | 'custom'
--                    showed_up: true | false (carried) | null (unreviewed)
--   • found_wins   — wins the evening recording finds that the
--                    morning never anticipated. [{ id, text }]
--   • victory_line — the user's won-tense line written in the
--                    morning ("Tonight, what's true?"). Resurfaced
--                    above the evening journal.
--   • tools_done   — which deck tools the session contained.
--                    e.g. ["audio:baseline","practice","win-the-day","journal"]
--
-- Notes are NOT duplicated here: the arrival and embark notes live
-- on horizon_state_checkins (before_note / after_note) and already
-- surface in the Journal's unified Read stream. Deck journal
-- quick-writes go to journal_entries directly.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS daily_sessions (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_date  date        NOT NULL,

  wins          jsonb       NOT NULL DEFAULT '[]'::jsonb,
  found_wins    jsonb       NOT NULL DEFAULT '[]'::jsonb,
  victory_line  text,
  tools_done    jsonb       NOT NULL DEFAULT '[]'::jsonb,

  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT daily_sessions_unique_day UNIQUE (user_id, session_date)
);

CREATE INDEX IF NOT EXISTS daily_sessions_user_recent_idx
  ON daily_sessions (user_id, session_date DESC);

CREATE OR REPLACE FUNCTION daily_sessions_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS daily_sessions_touch_updated_at ON daily_sessions;
CREATE TRIGGER daily_sessions_touch_updated_at
  BEFORE UPDATE ON daily_sessions
  FOR EACH ROW
  EXECUTE FUNCTION daily_sessions_touch_updated_at();

ALTER TABLE daily_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own daily sessions" ON daily_sessions;
CREATE POLICY "Users see own daily sessions"
  ON daily_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own daily sessions" ON daily_sessions;
CREATE POLICY "Users insert own daily sessions"
  ON daily_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own daily sessions" ON daily_sessions;
CREATE POLICY "Users update own daily sessions"
  ON daily_sessions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE daily_sessions IS
  'Per-day Daily session layer: Win the Day wins (seen/showed_up), found wins, victory line, tools completed. Slider values live in horizon_state_checkins.';
