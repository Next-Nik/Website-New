-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 045 — Phase v2.2 ingest: GeoNames → nextus_focuses
--
-- Reads from public.geonames_raw (loaded by you via Supabase CSV import or
-- psql \COPY from allCountries.txt) and inserts filtered Tier 1 rows into
-- nextus_focuses with proper NextUs scale, kind, parent_id, attribution.
--
-- The full GeoNames gazetteer is ~13.4 million rows. This migration filters
-- to roughly 30,000–80,000 Tier 1 rows:
--
--   - Countries and dependent political entities
--   - First-order administrative subdivisions (states / provinces)
--   - Capital cities and major cities (PPLC/PPLA/PPLA2/PPLG and PPL with
--     population >= 15,000)
--   - Major physical features: mountains/ranges (≥2000m), named rivers,
--     lakes, deserts, islands, archipelagos, forests, regions
--
-- Everything else stays in geonames_raw as Tier 2 lookup substrate.
--
-- Idempotent: every insert is gated on geonames_id not already present in
-- nextus_focuses. Safe to re-run.
--
-- Source: NextUs Geographic Scale Architecture v2.0, Section 8 (Build
-- Sequence, Phase v2.2). Feature class/code mapping per GeoNames feature
-- codes documentation: https://www.geonames.org/export/codes.html
-- ─────────────────────────────────────────────────────────────────────────────

begin;

-- ─── Helper: continent slug from GeoNames country code ──────────────────────
--
-- GeoNames uses two-letter continent codes embedded in countryInfo.txt and
-- referenced indirectly through country_code in the main gazetteer. We
-- derive continent membership from a deterministic country_code →
-- continent_slug map.

create temp table _continent_by_country (
  country_code  text primary key,
  continent_slug text not null
);

-- Africa (AF)
insert into _continent_by_country values
  ('DZ','africa'),('AO','africa'),('BJ','africa'),('BW','africa'),('BF','africa'),
  ('BI','africa'),('CM','africa'),('CV','africa'),('CF','africa'),('TD','africa'),
  ('KM','africa'),('CD','africa'),('CG','africa'),('CI','africa'),('DJ','africa'),
  ('EG','africa'),('GQ','africa'),('ER','africa'),('SZ','africa'),('ET','africa'),
  ('GA','africa'),('GM','africa'),('GH','africa'),('GN','africa'),('GW','africa'),
  ('KE','africa'),('LS','africa'),('LR','africa'),('LY','africa'),('MG','africa'),
  ('MW','africa'),('ML','africa'),('MR','africa'),('MU','africa'),('YT','africa'),
  ('MA','africa'),('MZ','africa'),('NA','africa'),('NE','africa'),('NG','africa'),
  ('RE','africa'),('RW','africa'),('SH','africa'),('ST','africa'),('SN','africa'),
  ('SC','africa'),('SL','africa'),('SO','africa'),('ZA','africa'),('SS','africa'),
  ('SD','africa'),('TZ','africa'),('TG','africa'),('TN','africa'),('UG','africa'),
  ('EH','africa'),('ZM','africa'),('ZW','africa');

-- Asia (AS)
insert into _continent_by_country values
  ('AF','asia'),('AM','asia'),('AZ','asia'),('BH','asia'),('BD','asia'),
  ('BT','asia'),('IO','asia'),('BN','asia'),('KH','asia'),('CN','asia'),
  ('CX','asia'),('CC','asia'),('CY','asia'),('GE','asia'),('HK','asia'),
  ('IN','asia'),('ID','asia'),('IR','asia'),('IQ','asia'),('IL','asia'),
  ('JP','asia'),('JO','asia'),('KZ','asia'),('KP','asia'),('KR','asia'),
  ('KW','asia'),('KG','asia'),('LA','asia'),('LB','asia'),('MO','asia'),
  ('MY','asia'),('MV','asia'),('MN','asia'),('MM','asia'),('NP','asia'),
  ('OM','asia'),('PK','asia'),('PS','asia'),('PH','asia'),('QA','asia'),
  ('SA','asia'),('SG','asia'),('LK','asia'),('SY','asia'),('TW','asia'),
  ('TJ','asia'),('TH','asia'),('TL','asia'),('TR','asia'),('TM','asia'),
  ('AE','asia'),('UZ','asia'),('VN','asia'),('YE','asia');

-- Europe (EU)
insert into _continent_by_country values
  ('AX','europe'),('AL','europe'),('AD','europe'),('AT','europe'),('BY','europe'),
  ('BE','europe'),('BA','europe'),('BG','europe'),('HR','europe'),('CZ','europe'),
  ('DK','europe'),('EE','europe'),('FO','europe'),('FI','europe'),('FR','europe'),
  ('DE','europe'),('GI','europe'),('GR','europe'),('GG','europe'),('VA','europe'),
  ('HU','europe'),('IS','europe'),('IE','europe'),('IM','europe'),('IT','europe'),
  ('JE','europe'),('XK','europe'),('LV','europe'),('LI','europe'),('LT','europe'),
  ('LU','europe'),('MT','europe'),('MD','europe'),('MC','europe'),('ME','europe'),
  ('NL','europe'),('MK','europe'),('NO','europe'),('PL','europe'),('PT','europe'),
  ('RO','europe'),('RU','europe'),('SM','europe'),('RS','europe'),('SK','europe'),
  ('SI','europe'),('ES','europe'),('SJ','europe'),('SE','europe'),('CH','europe'),
  ('UA','europe'),('GB','europe');

-- North America (NA)
insert into _continent_by_country values
  ('AI','north-america'),('AG','north-america'),('AW','north-america'),('BS','north-america'),
  ('BB','north-america'),('BZ','north-america'),('BM','north-america'),('BQ','north-america'),
  ('VG','north-america'),('CA','north-america'),('KY','north-america'),('CR','north-america'),
  ('CU','north-america'),('CW','north-america'),('DM','north-america'),('DO','north-america'),
  ('SV','north-america'),('GL','north-america'),('GD','north-america'),('GP','north-america'),
  ('GT','north-america'),('HT','north-america'),('HN','north-america'),('JM','north-america'),
  ('MQ','north-america'),('MX','north-america'),('MS','north-america'),('NI','north-america'),
  ('PA','north-america'),('PR','north-america'),('BL','north-america'),('KN','north-america'),
  ('LC','north-america'),('MF','north-america'),('PM','north-america'),('VC','north-america'),
  ('SX','north-america'),('TT','north-america'),('TC','north-america'),('US','north-america'),
  ('VI','north-america');

-- Oceania (OC)
insert into _continent_by_country values
  ('AS','oceania'),('AU','oceania'),('CK','oceania'),('FJ','oceania'),('PF','oceania'),
  ('GU','oceania'),('KI','oceania'),('MH','oceania'),('FM','oceania'),('NR','oceania'),
  ('NC','oceania'),('NZ','oceania'),('NU','oceania'),('NF','oceania'),('MP','oceania'),
  ('PW','oceania'),('PG','oceania'),('PN','oceania'),('WS','oceania'),('SB','oceania'),
  ('TK','oceania'),('TO','oceania'),('TV','oceania'),('UM','oceania'),('VU','oceania'),
  ('WF','oceania');

-- South America (SA)
insert into _continent_by_country values
  ('AR','south-america'),('BO','south-america'),('BV','south-america'),('BR','south-america'),
  ('CL','south-america'),('CO','south-america'),('EC','south-america'),('FK','south-america'),
  ('GF','south-america'),('GY','south-america'),('PY','south-america'),('PE','south-america'),
  ('GS','south-america'),('SR','south-america'),('UY','south-america'),('VE','south-america');

-- Antarctica (AN)
insert into _continent_by_country values
  ('AQ','antarctica'),('TF','antarctica'),('HM','antarctica');

-- ─── Tier 1.1 Countries and dependent political entities ────────────────────
--
-- GeoNames feature codes:
--   PCLI  - independent political entity (sovereign country)
--   PCLD  - dependent political entity (territory)
--   PCLF  - freely associated state
--   PCLS  - semi-independent political entity
--   TERR  - territory
--
-- Slug strategy: lowercase ISO country_code where available.

insert into public.nextus_focuses
  (name, slug, type, kind, parent_id, geonames_id, coordinates, description)
select
  g.name,
  lower(g.country_code),
  'country',
  'political',
  c.id,
  g.geonameid,
  jsonb_build_object('lat', g.latitude, 'lng', g.longitude),
  format('Country. Source: GeoNames (geonameId %s). %s',
         g.geonameid,
         case when g.population > 0
              then format('Population: %s.', g.population)
              else '' end)
from public.geonames_raw g
join _continent_by_country cc
  on cc.country_code = g.country_code
join public.nextus_focuses c
  on c.slug = cc.continent_slug
 and c.type = 'continent'
where g.feature_class = 'A'
  and g.feature_code in ('PCLI', 'PCLD', 'PCLF', 'PCLS', 'TERR')
  and g.country_code is not null
  and length(g.country_code) = 2
  and not exists (
    select 1 from public.nextus_focuses nf
    where nf.geonames_id = g.geonameid
  )
  and not exists (
    select 1 from public.nextus_focuses nf
    where nf.slug = lower(g.country_code) and nf.type = 'country'
  );

-- ─── Tier 1.2 First-order administrative subdivisions ───────────────────────
--
-- States, provinces, regions at the first administrative level under
-- countries. GeoNames feature code: ADM1.

insert into public.nextus_focuses
  (name, slug, type, kind, parent_id, geonames_id, coordinates, description)
select
  g.name,
  lower(g.country_code) || '-' || lower(coalesce(g.admin1_code, 'x' || g.geonameid::text)),
  'state_or_province',
  'political',
  ctry.id,
  g.geonameid,
  jsonb_build_object('lat', g.latitude, 'lng', g.longitude),
  format('First-order administrative subdivision of %s. Source: GeoNames (geonameId %s).',
         g.country_code, g.geonameid)
from public.geonames_raw g
join public.nextus_focuses ctry
  on ctry.slug = lower(g.country_code)
 and ctry.type = 'country'
where g.feature_class = 'A'
  and g.feature_code = 'ADM1'
  and g.country_code is not null
  and not exists (
    select 1 from public.nextus_focuses nf
    where nf.geonames_id = g.geonameid
  );

-- ─── Tier 1.3 Major cities ──────────────────────────────────────────────────
--
-- Capital cities and other significant settlements. Feature codes:
--   PPLC   - capital of a political entity
--   PPLA   - seat of a first-order administrative division
--   PPLA2  - seat of a second-order administrative division
--   PPLG   - seat of government
--   PPL    - populated place (filtered to population >= 15,000)
--
-- Parent resolution: prefer the matching ADM1 (state/province) if ingested;
-- otherwise the country.

insert into public.nextus_focuses
  (name, slug, type, kind, parent_id, geonames_id, coordinates, description)
select distinct on (g.geonameid)
  g.name,
  lower(g.country_code) || '-c' || g.geonameid::text,
  'city',
  'political',
  coalesce(adm.id, ctry.id),
  g.geonameid,
  jsonb_build_object('lat', g.latitude, 'lng', g.longitude),
  format('%s. Source: GeoNames (geonameId %s). Population: %s.',
         case g.feature_code
           when 'PPLC'  then 'National capital'
           when 'PPLA'  then 'First-order administrative capital'
           when 'PPLA2' then 'Second-order administrative capital'
           when 'PPLG'  then 'Seat of government'
           else 'City'
         end,
         g.geonameid,
         coalesce(g.population::text, 'unknown'))
from public.geonames_raw g
join public.nextus_focuses ctry
  on ctry.slug = lower(g.country_code)
 and ctry.type = 'country'
left join public.nextus_focuses adm
  on adm.slug = lower(g.country_code) || '-' || lower(g.admin1_code)
 and adm.type = 'state_or_province'
where g.feature_class = 'P'
  and (
        g.feature_code in ('PPLC', 'PPLA', 'PPLA2', 'PPLG')
        or (g.feature_code in ('PPL','PPLA3','PPLA4','PPLF','PPLL','PPLR','PPLS') and g.population >= 15000)
      )
  and g.country_code is not null
  and not exists (
    select 1 from public.nextus_focuses nf
    where nf.geonames_id = g.geonameid
  );

-- ─── Tier 1.4 Mountains and ranges ──────────────────────────────────────────
--
-- Feature class T: terrain features.
--   MT   - mountain (single peak)
--   MTS  - mountains (a range)
--   PK   - peak
--   RDGE - ridge
--
-- For v2.2 we limit named peaks to elevation >= 2000m. All named ranges/ridges
-- are included regardless of elevation (which is often null for ranges).
-- Unnamed and minor peaks remain in geonames_raw for Tier 2 lookup.

insert into public.nextus_focuses
  (name, slug, type, kind, parent_id, geonames_id, coordinates, description)
select
  g.name,
  case
    when g.feature_code in ('MTS','RDGE') then 'mr-' || g.geonameid::text
    else 'mt-' || g.geonameid::text
  end,
  case
    when g.feature_code in ('MTS','RDGE') then 'mountain_range'
    else 'mountain'
  end,
  'geological',
  coalesce(ctry.id, (select id from public.nextus_focuses where slug = 'earth' and type = 'planet')),
  g.geonameid,
  jsonb_build_object('lat', g.latitude, 'lng', g.longitude),
  format('%s. Source: GeoNames (geonameId %s). %s%s',
         case g.feature_code
           when 'MT'   then 'Mountain'
           when 'PK'   then 'Peak'
           when 'MTS'  then 'Mountain range'
           when 'RDGE' then 'Ridge'
           else 'Geological feature'
         end,
         g.geonameid,
         case when g.country_code is not null
              then format('Country: %s. ', g.country_code) else '' end,
         case when g.elevation is not null and g.elevation > 0
              then format('Elevation: %sm.', g.elevation) else '' end)
from public.geonames_raw g
left join public.nextus_focuses ctry
  on ctry.slug = lower(g.country_code)
 and ctry.type = 'country'
where g.feature_class = 'T'
  and g.name is not null
  and g.name <> ''
  and (
        g.feature_code in ('MTS','RDGE')
        or (g.feature_code in ('MT','PK') and g.elevation is not null and g.elevation >= 2000)
      )
  and not exists (
    select 1 from public.nextus_focuses nf
    where nf.geonames_id = g.geonameid
  );

-- ─── Tier 1.5 Rivers, lakes, seas, bays, gulfs ──────────────────────────────
--
-- Feature class H: hydrographic features.
--   STM   - stream / river
--   STMI  - intermittent stream
--   LK    - lake
--   LKS   - lakes (group)
--   SEA   - sea
--   BAY   - bay
--   GULF  - gulf
--
-- (OCN — ocean — is already seeded as anchors in migration 043.)

insert into public.nextus_focuses
  (name, slug, type, kind, parent_id, geonames_id, coordinates, description)
select
  g.name,
  case g.feature_code
    when 'STM'  then 'rv-' || g.geonameid::text
    when 'STMI' then 'rv-' || g.geonameid::text
    when 'LK'   then 'lk-' || g.geonameid::text
    when 'LKS'  then 'lk-' || g.geonameid::text
    when 'SEA'  then 'sea-' || g.geonameid::text
    when 'BAY'  then 'bay-' || g.geonameid::text
    when 'GULF' then 'gulf-' || g.geonameid::text
  end,
  case
    when g.feature_code in ('STM','STMI')          then 'river'
    when g.feature_code in ('LK','LKS')            then 'lake'
    when g.feature_code in ('SEA','BAY','GULF')    then 'sea'
  end,
  'hydrological',
  coalesce(ctry.id, (select id from public.nextus_focuses where slug = 'earth' and type = 'planet')),
  g.geonameid,
  jsonb_build_object('lat', g.latitude, 'lng', g.longitude),
  format('%s. Source: GeoNames (geonameId %s).%s',
         case g.feature_code
           when 'STM'  then 'River'
           when 'STMI' then 'Intermittent river'
           when 'LK'   then 'Lake'
           when 'LKS'  then 'Group of lakes'
           when 'SEA'  then 'Sea'
           when 'BAY'  then 'Bay'
           when 'GULF' then 'Gulf'
         end,
         g.geonameid,
         case when g.country_code is not null
              then format(' Country: %s.', g.country_code) else '' end)
from public.geonames_raw g
left join public.nextus_focuses ctry
  on ctry.slug = lower(g.country_code)
 and ctry.type = 'country'
where g.feature_class = 'H'
  and g.name is not null
  and length(g.name) >= 4
  and g.feature_code in ('STM','STMI','LK','LKS','SEA','BAY','GULF')
  and not exists (
    select 1 from public.nextus_focuses nf
    where nf.geonames_id = g.geonameid
  );

-- ─── Tier 1.6 Deserts, forests, regions ─────────────────────────────────────
--
-- Feature class L: parks, area, locality.
--   DSRT - desert
--   FRST - forest
--   RGN  - region

insert into public.nextus_focuses
  (name, slug, type, kind, parent_id, geonames_id, coordinates, description)
select
  g.name,
  case g.feature_code
    when 'DSRT' then 'desert-' || g.geonameid::text
    when 'FRST' then 'forest-' || g.geonameid::text
    when 'RGN'  then 'region-' || g.geonameid::text
  end,
  case g.feature_code
    when 'DSRT' then 'desert'
    when 'FRST' then 'forest'
    when 'RGN'  then 'region'
  end,
  case g.feature_code
    when 'DSRT' then 'geological'
    when 'FRST' then 'ecological'
    when 'RGN'  then 'cultural'
  end,
  coalesce(ctry.id, (select id from public.nextus_focuses where slug = 'earth' and type = 'planet')),
  g.geonameid,
  jsonb_build_object('lat', g.latitude, 'lng', g.longitude),
  format('%s. Source: GeoNames (geonameId %s).%s',
         case g.feature_code
           when 'DSRT' then 'Desert'
           when 'FRST' then 'Forest'
           when 'RGN'  then 'Region'
         end,
         g.geonameid,
         case when g.country_code is not null
              then format(' Country: %s.', g.country_code) else '' end)
from public.geonames_raw g
left join public.nextus_focuses ctry
  on ctry.slug = lower(g.country_code)
 and ctry.type = 'country'
where g.feature_class = 'L'
  and g.feature_code in ('DSRT','FRST','RGN')
  and g.name is not null and g.name <> ''
  and not exists (
    select 1 from public.nextus_focuses nf
    where nf.geonames_id = g.geonameid
  );

-- ─── Tier 1.7 Islands and archipelagos ──────────────────────────────────────
--
-- Feature class T (terrain) — islands are classified here in GeoNames.
--   ISL  - island
--   ISLS - islands (group / archipelago)
--   ATOL - atoll

insert into public.nextus_focuses
  (name, slug, type, kind, parent_id, geonames_id, coordinates, description)
select
  g.name,
  case g.feature_code
    when 'ISLS' then 'arch-' || g.geonameid::text
    when 'ATOL' then 'atol-' || g.geonameid::text
    else             'isl-'  || g.geonameid::text
  end,
  case g.feature_code
    when 'ISLS' then 'archipelago'
    else             'island'
  end,
  'geological',
  coalesce(ctry.id, (select id from public.nextus_focuses where slug = 'earth' and type = 'planet')),
  g.geonameid,
  jsonb_build_object('lat', g.latitude, 'lng', g.longitude),
  format('%s. Source: GeoNames (geonameId %s).%s',
         case g.feature_code
           when 'ISL'  then 'Island'
           when 'ISLS' then 'Archipelago'
           when 'ATOL' then 'Atoll'
         end,
         g.geonameid,
         case when g.country_code is not null
              then format(' Country: %s.', g.country_code) else '' end)
from public.geonames_raw g
left join public.nextus_focuses ctry
  on ctry.slug = lower(g.country_code)
 and ctry.type = 'country'
where g.feature_class = 'T'
  and g.feature_code in ('ISL','ISLS','ATOL')
  and g.name is not null
  and length(g.name) >= 4
  and (g.population is null or g.population >= 0)
  and not exists (
    select 1 from public.nextus_focuses nf
    where nf.geonames_id = g.geonameid
  );

commit;
