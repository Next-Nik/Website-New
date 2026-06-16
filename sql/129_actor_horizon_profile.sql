-- 129_actor_horizon_profile.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- The civilisational fractal of the self stack (June 2026).
--
-- On the self side a person runs:  The Map → Horizon Goal → Target Stretch, loop.
-- This migration builds the same loop one scale up, for an actor (an org):
--
--   apex Horizon Goal (shared, already in horizon_goal_objects — the seven)
--        │
--   best-in-world rendering  ── the concrete picture of excellence in this domain
--        │                      (the actor's working reference; civ analog of the
--        │                       self Horizon Goal as a *rendered* reference)
--   org Horizon Goal         ── where THIS actor wants to be. The standing
--        │                      destination. Owner-authored, never public.
--   current / desired state  ── where they are, and where they'd like to be,
--        │                      placed against best-in-world. The civ Map reading.
--   Target Stretch           ── a three-month bite out of the gap.
--                               (target_sprint_sessions, scale='civ', actor_id set)
--
-- TWO additions:
--   1. actor_horizon_profile — the owner-private civ Map + org Horizon Goal +
--      best-in-world rendering. One row per actor per domain. This is the
--      DEVELOPMENTAL RAIL AT CIV SCALE: private by default, never broadcast.
--   2. target_sprint_sessions.actor_id — lets a civ Stretch be run on behalf of
--      an actor (toward that actor's org Horizon Goal), distinct from the
--      person's own Planet Sprint (civ scale, actor_id NULL).
--
-- ── GOVERNANCE — the honesty locks, restated for a new table ──────────────────
-- Three gates, never collapsed into one:
--   • operational — the platform reads a field to do the job the owner came for
--                   (draft the goal, generate the Stretch). Baseline. No flag,
--                   no separate consent. It is the tool doing the thing.
--   • learnable   — the platform aggregates a field to get smarter for everyone,
--                   beyond this actor's session. CONSENTED. Off by default.
--                   Aggregated only to the domain level; never re-surfaced as
--                   this actor's value.
--   • public      — other actors see it on the profile. For this table: NEVER
--                   in v1. Enforced by RLS (owner-only) and the absence of any
--                   public flag.
--
-- Per field:
--   best_in_world     → operational yes · learnable by consent (learnable_rendering)
--   org_horizon_goal  → operational yes · learnable by consent (learnable_goal) · public NO
--   current_score     → operational yes · learnable NEVER · public NEVER  (walled)
--   desired_score     → operational yes · learnable NEVER · public NEVER  (walled)
--
-- THE LOCK THAT SURVIVES EVERYTHING: operational reading is never quietly
-- upgraded into learning. Reading a field to help the owner write it does not
-- become permission to learn from it across actors. Only the owner opens the
-- learnable gate, and only the two non-walled fields have a gate to open.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. actor_horizon_profile ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS actor_horizon_profile (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  -- Whose profile this is, and in which civilisational domain.
  actor_id        uuid NOT NULL REFERENCES nextus_actors(id) ON DELETE CASCADE,
  domain          text NOT NULL,                 -- civ domain slug; matches horizon_goal_objects.domain

  -- The apex this rung ladders up to (the shared, public domain goal).
  apex_goal_id    uuid REFERENCES horizon_goal_objects(id) ON DELETE SET NULL,

  -- The rendered reference: what a best-in-world org moving toward the apex
  -- looks like, in this domain. A constructed, abstract picture — NEVER a
  -- comparison to named real actors (that would be actor-vs-actor ranking).
  best_in_world   text,

  -- Where THIS actor wants to be. Their standing destination. Owner-authored,
  -- toward-framed, never public.
  org_horizon_goal text,

  -- The civ Map reading: placement against best_in_world. WALLED.
  -- Owner-private, never displayed, never aggregated for any signal.
  current_score   int CHECK (current_score IS NULL OR (current_score BETWEEN 0 AND 10)),
  desired_score   int CHECK (desired_score IS NULL OR (desired_score BETWEEN 0 AND 10)),

  -- Consent gates (the only learnable fields, both off by default).
  learnable_rendering boolean NOT NULL DEFAULT false,  -- aggregate best_in_world into the domain Standard
  learnable_goal      boolean NOT NULL DEFAULT false,  -- aggregate org_horizon_goal for cross-actor learning

  -- Who authored (the profile_owner who walked the intake).
  authored_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  CONSTRAINT actor_horizon_profile_domain_check CHECK (
    domain IN ('human-being','society','nature','technology','finance-economy','legacy','vision')
  ),
  -- One row per actor per domain. Default UX is a single domain; the UN /
  -- coaching case gets multi-domain free, with no schema change.
  UNIQUE (actor_id, domain)
);

COMMENT ON TABLE actor_horizon_profile IS
  'The developmental rail at civilisational scale. Owner-private civ Map + org Horizon Goal + best-in-world rendering, one row per actor per domain. Never broadcast. See migration header for the three governance gates.';
COMMENT ON COLUMN actor_horizon_profile.best_in_world IS
  'Constructed picture of excellence in this domain (the working reference). Operational always; learnable only if learnable_rendering. Never a comparison to named actors.';
COMMENT ON COLUMN actor_horizon_profile.org_horizon_goal IS
  'Where this actor wants to be — their standing destination. Operational always; learnable only if learnable_goal. NEVER public in v1.';
COMMENT ON COLUMN actor_horizon_profile.current_score IS
  'Civ Map placement against best_in_world. WALLED: owner-private, never displayed, never aggregated.';
COMMENT ON COLUMN actor_horizon_profile.desired_score IS
  'Where the actor would like to be, against best_in_world. WALLED: owner-private, never displayed, never aggregated. The gap (current→desired) seeds the Target Stretch.';
COMMENT ON COLUMN actor_horizon_profile.learnable_rendering IS
  'Owner consent: may the platform aggregate best_in_world into the domain Standard of Excellence. Default false. Aggregate only; never re-surfaced as this actor''s rendering.';
COMMENT ON COLUMN actor_horizon_profile.learnable_goal IS
  'Owner consent: may the platform learn from org_horizon_goal across actors. Default false. Aggregate only; goal stays private to this actor.';

CREATE INDEX IF NOT EXISTS idx_ahp_actor   ON actor_horizon_profile (actor_id);
CREATE INDEX IF NOT EXISTS idx_ahp_domain  ON actor_horizon_profile (domain);
-- Partial indexes that the (future) domain-Standard aggregator will read.
-- They touch ONLY consented rows — the walled scores are never in scope.
CREATE INDEX IF NOT EXISTS idx_ahp_learnable_rendering
  ON actor_horizon_profile (domain) WHERE learnable_rendering = true;
CREATE INDEX IF NOT EXISTS idx_ahp_learnable_goal
  ON actor_horizon_profile (domain) WHERE learnable_goal = true;

-- ── RLS: owner-only, the whole table ──────────────────────────────────────────
-- This is the civ developmental rail. The owner of the actor (profile_owner) is the only principal who may read or write. The public
-- never sees any of it. The API uses the service-role key and performs its own
-- ownsActor() check; these policies protect any direct client access.

ALTER TABLE actor_horizon_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner reads own civ horizon profile"
  ON actor_horizon_profile FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM nextus_actors a
    WHERE a.id = actor_horizon_profile.actor_id
      AND a.profile_owner = auth.uid()
  ));

CREATE POLICY "Owner writes own civ horizon profile"
  ON actor_horizon_profile FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM nextus_actors a
    WHERE a.id = actor_horizon_profile.actor_id
      AND a.profile_owner = auth.uid()
  ));

CREATE POLICY "Owner updates own civ horizon profile"
  ON actor_horizon_profile FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM nextus_actors a
    WHERE a.id = actor_horizon_profile.actor_id
      AND a.profile_owner = auth.uid()
  ));

CREATE POLICY "Owner deletes own civ horizon profile"
  ON actor_horizon_profile FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM nextus_actors a
    WHERE a.id = actor_horizon_profile.actor_id
      AND a.profile_owner = auth.uid()
  ));

-- ── 2. target_sprint_sessions.actor_id ────────────────────────────────────────
-- A civ Stretch can now be run ON BEHALF OF an actor (the org), toward that
-- actor's org Horizon Goal. The acting human stays in user_id (the owner who
-- drives it); actor_id names the org it serves.
--
--   scale='civ', actor_id NULL  → the person's own Planet Sprint (unchanged).
--   scale='civ', actor_id set   → an org Target Stretch (this migration's new case).
--
-- The domain_data.__planet_sprint__ blob (used by the existing civ path) carries
-- source:'org' and serves:<domain> for org stretches.

ALTER TABLE target_sprint_sessions
  ADD COLUMN IF NOT EXISTS actor_id uuid NULL
    REFERENCES nextus_actors(id) ON DELETE SET NULL;

COMMENT ON COLUMN target_sprint_sessions.actor_id IS
  'When set on a scale=civ row: this Stretch is an org Target Stretch run on behalf of the actor, toward the actor''s org Horizon Goal. NULL civ rows are the person''s own Planet Sprint.';

CREATE INDEX IF NOT EXISTS idx_tss_actor_scale_status
  ON target_sprint_sessions (actor_id, scale, status)
  WHERE actor_id IS NOT NULL;
