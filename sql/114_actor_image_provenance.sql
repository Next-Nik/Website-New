-- 114_actor_image_provenance.sql
-- C7 — Image hosting + provenance (June 2026).
--
-- Adds image_provenance to nextus_actors to track whether an image URL
-- is a hotlink (risky: can rot, slow pages) or a Supabase Storage upload
-- (stable, fast, rights-documented).
--
-- The seeding pipeline uploads images to Supabase Storage and sets
-- image_provenance = 'storage'. Entries with image_provenance = 'hotlink'
-- are visible in the Floor tab as candidates for re-hosting.

ALTER TABLE nextus_actors
  ADD COLUMN IF NOT EXISTS image_provenance text
    CHECK (image_provenance IN ('hotlink', 'storage', 'self_uploaded'));

COMMENT ON COLUMN nextus_actors.image_provenance IS
  'hotlink=URL from source site (may rot). storage=uploaded to Supabase Storage. self_uploaded=actor uploaded it themselves.';

-- Mark all existing image URLs as hotlinks so they appear in the
-- Floor tab as candidates for re-hosting.
UPDATE nextus_actors
  SET image_provenance = 'hotlink'
  WHERE image_url IS NOT NULL
    AND image_provenance IS NULL;
