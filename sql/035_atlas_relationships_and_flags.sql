-- 035_atlas_relationships_and_flags.sql
--
-- Atlas community trust architecture.
--
-- Changes:
--   1. nextus_actors — add parent_id (self-referential hierarchy)
--   2. nextus_actors — add represented_by_adder boolean (the "I represent this org" toggle)
--   3. nextus_actors — broaden seeded_by to accept 'self' in addition to existing values
--   4. nextus_relationships — new table for parent/child and member/of relationships
--   5. nextus_flags — new table for community flagging
--
-- Safe to re-run (IF NOT EXISTS / IF NOT COLUMN throughout).
-- Run in Supabase SQL editor.

-- ── 1. nextus_actors: parent_id ───────────────────────────────────────────────
-- Self-referential. Unlimited depth. NULL = top-level actor.
-- ON DELETE SET NULL: if a parent is deleted, children become top-level actors,
-- not deleted. Severance is always non-destructive.

ALTER TABLE public.nextus_actors
  ADD COLUMN IF NOT EXISTS parent_id uuid
    REFERENCES public.nextus_actors(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_actors_parent_id
  ON public.nextus_actors (parent_id);

-- ── 2. nextus_actors: represented_by_adder ────────────────────────────────────
-- True when the user who created the entry selected "I represent this org."
-- Drives seeded_by = 'self' and profile_owner = auth.uid() at insert time.
-- False (default) when the user selected "I'm adding this to the ecosystem."

ALTER TABLE public.nextus_actors
  ADD COLUMN IF NOT EXISTS represented_by_adder boolean NOT NULL DEFAULT false;

-- ── 3. nextus_actors: broaden seeded_by check ────────────────────────────────
-- Existing check constraint (if any) on seeded_by may only allow 'nextus' and
-- 'community'. We need to add 'self'. Drop and recreate safely.
-- NOTE: Supabase may have named this constraint automatically. The DO block
-- handles the case where no constraint exists yet.

DO $$
BEGIN
  -- Drop old constraint by name if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.nextus_actors'::regclass
      AND contype = 'c'
      AND conname LIKE '%seeded_by%'
  ) THEN
    EXECUTE (
      SELECT 'ALTER TABLE public.nextus_actors DROP CONSTRAINT ' || conname
      FROM pg_constraint
      WHERE conrelid = 'public.nextus_actors'::regclass
        AND contype = 'c'
        AND conname LIKE '%seeded_by%'
      LIMIT 1
    );
  END IF;
END;
$$;

-- Add the updated constraint allowing all three provenance values.
ALTER TABLE public.nextus_actors
  ADD CONSTRAINT nextus_actors_seeded_by_check
    CHECK (seeded_by IN ('nextus', 'community', 'self'));

-- ── 4. nextus_relationships ───────────────────────────────────────────────────
-- Bilateral relationships between actors.
-- Both parent/child (structural containment) and member/of (participation).
--
-- Lifecycle:
--   initiated_by proposes the relationship → status = 'pending'
--   other party confirms → status = 'confirmed'
--   either party severs → status = 'severed' (row kept for audit trail)
--
-- A parent removing a child from their umbrella = UPDATE status = 'severed'.
-- The child actor entry is untouched.

CREATE TABLE IF NOT EXISTS public.nextus_relationships (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The actor making the relationship (e.g. the child, or the member)
  actor_id            uuid NOT NULL
    REFERENCES public.nextus_actors(id) ON DELETE CASCADE,

  -- The actor being related to (e.g. the parent, or the group)
  related_actor_id    uuid NOT NULL
    REFERENCES public.nextus_actors(id) ON DELETE CASCADE,

  relationship_type   text NOT NULL
    CHECK (relationship_type IN ('parent_child', 'member_of', 'partner')),

  status              text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'severed')),

  -- Which user initiated the relationship proposal
  initiated_by        uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Which user confirmed (null until confirmed)
  confirmed_by        uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  confirmed_at        timestamptz,
  severed_at          timestamptz,
  severed_by          uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),

  -- One relationship of each type between any two actors
  UNIQUE (actor_id, related_actor_id, relationship_type)
);

CREATE INDEX IF NOT EXISTS idx_relationships_actor
  ON public.nextus_relationships (actor_id, relationship_type, status);

CREATE INDEX IF NOT EXISTS idx_relationships_related
  ON public.nextus_relationships (related_actor_id, relationship_type, status);

ALTER TABLE public.nextus_relationships ENABLE ROW LEVEL SECURITY;

-- Public can read confirmed relationships (for display on profiles)
CREATE POLICY "Confirmed relationships are public"
  ON public.nextus_relationships FOR SELECT
  USING (status = 'confirmed');

-- Authenticated users can read relationships they're party to (including pending)
CREATE POLICY "Parties can read their own relationships"
  ON public.nextus_relationships FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND (
      initiated_by = auth.uid() OR confirmed_by = auth.uid()
    )
  );

-- Authenticated users can propose relationships
CREATE POLICY "Authenticated users can propose relationships"
  ON public.nextus_relationships FOR INSERT
  WITH CHECK (auth.uid() = initiated_by);

-- Parties can update (confirm or sever) relationships they're involved in
CREATE POLICY "Parties can update their relationships"
  ON public.nextus_relationships FOR UPDATE
  USING (
    auth.uid() IS NOT NULL AND (
      initiated_by = auth.uid() OR confirmed_by = auth.uid()
    )
  );

-- ── 5. nextus_flags ───────────────────────────────────────────────────────────
-- Community flagging system. Replaces the old approval queue logic.
--
-- Flag levels:
--   1 = spam / doesn't exist
--   2 = misplaced / wrong domain
--   3 = misleading or inaccurate
--   4 = harmful / bad actor  ← auto-hides the actor entry on insert
--
-- Resolution:
--   'open'     = in the flags queue, unreviewed
--   'resolved' = reviewed and closed (entry kept or edited)
--   'dismissed' = flag was not valid

CREATE TABLE IF NOT EXISTS public.nextus_flags (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  actor_id        uuid NOT NULL
    REFERENCES public.nextus_actors(id) ON DELETE CASCADE,

  flagged_by      uuid NOT NULL
    REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 1–4 as defined above
  flag_level      integer NOT NULL
    CHECK (flag_level BETWEEN 1 AND 4),

  flag_label      text NOT NULL
    CHECK (flag_label IN ('spam', 'misplaced', 'misleading', 'harmful')),

  reason          text,           -- optional free text from the flagger

  status          text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'resolved', 'dismissed')),

  resolver_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolver_note   text,
  resolved_at     timestamptz,

  created_at      timestamptz NOT NULL DEFAULT now(),

  -- One open flag per user per actor (prevents spam flagging)
  UNIQUE (actor_id, flagged_by, status)
);

CREATE INDEX IF NOT EXISTS idx_flags_actor_status
  ON public.nextus_flags (actor_id, status);

CREATE INDEX IF NOT EXISTS idx_flags_level_status
  ON public.nextus_flags (flag_level DESC, status, created_at DESC);

ALTER TABLE public.nextus_flags ENABLE ROW LEVEL SECURITY;

-- Authenticated users can flag actors
CREATE POLICY "Authenticated users can flag actors"
  ON public.nextus_flags FOR INSERT
  WITH CHECK (auth.uid() = flagged_by);

-- Users can read their own flags
CREATE POLICY "Users can read own flags"
  ON public.nextus_flags FOR SELECT
  USING (auth.uid() = flagged_by);

-- ── 6. Auto-hide trigger for level-4 flags ────────────────────────────────────
-- When a harmful flag is inserted, immediately set the actor's status to
-- 'suspended' so it disappears from public surfaces pending admin review.
-- The admin resolves by either restoring status = 'live' or leaving suspended.

CREATE OR REPLACE FUNCTION public.handle_harmful_flag()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.flag_level = 4 THEN
    UPDATE public.nextus_actors
    SET status = 'suspended'
    WHERE id = NEW.actor_id
      AND status = 'live';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_harmful_flag ON public.nextus_flags;

CREATE TRIGGER trg_harmful_flag
  AFTER INSERT ON public.nextus_flags
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_harmful_flag();

-- ── Done ──────────────────────────────────────────────────────────────────────
-- Tables and columns created:
--   nextus_actors        — parent_id, represented_by_adder, broadened seeded_by
--   nextus_relationships — new table (parent_child, member_of, partner)
--   nextus_flags         — new table (4-level flagging, auto-hide on level 4)
--
-- No data migrations needed. All new columns have safe defaults.
-- Existing entries carry forward unchanged.
