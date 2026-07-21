-- 159_challenge_subdomain.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- Challenge subdomain + founding close-date correction (June 2026).
--
-- The founding-mode challenge builder (the Earth Challenge "Create a challenge"
-- door) asks the author which part of the living world their challenge touches:
-- one of the seven canonical Nature subdomains seeded in 145
--   nat-earth · nat-air · nat-salt-water · nat-fresh-water
--   nat-flora · nat-fauna · nat-living-systems
--
-- Stored as a plain text key (the nextus_subdomains.id value). No hard FK: the
-- id column's type has drifted across migrations, so a constraint here risks a
-- failed run. The builder constrains the value to the canon client-side, and the
-- create endpoint validates against the known set. A challenge with no subdomain
-- (every challenge authored outside founding mode) simply leaves this NULL.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE actor_calls
  ADD COLUMN IF NOT EXISTS subdomain_slug text;

COMMENT ON COLUMN actor_calls.subdomain_slug IS
  'Which subdomain this challenge touches, as a nextus_subdomains key (e.g. nat-fresh-water). Set by the founding-mode builder; NULL for ordinary challenges.';

CREATE INDEX IF NOT EXISTS idx_actor_calls_subdomain
  ON actor_calls (subdomain_slug)
  WHERE subdomain_slug IS NOT NULL;

-- ── Founding close date ───────────────────────────────────────────────────────
-- The constellation closes the day after Climate Week's witnessing date. The
-- 115/152 seed carried the 27th; the canonical close is September 28, 2026.
UPDATE constellation_beacons
   SET closes_on = '2026-09-28'
 WHERE slug = 'founding-nature';
