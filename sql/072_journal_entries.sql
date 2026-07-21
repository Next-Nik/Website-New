-- ─────────────────────────────────────────────────────────────
-- 072_journal_entries.sql
--
-- Adds journal_entries — the table behind the Journal's
-- "Write" tab. Free-text entries the user composes directly
-- inside the Journal, not tied to any tool.
--
-- These entries appear in the unified "Read" stream alongside
-- horizon_state_checkins and horizon_practice_entries — but
-- they are first-class: the user writes them, they live here,
-- and they belong to the Journal itself.
--
-- Privacy: standard "user can only see their own rows" RLS,
-- matching the pattern used by other user-scoped tables.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS journal_entries (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  body            text        NOT NULL,

  -- Optional domain tag — one of the seven personal domains, or null.
  -- Stored as text rather than an enum so adding/renaming domains
  -- later doesn't require a migration.
  domain          text,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Most common read pattern: the user's recent entries first.
CREATE INDEX IF NOT EXISTS journal_entries_user_recent_idx
  ON journal_entries (user_id, created_at DESC);

-- Keep updated_at honest on every write.
CREATE OR REPLACE FUNCTION journal_entries_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS journal_entries_touch_updated_at ON journal_entries;
CREATE TRIGGER journal_entries_touch_updated_at
  BEFORE UPDATE ON journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION journal_entries_touch_updated_at();

-- ── RLS ────────────────────────────────────────────────────────
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own journal entries" ON journal_entries;
CREATE POLICY "Users see own journal entries"
  ON journal_entries
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own journal entries" ON journal_entries;
CREATE POLICY "Users insert own journal entries"
  ON journal_entries
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own journal entries" ON journal_entries;
CREATE POLICY "Users update own journal entries"
  ON journal_entries
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own journal entries" ON journal_entries;
CREATE POLICY "Users delete own journal entries"
  ON journal_entries
  FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON TABLE journal_entries IS
  'Free-text journal entries composed by the user in the Journal page Write tab. Private to the user (RLS).';
