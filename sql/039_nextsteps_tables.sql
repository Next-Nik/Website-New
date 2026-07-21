-- 039_nextsteps_tables.sql
--
-- NextSteps — the navigation tool that turns caring into a step.
-- See: docs/NextSteps_Conceptual_Foundation_v1_1.md
--
-- Two tables, parent-with-ordered-children pattern (same shape as
-- target_sprint_sessions). A Track is the standing record of one project
-- or issue a person is walking; Steps are the ordered nodes inside it.
--
-- Lifecycle:
--   Track:   planning -> active <-> dormant -> complete
--   Step:    suggested -> active -> done
--
-- The loop, in data terms, is exactly:
--   Step.state = 'done'  ->  Track re-read  ->  new Step appended
--
-- Safe to re-run. All operations are idempotent.

-- ── 1. nextsteps_tracks ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.nextsteps_tracks (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- The away-from words in the person's own voice. Kept verbatim, never
  -- overwritten. This is part of the record. (Foundation 2.7)
  original_concern text NOT NULL,

  -- What the reframe produced. Nullable while a Track is mid-Reflection
  -- (Phase 2 not yet complete). Set by the time the Track flips out of
  -- 'planning'.
  toward_sentence  text,

  -- Landed domain(s). Array — dual residency is canon. Civilisational
  -- domain keys: 'human', 'society', 'nature', 'tech', 'finance',
  -- 'legacy', 'vision'. Personal-side keys when scale = 'self'.
  domains          text[] NOT NULL DEFAULT '{}',

  -- Which track the Reflection read into.
  scale            text NOT NULL DEFAULT 'civ'
                     CHECK (scale IN ('civ', 'self')),

  -- The domain's Horizon Goal, snapshotted at Track creation so the
  -- record is stable even if the goal text is later edited.
  horizon_goal     text,

  -- Lifecycle status.
  --   planning  - Track exists, reframe complete, no Steps yet (Phase 3 done, Phase 4 pending)
  --   active    - Steps exist, person is walking it
  --   dormant   - parked; person holding multiple Tracks is not on this one
  --   complete  - closed out
  status           text NOT NULL DEFAULT 'planning'
                     CHECK (status IN ('planning', 'active', 'dormant', 'complete')),

  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nextsteps_tracks_user_id
  ON public.nextsteps_tracks (user_id);

CREATE INDEX IF NOT EXISTS idx_nextsteps_tracks_status
  ON public.nextsteps_tracks (user_id, status);

-- ── 2. nextsteps_steps ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.nextsteps_steps (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id          uuid NOT NULL REFERENCES public.nextsteps_tracks(id) ON DELETE CASCADE,

  -- Order in the path. Unique within a track (see constraint below).
  position          int NOT NULL,

  -- What the step is. Plain prose in the person's idiom — written by
  -- NextSteps in Phase 4 against the toward-sentence and domain.
  description       text NOT NULL,

  -- Where the step routes to.
  --   atlas        - to a nextus_actor (Atlas listing)
  --   nextmarket   - to a NextMarket product/offering
  --   tool         - to another platform tool (e.g. Purpose Piece)
  --   facilitated  - to facilitated work (Work with Nik, Horizon Leap)
  route_type        text NOT NULL
                      CHECK (route_type IN ('atlas', 'nextmarket', 'tool', 'facilitated')),

  -- The actual destination. Nullable for 'facilitated' (no internal target).
  --   atlas        - nextus_actors.id (or slug) as text
  --   nextmarket   - product slug or id as text
  --   tool         - tool key from src/constants/tools.js
  --   facilitated  - null
  route_target      text,

  -- Step state. The loop:
  --   suggested -> NextSteps wrote it, person hasn't acted
  --   active    -> person has opened/started it (linked Target Stretch in flight)
  --   done      -> completed; triggers Track re-read
  state             text NOT NULL DEFAULT 'suggested'
                      CHECK (state IN ('suggested', 'active', 'done')),

  -- The Target Stretch session, set when the step is taken.
  -- INTERIM: the execution tool's table is still named target_sprint_sessions
  -- because the rename is its own scoped job. FK points at the existing table.
  -- When the rename happens, this column's referenced table name will change
  -- but the column name (target_stretch_id) is already aligned with v1.1.
  target_stretch_id uuid REFERENCES public.target_sprint_sessions(id) ON DELETE SET NULL,

  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nextsteps_steps_track_id
  ON public.nextsteps_steps (track_id);

CREATE INDEX IF NOT EXISTS idx_nextsteps_steps_state
  ON public.nextsteps_steps (track_id, state);

-- Unique ordering within a track.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'nextsteps_steps_track_position_unique'
  ) THEN
    ALTER TABLE public.nextsteps_steps
      ADD CONSTRAINT nextsteps_steps_track_position_unique
      UNIQUE (track_id, position);
  END IF;
END $$;

-- ── 3. Auto-update updated_at on row change ──────────────────────────────────

CREATE OR REPLACE FUNCTION public.nextsteps_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS nextsteps_tracks_updated_at ON public.nextsteps_tracks;
CREATE TRIGGER nextsteps_tracks_updated_at
  BEFORE UPDATE ON public.nextsteps_tracks
  FOR EACH ROW EXECUTE FUNCTION public.nextsteps_set_updated_at();

DROP TRIGGER IF EXISTS nextsteps_steps_updated_at ON public.nextsteps_steps;
CREATE TRIGGER nextsteps_steps_updated_at
  BEFORE UPDATE ON public.nextsteps_steps
  FOR EACH ROW EXECUTE FUNCTION public.nextsteps_set_updated_at();

-- ── 4. Bump parent Track updated_at when a Step changes ──────────────────────
-- So Mission Control's "most recent track" ordering reflects Step movement,
-- not just Track-level edits.

CREATE OR REPLACE FUNCTION public.nextsteps_bump_track_on_step()
RETURNS trigger AS $$
BEGIN
  UPDATE public.nextsteps_tracks
     SET updated_at = now()
   WHERE id = COALESCE(NEW.track_id, OLD.track_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS nextsteps_steps_bump_track ON public.nextsteps_steps;
CREATE TRIGGER nextsteps_steps_bump_track
  AFTER INSERT OR UPDATE OR DELETE ON public.nextsteps_steps
  FOR EACH ROW EXECUTE FUNCTION public.nextsteps_bump_track_on_step();

-- ── 5. RLS — owner-scoped on Tracks; inherited via parent for Steps ──────────

ALTER TABLE public.nextsteps_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nextsteps_steps  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS nextsteps_tracks_owner_all ON public.nextsteps_tracks;
CREATE POLICY nextsteps_tracks_owner_all
  ON public.nextsteps_tracks
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS nextsteps_steps_owner_all ON public.nextsteps_steps;
CREATE POLICY nextsteps_steps_owner_all
  ON public.nextsteps_steps
  FOR ALL
  USING  (
    EXISTS (
      SELECT 1 FROM public.nextsteps_tracks t
       WHERE t.id = nextsteps_steps.track_id
         AND t.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.nextsteps_tracks t
       WHERE t.id = nextsteps_steps.track_id
         AND t.user_id = auth.uid()
    )
  );

-- ── 6. Convenience view for Mission Control ──────────────────────────────────
-- Tracks with their step counts, so the card list doesn't N+1.

CREATE OR REPLACE VIEW public.nextsteps_tracks_with_counts AS
SELECT
  t.*,
  COALESCE(s.total_steps,    0)::int AS total_steps,
  COALESCE(s.active_steps,   0)::int AS active_steps,
  COALESCE(s.done_steps,     0)::int AS done_steps,
  COALESCE(s.suggested_steps,0)::int AS suggested_steps
FROM public.nextsteps_tracks t
LEFT JOIN (
  SELECT
    track_id,
    COUNT(*)                                              AS total_steps,
    COUNT(*) FILTER (WHERE state = 'active')              AS active_steps,
    COUNT(*) FILTER (WHERE state = 'done')                AS done_steps,
    COUNT(*) FILTER (WHERE state = 'suggested')           AS suggested_steps
  FROM public.nextsteps_steps
  GROUP BY track_id
) s ON s.track_id = t.id;

-- View inherits RLS from underlying tables.

-- ── Done ─────────────────────────────────────────────────────────────────────
-- Verify with:
--   SELECT table_name FROM information_schema.tables
--    WHERE table_schema='public' AND table_name LIKE 'nextsteps_%';
--   SELECT * FROM nextsteps_tracks_with_counts LIMIT 1;
