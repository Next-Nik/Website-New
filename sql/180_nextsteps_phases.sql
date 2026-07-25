-- 180_nextsteps_phases.sql
--
-- NextSteps v2.0.1 — the Phase layer.
-- See: docs/NextSteps_Conceptual_Foundation_v2_0_1.md §2.4, §2.5, §2.9
--
-- The v1.1 two-table shape (Track + Step) gains one layer in the middle:
--
--   Track  — the standing record of one concern being walked
--     └─ Phase — one node in the ordered ROUTE (3–6 of them)
--          └─ Step — one node in the ordered PATH inside the current Phase
--
-- The load-bearing rule of this whole migration, in one line:
--
--   A PHASE IS DEFINED BY ITS EXIT CONDITION, NOT BY TIME.
--
-- There is deliberately no due_date, no target_date, no duration, and no
-- estimate column on nextsteps_phases, and there never will be. A phase ends
-- when its exit condition is true, whenever that is. If a future migration
-- proposes a date column here, that migration is wrong.
--
-- Authorship (§2.5): the AI drafts, the person ratifies. An UNRATIFIED route
-- is a suggestion, so no phase is 'current' until the owner ratifies. That is
-- enforced below in nextsteps_ratify_route(), not left to the application.
--
-- Idempotent. Safe to re-run.

-- ── 1. nextsteps_phases ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.nextsteps_phases (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id       uuid NOT NULL REFERENCES public.nextsteps_tracks(id) ON DELETE CASCADE,

  -- Order in the route. 1-based, contiguous, unique within a track.
  position       int NOT NULL,

  -- Short, plain, the person's language where possible. (§2.4)
  name           text NOT NULL,

  -- What doing this phase looks like day to day. This is the field the daily
  -- tools will eventually read from; the daily-read switch is a follow-on.
  work           text NOT NULL,

  -- THE single checkable statement that, when true, ends the phase. Checkable
  -- means a person can honestly answer yes or no to it: behavioural evidence,
  -- not a feeling. Enforced in the drafting endpoint by an explicit validator
  -- that will fail a draft rather than ship a soft exit. (Sacred Limit:
  -- "NextSteps never fakes an exit condition.")
  exit_condition text NOT NULL,

  --   upcoming — not reached yet (and the state of EVERY phase pre-ratification)
  --   current  — the phase whose exit condition is not yet met
  --   cleared  — exit condition answered true by the owner
  state          text NOT NULL DEFAULT 'upcoming'
                   CHECK (state IN ('upcoming', 'current', 'cleared')),

  -- Set only when the owner answers the exit condition true. Never inferred,
  -- never set by a model, never back-filled. This is a record of a person
  -- saying yes, which is the only thing that clears a phase.
  cleared_at     timestamptz,

  -- Provenance of the text, so a later read can tell a draft the person kept
  -- from a draft the person rewrote. 'ai' on insert; flips to 'person' on any
  -- owner edit of name / work / exit_condition.
  authored_by    text NOT NULL DEFAULT 'ai'
                   CHECK (authored_by IN ('ai', 'person')),

  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nextsteps_phases_track
  ON public.nextsteps_phases (track_id, position);

-- Ordering is unique within a route.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'nextsteps_phases_track_position_unique'
  ) THEN
    ALTER TABLE public.nextsteps_phases
      ADD CONSTRAINT nextsteps_phases_track_position_unique
      UNIQUE (track_id, position);
  END IF;
END $$;

-- "Exactly one phase per Track is current" (§2.9) — enforced by the database,
-- not by hope. A partial unique index is the cheapest correct expression of it.
CREATE UNIQUE INDEX IF NOT EXISTS nextsteps_phases_one_current_per_track
  ON public.nextsteps_phases (track_id)
  WHERE state = 'current';

-- ── 2. Steps hang off a Phase ────────────────────────────────────────────────
-- track_id stays (denormalised parent, keeps existing reads working). phase_id
-- is nullable ON PURPOSE: v1.1 tracks already in the wild have steps and no
-- route. Those tracks keep working untouched and can be given a route later.

ALTER TABLE public.nextsteps_steps
  ADD COLUMN IF NOT EXISTS phase_id uuid
    REFERENCES public.nextsteps_phases(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_nextsteps_steps_phase
  ON public.nextsteps_steps (phase_id, position);

-- Step position was unique per TRACK. With a route, a step's position is only
-- meaningful inside its phase: phase 1 step 1 and phase 2 step 1 both exist.
-- Swap the constraint for an expression index that treats legacy (NULL phase)
-- steps as one implicit group per track, preserving the old guarantee for them.
ALTER TABLE public.nextsteps_steps
  DROP CONSTRAINT IF EXISTS nextsteps_steps_track_position_unique;

CREATE UNIQUE INDEX IF NOT EXISTS nextsteps_steps_phase_position_unique
  ON public.nextsteps_steps (
    track_id,
    COALESCE(phase_id, '00000000-0000-0000-0000-000000000000'::uuid),
    position
  );

-- ── 3. Ratification + authorship on the Track ────────────────────────────────

ALTER TABLE public.nextsteps_tracks
  -- none → drafted → ratified. Only the owner moves it to ratified. (§2.5)
  ADD COLUMN IF NOT EXISTS route_state text NOT NULL DEFAULT 'none'
    CHECK (route_state IN ('none', 'drafted', 'ratified')),

  ADD COLUMN IF NOT EXISTS ratified_at timestamptz,

  -- How many phase fields the owner changed before ratifying. Not a score and
  -- never shown as one. The Evolution Protocol says to update the doc when
  -- "real ratification behaviour reveals the draft model failing — people
  -- deferring rather than owning." This column is the only honest way to see
  -- that happening. A route ratified with 0 edits is the signal to watch.
  ADD COLUMN IF NOT EXISTS route_edits int NOT NULL DEFAULT 0,

  -- Two authorship models, one primitive (§2.5). 'personal' is the only value
  -- the personal rail ever writes. 'editorial' is the civ rail: a route per
  -- domain, drafted from the domain's Horizon Goal and ratified by the founder
  -- as editor of the planet-side routes.
  ADD COLUMN IF NOT EXISTS route_authorship text NOT NULL DEFAULT 'personal'
    CHECK (route_authorship IN ('personal', 'editorial')),

  -- Civ rail only: which domain's route this is. NULL on every personal track.
  ADD COLUMN IF NOT EXISTS civ_domain text,

  -- Civ rail only: an editorial route is invisible until the editor publishes.
  ADD COLUMN IF NOT EXISTS route_published boolean NOT NULL DEFAULT false;

-- One editorial route per civ domain. (No rows exist yet — see §5 below.)
CREATE UNIQUE INDEX IF NOT EXISTS nextsteps_tracks_one_editorial_route_per_domain
  ON public.nextsteps_tracks (civ_domain)
  WHERE route_authorship = 'editorial';

-- ── 4. Triggers ──────────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS nextsteps_phases_updated_at ON public.nextsteps_phases;
CREATE TRIGGER nextsteps_phases_updated_at
  BEFORE UPDATE ON public.nextsteps_phases
  FOR EACH ROW EXECUTE FUNCTION public.nextsteps_set_updated_at();

-- Phase movement bumps the parent Track, so "most recent" ordering in the
-- returning surface reflects route movement, not just track-level edits.
CREATE OR REPLACE FUNCTION public.nextsteps_bump_track_on_phase()
RETURNS trigger AS $$
BEGIN
  UPDATE public.nextsteps_tracks
     SET updated_at = now()
   WHERE id = COALESCE(NEW.track_id, OLD.track_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS nextsteps_phases_bump_track ON public.nextsteps_phases;
CREATE TRIGGER nextsteps_phases_bump_track
  AFTER INSERT OR UPDATE OR DELETE ON public.nextsteps_phases
  FOR EACH ROW EXECUTE FUNCTION public.nextsteps_bump_track_on_phase();

-- Guard: a date-like intent smuggled into the exit condition text is a copy
-- problem, caught by the drafting validator. An EMPTY exit condition is a
-- schema problem, and it is refused here.
ALTER TABLE public.nextsteps_phases
  DROP CONSTRAINT IF EXISTS nextsteps_phases_exit_condition_present;
ALTER TABLE public.nextsteps_phases
  ADD CONSTRAINT nextsteps_phases_exit_condition_present
  CHECK (length(btrim(exit_condition)) > 0);

-- ── 5. Ratify + advance, as functions ────────────────────────────────────────
-- Both of these exist as SQL functions rather than application code because
-- each is a multi-row state change that must never leave a track with two
-- current phases or zero. SECURITY INVOKER: RLS still applies, so a caller can
-- only ever move their own route.

-- Ratification is the moment the route becomes the person's own. Phase 1 goes
-- current; the track flips to ratified. Refuses to run twice.
CREATE OR REPLACE FUNCTION public.nextsteps_ratify_route(p_track_id uuid)
RETURNS void AS $$
DECLARE
  v_first uuid;
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.nextsteps_tracks
     WHERE id = p_track_id AND route_state = 'ratified'
  ) THEN
    RETURN;  -- already ratified; ratification is not re-runnable
  END IF;

  SELECT id INTO v_first
    FROM public.nextsteps_phases
   WHERE track_id = p_track_id
   ORDER BY position ASC
   LIMIT 1;

  IF v_first IS NULL THEN
    RAISE EXCEPTION 'Cannot ratify a route with no phases';
  END IF;

  UPDATE public.nextsteps_phases SET state = 'current'
   WHERE id = v_first;

  UPDATE public.nextsteps_tracks
     SET route_state = 'ratified',
         ratified_at = now(),
         status      = CASE WHEN status = 'planning' THEN 'active' ELSE status END
   WHERE id = p_track_id;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Clearing a phase: the owner has answered the exit condition true. Old phase
-- cleared FIRST, then the next lit — never both current, not even mid-statement.
-- Returns the id of the phase now current, or NULL if the route is complete.
CREATE OR REPLACE FUNCTION public.nextsteps_clear_phase(p_phase_id uuid)
RETURNS uuid AS $$
DECLARE
  v_track uuid;
  v_pos   int;
  v_next  uuid;
BEGIN
  SELECT track_id, position INTO v_track, v_pos
    FROM public.nextsteps_phases
   WHERE id = p_phase_id AND state = 'current';

  IF v_track IS NULL THEN
    RAISE EXCEPTION 'Phase is not the current phase of its route';
  END IF;

  UPDATE public.nextsteps_phases
     SET state = 'cleared', cleared_at = now()
   WHERE id = p_phase_id;

  SELECT id INTO v_next
    FROM public.nextsteps_phases
   WHERE track_id = v_track AND position > v_pos AND state = 'upcoming'
   ORDER BY position ASC
   LIMIT 1;

  IF v_next IS NOT NULL THEN
    UPDATE public.nextsteps_phases SET state = 'current' WHERE id = v_next;
  ELSE
    -- Route walked to its end. The track is complete; nothing is abandoned.
    UPDATE public.nextsteps_tracks SET status = 'complete' WHERE id = v_track;
  END IF;

  RETURN v_next;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- ── 6. RLS — owner-scoped through the parent Track ───────────────────────────

ALTER TABLE public.nextsteps_phases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS nextsteps_phases_owner_all ON public.nextsteps_phases;
CREATE POLICY nextsteps_phases_owner_all
  ON public.nextsteps_phases
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.nextsteps_tracks t
       WHERE t.id = nextsteps_phases.track_id AND t.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.nextsteps_tracks t
       WHERE t.id = nextsteps_phases.track_id AND t.user_id = auth.uid()
    )
  );

-- Civ rail, shipped inert. A published editorial route is public reading: the
-- route on the leg of the domain, visible to anyone looking at that domain.
-- NO ROWS MATCH THIS TODAY — no editorial track exists, route_published
-- defaults false, and the needs lists that would become phase one's exit
-- condition are unauthored. This policy is here so the civ build is a seeding
-- job and not a schema job.
DROP POLICY IF EXISTS nextsteps_phases_editorial_read ON public.nextsteps_phases;
CREATE POLICY nextsteps_phases_editorial_read
  ON public.nextsteps_phases
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.nextsteps_tracks t
       WHERE t.id = nextsteps_phases.track_id
         AND t.route_authorship = 'editorial'
         AND t.route_published  = true
    )
  );

DROP POLICY IF EXISTS nextsteps_tracks_editorial_read ON public.nextsteps_tracks;
CREATE POLICY nextsteps_tracks_editorial_read
  ON public.nextsteps_tracks
  FOR SELECT
  USING (route_authorship = 'editorial' AND route_published = true);

-- ── 7. The returning-surface view, extended ──────────────────────────────────
-- Track cards need to say "phase 2 of 5" without an N+1. Position is
-- structural: it is derived from which exit condition has not yet been met,
-- never from elapsed time and never from a completion percentage.

-- DROP before CREATE, not CREATE OR REPLACE. The view selects t.*, and this
-- migration adds six columns to nextsteps_tracks, so the view's column list
-- shifts. Postgres refuses to REPLACE a view whose existing columns move or
-- change name ("cannot change name of view column"), which would fail this
-- migration halfway through, after the table changes had already applied.
DROP VIEW IF EXISTS public.nextsteps_tracks_with_counts;

CREATE VIEW public.nextsteps_tracks_with_counts AS
SELECT
  t.*,
  COALESCE(s.total_steps,     0)::int AS total_steps,
  COALESCE(s.active_steps,    0)::int AS active_steps,
  COALESCE(s.done_steps,      0)::int AS done_steps,
  COALESCE(s.suggested_steps, 0)::int AS suggested_steps,
  COALESCE(p.total_phases,    0)::int AS total_phases,
  COALESCE(p.cleared_phases,  0)::int AS cleared_phases,
  cur.id            AS current_phase_id,
  cur.position      AS current_phase_position,
  cur.name          AS current_phase_name,
  cur.exit_condition AS current_phase_exit_condition
FROM public.nextsteps_tracks t
LEFT JOIN (
  SELECT
    track_id,
    COUNT(*)                                    AS total_steps,
    COUNT(*) FILTER (WHERE state = 'active')    AS active_steps,
    COUNT(*) FILTER (WHERE state = 'done')      AS done_steps,
    COUNT(*) FILTER (WHERE state = 'suggested') AS suggested_steps
  FROM public.nextsteps_steps
  GROUP BY track_id
) s ON s.track_id = t.id
LEFT JOIN (
  SELECT
    track_id,
    COUNT(*)                                  AS total_phases,
    COUNT(*) FILTER (WHERE state = 'cleared') AS cleared_phases
  FROM public.nextsteps_phases
  GROUP BY track_id
) p ON p.track_id = t.id
LEFT JOIN LATERAL (
  SELECT ph.id, ph.position, ph.name, ph.exit_condition
    FROM public.nextsteps_phases ph
   WHERE ph.track_id = t.id AND ph.state = 'current'
   LIMIT 1
) cur ON true;

-- The LATERAL is a single-row lookup by construction:
-- nextsteps_phases_one_current_per_track guarantees at most one match. (Written
-- as a lateral rather than MAX(...) FILTER because max(uuid) is not available
-- on every Postgres version Supabase projects run.)

-- ── Done ─────────────────────────────────────────────────────────────────────
-- Verify with:
--   SELECT table_name FROM information_schema.tables
--    WHERE table_schema='public' AND table_name = 'nextsteps_phases';
--
--   SELECT indexname FROM pg_indexes
--    WHERE tablename = 'nextsteps_phases';
--   -- expect nextsteps_phases_one_current_per_track among them
--
--   SELECT column_name FROM information_schema.columns
--    WHERE table_name='nextsteps_tracks' AND column_name IN
--          ('route_state','ratified_at','route_edits','route_authorship',
--           'civ_domain','route_published');
--
--   SELECT * FROM nextsteps_tracks_with_counts LIMIT 1;
--
-- Rollback: DROP the two functions, DROP TABLE nextsteps_phases CASCADE (this
-- drops the steps.phase_id FK values with it), then re-run 039's view block.
-- The six new nextsteps_tracks columns are additive and harmless if left.
