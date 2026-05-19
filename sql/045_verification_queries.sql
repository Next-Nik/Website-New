-- ─────────────────────────────────────────────────────────────────────────────
-- Geographic Scale v2 — Phase v2.2 Verification Queries
--
-- Run these in Supabase SQL Editor after migrations 044, 044b, and 045 have
-- completed. Each query is independent — copy and paste them one at a time.
--
-- Purpose:
--   - Confirm the staging load took
--   - Confirm the filter migration produced the expected Tier 1 shape
--   - Spot-check parent linkage (every country has a continent parent, etc.)
--   - Provide a quick canary that the architecture's most meaningful proof is
--     in place — Canada exists as a Focus.
--
-- These queries are read-only. Safe to run any time, repeatedly.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── 1. Staging load — total rows ingested ──────────────────────────────────
select count(*) as staging_total
from public.geonames_raw;
-- Expected: ~13,418,484 (small variance if a few rows failed import).


-- ─── 2. Filter migration — total Tier 1 Focuses created from GeoNames ──────
select count(*) as focuses_from_geonames
from public.nextus_focuses
where geonames_id is not null;
-- Expected: roughly 50,000–80,000 depending on actual world population and
-- threshold matching.


-- ─── 3. Summary count by type ──────────────────────────────────────────────
select type, count(*)
from public.nextus_focuses
where type in (
  'planet','continent','ocean','realm','biome',
  'country','state_or_province','city',
  'mountain','mountain_range','river','lake','sea','bay','gulf',
  'desert','forest','region','island','archipelago'
)
group by type
order by count(*) desc;
-- Anchor rows (from migration 043): 1 planet, 7 continents, 5 oceans,
-- 8 realms, 14 biomes.
-- GeoNames rows (from migration 045): ~200-250 countries, ~3-4k ADM1,
-- ~20-30k cities, plus thousands of physical features.


-- ─── 4. Orphan check: every country has a continent parent ──────────────────
select count(*) as orphan_countries
from public.nextus_focuses
where type = 'country' and parent_id is null;
-- Expected: 0


-- ─── 5. Continent breakdown of countries ────────────────────────────────────
select c.name as continent, count(co.id) as countries
from public.nextus_focuses c
left join public.nextus_focuses co
  on co.parent_id = c.id and co.type = 'country'
where c.type = 'continent'
group by c.name
order by countries desc;
-- Expected approximate: Africa ~58, Asia ~54, Europe ~52, North America ~41,
--                       Oceania ~26, South America ~16, Antarctica ~3.


-- ─── 6. Spot check: well-known countries by ISO code ───────────────────────
select name, slug, geonames_id, kind
from public.nextus_focuses
where type = 'country'
  and slug in ('ca','mx','us','fr','jp','br','ke','au','de','in','cn','gb')
order by slug;


-- ─── 7. Canada exists. The original spark. ──────────────────────────────────
select id, name, slug, type, kind, parent_id, geonames_id, coordinates
from public.nextus_focuses
where slug = 'ca' and type = 'country';
-- Expected: one row. This is the architectural confirmation that what we
-- set out to do in this thread — make it structurally possible to claim
-- Canada on NextUs — is done.


-- ─── 8. Mexico City exists ─────────────────────────────────────────────────
select id, name, slug, type, kind, parent_id, coordinates
from public.nextus_focuses
where lower(name) = 'mexico city' and type = 'city';


-- ─── 9. Sanity check on coordinates ─────────────────────────────────────────
select count(*) as without_coords
from public.nextus_focuses
where type in ('country','city','mountain','river','lake')
  and coordinates is null;
-- Expected: small number or 0. Every GeoNames row has lat/lng.


-- ─── 10. Find ADM1 parent linkage ──────────────────────────────────────────
select
  count(*) filter (where adm.id is not null) as cities_linked_to_state,
  count(*) filter (where adm.id is null and ctry.id is not null) as cities_linked_to_country_only,
  count(*) filter (where ctry.id is null) as cities_orphaned
from public.nextus_focuses city
left join public.nextus_focuses adm
  on adm.id = city.parent_id and adm.type = 'state_or_province'
left join public.nextus_focuses ctry
  on (ctry.id = city.parent_id or ctry.id = adm.parent_id)
 and ctry.type = 'country'
where city.type = 'city';
-- Most cities should have a state parent. A minority will link directly to
-- the country (when admin1 wasn't seeded for some country). None should
-- be orphaned.
