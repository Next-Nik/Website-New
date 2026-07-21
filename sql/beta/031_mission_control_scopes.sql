-- sql/beta/031_mission_control_scopes.sql
-- Mission Control scope visibility per user.
-- Per the Scopes & Onboarding brief, Section 4.2.
--
-- A simple text[] column holding the active scope ids:
--   'self'     — My Life
--   'planet'   — The Planet
--   'practice' — My Practice
--   'org'      — My Org
--
-- The order of the array does not matter; the toggle bar in Mission
-- Control renders scopes in fixed display order regardless. The
-- presence of an id activates that scope's slot in the toggle bar.
--
-- Defaults:
--   New personal users get ['self','planet'] — today's behaviour.
--   Org-track signups get ['org'] (handled in the welcome flow, not
--   in this migration).
--
-- Constraints:
--   • Every entry must be one of the four locked ids.
--   • The array cannot be empty — Mission Control without a scope is
--     meaningless. UI prevents the user from deactivating their last
--     scope; we enforce that at the DB level too.
--
-- Single transaction, idempotent.

BEGIN;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS mission_control_scopes text[]
    NOT NULL DEFAULT ARRAY['self','planet'];

-- Constraint: every entry must be a known scope id.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_mc_scopes_valid_check'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_mc_scopes_valid_check
      CHECK (
        mission_control_scopes <@ ARRAY['self','planet','practice','org']::text[]
      );
  END IF;
END$$;

-- Constraint: array cannot be empty.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_mc_scopes_nonempty_check'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_mc_scopes_nonempty_check
      CHECK (array_length(mission_control_scopes, 1) >= 1);
  END IF;
END$$;

-- Backfill any rows that landed before the default took effect.
-- Idempotent: only touches rows where the column ended up NULL or empty,
-- which should not happen with the NOT NULL DEFAULT but is defensive.
UPDATE users
SET    mission_control_scopes = ARRAY['self','planet']
WHERE  mission_control_scopes IS NULL
   OR  array_length(mission_control_scopes, 1) IS NULL;

COMMIT;
