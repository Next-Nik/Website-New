-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 043 — Top-of-tree Focus seed
--
-- Seeds the canonical anchor entities that v2 needs in place before any
-- downstream ingest. Small, finite, and stable.
--
-- Seeded:
--   - 1  planet         (Earth)
--   - 7  continents     (GeoNames-defined; IDs from the GeoNames readme)
--   - 5  oceans         (canonical major oceans)
--   - 14 biomes         (WWF TEOW biome taxonomy 1–14)
--   - 8  realms         (WWF TEOW biogeographic realms)
--
-- Idempotent: every insert is gated on absence (not exists) so re-running
-- this migration after edits never duplicates rows.
--
-- All seeded rows have:
--   - geonames_id where canonical (planet, continents)
--   - kind classification
--   - source attribution captured in description prefix
--
-- Source: NextUs Geographic Scale Architecture v2.0, Section 2 (scale + kind
-- taxonomy) and Section 7 (Source Registry).
--
-- Attribution requirements honoured:
--   - GeoNames: CC-BY 4.0 ("Data: GeoNames")
--   - WWF TEOW: use permitted for scientific/conservation/educational
--     purposes; biome and realm names preserved verbatim per use constraint
-- ─────────────────────────────────────────────────────────────────────────────

begin;

-- ─── 1. Planet ──────────────────────────────────────────────────────────────

insert into public.nextus_focuses (
  name, slug, type, kind, parent_id, geonames_id, wikidata_qid, description
)
select
  'Earth', 'earth', 'planet', 'political', null, 6295630, 'Q2',
  'The planet. Root of the geographic containment tree. Source: GeoNames (geonameId 6295630), Wikidata (Q2).'
where not exists (
  select 1 from public.nextus_focuses where slug = 'earth' and type = 'planet'
);

-- ─── 2. Continents ──────────────────────────────────────────────────────────
--
-- GeoNames IDs from the canonical readme:
--   AF Africa        6255146
--   AS Asia          6255147
--   EU Europe        6255148
--   NA North America 6255149
--   OC Oceania       6255151
--   SA South America 6255150
--   AN Antarctica    6255152

do $$
declare
  earth_id uuid;
begin
  select id into earth_id from public.nextus_focuses where slug = 'earth' and type = 'planet';

  insert into public.nextus_focuses (name, slug, type, kind, parent_id, geonames_id, description)
  select 'Africa', 'africa', 'continent', 'political', earth_id, 6255146,
         'Continent. Source: GeoNames (geonameId 6255146).'
  where not exists (select 1 from public.nextus_focuses where slug = 'africa' and type = 'continent');

  insert into public.nextus_focuses (name, slug, type, kind, parent_id, geonames_id, description)
  select 'Asia', 'asia', 'continent', 'political', earth_id, 6255147,
         'Continent. Source: GeoNames (geonameId 6255147).'
  where not exists (select 1 from public.nextus_focuses where slug = 'asia' and type = 'continent');

  insert into public.nextus_focuses (name, slug, type, kind, parent_id, geonames_id, description)
  select 'Europe', 'europe', 'continent', 'political', earth_id, 6255148,
         'Continent. Source: GeoNames (geonameId 6255148).'
  where not exists (select 1 from public.nextus_focuses where slug = 'europe' and type = 'continent');

  insert into public.nextus_focuses (name, slug, type, kind, parent_id, geonames_id, description)
  select 'North America', 'north-america', 'continent', 'political', earth_id, 6255149,
         'Continent. Source: GeoNames (geonameId 6255149).'
  where not exists (select 1 from public.nextus_focuses where slug = 'north-america' and type = 'continent');

  insert into public.nextus_focuses (name, slug, type, kind, parent_id, geonames_id, description)
  select 'South America', 'south-america', 'continent', 'political', earth_id, 6255150,
         'Continent. Source: GeoNames (geonameId 6255150).'
  where not exists (select 1 from public.nextus_focuses where slug = 'south-america' and type = 'continent');

  insert into public.nextus_focuses (name, slug, type, kind, parent_id, geonames_id, description)
  select 'Oceania', 'oceania', 'continent', 'political', earth_id, 6255151,
         'Continent. Source: GeoNames (geonameId 6255151).'
  where not exists (select 1 from public.nextus_focuses where slug = 'oceania' and type = 'continent');

  insert into public.nextus_focuses (name, slug, type, kind, parent_id, geonames_id, description)
  select 'Antarctica', 'antarctica', 'continent', 'political', earth_id, 6255152,
         'Continent. Source: GeoNames (geonameId 6255152).'
  where not exists (select 1 from public.nextus_focuses where slug = 'antarctica' and type = 'continent');
end $$;

-- ─── 3. Oceans ──────────────────────────────────────────────────────────────
--
-- Major ocean basins. GeoNames carries oceans under feature class 'H' /
-- code 'OCN'. IDs included where canonical.

do $$
declare
  earth_id uuid;
begin
  select id into earth_id from public.nextus_focuses where slug = 'earth' and type = 'planet';

  insert into public.nextus_focuses (name, slug, type, kind, parent_id, geonames_id, description)
  select 'Pacific Ocean', 'pacific-ocean', 'ocean', 'hydrological', earth_id, 4030875,
         'Major ocean basin. Source: GeoNames (geonameId 4030875).'
  where not exists (select 1 from public.nextus_focuses where slug = 'pacific-ocean' and type = 'ocean');

  insert into public.nextus_focuses (name, slug, type, kind, parent_id, geonames_id, description)
  select 'Atlantic Ocean', 'atlantic-ocean', 'ocean', 'hydrological', earth_id, 3373405,
         'Major ocean basin. Source: GeoNames (geonameId 3373405).'
  where not exists (select 1 from public.nextus_focuses where slug = 'atlantic-ocean' and type = 'ocean');

  insert into public.nextus_focuses (name, slug, type, kind, parent_id, geonames_id, description)
  select 'Indian Ocean', 'indian-ocean', 'ocean', 'hydrological', earth_id, 1545739,
         'Major ocean basin. Source: GeoNames (geonameId 1545739).'
  where not exists (select 1 from public.nextus_focuses where slug = 'indian-ocean' and type = 'ocean');

  insert into public.nextus_focuses (name, slug, type, kind, parent_id, geonames_id, description)
  select 'Arctic Ocean', 'arctic-ocean', 'ocean', 'hydrological', earth_id, 2960860,
         'Major ocean basin. Source: GeoNames (geonameId 2960860).'
  where not exists (select 1 from public.nextus_focuses where slug = 'arctic-ocean' and type = 'ocean');

  insert into public.nextus_focuses (name, slug, type, kind, parent_id, geonames_id, description)
  select 'Southern Ocean', 'southern-ocean', 'ocean', 'hydrological', earth_id, 4036776,
         'Major ocean basin encircling Antarctica. Source: GeoNames (geonameId 4036776).'
  where not exists (select 1 from public.nextus_focuses where slug = 'southern-ocean' and type = 'ocean');
end $$;

-- ─── 4. Biogeographic Realms ────────────────────────────────────────────────
--
-- The 8 realms from WWF TEOW. Codes preserved per WWF use constraint
-- (no modification of names or classifications).
--
-- Realm codes from the TEOW dataset:
--   AA Australasia    AN Antarctic     AT Afrotropics
--   IM IndoMalay      NA Nearctic      NT Neotropics
--   OC Oceania        PA Palearctic

do $$
declare
  earth_id uuid;
begin
  select id into earth_id from public.nextus_focuses where slug = 'earth' and type = 'planet';

  insert into public.nextus_focuses (name, slug, type, kind, parent_id, description)
  select 'Australasia', 'realm-australasia', 'realm', 'ecological', earth_id,
         'Biogeographic realm. Code: AA. Source: WWF Terrestrial Ecoregions of the World (Olson et al. 2001).'
  where not exists (select 1 from public.nextus_focuses where slug = 'realm-australasia' and type = 'realm');

  insert into public.nextus_focuses (name, slug, type, kind, parent_id, description)
  select 'Antarctic', 'realm-antarctic', 'realm', 'ecological', earth_id,
         'Biogeographic realm. Code: AN. Source: WWF Terrestrial Ecoregions of the World (Olson et al. 2001).'
  where not exists (select 1 from public.nextus_focuses where slug = 'realm-antarctic' and type = 'realm');

  insert into public.nextus_focuses (name, slug, type, kind, parent_id, description)
  select 'Afrotropics', 'realm-afrotropics', 'realm', 'ecological', earth_id,
         'Biogeographic realm. Code: AT. Source: WWF Terrestrial Ecoregions of the World (Olson et al. 2001).'
  where not exists (select 1 from public.nextus_focuses where slug = 'realm-afrotropics' and type = 'realm');

  insert into public.nextus_focuses (name, slug, type, kind, parent_id, description)
  select 'IndoMalay', 'realm-indomalay', 'realm', 'ecological', earth_id,
         'Biogeographic realm. Code: IM. Source: WWF Terrestrial Ecoregions of the World (Olson et al. 2001).'
  where not exists (select 1 from public.nextus_focuses where slug = 'realm-indomalay' and type = 'realm');

  insert into public.nextus_focuses (name, slug, type, kind, parent_id, description)
  select 'Nearctic', 'realm-nearctic', 'realm', 'ecological', earth_id,
         'Biogeographic realm. Code: NA. Source: WWF Terrestrial Ecoregions of the World (Olson et al. 2001).'
  where not exists (select 1 from public.nextus_focuses where slug = 'realm-nearctic' and type = 'realm');

  insert into public.nextus_focuses (name, slug, type, kind, parent_id, description)
  select 'Neotropics', 'realm-neotropics', 'realm', 'ecological', earth_id,
         'Biogeographic realm. Code: NT. Source: WWF Terrestrial Ecoregions of the World (Olson et al. 2001).'
  where not exists (select 1 from public.nextus_focuses where slug = 'realm-neotropics' and type = 'realm');

  insert into public.nextus_focuses (name, slug, type, kind, parent_id, description)
  select 'Oceania (realm)', 'realm-oceania', 'realm', 'ecological', earth_id,
         'Biogeographic realm. Code: OC. Distinct from the political continent of Oceania. Source: WWF Terrestrial Ecoregions of the World (Olson et al. 2001).'
  where not exists (select 1 from public.nextus_focuses where slug = 'realm-oceania' and type = 'realm');

  insert into public.nextus_focuses (name, slug, type, kind, parent_id, description)
  select 'Palearctic', 'realm-palearctic', 'realm', 'ecological', earth_id,
         'Biogeographic realm. Code: PA. Source: WWF Terrestrial Ecoregions of the World (Olson et al. 2001).'
  where not exists (select 1 from public.nextus_focuses where slug = 'realm-palearctic' and type = 'realm');
end $$;

-- ─── 5. Biomes ──────────────────────────────────────────────────────────────
--
-- The 14 canonical biomes from WWF TEOW. Names preserved verbatim per
-- the WWF use constraint. Numeric codes 1–14 stored in slug for stable
-- reference.

do $$
declare
  earth_id uuid;
begin
  select id into earth_id from public.nextus_focuses where slug = 'earth' and type = 'planet';

  insert into public.nextus_focuses (name, slug, type, kind, parent_id, description)
  select 'Tropical & Subtropical Moist Broadleaf Forests', 'biome-01', 'biome', 'ecological', earth_id,
         'WWF Biome 1. Source: WWF Terrestrial Ecoregions of the World (Olson et al. 2001).'
  where not exists (select 1 from public.nextus_focuses where slug = 'biome-01' and type = 'biome');

  insert into public.nextus_focuses (name, slug, type, kind, parent_id, description)
  select 'Tropical & Subtropical Dry Broadleaf Forests', 'biome-02', 'biome', 'ecological', earth_id,
         'WWF Biome 2. Source: WWF Terrestrial Ecoregions of the World (Olson et al. 2001).'
  where not exists (select 1 from public.nextus_focuses where slug = 'biome-02' and type = 'biome');

  insert into public.nextus_focuses (name, slug, type, kind, parent_id, description)
  select 'Tropical & Subtropical Coniferous Forests', 'biome-03', 'biome', 'ecological', earth_id,
         'WWF Biome 3. Source: WWF Terrestrial Ecoregions of the World (Olson et al. 2001).'
  where not exists (select 1 from public.nextus_focuses where slug = 'biome-03' and type = 'biome');

  insert into public.nextus_focuses (name, slug, type, kind, parent_id, description)
  select 'Temperate Broadleaf & Mixed Forests', 'biome-04', 'biome', 'ecological', earth_id,
         'WWF Biome 4. Source: WWF Terrestrial Ecoregions of the World (Olson et al. 2001).'
  where not exists (select 1 from public.nextus_focuses where slug = 'biome-04' and type = 'biome');

  insert into public.nextus_focuses (name, slug, type, kind, parent_id, description)
  select 'Temperate Conifer Forests', 'biome-05', 'biome', 'ecological', earth_id,
         'WWF Biome 5. Source: WWF Terrestrial Ecoregions of the World (Olson et al. 2001).'
  where not exists (select 1 from public.nextus_focuses where slug = 'biome-05' and type = 'biome');

  insert into public.nextus_focuses (name, slug, type, kind, parent_id, description)
  select 'Boreal Forests / Taiga', 'biome-06', 'biome', 'ecological', earth_id,
         'WWF Biome 6. Source: WWF Terrestrial Ecoregions of the World (Olson et al. 2001).'
  where not exists (select 1 from public.nextus_focuses where slug = 'biome-06' and type = 'biome');

  insert into public.nextus_focuses (name, slug, type, kind, parent_id, description)
  select 'Tropical & Subtropical Grasslands, Savannas & Shrublands', 'biome-07', 'biome', 'ecological', earth_id,
         'WWF Biome 7. Source: WWF Terrestrial Ecoregions of the World (Olson et al. 2001).'
  where not exists (select 1 from public.nextus_focuses where slug = 'biome-07' and type = 'biome');

  insert into public.nextus_focuses (name, slug, type, kind, parent_id, description)
  select 'Temperate Grasslands, Savannas & Shrublands', 'biome-08', 'biome', 'ecological', earth_id,
         'WWF Biome 8. Source: WWF Terrestrial Ecoregions of the World (Olson et al. 2001).'
  where not exists (select 1 from public.nextus_focuses where slug = 'biome-08' and type = 'biome');

  insert into public.nextus_focuses (name, slug, type, kind, parent_id, description)
  select 'Flooded Grasslands & Savannas', 'biome-09', 'biome', 'ecological', earth_id,
         'WWF Biome 9. Source: WWF Terrestrial Ecoregions of the World (Olson et al. 2001).'
  where not exists (select 1 from public.nextus_focuses where slug = 'biome-09' and type = 'biome');

  insert into public.nextus_focuses (name, slug, type, kind, parent_id, description)
  select 'Montane Grasslands & Shrublands', 'biome-10', 'biome', 'ecological', earth_id,
         'WWF Biome 10. Source: WWF Terrestrial Ecoregions of the World (Olson et al. 2001).'
  where not exists (select 1 from public.nextus_focuses where slug = 'biome-10' and type = 'biome');

  insert into public.nextus_focuses (name, slug, type, kind, parent_id, description)
  select 'Tundra', 'biome-11', 'biome', 'ecological', earth_id,
         'WWF Biome 11. Source: WWF Terrestrial Ecoregions of the World (Olson et al. 2001).'
  where not exists (select 1 from public.nextus_focuses where slug = 'biome-11' and type = 'biome');

  insert into public.nextus_focuses (name, slug, type, kind, parent_id, description)
  select 'Mediterranean Forests, Woodlands & Scrub', 'biome-12', 'biome', 'ecological', earth_id,
         'WWF Biome 12. Source: WWF Terrestrial Ecoregions of the World (Olson et al. 2001).'
  where not exists (select 1 from public.nextus_focuses where slug = 'biome-12' and type = 'biome');

  insert into public.nextus_focuses (name, slug, type, kind, parent_id, description)
  select 'Deserts & Xeric Shrublands', 'biome-13', 'biome', 'ecological', earth_id,
         'WWF Biome 13. Source: WWF Terrestrial Ecoregions of the World (Olson et al. 2001).'
  where not exists (select 1 from public.nextus_focuses where slug = 'biome-13' and type = 'biome');

  insert into public.nextus_focuses (name, slug, type, kind, parent_id, description)
  select 'Mangroves', 'biome-14', 'biome', 'ecological', earth_id,
         'WWF Biome 14. Source: WWF Terrestrial Ecoregions of the World (Olson et al. 2001).'
  where not exists (select 1 from public.nextus_focuses where slug = 'biome-14' and type = 'biome');
end $$;

commit;

-- ─── Verification queries ───────────────────────────────────────────────────
-- select type, count(*) from public.nextus_focuses
--   where type in ('planet','continent','ocean','realm','biome')
--   group by type order by type;
--
-- Expected:
--   biome      14
--   continent   7
--   ocean       5
--   planet      1
--   realm       8
-- Total: 35 rows seeded by this migration.
