-- ─────────────────────────────────────────────────────────────
-- 127_practice_writing.sql
--
-- One table backing two evening writing practices:
--   • I Am          (/tools/i-am)          — write a declared
--       I Am statement 3–10 times, feeling it as you go.
--   • Morning Pages  (/tools/morning-pages) — open, unstructured
--       stream-of-consciousness writing.
--
-- Rather than a table per practice, both land here, distinguished
-- by `practice`. A session is grouped by session_id so the Journal
-- shows one card per sitting. Developmental-rail work: private by
-- default, never surfaced on any public profile.
--
-- The I Am statements themselves are NOT stored here — they live in
-- horizon_profile.ia_statement (the canonical writer is the I Am
-- chapter at /nextu/i-am). This table stores only the practice of
-- writing them, plus the free morning-pages text.
--
-- Privacy: standard user-scoped RLS, matching journal_entries.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS practice_writing_entries (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- One uuid per sitting so a session reads as one Journal card.
  session_id  uuid        NOT NULL,

  -- Which practice produced the entry: 'i_am' | 'morning_pages'.
  practice    text        NOT NULL,

  -- For I Am: the domain whose statement was written (one of the
  -- seven personal domains). Null for morning pages. Stored as text
  -- (no enum) so renaming domains later needs no migration.
  domain      text,

  -- The written work. For I Am, the statement written out 3–10
  -- times. For morning pages, the free text.
  body        text        NOT NULL,

  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS practice_writing_entries_user_recent_idx
  ON practice_writing_entries (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS practice_writing_entries_session_idx
  ON practice_writing_entries (user_id, session_id);

-- ── RLS ────────────────────────────────────────────────────────
ALTER TABLE practice_writing_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own practice writing" ON practice_writing_entries;
CREATE POLICY "Users see own practice writing"
  ON practice_writing_entries FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own practice writing" ON practice_writing_entries;
CREATE POLICY "Users insert own practice writing"
  ON practice_writing_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own practice writing" ON practice_writing_entries;
CREATE POLICY "Users delete own practice writing"
  ON practice_writing_entries FOR DELETE
  USING (auth.uid() = user_id);
