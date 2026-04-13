-- ============================================================
-- NextUs — Geographic Scale Architecture
-- Phase 1 Migration
-- April 2026
--
-- What this does:
--   1. Creates nextus_focuses (the entity tree)
--   2. Creates nextus_focus_places (multi-place span for orgs)
--   3. Creates nextus_focus_goals (domain goals at each Focus)
--   4. Creates nextus_domain_definitions (future-ready, stays empty)
--   5. Adds focus_id to nextus_actors (nullable, no breaking change)
--   6. Seeds the tree: planet → continents → Canada →
--      provinces/territories → 5 cities
--
-- Safe to run on existing data. Nothing is dropped or altered
-- except the additive column on nextus_actors.
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 1. nextus_focuses
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS nextus_focuses (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  slug          text NOT NULL UNIQUE,
  type          text NOT NULL CHECK (type IN (
                  'planet',
                  'continent',
                  'nation',
                  'province',
                  'city',
                  'neighbourhood',
                  'organisation'
                )),
  parent_id     uuid REFERENCES nextus_focuses(id) ON DELETE SET NULL,
  coordinates   jsonb,           -- { "lat": 0.0, "lng": 0.0 }
  website       text,
  description   text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_focuses_parent   ON nextus_focuses(parent_id);
CREATE INDEX IF NOT EXISTS idx_focuses_type     ON nextus_focuses(type);
CREATE INDEX IF NOT EXISTS idx_focuses_slug     ON nextus_focuses(slug);


-- ────────────────────────────────────────────────────────────
-- 2. nextus_focus_places  (multi-place span for organisations)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS nextus_focus_places (
  focus_id      uuid NOT NULL REFERENCES nextus_focuses(id) ON DELETE CASCADE,
  place_id      uuid NOT NULL REFERENCES nextus_focuses(id) ON DELETE CASCADE,
  is_primary    boolean NOT NULL DEFAULT false,
  PRIMARY KEY (focus_id, place_id)
);


-- ────────────────────────────────────────────────────────────
-- 3. nextus_focus_goals
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS nextus_focus_goals (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  focus_id      uuid NOT NULL REFERENCES nextus_focuses(id) ON DELETE CASCADE,
  domain_id     text NOT NULL,   -- 'human-being' | 'society' | 'nature' | etc.
  subdomain_id  text,            -- optional: goal at subdomain level
  horizon_goal  text NOT NULL,
  set_by        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status        text NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft', 'proposed', 'ratified')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (focus_id, domain_id, subdomain_id)
);

CREATE INDEX IF NOT EXISTS idx_focus_goals_focus  ON nextus_focus_goals(focus_id);
CREATE INDEX IF NOT EXISTS idx_focus_goals_domain ON nextus_focus_goals(domain_id);
CREATE INDEX IF NOT EXISTS idx_focus_goals_status ON nextus_focus_goals(status);


-- ────────────────────────────────────────────────────────────
-- 4. nextus_domain_definitions  (future-ready, stays empty)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS nextus_domain_definitions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  focus_id      uuid REFERENCES nextus_focuses(id) ON DELETE CASCADE,
                -- null = global/canonical (mirrors data.js)
  domain_id     text NOT NULL,
  subdomain_id  text,            -- null = domain-level definition
  name          text NOT NULL,
  description   text,
  horizon_goal  text,
  created_at    timestamptz NOT NULL DEFAULT now()
);


-- ────────────────────────────────────────────────────────────
-- 5. Add focus_id to nextus_actors  (nullable, no breaking change)
-- ────────────────────────────────────────────────────────────

ALTER TABLE nextus_actors
  ADD COLUMN IF NOT EXISTS focus_id uuid REFERENCES nextus_focuses(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_actors_focus ON nextus_actors(focus_id);


-- ────────────────────────────────────────────────────────────
-- 6. Seed data
-- ────────────────────────────────────────────────────────────

-- We use a CTE chain so IDs are stable within this migration
-- without hardcoding UUIDs. Each INSERT ... RETURNING id feeds
-- the next level. Run the whole block as one transaction.

BEGIN;

-- ── Planet ───────────────────────────────────────────────────

INSERT INTO nextus_focuses (name, slug, type, coordinates)
VALUES ('Planet Earth', 'planet-earth', 'planet', '{"lat": 0, "lng": 0}')
ON CONFLICT (slug) DO NOTHING;


-- ── Continents ───────────────────────────────────────────────

INSERT INTO nextus_focuses (name, slug, type, parent_id, coordinates)
SELECT name, slug, 'continent', p.id, coords::jsonb
FROM (VALUES
  ('Africa',            'africa',           '{"lat":  -8.8, "lng":  34.5}'),
  ('Antarctica',        'antarctica',       '{"lat": -90.0, "lng":   0.0}'),
  ('Asia',              'asia',             '{"lat":  34.0, "lng": 100.0}'),
  ('Australia/Oceania', 'australia-oceania','{"lat": -22.7, "lng": 140.0}'),
  ('Europe',            'europe',           '{"lat":  54.5, "lng":  15.3}'),
  ('North America',     'north-america',    '{"lat":  54.0, "lng": -105.0}'),
  ('South America',     'south-america',    '{"lat": -14.2, "lng":  -51.9}')
) AS v(name, slug, coords)
CROSS JOIN (SELECT id FROM nextus_focuses WHERE slug = 'planet-earth') AS p
ON CONFLICT (slug) DO NOTHING;


-- ── Canada ───────────────────────────────────────────────────

INSERT INTO nextus_focuses (name, slug, type, parent_id, coordinates)
SELECT 'Canada', 'ca', 'nation', id, '{"lat": 56.1, "lng": -106.3}'
FROM nextus_focuses WHERE slug = 'north-america'
ON CONFLICT (slug) DO NOTHING;


-- ── Provinces & Territories ───────────────────────────────────

INSERT INTO nextus_focuses (name, slug, type, parent_id, coordinates)
SELECT name, slug, 'province', p.id, coords::jsonb
FROM (VALUES
  ('Alberta',                    'ca-ab', '{"lat": 53.9,  "lng": -116.6}'),
  ('British Columbia',           'ca-bc', '{"lat": 53.7,  "lng": -127.6}'),
  ('Manitoba',                   'ca-mb', '{"lat": 56.4,  "lng":  -98.8}'),
  ('New Brunswick',              'ca-nb', '{"lat": 46.5,  "lng":  -66.5}'),
  ('Newfoundland and Labrador',  'ca-nl', '{"lat": 53.1,  "lng":  -57.6}'),
  ('Northwest Territories',      'ca-nt', '{"lat": 64.8,  "lng": -124.8}'),
  ('Nova Scotia',                'ca-ns', '{"lat": 44.7,  "lng":  -63.7}'),
  ('Nunavut',                    'ca-nu', '{"lat": 70.3,  "lng":  -83.1}'),
  ('Ontario',                    'ca-on', '{"lat": 51.3,  "lng":  -85.3}'),
  ('Prince Edward Island',       'ca-pe', '{"lat": 46.5,  "lng":  -63.4}'),
  ('Quebec',                     'ca-qc', '{"lat": 52.9,  "lng":  -73.5}'),
  ('Saskatchewan',               'ca-sk', '{"lat": 55.0,  "lng": -106.0}'),
  ('Yukon',                      'ca-yt', '{"lat": 64.3,  "lng": -135.0}')
) AS v(name, slug, coords)
CROSS JOIN (SELECT id FROM nextus_focuses WHERE slug = 'ca') AS p
ON CONFLICT (slug) DO NOTHING;


-- ── Cities ────────────────────────────────────────────────────

-- Vancouver (BC)
INSERT INTO nextus_focuses (name, slug, type, parent_id, coordinates)
SELECT 'Vancouver', 'ca-bc-vancouver', 'city', id, '{"lat": 49.3, "lng": -123.1}'
FROM nextus_focuses WHERE slug = 'ca-bc'
ON CONFLICT (slug) DO NOTHING;

-- Toronto (ON)
INSERT INTO nextus_focuses (name, slug, type, parent_id, coordinates)
SELECT 'Toronto', 'ca-on-toronto', 'city', id, '{"lat": 43.7, "lng": -79.4}'
FROM nextus_focuses WHERE slug = 'ca-on'
ON CONFLICT (slug) DO NOTHING;

-- Montreal (QC)
INSERT INTO nextus_focuses (name, slug, type, parent_id, coordinates)
SELECT 'Montreal', 'ca-qc-montreal', 'city', id, '{"lat": 45.5, "lng": -73.6}'
FROM nextus_focuses WHERE slug = 'ca-qc'
ON CONFLICT (slug) DO NOTHING;

-- Calgary (AB)
INSERT INTO nextus_focuses (name, slug, type, parent_id, coordinates)
SELECT 'Calgary', 'ca-ab-calgary', 'city', id, '{"lat": 51.0, "lng": -114.1}'
FROM nextus_focuses WHERE slug = 'ca-ab'
ON CONFLICT (slug) DO NOTHING;

-- Ottawa (ON)
INSERT INTO nextus_focuses (name, slug, type, parent_id, coordinates)
SELECT 'Ottawa', 'ca-on-ottawa', 'city', id, '{"lat": 45.4, "lng": -75.7}'
FROM nextus_focuses WHERE slug = 'ca-on'
ON CONFLICT (slug) DO NOTHING;

COMMIT;


-- ────────────────────────────────────────────────────────────
-- RLS policies
-- ────────────────────────────────────────────────────────────

ALTER TABLE nextus_focuses           ENABLE ROW LEVEL SECURITY;
ALTER TABLE nextus_focus_places      ENABLE ROW LEVEL SECURITY;
ALTER TABLE nextus_focus_goals       ENABLE ROW LEVEL SECURITY;
ALTER TABLE nextus_domain_definitions ENABLE ROW LEVEL SECURITY;

-- Public read on focuses and goals
CREATE POLICY "public_read_focuses"
  ON nextus_focuses FOR SELECT USING (true);

CREATE POLICY "public_read_focus_goals"
  ON nextus_focus_goals FOR SELECT USING (true);

CREATE POLICY "public_read_focus_places"
  ON nextus_focus_places FOR SELECT USING (true);

-- Only authenticated users can insert/update focuses
CREATE POLICY "auth_insert_focuses"
  ON nextus_focuses FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "auth_update_focuses"
  ON nextus_focuses FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Goals: insert/update by authenticated users, ratification by founder only
CREATE POLICY "auth_insert_focus_goals"
  ON nextus_focus_goals FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "founder_update_focus_goals"
  ON nextus_focus_goals FOR UPDATE
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'founder'
    OR set_by = auth.uid()
  );

-- Domain definitions: founder only for now
CREATE POLICY "founder_all_domain_definitions"
  ON nextus_domain_definitions FOR ALL
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'founder');


-- ────────────────────────────────────────────────────────────
-- Verify
-- ────────────────────────────────────────────────────────────

-- Run this after migration to confirm the tree looks right:
--
-- SELECT
--   f.type,
--   p.name AS parent,
--   f.name,
--   f.slug
-- FROM nextus_focuses f
-- LEFT JOIN nextus_focuses p ON p.id = f.parent_id
-- ORDER BY f.type, p.name, f.name;
-- ============================================================
-- NextUs — Focus Stewardship
-- Phase 6 Migration
-- April 2026
--
-- What this does:
--   1. Creates nextus_focus_stewards — who holds stewardship
--   2. Creates nextus_focus_steward_log — full action history
--      (grant, revoke, transfer, suspend, reinstate)
--   3. Creates nextus_focus_steward_claims — inbound requests
--      from people who want to steward a Focus
--   4. RLS: stewards can read their own record;
--      founders/governors can write everything
--
-- Nothing existing is altered.
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 1. nextus_focus_stewards
--    Current stewardship state — one row per (focus, user)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS nextus_focus_stewards (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  focus_id      uuid NOT NULL REFERENCES nextus_focuses(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role          text NOT NULL DEFAULT 'steward'
                  CHECK (role IN ('steward', 'governor')),
                  -- steward: manages goals and actors for this focus
                  -- governor: can also grant/revoke stewardship within this focus
  status        text NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'suspended', 'revoked')),
  granted_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  granted_at    timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz,             -- null = no expiry
  notes         text,                   -- internal note from granting authority
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (focus_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_stewards_focus  ON nextus_focus_stewards(focus_id);
CREATE INDEX IF NOT EXISTS idx_stewards_user   ON nextus_focus_stewards(user_id);
CREATE INDEX IF NOT EXISTS idx_stewards_status ON nextus_focus_stewards(status);


-- ────────────────────────────────────────────────────────────
-- 2. nextus_focus_steward_log
--    Immutable audit trail — every action recorded forever
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS nextus_focus_steward_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  focus_id      uuid NOT NULL REFERENCES nextus_focuses(id) ON DELETE CASCADE,
  subject_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
                -- the user whose stewardship changed
  action        text NOT NULL
                  CHECK (action IN (
                    'granted',      -- stewardship given
                    'revoked',      -- stewardship removed
                    'suspended',    -- temporarily inactive
                    'reinstated',   -- suspension lifted
                    'transferred',  -- moved from one user to another
                    'role_changed', -- steward ↔ governor
                    'expired'       -- passed expires_at
                  )),
  actor_id      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
                -- who performed the action (null = system, e.g. expiry)
  from_user_id  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
                -- for transfers: who held it before
  to_user_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
                -- for transfers: who holds it after
  reason        text,                   -- written rationale
  metadata      jsonb,                  -- any additional context
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_steward_log_focus   ON nextus_focus_steward_log(focus_id);
CREATE INDEX IF NOT EXISTS idx_steward_log_subject ON nextus_focus_steward_log(subject_id);
CREATE INDEX IF NOT EXISTS idx_steward_log_action  ON nextus_focus_steward_log(action);
CREATE INDEX IF NOT EXISTS idx_steward_log_time    ON nextus_focus_steward_log(created_at);


-- ────────────────────────────────────────────────────────────
-- 3. nextus_focus_steward_claims
--    Inbound requests from users wanting to steward a Focus
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS nextus_focus_steward_claims (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  focus_id      uuid NOT NULL REFERENCES nextus_focuses(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rationale     text NOT NULL,          -- why they should steward this Focus
  organisation  text,                   -- org they represent, if any
  website       text,
  status        text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'approved', 'declined', 'withdrawn')),
  reviewed_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at   timestamptz,
  review_note   text,                   -- internal note on decision
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (focus_id, user_id)            -- one claim per (focus, user) at a time
);

CREATE INDEX IF NOT EXISTS idx_claims_focus  ON nextus_focus_steward_claims(focus_id);
CREATE INDEX IF NOT EXISTS idx_claims_user   ON nextus_focus_steward_claims(user_id);
CREATE INDEX IF NOT EXISTS idx_claims_status ON nextus_focus_steward_claims(status);


-- ────────────────────────────────────────────────────────────
-- 4. Update nextus_focus_goals RLS
--    Stewards can now insert/update goals for their focus
--    (status caps at 'proposed' — ratification stays with
--    founder/governor)
-- ────────────────────────────────────────────────────────────

-- Drop the old auth-only insert policy and replace
DROP POLICY IF EXISTS "auth_insert_focus_goals" ON nextus_focus_goals;
DROP POLICY IF EXISTS "founder_update_focus_goals" ON nextus_focus_goals;

-- Stewards can insert goals for their own focus (land as 'proposed')
CREATE POLICY "steward_insert_focus_goals"
  ON nextus_focus_goals FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND (
      -- founder can insert anything
      (auth.jwt() -> 'user_metadata' ->> 'role') = 'founder'
      OR
      -- active steward of this focus
      EXISTS (
        SELECT 1 FROM nextus_focus_stewards
        WHERE focus_id = nextus_focus_goals.focus_id
          AND user_id  = auth.uid()
          AND status   = 'active'
      )
    )
  );

-- Stewards can update goals they set (but cannot self-ratify)
CREATE POLICY "steward_update_focus_goals"
  ON nextus_focus_goals FOR UPDATE
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'founder'
    OR set_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM nextus_focus_stewards
      WHERE focus_id = nextus_focus_goals.focus_id
        AND user_id  = auth.uid()
        AND status   = 'active'
        AND role     = 'governor'
    )
  );


-- ────────────────────────────────────────────────────────────
-- 5. RLS on new tables
-- ────────────────────────────────────────────────────────────

ALTER TABLE nextus_focus_stewards        ENABLE ROW LEVEL SECURITY;
ALTER TABLE nextus_focus_steward_log     ENABLE ROW LEVEL SECURITY;
ALTER TABLE nextus_focus_steward_claims  ENABLE ROW LEVEL SECURITY;

-- Stewards table: public read, founder/governor write
CREATE POLICY "public_read_stewards"
  ON nextus_focus_stewards FOR SELECT USING (true);

CREATE POLICY "founder_all_stewards"
  ON nextus_focus_stewards FOR ALL
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'founder'
    OR EXISTS (
      SELECT 1 FROM nextus_focus_stewards s2
      WHERE s2.focus_id = nextus_focus_stewards.focus_id
        AND s2.user_id  = auth.uid()
        AND s2.status   = 'active'
        AND s2.role     = 'governor'
    )
  );

-- Log: public read, system/founder write (log rows are never updated or deleted)
CREATE POLICY "public_read_steward_log"
  ON nextus_focus_steward_log FOR SELECT USING (true);

CREATE POLICY "founder_insert_steward_log"
  ON nextus_focus_steward_log FOR INSERT
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'founder'
    OR auth.role() = 'service_role'
  );

-- Claims: user can read/insert/withdraw their own; founder reads all
CREATE POLICY "user_read_own_claims"
  ON nextus_focus_steward_claims FOR SELECT
  USING (
    user_id = auth.uid()
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'founder'
  );

CREATE POLICY "user_insert_claim"
  ON nextus_focus_steward_claims FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND user_id = auth.uid()
  );

CREATE POLICY "user_withdraw_claim"
  ON nextus_focus_steward_claims FOR UPDATE
  USING (
    -- user can only withdraw their own pending claim
    (user_id = auth.uid() AND status = 'pending')
    OR
    -- founder can approve/decline
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'founder'
  );


-- ────────────────────────────────────────────────────────────
-- Helper: grant_stewardship()
-- Call this instead of raw INSERT to ensure the log is written
-- atomically with the steward record.
--
-- Usage:
--   SELECT grant_stewardship(
--     focus_id   := 'uuid',
--     subject_id := 'uuid',   -- user receiving stewardship
--     actor_id   := 'uuid',   -- user granting (you)
--     role       := 'steward',
--     reason     := 'Approved claim — represents...',
--     expires_at := null
--   );
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION grant_stewardship(
  p_focus_id   uuid,
  p_subject_id uuid,
  p_actor_id   uuid,
  p_role       text    DEFAULT 'steward',
  p_reason     text    DEFAULT null,
  p_expires_at timestamptz DEFAULT null
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Upsert the steward record
  INSERT INTO nextus_focus_stewards
    (focus_id, user_id, role, status, granted_by, granted_at, expires_at, notes)
  VALUES
    (p_focus_id, p_subject_id, p_role, 'active', p_actor_id, now(), p_expires_at, p_reason)
  ON CONFLICT (focus_id, user_id)
  DO UPDATE SET
    role       = EXCLUDED.role,
    status     = 'active',
    granted_by = EXCLUDED.granted_by,
    granted_at = EXCLUDED.granted_at,
    expires_at = EXCLUDED.expires_at,
    notes      = EXCLUDED.notes,
    updated_at = now();

  -- Write the log
  INSERT INTO nextus_focus_steward_log
    (focus_id, subject_id, action, actor_id, reason)
  VALUES
    (p_focus_id, p_subject_id, 'granted', p_actor_id, p_reason);
END;
$$;


CREATE OR REPLACE FUNCTION revoke_stewardship(
  p_focus_id   uuid,
  p_subject_id uuid,
  p_actor_id   uuid,
  p_reason     text DEFAULT null
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE nextus_focus_stewards
  SET status = 'revoked', updated_at = now()
  WHERE focus_id = p_focus_id AND user_id = p_subject_id;

  INSERT INTO nextus_focus_steward_log
    (focus_id, subject_id, action, actor_id, reason)
  VALUES
    (p_focus_id, p_subject_id, 'revoked', p_actor_id, p_reason);
END;
$$;


CREATE OR REPLACE FUNCTION transfer_stewardship(
  p_focus_id    uuid,
  p_from_id     uuid,
  p_to_id       uuid,
  p_actor_id    uuid,
  p_reason      text DEFAULT null
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role text;
BEGIN
  -- Get current role to preserve it in transfer
  SELECT role INTO v_role
  FROM nextus_focus_stewards
  WHERE focus_id = p_focus_id AND user_id = p_from_id;

  -- Revoke from current holder
  UPDATE nextus_focus_stewards
  SET status = 'revoked', updated_at = now()
  WHERE focus_id = p_focus_id AND user_id = p_from_id;

  -- Grant to new holder
  INSERT INTO nextus_focus_stewards
    (focus_id, user_id, role, status, granted_by, granted_at)
  VALUES
    (p_focus_id, p_to_id, COALESCE(v_role, 'steward'), 'active', p_actor_id, now())
  ON CONFLICT (focus_id, user_id)
  DO UPDATE SET
    role       = EXCLUDED.role,
    status     = 'active',
    granted_by = EXCLUDED.granted_by,
    granted_at = EXCLUDED.granted_at,
    updated_at = now();

  -- Single log entry capturing the transfer
  INSERT INTO nextus_focus_steward_log
    (focus_id, subject_id, action, actor_id, from_user_id, to_user_id, reason)
  VALUES
    (p_focus_id, p_to_id, 'transferred', p_actor_id, p_from_id, p_to_id, p_reason);
END;
$$;


-- ────────────────────────────────────────────────────────────
-- Verify
-- ────────────────────────────────────────────────────────────

-- After migration, confirm tables exist:
--
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
--   AND table_name LIKE 'nextus_focus_%'
-- ORDER BY table_name;
--
-- Expected:
--   nextus_focus_goals
--   nextus_focus_places
--   nextus_focus_steward_claims
--   nextus_focus_steward_log
--   nextus_focus_stewards
-- ============================================================
-- NextUs — Audit Fixes Migration
-- April 2026
--
-- What this does:
--   1. Adds 'creative' to the need_type check constraint
--   2. Adds contribution_mode column to nextus_needs
--   3. Adds alignment_score_computed column to nextus_actors
--      (cron already writes this field — column may already exist)
--
-- Safe to run on existing data.
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 1. Add 'creative' to need_type
-- ────────────────────────────────────────────────────────────

-- Drop existing check constraint and replace with updated version
-- (constraint name may vary — use DO block to handle gracefully)

DO $$
BEGIN
  -- Try to drop the existing check constraint
  ALTER TABLE nextus_needs DROP CONSTRAINT IF EXISTS nextus_needs_need_type_check;
EXCEPTION WHEN OTHERS THEN
  NULL; -- constraint didn't exist or had a different name, continue
END $$;

ALTER TABLE nextus_needs
  ADD CONSTRAINT nextus_needs_need_type_check
  CHECK (need_type IN (
    'skills',
    'creative',
    'capital',
    'time',
    'resources',
    'partnerships',
    'data',
    'other'
  ));


-- ────────────────────────────────────────────────────────────
-- 2. Add contribution_mode to nextus_needs
-- ────────────────────────────────────────────────────────────
-- Allows orgs to tag what kind of contributor they need.
-- The matching engine reads this field to score mode alignment.
-- Nullable — existing needs unaffected.

ALTER TABLE nextus_needs
  ADD COLUMN IF NOT EXISTS contribution_mode text
  CHECK (contribution_mode IN (
    'functional',
    'expressive',
    'relational',
    'intellectual',
    'mixed'
  ));


-- ────────────────────────────────────────────────────────────
-- 3. Add alignment_score_computed to nextus_actors
-- ────────────────────────────────────────────────────────────
-- The integrity cron already writes this field when it computes
-- an evidence-based score. Adding the column here in case it
-- doesn't already exist.

ALTER TABLE nextus_actors
  ADD COLUMN IF NOT EXISTS alignment_score_computed boolean DEFAULT false;

ALTER TABLE nextus_actors
  ADD COLUMN IF NOT EXISTS alignment_score_updated_at timestamptz;

-- Backfill: any existing actors with non-null alignment scores
-- are assumed to be self-declared until the cron runs.
-- Set computed = false so they show "Not yet established" on the
-- public profile until 3 loops are closed.
UPDATE nextus_actors
  SET alignment_score_computed = false
  WHERE alignment_score IS NOT NULL
    AND alignment_score_computed IS NULL;


-- ────────────────────────────────────────────────────────────
-- Verify
-- ────────────────────────────────────────────────────────────

-- Run after migration to confirm:
--
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'nextus_needs'
--   AND column_name IN ('need_type', 'contribution_mode')
-- ORDER BY column_name;
--
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'nextus_actors'
--   AND column_name IN ('alignment_score', 'alignment_score_computed', 'alignment_score_updated_at')
-- ORDER BY column_name;
