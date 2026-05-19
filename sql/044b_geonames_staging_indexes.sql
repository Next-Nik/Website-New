-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 044b — GeoNames staging table indexes
--
-- Run AFTER the bulk load into public.geonames_raw is complete (per Phase
-- v2.2 deploy note step 2). Builds the indexes on the populated table.
--
-- Index-on-empty-table is fast but maintaining indexes during a 13M-row
-- COPY is dramatically slower. Splitting them is what makes the bulk load
-- practical.
--
-- These indexes support:
--   - The filter joins in migration 045 (feature_class, feature_code, country_code)
--   - Tier 2 on-demand lookup by name (geonames_raw_name_lower_idx)
--   - Hierarchy and alternate-name joins in future phases
--
-- Idempotent: every CREATE uses `if not exists`. Safe to re-run.
--
-- Source: NextUs Geographic Scale Architecture v2.0, Section 8 (Build
-- Sequence, Phase v2.2).
-- ─────────────────────────────────────────────────────────────────────────────

begin;

create index if not exists geonames_raw_feature_class_idx
  on public.geonames_raw (feature_class);

create index if not exists geonames_raw_feature_code_idx
  on public.geonames_raw (feature_code);

create index if not exists geonames_raw_country_code_idx
  on public.geonames_raw (country_code);

create index if not exists geonames_raw_class_code_idx
  on public.geonames_raw (feature_class, feature_code);

create index if not exists geonames_raw_population_idx
  on public.geonames_raw (population)
  where population is not null and population > 0;

-- Useful for typeahead and Tier 2 search later
create index if not exists geonames_raw_name_lower_idx
  on public.geonames_raw (lower(name));

commit;

-- Refresh query planner statistics now that indexes exist and data is loaded.
analyze public.geonames_raw;
