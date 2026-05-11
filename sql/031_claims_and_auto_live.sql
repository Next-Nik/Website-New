-- 031_claims_and_auto_live.sql
--
-- 1. Creates nextus_claims table with full claim request fields.
-- 2. Adds `status` column to nextus_actors if not present, defaulting
--    to 'live' for self-submitted orgs (assume good).
-- 3. Enables RLS on nextus_claims per Standing 8 security rule.
--
-- Run in Supabase SQL editor before deploying the claim flow.

-- ── nextus_claims ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.nextus_claims (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id        uuid NOT NULL REFERENCES public.nextus_actors(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  claimant_email  text,
  role            text,                    -- "Head of Programmes at Hearth Lab"
  note            text,                    -- why they're the right person
  evidence        text,                    -- URL connecting them to the org
  status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','verified','rejected')),
  submitted_at    timestamptz NOT NULL DEFAULT now(),
  resolved_at     timestamptz,
  resolver_note   text,                    -- Nik's message back to the claimant
  UNIQUE (actor_id, user_id)               -- one claim per user per org
);

ALTER TABLE public.nextus_claims ENABLE ROW LEVEL SECURITY;

-- Users can insert their own claims
CREATE POLICY "Users can submit claims"
  ON public.nextus_claims FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can read their own claims
CREATE POLICY "Users can read own claims"
  ON public.nextus_claims FOR SELECT
  USING (auth.uid() = user_id);

-- Founders can read and update all claims (via service role in admin console)
-- The admin console uses the anon key + founder check in UI; service role
-- bypasses RLS for admin operations. No additional policy needed here.

-- ── nextus_actors: status column ─────────────────────────────────────────────
-- Add status if it doesn't exist. Self-submitted orgs go live immediately.
-- Seeded orgs are inserted with status = 'live' by the admin console.

ALTER TABLE public.nextus_actors
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'live'
    CHECK (status IN ('live', 'pending', 'suspended', 'draft'));

-- ── nextus_actors: claimed + profile_owner index ──────────────────────────────
-- Speed up the "unclaimed orgs" query on the public page.
CREATE INDEX IF NOT EXISTS idx_nextus_actors_claimed
  ON public.nextus_actors (claimed, profile_owner);
