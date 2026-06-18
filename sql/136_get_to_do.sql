-- 136_get_to_do.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- Get To Do — the daily instrument on the personal (becoming) rail.
--
-- One unified item table holds both kinds of to-do:
--   • 'daily'   — items the user writes straight into the day. Weekly-scoped:
--                 every item carries the Monday that begins its week, and the
--                 whole daily list clears at the Sunday-night boundary (the
--                 next Monday's anchor supersedes it). Both done and undone go.
--   • 'stretch' — items projected from the active Target Stretch session(s).
--                 Identified by a stable source_key 'sprintId:itemId'. The
--                 projection reconciles on load: new items appear, edited text
--                 updates, items removed from the stretch drop out. A stretch
--                 item stays completed for as long as it exists in the stretch
--                 — i.e. until the stretch ends and its source_key disappears.
--
-- A single global sort_order spans both kinds. Each list view (Today, Stretch,
-- Daily) is a filtered slice of the same order, which is what makes "move it on
-- one list, it moves on Today too" automatic — there is only ever one order.
--
-- Completion is real and persisted (completed_at). Checked items leave the
-- active views and gather in the Completed pile until their lifecycle clears
-- them (Sunday-night wipe for daily, stretch-end for stretch).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS get_to_do_items (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind         text NOT NULL CHECK (kind IN ('daily', 'stretch')),
  body         text NOT NULL,
  source_key   text,                       -- 'sprintId:itemId' for stretch; NULL for daily
  sort_order   double precision NOT NULL DEFAULT 0,
  completed_at timestamptz,
  week_anchor  date,                        -- Monday that begins the daily item's week; NULL for stretch
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE get_to_do_items IS
  'Unified to-do rows for the Get To Do tool. kind=daily are user-written and weekly-scoped; kind=stretch are projected from the active Target Stretch by stable source_key. One global sort_order across both.';
COMMENT ON COLUMN get_to_do_items.source_key IS
  'For stretch items: stable identity "sprintId:itemId" so completion and order survive Target Stretch edits. NULL for daily items.';
COMMENT ON COLUMN get_to_do_items.week_anchor IS
  'For daily items: the Monday (date) beginning the item''s week. The daily list clears when this falls before the current week''s Monday. NULL for stretch.';

-- One projected row per stretch source item per user.
CREATE UNIQUE INDEX IF NOT EXISTS uq_gtd_source
  ON get_to_do_items (user_id, source_key)
  WHERE source_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_gtd_user_order
  ON get_to_do_items (user_id, sort_order);

ALTER TABLE get_to_do_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own get_to_do items" ON get_to_do_items;
CREATE POLICY "Users manage own get_to_do items"
  ON get_to_do_items FOR ALL
  USING      (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── Shared consistency log ────────────────────────────────────────────────────
-- "Days you showed up", logged per tool so the signal survives the weekly wipe
-- and any daily tool can reuse the same primitive. A row is written the first
-- time a user completes an item in a tool on a given day. Streaks are derived
-- (consecutive active_dates up to today); nothing is stored as a score.

CREATE TABLE IF NOT EXISTS daily_tool_activity (
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tool_key    text NOT NULL,          -- e.g. 'get_to_do'
  active_date date NOT NULL,
  PRIMARY KEY (user_id, tool_key, active_date)
);

COMMENT ON TABLE daily_tool_activity IS
  'One row per (user, tool, day) the user showed up — i.e. completed at least one item. Shared by all daily tools. Streaks are derived from consecutive active_dates; no score is persisted.';

ALTER TABLE daily_tool_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own daily activity" ON daily_tool_activity;
CREATE POLICY "Users manage own daily activity"
  ON daily_tool_activity FOR ALL
  USING      (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── Per-tool consistency toggle ───────────────────────────────────────────────
-- Opt-in, per user, per tool. A jsonb map { toolKey: bool } so one column serves
-- every daily tool. Absent / false means the consistency display stays hidden.

ALTER TABLE contributor_profiles_beta
  ADD COLUMN IF NOT EXISTS daily_consistency jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN contributor_profiles_beta.daily_consistency IS
  'Per-tool opt-in for the consistency display: { "get_to_do": true, ... }. Default off (absent/false). Read by the shared consistency module.';
