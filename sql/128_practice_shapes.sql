-- ─────────────────────────────────────────────────────────────
-- 128_practice_shapes.sql
--
-- The standing shape of each daily entrance, per user. One row per
-- user per entrance ('morning' | 'midday' | 'evening'), holding the
-- ordered list of block ids the user keeps in. Reshaped once via the
-- composer (plus/minus); it sticks until changed — no re-composing
-- each day. When no row exists, the app falls back to the house
-- default for that entrance.
--
-- block_ids is the source of truth for *which* blocks are in; the
-- registry (practiceBlocks.js) owns the order, so the list is always
-- re-sorted into canonical order on read. Storing ids (not full
-- blocks) means renaming or reordering blocks later needs no data
-- migration.
--
-- Privacy: standard user-scoped RLS. A composition is the user's own
-- arrangement; never surfaced anywhere public.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS practice_shapes (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Which entrance this shape is for: 'morning' | 'midday' | 'evening'.
  -- Stored as text (no enum) so adding an entrance later needs no migration.
  entrance    text        NOT NULL,

  -- Ordered list of block ids kept in. Order is advisory; the registry
  -- re-sorts into canonical order on read.
  block_ids   jsonb       NOT NULL DEFAULT '[]'::jsonb,

  updated_at  timestamptz NOT NULL DEFAULT now(),

  UNIQUE (user_id, entrance)
);

CREATE INDEX IF NOT EXISTS practice_shapes_user_idx ON practice_shapes (user_id);

-- ── RLS ────────────────────────────────────────────────────────
ALTER TABLE practice_shapes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own practice shapes" ON practice_shapes;
CREATE POLICY "Users see own practice shapes"
  ON practice_shapes FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own practice shapes" ON practice_shapes;
CREATE POLICY "Users insert own practice shapes"
  ON practice_shapes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own practice shapes" ON practice_shapes;
CREATE POLICY "Users update own practice shapes"
  ON practice_shapes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own practice shapes" ON practice_shapes;
CREATE POLICY "Users delete own practice shapes"
  ON practice_shapes FOR DELETE
  USING (auth.uid() = user_id);
