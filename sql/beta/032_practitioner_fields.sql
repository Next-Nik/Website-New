-- sql/beta/032_practitioner_fields.sql
-- Practitioner placement and offering fields on the existing
-- contributor_profiles_beta row. Per the Scopes & Onboarding brief,
-- Section 5.1 — My Practice field list.
--
-- We extend the existing contributor profile rather than fork a new
-- table. About half the practitioner fields (display_name, headline,
-- count_on_me_for, dont_count_on_me_for, engaged_self_domains) already
-- live on contributor_profiles_beta. The new fields below carry the
-- practitioner_ prefix so they are unambiguously practitioner-scope
-- regardless of which Mission Control surface reads them.
--
-- A user becomes a practitioner when they fill these in. Until they
-- do, they are a contributor — no role-shape change, no second table.
--
-- All columns nullable. The application enforces required-at-onboarding
-- for the eight listed in Section 5.1 of the brief; the DB stays
-- permissive so half-completed setup sessions persist cleanly.
--
-- Idempotent. Single transaction.

BEGIN;

ALTER TABLE contributor_profiles_beta
  ADD COLUMN IF NOT EXISTS practitioner_primary_domain    text,
  ADD COLUMN IF NOT EXISTS practitioner_secondary_domains text[],
  ADD COLUMN IF NOT EXISTS practitioner_subdomains        text[],
  ADD COLUMN IF NOT EXISTS practitioner_lenses            text[],
  ADD COLUMN IF NOT EXISTS practitioner_who_you_work_with text,
  ADD COLUMN IF NOT EXISTS practitioner_capacity_tiers    text[],
  ADD COLUMN IF NOT EXISTS practitioner_medium            text,
  ADD COLUMN IF NOT EXISTS practitioner_scale             text,
  ADD COLUMN IF NOT EXISTS practitioner_scale_notes       text,
  ADD COLUMN IF NOT EXISTS practitioner_accepting         text,
  ADD COLUMN IF NOT EXISTS practitioner_website           text;

-- Primary Self domain — locked to the seven canonical ids, or NULL.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'practitioner_primary_domain_check') THEN
    ALTER TABLE contributor_profiles_beta
      ADD CONSTRAINT practitioner_primary_domain_check
      CHECK (practitioner_primary_domain IS NULL
        OR practitioner_primary_domain IN
           ('path','spark','body','finances','connection','inner_game','signal'));
  END IF;
END$$;

-- Medium — Digital / In-person / Either, or NULL.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'practitioner_medium_check') THEN
    ALTER TABLE contributor_profiles_beta
      ADD CONSTRAINT practitioner_medium_check
      CHECK (practitioner_medium IS NULL
        OR practitioner_medium IN ('digital','in_person','either'));
  END IF;
END$$;

-- Scale — the eight-level scale from scales.js, or NULL.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'practitioner_scale_check') THEN
    ALTER TABLE contributor_profiles_beta
      ADD CONSTRAINT practitioner_scale_check
      CHECK (practitioner_scale IS NULL
        OR practitioner_scale IN
           ('individual','local','municipal','regional','national','international','global','planetary'));
  END IF;
END$$;

-- Accepting clients — three honest states, or NULL.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'practitioner_accepting_check') THEN
    ALTER TABLE contributor_profiles_beta
      ADD CONSTRAINT practitioner_accepting_check
      CHECK (practitioner_accepting IS NULL
        OR practitioner_accepting IN ('yes','waitlist','not_now'));
  END IF;
END$$;

-- Capacity tiers — each entry must be one of the five Module 7 tiers.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'practitioner_capacity_tiers_check') THEN
    ALTER TABLE contributor_profiles_beta
      ADD CONSTRAINT practitioner_capacity_tiers_check
      CHECK (practitioner_capacity_tiers IS NULL
        OR practitioner_capacity_tiers <@ ARRAY['micro','tiny','small','medium','large']::text[]);
  END IF;
END$$;

-- Light length cap on the free-text "who you work with" so the input
-- stays a sentence, not an essay.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'practitioner_who_length_check') THEN
    ALTER TABLE contributor_profiles_beta
      ADD CONSTRAINT practitioner_who_length_check
      CHECK (practitioner_who_you_work_with IS NULL
        OR char_length(practitioner_who_you_work_with) <= 280);
  END IF;
END$$;

COMMIT;
