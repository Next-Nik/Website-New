-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 044 — GeoNames staging table
--
-- A faithful mirror of the GeoNames gazetteer schema, designed for direct
-- bulk load from allCountries.txt (or any country-slice file or cityXXXXX.zip)
-- via Postgres COPY / Supabase CSV import. No business logic, no
-- transformation — this table is the parking lot.
--
-- After the file is loaded into this table, migration 045 does the filtered
-- INSERT into nextus_focuses with NextUs's scale, kind, and attribution
-- mapping applied.
--
-- Column order, names, and types match the GeoNames "main 'geoname' table"
-- specification exactly:
--   https://download.geonames.org/export/dump/
--
-- Tab-delimited, UTF-8. The COPY/import command is documented in the deploy
-- note that ships with this migration.
--
-- Why a staging table:
--   - One-shot bulk load is orders of magnitude faster than row-by-row
--     adapter logic
--   - Filtering by feature class/code is plain SQL on a real table
--   - The staged data is available for future Tier 2 lookups, alternate-name
--     joins, hierarchy joins, and modification syncs
--   - Re-running the import is safe — TRUNCATE first, COPY again
--
-- Source: NextUs Geographic Scale Architecture v2.0, Section 8 (Build
-- Sequence, Phase v2.2).
-- ─────────────────────────────────────────────────────────────────────────────

begin;

-- ─── Staging table ──────────────────────────────────────────────────────────
--
-- Column names match GeoNames' readme. Types chosen so a CSV import from
-- the raw tab-delimited file lands cleanly without per-row coercion.

create table if not exists public.geonames_raw (
  geonameid         bigint  primary key,
  name              text,
  asciiname         text,
  alternatenames    text,
  latitude          double precision,
  longitude         double precision,
  feature_class     text,
  feature_code      text,
  country_code      text,
  cc2               text,
  admin1_code       text,
  admin2_code       text,
  admin3_code       text,
  admin4_code       text,
  population        bigint,
  elevation         integer,
  dem               integer,
  timezone          text,
  modification_date date
);

-- Indexes are NOT created here. They are created by migration 044b AFTER
-- you bulk-load the data into this table. Building indexes on an empty
-- table is cheap, but maintaining them during a 12-million-row COPY is
-- expensive — orders of magnitude slower import. Standard pattern:
-- create empty table, COPY in bulk, then create indexes.
--
-- After step 2 of the deploy note (the COPY), run 044b_geonames_staging_indexes.sql.

-- ─── Notes ──────────────────────────────────────────────────────────────────
--
-- This staging table is intentionally outside the nextus_ namespace because
-- it is upstream data, not NextUs data. We do not modify rows here. We do
-- not store NextUs-specific fields here. The only writes to this table are
-- bulk loads from the canonical GeoNames distribution.
--
-- The table will end up sizable: allCountries.txt is ~12 million rows.
-- Cities15000.txt is ~25k rows. countryInfo.txt is a different shape (richer
-- country metadata) and has its own staging table in a sibling migration if
-- we choose to load it.
--
-- Storage planning: ~12M rows at ~250 bytes/row = ~3 GB of table data plus
-- ~1-2 GB of indexes. Supabase Pro's 8 GB tier accommodates this; Free tier
-- (500 MB) does not. If the storage budget is a concern, load cities15000
-- and a slimmed country slice instead.

commit;
