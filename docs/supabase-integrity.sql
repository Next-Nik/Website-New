-- ══════════════════════════════════════════════════════════════
-- NextUs Integrity Layer — Supabase SQL
-- Run in Supabase SQL Editor. Safe to run multiple times (IF NOT EXISTS throughout).
-- ══════════════════════════════════════════════════════════════

-- ── 1. Columns on nextus_actors (integrity fields) ─────────────

ALTER TABLE nextus_actors
  ADD COLUMN IF NOT EXISTS needs_visible           boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS needs_hidden_reason     text,
  ADD COLUMN IF NOT EXISTS needs_hidden_at         timestamptz,
  ADD COLUMN IF NOT EXISTS dormant_since           timestamptz,
  ADD COLUMN IF NOT EXISTS alignment_score_computed     boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS alignment_score_updated_at   timestamptz;

-- Index for the cron job queries
CREATE INDEX IF NOT EXISTS idx_actors_needs_visible ON nextus_actors(needs_visible);
CREATE INDEX IF NOT EXISTS idx_actors_dormant       ON nextus_actors(dormant_since);

-- ── 2. Columns on nextus_contributor_offers (dormancy) ─────────

ALTER TABLE nextus_contributor_offers
  ADD COLUMN IF NOT EXISTS dormant_since timestamptz;

-- ── 3. nextus_contributor_enquiries ────────────────────────────
-- Stores messages sent from orgs (or any user) to contributors.

CREATE TABLE IF NOT EXISTS nextus_contributor_enquiries (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  contributor_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enquirer_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  offer_id         uuid REFERENCES nextus_contributor_offers(id) ON DELETE SET NULL,
  offer_title      text,
  message          text NOT NULL,
  read_at          timestamptz,
  replied_at       timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_enquiries_contributor ON nextus_contributor_enquiries(contributor_id);
CREATE INDEX IF NOT EXISTS idx_enquiries_enquirer    ON nextus_contributor_enquiries(enquirer_id);

-- RLS
ALTER TABLE nextus_contributor_enquiries ENABLE ROW LEVEL SECURITY;

-- Contributor can read messages sent to them
CREATE POLICY "enquiries_contributor_read" ON nextus_contributor_enquiries
  FOR SELECT USING (contributor_id = auth.uid());

-- Enquirer can read messages they sent
CREATE POLICY "enquiries_enquirer_read" ON nextus_contributor_enquiries
  FOR SELECT USING (enquirer_id = auth.uid());

-- Any authenticated user can send a message
CREATE POLICY "enquiries_insert" ON nextus_contributor_enquiries
  FOR INSERT WITH CHECK (enquirer_id = auth.uid());

-- Contributor can mark as read
CREATE POLICY "enquiries_contributor_update" ON nextus_contributor_enquiries
  FOR UPDATE USING (contributor_id = auth.uid());

-- ── 4. contributor_profiles view ───────────────────────────────
-- Powers the public contributor profile page.
-- Joins auth.users metadata with Purpose Piece results and
-- contributor offer activity.
-- NOTE: requires service role to read auth.users — this view
-- must be created with SECURITY DEFINER if needed.

CREATE OR REPLACE VIEW contributor_profiles AS
SELECT
  u.id,
  COALESCE(
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'name',
    split_part(u.email, '@', 1)
  )                                                    AS display_name,
  u.raw_user_meta_data->>'full_name'                   AS full_name,
  -- Purpose Piece coordinates from most recent result
  pp.session->'tentative'->'archetype'->>'archetype'   AS archetype,
  pp.session->'tentative'->'domain'->>'domain_id'      AS domain_id,
  pp.session->'tentative'->'scale'->>'scale'           AS scale,
  pp.profile->>'civilisational_statement'              AS civilisational_statement,
  pp.completed_at                                      AS purpose_piece_completed_at,
  -- Last activity signal from contributor offers
  (
    SELECT MAX(COALESCE(last_active_at, updated_at))
    FROM nextus_contributor_offers
    WHERE user_id = u.id
  )                                                    AS last_active_at,
  -- Offer count (active only)
  (
    SELECT COUNT(*)
    FROM nextus_contributor_offers
    WHERE user_id = u.id AND is_active = true
  )                                                    AS active_offer_count,
  -- Confirmed contribution count
  (
    SELECT COUNT(*)
    FROM nextus_contributions
    WHERE contributor_id = u.id AND confirmed_by_actor = true
  )                                                    AS confirmed_contribution_count
FROM auth.users u
LEFT JOIN LATERAL (
  SELECT session, profile, completed_at
  FROM purpose_piece_results
  WHERE user_id = u.id
  ORDER BY updated_at DESC
  LIMIT 1
) pp ON true
WHERE
  -- Only surface users who have at least one active offer or confirmed contribution
  EXISTS (
    SELECT 1 FROM nextus_contributor_offers
    WHERE user_id = u.id AND is_active = true
  )
  OR EXISTS (
    SELECT 1 FROM nextus_contributions
    WHERE contributor_id = u.id AND confirmed_by_actor = true
  );

-- ── 5. Updated query pattern for actors directory ───────────────
-- The NextUsActors.jsx page should filter needs_visible when
-- deciding whether to show needs badges on actor cards.
-- This is a reminder — not executable SQL.
--
-- In NextUsActors.jsx, the actor query should respect:
--   .eq('needs_visible', true)  -- when filtering actors with open needs
--
-- On NextUsActor.jsx public profile, the needs section should
-- check actor.needs_visible before rendering.
-- If false, show:
--   "This organisation is completing outstanding contribution
--    reports before posting new needs."
-- This is the smile. The teeth are in the cron job.

-- ── 6. Ensure nextus_actors has profile_owner indexed ──────────

CREATE INDEX IF NOT EXISTS idx_actors_profile_owner ON nextus_actors(profile_owner);
CREATE INDEX IF NOT EXISTS idx_actors_domain        ON nextus_actors(domain_id);

-- ── 7. RLS: integrity-cron uses service role key ───────────────
-- The cron job uses SUPABASE_SERVICE_ROLE_KEY which bypasses RLS.
-- No policy changes needed for the cron.
-- Confirm SUPABASE_SERVICE_ROLE_KEY is set in Vercel env vars.
-- Also set: CRON_SECRET (any strong random string, used to
-- authenticate manual POST calls to /api/integrity-cron).

-- ── Done ────────────────────────────────────────────────────────
-- Tables and views created:
--   nextus_actors          — 5 new columns
--   nextus_contributor_offers — 1 new column
--   nextus_contributor_enquiries — new table
--   contributor_profiles   — new view
--
-- Cron job:
--   /api/integrity-cron.js — runs nightly at 02:00 UTC
--   Schedule set in vercel.json crons array
