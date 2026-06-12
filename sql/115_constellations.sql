-- 115_constellations.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- Phase E — Constellations (June 2026).
--
-- The constellation is the right frame for small actors aligned to a shared
-- destination: same goal, retained identity, amplified discovery.
--
-- Three additions:
--
-- 1. horizon_goal_objects — the seven civilisational Horizon Goals as proper
--    DB rows. Actors align to one; constellations form around one. These are
--    the destination anchors of the Atlas.
--
-- 2. nextus_relationships gets 'constellation' as a new relationship_type.
--    A constellation relationship means: actor A and actor B are aligned to
--    the same Horizon Goal and have formally joined each other's constellation.
--    Bilateral, confirmed-or-pending, same pattern as partner relationships.
--
-- 3. actor_call_cosigners — an actor can co-sign a challenge or ask authored
--    by another actor in their constellation. Co-signing = "our constellation
--    stands behind this call." Authors see cosigner count; browse shows it.
--
-- 4. actor_calls gets overflow_constellation_id — when an ask fills to
--    capacity, surplus offers route to the owning actor's constellation
--    siblings automatically.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Horizon Goal objects ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS horizon_goal_objects (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  -- Identity
  domain          text NOT NULL UNIQUE,         -- matches CIV_DOMAINS slug
  label           text NOT NULL,                -- 'Human Being', 'Society', etc.
  goal_text       text NOT NULL,                -- the canonical one-sentence Horizon Goal
  colour          text,                         -- hex — matches CIV_DOMAINS colour

  -- Aggregate signals (maintained by triggers / API)
  actor_count     int NOT NULL DEFAULT 0,       -- actors aligned to this goal
  challenge_count int NOT NULL DEFAULT 0,       -- published challenges pointing here
  constellation_count int NOT NULL DEFAULT 0,   -- constellations formed here

  CONSTRAINT horizon_goal_objects_domain_check CHECK (
    domain IN ('human-being','society','nature','technology','finance-economy','legacy','vision')
  )
);

-- Seed the seven canonical goals
INSERT INTO horizon_goal_objects (domain, label, goal_text, colour)
VALUES
  ('human-being',
   'Human Being',
   'Every human held in dignity, met with care, supported in becoming most fully themselves.',
   '#5C7FA3'),
  ('society',
   'Society',
   'A structure that gives everyone space to function and the possibility to thrive.',
   '#7A6B8A'),
  ('nature',
   'Nature',
   'The living planet is thriving, and humanity lives as a regenerative participant in it — not separate from, not above, but of.',
   '#4A8C6F'),
  ('technology',
   'Technology',
   'Technology in service of life — human and planetary — designed to restore as it operates, accessible to those it affects, and honest about what it costs.',
   '#5F8DAA'),
  ('finance-economy',
   'Finance & Economy',
   'An economy in which everyone has enough to act on what matters, contribution is freely chosen rather than coerced, and the living systems that make all exchange possible are counted, sustained, and restored.',
   '#8C7A3E'),
  ('legacy',
   'Legacy',
   'A civilisation that knows what it carries, tends what it transmits, repairs what it broke, and plants with love for people it will never meet.',
   '#8A6952'),
  ('vision',
   'Vision',
   'Creating forward — as far as we can see — in service of the brightest future for all.',
   '#6B5EA8')
ON CONFLICT (domain) DO NOTHING;

COMMENT ON TABLE horizon_goal_objects IS
  'The seven civilisational Horizon Goals as proper DB rows. Actors and constellations align to one. These are the destination anchors of the Atlas.';

-- RLS: public read, service-role write only
ALTER TABLE horizon_goal_objects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read horizon goals"
  ON horizon_goal_objects FOR SELECT USING (true);

-- ── 2. Constellation relationship type ───────────────────────────────────────
-- Adds 'constellation' to the allowed relationship types on nextus_relationships.
-- Also adds horizon_goal_id so a relationship carries which goal it's aligned to.

ALTER TABLE nextus_relationships
  DROP CONSTRAINT IF EXISTS nextus_relationships_relationship_type_check;

ALTER TABLE nextus_relationships
  ADD CONSTRAINT nextus_relationships_relationship_type_check
  CHECK (relationship_type IN ('parent_child', 'member_of', 'partner', 'constellation'));

ALTER TABLE nextus_relationships
  ADD COLUMN IF NOT EXISTS horizon_goal_id uuid REFERENCES horizon_goal_objects(id) ON DELETE SET NULL;

ALTER TABLE nextus_relationships
  ADD COLUMN IF NOT EXISTS discovery_boost boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN nextus_relationships.horizon_goal_id IS
  'For constellation relationships: which Horizon Goal this constellation is aligned to.';
COMMENT ON COLUMN nextus_relationships.discovery_boost IS
  'When true (confirmed constellation), both actors gain increased discovery surface in Atlas browse.';

-- Index for constellation browse
CREATE INDEX IF NOT EXISTS idx_nextus_rel_constellation
  ON nextus_relationships (horizon_goal_id, status)
  WHERE relationship_type = 'constellation';

-- ── 3. Actor alignment to Horizon Goal objects ────────────────────────────────
-- Actors already have domain_alignment_notes (jsonb). We add a FK to the
-- horizon_goal_objects row they're primarily aligned to — set in the claim
-- flow (C2) or from the manage page.

ALTER TABLE nextus_actors
  ADD COLUMN IF NOT EXISTS primary_horizon_goal_id uuid
    REFERENCES horizon_goal_objects(id) ON DELETE SET NULL;

COMMENT ON COLUMN nextus_actors.primary_horizon_goal_id IS
  'The single Horizon Goal this actor''s work primarily moves toward. Set in the claim flow or manage page.';

CREATE INDEX IF NOT EXISTS idx_actors_horizon_goal
  ON nextus_actors (primary_horizon_goal_id)
  WHERE primary_horizon_goal_id IS NOT NULL;

-- ── 4. actor_call_cosigners ───────────────────────────────────────────────────
-- An actor in the same constellation as a call's author can co-sign the call.
-- Co-signing means: "our constellation stands behind this." Identity retained.

CREATE TABLE IF NOT EXISTS actor_call_cosigners (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  call_id         uuid NOT NULL REFERENCES actor_calls(id) ON DELETE CASCADE,
  actor_id        uuid NOT NULL REFERENCES nextus_actors(id) ON DELETE CASCADE,
  cosigned_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,  -- who clicked cosign
  UNIQUE (call_id, actor_id)
);

CREATE INDEX IF NOT EXISTS idx_cosigners_call   ON actor_call_cosigners (call_id);
CREATE INDEX IF NOT EXISTS idx_cosigners_actor  ON actor_call_cosigners (actor_id);

ALTER TABLE actor_call_cosigners ENABLE ROW LEVEL SECURITY;

-- Public read (cosigner count shown on challenge page)
CREATE POLICY "Public read cosigners"
  ON actor_call_cosigners FOR SELECT USING (true);

-- Actor owners can cosign (via profile_owner check in API — service role)
CREATE POLICY "Owners can cosign"
  ON actor_call_cosigners FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ── 5. Ask overflow ───────────────────────────────────────────────────────────
-- When an ask fills to capacity, surplus offers route to constellation siblings.
-- The overflow_to_constellation flag enables this; overflow is logged.

ALTER TABLE actor_calls
  ADD COLUMN IF NOT EXISTS overflow_to_constellation boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN actor_calls.overflow_to_constellation IS
  'When true and ask_quantity is full, surplus offers are routed to constellation siblings automatically.';

CREATE TABLE IF NOT EXISTS ask_overflow_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  original_call_id uuid NOT NULL REFERENCES actor_calls(id) ON DELETE CASCADE,
  routed_to_call_id uuid REFERENCES actor_calls(id) ON DELETE SET NULL,
  user_id         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  note            text  -- why it routed here
);

COMMENT ON TABLE ask_overflow_log IS
  'Records when a surplus offer from a full ask is routed to a constellation sibling.';
