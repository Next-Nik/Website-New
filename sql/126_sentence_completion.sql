-- ─────────────────────────────────────────────────────────────
-- 126_sentence_completion.sql
--
-- Backs the Sentence Completion practice (/tools/sentence-completion).
-- A nine-week writing practice built on Branden's method. Each
-- "session" is one pass through a week's block of stems; every stem
-- the user actually wrote endings for is stored as its own row,
-- grouped by session_id so the Journal can show one card per session.
--
-- Two tables:
--   sentence_completion_progress  — one row per user, holds the
--       linear pointer (current_week). Advancement is by completion,
--       not calendar: current_week only moves when the user chooses.
--   sentence_completion_entries   — the written work. One row per
--       stem completed in a session, plus the weekend reflection.
--
-- Privacy: standard user-scoped RLS, matching journal_entries.
-- These are developmental-rail entries — private by default, never
-- surfaced on any public profile.
-- ─────────────────────────────────────────────────────────────

-- ── Progress pointer ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sentence_completion_progress (
  user_id       uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_week  integer     NOT NULL DEFAULT 1,
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- ── Entries ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sentence_completion_entries (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- One uuid shared across all stems written in a single sitting,
  -- so a session reads as one entry in the Journal.
  session_id    uuid        NOT NULL,

  -- Which week's block this came from (1–9). Free-mode and Map-mode
  -- sessions still record the week they drew their stems from.
  week          integer     NOT NULL,

  -- Domain tag — one of the seven personal domains, or null for the
  -- Foundation and Integration weeks. Stored as text (no enum) so
  -- renaming domains later needs no migration. Matches journal_entries.
  domain        text,

  -- How the user reached this block: 'linear' | 'free' | 'map'.
  mode          text        NOT NULL DEFAULT 'linear',

  -- The stem shown, and the user's endings (free text, newline-sep).
  stem          text        NOT NULL,
  endings       text        NOT NULL,

  -- The weekend reflection stem is stored the same way, flagged.
  is_reflection boolean     NOT NULL DEFAULT false,

  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Most common read pattern: a user's recent entries first.
CREATE INDEX IF NOT EXISTS sentence_completion_entries_user_recent_idx
  ON sentence_completion_entries (user_id, created_at DESC);

-- Grouping a session's stems together.
CREATE INDEX IF NOT EXISTS sentence_completion_entries_session_idx
  ON sentence_completion_entries (user_id, session_id);

-- Gating reflection / advancement: "did I work this week yet?"
CREATE INDEX IF NOT EXISTS sentence_completion_entries_user_week_idx
  ON sentence_completion_entries (user_id, week);

-- Keep updated_at honest on the progress row.
CREATE OR REPLACE FUNCTION sentence_completion_progress_touch()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sentence_completion_progress_touch ON sentence_completion_progress;
CREATE TRIGGER sentence_completion_progress_touch
  BEFORE UPDATE ON sentence_completion_progress
  FOR EACH ROW
  EXECUTE FUNCTION sentence_completion_progress_touch();

-- ── RLS ────────────────────────────────────────────────────────
ALTER TABLE sentence_completion_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE sentence_completion_entries  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own sc progress" ON sentence_completion_progress;
CREATE POLICY "Users see own sc progress"
  ON sentence_completion_progress FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users upsert own sc progress" ON sentence_completion_progress;
CREATE POLICY "Users upsert own sc progress"
  ON sentence_completion_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own sc progress" ON sentence_completion_progress;
CREATE POLICY "Users update own sc progress"
  ON sentence_completion_progress FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users see own sc entries" ON sentence_completion_entries;
CREATE POLICY "Users see own sc entries"
  ON sentence_completion_entries FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own sc entries" ON sentence_completion_entries;
CREATE POLICY "Users insert own sc entries"
  ON sentence_completion_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own sc entries" ON sentence_completion_entries;
CREATE POLICY "Users delete own sc entries"
  ON sentence_completion_entries FOR DELETE
  USING (auth.uid() = user_id);
