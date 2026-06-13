-- 116_member_card.sql
-- ─────────────────────────────────────────────────────────────────────────
-- Person-scale public member card.
--
-- A member's public presence on the Planet is a CONTRIBUTION-RAIL surface:
-- it shows where a person stands and what they contribute, never their
-- developmental work. The becoming rail (Horizon Self, Map scores, I Am
-- Statements, journal, practices, streaks, self-side Stretches) is NEVER
-- published and has no opt-in toggle by design.
--
-- This migration adds three person-scale columns to public.users and a single
-- visibility flag. Everything else the member card renders already exists:
--   • owned actor profiles      → nextus_actors.profile_owner
--   • Planet Sprints completed   → target_sprint_sessions (scale = 'civ')
--   • spaces / affiliations      → nextus_user_affiliations (visibility = 'public')
--   • constellations             → surfaced through owned actors (migration 115)
--
-- Apply order: after 115_constellations.sql.
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE public.users
  -- Self-authored public bio. A deliberate written act — NOT piped from any
  -- developmental field. Empty by default; the card hides the section if blank.
  ADD COLUMN IF NOT EXISTS public_bio text;

ALTER TABLE public.users
  -- Domains of interest as a CONTRIBUTION stance ("where I'm working"), stored
  -- as canonical personal-domain slugs. This is the domain NAMES only — never
  -- Map scores. Public when the member card is public.
  ADD COLUMN IF NOT EXISTS domains_of_interest text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.users
  -- Master visibility for the public member card. Off by default: a member is
  -- placed in the ecosystem only when they choose to be. When false, /member/
  -- returns not-found for everyone except the member themselves (preview).
  ADD COLUMN IF NOT EXISTS member_card_public boolean NOT NULL DEFAULT false;

ALTER TABLE public.users
  -- Stable public handle for the /member/{slug} URL. Nullable until the member
  -- publishes; generated from name at publish time in the app layer.
  ADD COLUMN IF NOT EXISTS member_slug text UNIQUE;

CREATE INDEX IF NOT EXISTS idx_users_member_slug
  ON public.users (member_slug)
  WHERE member_slug IS NOT NULL;

COMMENT ON COLUMN public.users.public_bio IS
  'Self-authored public bio for the member card. Never derived from developmental-rail fields.';
COMMENT ON COLUMN public.users.domains_of_interest IS
  'Personal-domain slugs shown as contribution stance on the member card. Names only, never Map scores.';
COMMENT ON COLUMN public.users.member_card_public IS
  'Master switch for the public /member card. Off by default — placement is opt-in.';
COMMENT ON COLUMN public.users.member_slug IS
  'Public handle for the /member/{slug} URL. Null until published.';

-- ── Public read: a column-safe VIEW, never a row policy on users ────────────
-- A row-level SELECT policy on public.users (USING member_card_public = true)
-- would expose EVERY column of those rows — email, region, account state — to
-- anyone, because RLS gates rows, not columns. We never do that.
--
-- Instead the public reads through a view that exposes ONLY the contribution-
-- rail columns of published members. No inner-rail field (Horizon Self, Map
-- scores, etc. — none of which live on this table anyway) and no account field
-- (email, status) is selectable through it. The view is owned by the migration
-- role and runs with security_invoker = false so the public can read it without
-- a row policy on the base table.

CREATE OR REPLACE VIEW public.member_cards
  WITH (security_invoker = false)
  AS
  SELECT
    member_slug,
    first_name,
    last_name,
    public_bio,
    domains_of_interest,
    location,
    region
  FROM public.users
  WHERE member_card_public = true
    AND member_slug IS NOT NULL;

COMMENT ON VIEW public.member_cards IS
  'Public contribution-rail member cards. Exposes only whitelisted columns of published members. Never exposes email, account state, or any developmental-rail field.';

GRANT SELECT ON public.member_cards TO anon, authenticated;

-- Owned actors, Planet Sprints, and public affiliations are read through their
-- own tables, which already carry appropriate RLS (actors public when live,
-- affiliations public when visibility = 'public'). The app queries those keyed
-- by the member's user_id, which it resolves from member_cards first.

-- Verification:
--   SELECT column_name FROM information_schema.columns
--     WHERE table_name = 'users'
--       AND column_name IN ('public_bio','domains_of_interest','member_card_public','member_slug');
--   → 4 rows
--   SELECT * FROM public.member_cards LIMIT 1;   -- exposes only the 7 safe columns
--   -- Confirm email is NOT reachable through the view:
--   SELECT column_name FROM information_schema.columns WHERE table_name = 'member_cards';
--   → member_slug, first_name, last_name, public_bio, domains_of_interest, location, region
--
-- Rollback:
--   DROP VIEW IF EXISTS public.member_cards;
--   ALTER TABLE public.users DROP COLUMN IF EXISTS member_slug;
--   ALTER TABLE public.users DROP COLUMN IF EXISTS member_card_public;
--   ALTER TABLE public.users DROP COLUMN IF EXISTS domains_of_interest;
--   ALTER TABLE public.users DROP COLUMN IF EXISTS public_bio;
