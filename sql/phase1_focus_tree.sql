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
