-- 033_missing_tables.sql
--
-- Adds tables that the live code references but were never migrated.
-- All idempotent (IF NOT EXISTS) so safe to re-run.
-- Each table gets RLS enabled with explicit policies per security rule.

-- ── nextus_onboarding_interest ────────────────────────────────────────────────
-- Captures emails from org/practitioner welcome flows when users opt into
-- early outreach. Written by BetaWelcomeNext.jsx after the welcome beats.

CREATE TABLE IF NOT EXISTS public.nextus_onboarding_interest (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text NOT NULL,
  kind          text,                              -- 'org' | 'practitioner' | etc.
  path          text,                              -- where they were when they signed up
  user_id       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes         text,
  reached_out   boolean NOT NULL DEFAULT false,
  reached_out_at timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.nextus_onboarding_interest ENABLE ROW LEVEL SECURITY;

-- Anyone (including anonymous) can submit interest. No SELECT for non-admin.
CREATE POLICY "Anyone can submit onboarding interest"
  ON public.nextus_onboarding_interest FOR INSERT
  WITH CHECK (true);

-- ── user_terms_acceptance ─────────────────────────────────────────────────────
-- Tracks which TOS version each user has accepted. Read by useTermsAcceptance.

CREATE TABLE IF NOT EXISTS public.user_terms_acceptance (
  user_id      uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  version      text NOT NULL,
  accepted_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_terms_acceptance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own terms acceptance"
  ON public.user_terms_acceptance FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users write own terms acceptance"
  ON public.user_terms_acceptance FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own terms acceptance"
  ON public.user_terms_acceptance FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── nextus_source_suggestions ────────────────────────────────────────────────
-- Anonymous-first source suggestions for civ indicators.
-- Read by /api/source-suggestion (GET) for accepted suggestions.
-- Written by the same endpoint (POST) for new submissions.

CREATE TABLE IF NOT EXISTS public.nextus_source_suggestions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  indicator_id    uuid REFERENCES public.nextus_domain_indicators(id) ON DELETE CASCADE,
  source_name     text NOT NULL,
  source_url      text NOT NULL,
  endpoint_url    text,
  cadence_hint    text,
  notes           text,
  submitter_email text,                                  -- optional, anonymous-first
  submitter_ip    inet,                                  -- for rate limiting
  status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'accepted', 'rejected')),
  submitted_at    timestamptz NOT NULL DEFAULT now(),
  resolved_at     timestamptz,
  resolver_note   text
);

CREATE INDEX IF NOT EXISTS idx_source_suggestions_indicator_status
  ON public.nextus_source_suggestions (indicator_id, status);

CREATE INDEX IF NOT EXISTS idx_source_suggestions_status
  ON public.nextus_source_suggestions (status, submitted_at DESC);

ALTER TABLE public.nextus_source_suggestions ENABLE ROW LEVEL SECURITY;

-- Public reads only for accepted suggestions
CREATE POLICY "Accepted source suggestions are public"
  ON public.nextus_source_suggestions FOR SELECT
  USING (status = 'accepted');

-- Anyone can submit a suggestion (anonymous-first design)
CREATE POLICY "Anyone can submit source suggestions"
  ON public.nextus_source_suggestions FOR INSERT
  WITH CHECK (true);

-- ── crisis_resources ──────────────────────────────────────────────────────────
-- Regional crisis hotline data. Read by CrisisResources.jsx and admin.
-- Public-readable, admin-writeable.

CREATE TABLE IF NOT EXISTS public.crisis_resources (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region        text NOT NULL,                            -- 'US', 'UK', 'CA', etc.
  topic         text,                                     -- 'suicide', 'self-harm', 'eating-disorder', etc.
  name          text NOT NULL,
  description   text,
  phone         text,
  text_line     text,
  website       text,
  hours         text,
  language      text,
  sort_order    integer DEFAULT 0,
  active        boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crisis_resources_region_topic
  ON public.crisis_resources (region, topic, active);

ALTER TABLE public.crisis_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Crisis resources are public"
  ON public.crisis_resources FOR SELECT
  USING (active = true);

-- Admin writes happen via service role.

-- ── That's it. ────────────────────────────────────────────────────────────────
-- Tables NOT created here, intentionally:
--
--   nextus_indicator_aliases, nextus_indicator_values_resolved
--     → These are part of migration 029 (per the migration notes). They
--       exist in the database but weren't in the schema-only.sql dump.
--       If you confirm they're live, no action needed. If not, separate
--       migration with their actual structure.
--
--   nextus_actor_domains
--     → Legacy table from the v9 architecture. Only referenced in pages
--       that are no longer routed (legacy admin, legacy NextUs pages).
--       Leave to die with the legacy code.
--
--   entitlements, group_members, group_entitlements
--     → Referenced only by legacy admin. If the new admin (BetaAdminConsole)
--       actually queries them, they need creating. Verify before adding.
