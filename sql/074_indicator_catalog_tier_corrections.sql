-- ─────────────────────────────────────────────────────────────────────────────
-- 074 — Indicator catalog tier corrections
--
-- Part A: Extend the tier check constraint to include 'manual'.
--   'manual' = indicator value is maintained via periodic SQL seed rather
--   than automated fetch. The cron skips these; they are excluded from the
--   reliability card's not-implemented count.
--
-- Part B: Set tier='manual' for:
--   - 5 deferred API-tier sources (no usable machine-readable endpoint)
--   - All scrape-tier indicators (annual PDFs / login walls)
--
-- Idempotent: safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

begin;

-- ── Part A: extend the tier check constraint ─────────────────────────────────

alter table nextus_domain_indicators
  drop constraint if exists nextus_domain_indicators_tier_check;

alter table nextus_domain_indicators
  add constraint nextus_domain_indicators_tier_check
  check (tier in ('api', 'scrape', 'contributor', 'manual'));

-- ── Part B-1: deferred API-tier sources → manual ─────────────────────────────

update nextus_domain_indicators
set tier = 'manual', updated_at = now()
where source_name in (
  'ISRIC — World Soil Information',   -- SoilGrids requires lat/lng, no global aggregate
  'LandMark Global Platform',         -- API authentication undocumented
  'WRI Aqueduct Water Risk',          -- web app only, no REST API
  'Global Mangrove Watch',            -- data downloads only (GeoTIFF)
  'Crop Trust / Genesys'              -- paginated specimen data, no count endpoint
)
and tier = 'api';

-- ── Part B-2: all scrape-tier sources → manual ───────────────────────────────

update nextus_domain_indicators
set tier = 'manual', updated_at = now()
where tier = 'scrape';

commit;
