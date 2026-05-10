-- sql/beta/028_user_location.sql
-- Optional user location, used (initially) to surface region-appropriate
-- crisis-band resources in the Self-side Resources Engine.
--
-- Two fields:
--   location  — free text. What the user types: city, country, "Mexico
--               City", "London", "Remote / nomadic". Cosmetic; we never
--               reverse-geocode it silently.
--   region    — short enum. Used as the routing primitive when picking
--               a crisis-line resource. NULL means "unknown" — fall back
--               to a manual region picker rather than guessing.
--
-- Both are optional. We only ask, we never require.
-- Single transaction, idempotent.

BEGIN;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS region   text;

-- Region constraint: only accept values from a known list, or NULL.
-- Expansion path: when we add another region, alter the constraint.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_region_check'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_region_check
      CHECK (region IS NULL OR region IN ('US','UK','EU','CA','AU','NZ','OTHER'));
  END IF;
END$$;

-- Soft length limits so the free-text field stays reasonable.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_location_length_check'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_location_length_check
      CHECK (location IS NULL OR char_length(location) <= 120);
  END IF;
END$$;

COMMIT;
