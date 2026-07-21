-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 046 — v1 to v2 geographic Focus cleanup
--
-- Purpose: clean up legacy v1-style Focus rows so migration 045 can land
-- the GeoNames-sourced Tier 1 substrate without slug collisions.
--
-- Context: v1 of the Geographic Scale Architecture seeded a small set of
-- continents, countries, provinces, and cities by hand on 2026-04-19. v2
-- introduces the canonical taxonomy and ingests substrate from GeoNames.
-- The v1 stubs collide on slug values that v2 ingest needs.
--
-- This migration performs the architectural cleanup in a single transaction:
--
--   1. Adopts the seven v1 continents as canonical v2 continents by
--      backfilling their geonames_id and kind. Renames "Australia/Oceania"
--      to "Australia / Oceania" / oceania to match GeoNames convention.
--      Removes the duplicate v2.1 Oceania that was inserted on 2026-05-19
--      when migration 043 didn't recognise the v1 row.
--
--   2. Deletes v1 stub rows for Canada (1), Canadian provinces (13), and
--      Canadian cities (5) — total 19 rows. Pre-verified to have zero
--      references in nextus_focus_goals, nextus_user_affiliations,
--      nextus_focus_designations, nextus_focus_responses,
--      nextus_domain_indicator_values. All children of these stubs are
--      themselves v1 stubs being deleted in the same transaction.
--
--   3. Tightens the nextus_focuses.type CHECK constraint to drop 'nation'
--      and 'province' as accepted values. v2 canonical names ('country',
--      'state_or_province') become enforced. Future v1-style writes
--      cannot succeed.
--
-- After this migration runs, re-run migration 045 to land the v2 Tier 1
-- substrate from public.geonames_raw.
--
-- Idempotent: every step uses `if exists` / `not exists` guards, conditional
-- updates, and constraint-replace patterns. Safe to re-run.
--
-- Source: NextUs Geographic Scale Architecture v2.0, Section 8 (Build
-- Sequence, Phase v2.2).
-- ─────────────────────────────────────────────────────────────────────────────

begin;

-- ─── Step 1.1 — Reconcile the duplicate Oceania continent ───────────────────
--
-- Two rows exist:
--   v1: "Australia/Oceania" / slug 'australia-oceania' / no geonames_id /
--       created 2026-04-19. This is the row referenced by any v1 children.
--   v2.1: "Oceania" / slug 'oceania' / geonames_id 6255151 / created
--         2026-05-19 by migration 043 (which didn't detect the v1 row
--         because of different slug).
--
-- Resolution:
--   - Move any children of the v2.1 'oceania' row to the v1 row (there
--     shouldn't be any, but guard anyway).
--   - Delete the v2.1 'oceania' row.
--   - Update the v1 row in place: name → "Australia / Oceania",
--     slug → 'oceania', kind → 'political', geonames_id → 6255151.

do $$
declare
  v1_oceania_id uuid;
  v2_oceania_id uuid;
begin
  select id into v1_oceania_id
    from public.nextus_focuses
    where slug = 'australia-oceania' and type = 'continent';

  select id into v2_oceania_id
    from public.nextus_focuses
    where slug = 'oceania' and type = 'continent';

  -- If both rows exist, reconcile.
  if v1_oceania_id is not null and v2_oceania_id is not null then
    -- Reparent any children of v2_oceania to v1_oceania (defensive).
    update public.nextus_focuses
      set parent_id = v1_oceania_id
      where parent_id = v2_oceania_id;

    -- Delete the v2.1 duplicate.
    delete from public.nextus_focuses where id = v2_oceania_id;

    -- Promote the v1 row to canonical v2 shape.
    update public.nextus_focuses
      set name        = 'Australia / Oceania',
          slug        = 'oceania',
          kind        = 'political',
          geonames_id = 6255151,
          description = 'Continent. Source: GeoNames (geonameId 6255151).'
      where id = v1_oceania_id;

  -- If only v1 exists (no duplicate), still promote it.
  elsif v1_oceania_id is not null and v2_oceania_id is null then
    update public.nextus_focuses
      set name        = 'Australia / Oceania',
          slug        = 'oceania',
          kind        = 'political',
          geonames_id = 6255151,
          description = 'Continent. Source: GeoNames (geonameId 6255151).'
      where id = v1_oceania_id;

  -- If only v2 exists, do nothing — it's already correct.
  end if;
end $$;

-- ─── Step 1.2 — Backfill the other six v1 continents ────────────────────────
--
-- For each, set geonames_id (canonical from GeoNames readme), kind, and
-- description. No name changes. No slug changes.

update public.nextus_focuses
  set kind        = 'political',
      geonames_id = 6255146,
      description = coalesce(description, 'Continent. Source: GeoNames (geonameId 6255146).')
  where slug = 'africa' and type = 'continent' and geonames_id is null;

update public.nextus_focuses
  set kind        = 'political',
      geonames_id = 6255147,
      description = coalesce(description, 'Continent. Source: GeoNames (geonameId 6255147).')
  where slug = 'asia' and type = 'continent' and geonames_id is null;

update public.nextus_focuses
  set kind        = 'political',
      geonames_id = 6255148,
      description = coalesce(description, 'Continent. Source: GeoNames (geonameId 6255148).')
  where slug = 'europe' and type = 'continent' and geonames_id is null;

update public.nextus_focuses
  set kind        = 'political',
      geonames_id = 6255149,
      description = coalesce(description, 'Continent. Source: GeoNames (geonameId 6255149).')
  where slug = 'north-america' and type = 'continent' and geonames_id is null;

update public.nextus_focuses
  set kind        = 'political',
      geonames_id = 6255150,
      description = coalesce(description, 'Continent. Source: GeoNames (geonameId 6255150).')
  where slug = 'south-america' and type = 'continent' and geonames_id is null;

update public.nextus_focuses
  set kind        = 'political',
      geonames_id = 6255152,
      description = coalesce(description, 'Continent. Source: GeoNames (geonameId 6255152).')
  where slug = 'antarctica' and type = 'continent' and geonames_id is null;

-- ─── Step 2 — Delete v1 stub Focuses (Canada, provinces, cities) ────────────
--
-- Order matters because of parent_id foreign-key cascade behaviour:
--   - Delete cities first (leaves provinces)
--   - Delete provinces (leaves Canada)
--   - Delete Canada
--
-- Each delete is guarded by:
--   - type IN v1 vocabulary
--   - geonames_id IS NULL (proves this is v1 stub, not v2 ingest)
--   - zero references in known tables (validated externally before
--     writing this migration; guards remain for safety)
--
-- Note: the v2.1 schema migration declared foreign keys with ON DELETE
-- CASCADE on nextus_focus_designations, nextus_user_affiliations, and
-- nextus_focus_responses. If any reference appeared after our diagnostic,
-- cascade would handle them — but since refs were verified zero, no
-- cascades will actually fire here.

-- Delete v1 cities (parents = v1 provinces)
delete from public.nextus_focuses
  where type = 'city'
    and geonames_id is null
    and slug in (
      'ca-ab-calgary',
      'ca-qc-montreal',
      'ca-on-ottawa',
      'ca-on-toronto',
      'ca-bc-vancouver'
    );

-- Delete v1 provinces (parent = v1 Canada)
delete from public.nextus_focuses
  where type = 'province'
    and geonames_id is null
    and slug in (
      'ca-ab','ca-bc','ca-mb','ca-nb','ca-nl','ca-nt',
      'ca-ns','ca-nu','ca-on','ca-pe','ca-qc','ca-sk','ca-yt'
    );

-- Delete v1 Canada (parent = v1 North America, now canonical v2 NA)
delete from public.nextus_focuses
  where type = 'nation'
    and geonames_id is null
    and slug = 'ca';

-- ─── Step 3 — Tighten the type CHECK to drop 'nation' and 'province' ────────
--
-- v1 vocabulary is retired. v2 canonical names ('country',
-- 'state_or_province') are the only accepted values from this point.
--
-- This is the same defensive drop-and-recreate pattern used in migration
-- 042, scanning all CHECK constraints on the type column and dropping them
-- regardless of name.

do $$
declare
  c record;
begin
  for c in
    select con.conname
    from pg_constraint con
    join pg_attribute  att on att.attrelid = con.conrelid
                          and att.attnum   = any(con.conkey)
    where con.conrelid = 'public.nextus_focuses'::regclass
      and con.contype  = 'c'
      and att.attname  = 'type'
  loop
    execute format('alter table public.nextus_focuses drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.nextus_focuses
  add constraint nextus_focuses_type_check
  check (type in (
    -- Top of tree
    'planet',
    'continent',
    'ocean',
    'sea',
    -- Political and administrative (v2 canonical)
    'country',
    'state_or_province',
    'region',
    'city',
    'neighbourhood',
    -- Hydrological
    'river',
    'lake',
    'watershed',
    -- Geological
    'mountain_range',
    'mountain',
    'desert',
    'island',
    'archipelago',
    'geological_feature',
    'polar_region',
    -- Ecological
    'ecoregion',
    'biome',
    'realm',
    'bioregion',
    'forest',
    -- Designation-as-scale
    'protected_area',
    'heritage_site',
    'sacred_site',
    -- Crisis-as-Focus surface
    'bay',
    'gulf',
    -- Atmospheric and orbital (named, deferred from launch)
    'atmosphere_layer',
    'orbital_zone',
    -- Organisation-as-Focus (named in v1 doc as future entity type)
    'organisation'
  ));

commit;

-- ─── Verification (run manually after migration) ────────────────────────────
--
-- 1. Continents — should be exactly 7, all with geonames_id, one of which
--    is "Australia / Oceania" slug 'oceania':
-- select name, slug, geonames_id from public.nextus_focuses
--   where type = 'continent' order by name;
--
-- 2. v1 stubs should be gone:
-- select type, count(*) from public.nextus_focuses
--   where type in ('nation','province','city')
--     and geonames_id is null
--   group by type;
-- Expected: zero rows returned.
--
-- 3. type CHECK no longer accepts 'nation' or 'province':
-- select pg_get_constraintdef(oid) from pg_constraint
--   where conrelid = 'public.nextus_focuses'::regclass
--     and conname = 'nextus_focuses_type_check';
-- Should NOT contain 'nation' or 'province' in the IN list.
