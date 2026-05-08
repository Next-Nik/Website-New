-- ─────────────────────────────────────────────────────────────────────────────
-- Module 11.1 — Per-domain rollup score columns
--
-- Adds three columns to nextus_domain_indicators that let us compute a
-- 0–10 per-domain score from headline indicators. The rollup function
-- (computeDomainScore) lives in src/beta/util/domainScore.js and reads
-- only these columns plus the existing direction_preferred + the current
-- value.
--
--   target_value  numeric — the value at which this indicator scores 10
--                            (the desired horizon for this measurement)
--   floor_value   numeric — the value at which this indicator scores 0
--                            (a known floor, often a known crisis level
--                            or a methodologically defensible bottom)
--   rollup_weight numeric — optional weighting (default 1.0). Set this
--                            higher for indicators that should dominate
--                            the domain score, lower for context.
--
-- For 'down' direction indicators (lower-is-better), target_value should
-- be LOWER than floor_value. The score function flips before normalising.
-- For 'up' direction indicators, target_value > floor_value.
-- For 'context' direction indicators, the rollup ignores them.
--
-- All columns are nullable; an indicator with no target/floor cannot
-- contribute to the rollup but still appears in the catalog and renders
-- on its own card.
--
-- Idempotent: safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

begin;

alter table nextus_domain_indicators
  add column if not exists target_value  numeric,
  add column if not exists floor_value   numeric,
  add column if not exists rollup_weight numeric not null default 1.0
    check (rollup_weight >= 0);

create index if not exists nextus_domain_indicators_rollup_idx
  on nextus_domain_indicators (domain_id, is_headline)
  where status = 'active' and target_value is not null and floor_value is not null;

-- ─── Seed scoring for the four currently-implemented Nature indicators
--
-- These are the only indicators with a working API fetcher right now, so
-- they are the only ones with values to roll up. Setting target/floor here
-- means the Nature spoke on the civ wheel actually draws a number on day
-- one.
--
-- Atmospheric CO₂ — pre-industrial baseline ≈ 280 ppm, IPCC overshoot
-- threshold ≈ 450 ppm. Direction is 'down' (lower is better). target=280,
-- floor=450. Currently ~422 ppm in 2026, scoring close to 0.16.
--
-- Atmospheric methane — pre-industrial ≈ 700 ppb, current ≈ 1920 ppb,
-- a hypothetical doubling-of-pre-industrial alarm threshold ≈ 2500 ppb.
-- Direction 'down'. target=700, floor=2500.
--
-- Earthquakes M4.5+ count — context indicator in concept, but the seed
-- has it as 'up' (more recorded events does not necessarily mean Earth
-- is healthier — this is a scientific count, not an aspirational metric).
-- The seed sets it as 'context' so the rollup ignores it. We do not seed
-- target/floor.
--
-- PM2.5 — WHO guideline annual mean is 5 µg/m³. A widely-cited unhealthy
-- threshold is 35 µg/m³. Direction 'down'. target=5, floor=35.
update nextus_domain_indicators
  set target_value = 280, floor_value = 450
  where domain_id = 'nature'
    and source_name = 'NOAA Global Monitoring Laboratory'
    and unit = 'ppm';

update nextus_domain_indicators
  set target_value = 700, floor_value = 2500
  where domain_id = 'nature'
    and source_name = 'NOAA Global Monitoring Laboratory'
    and unit = 'ppb';

update nextus_domain_indicators
  set target_value = 5, floor_value = 35
  where domain_id = 'nature'
    and source_name = 'OpenAQ'
    and unit = 'µg/m³';

commit;

-- ─── Rollback (reference only)
-- alter table nextus_domain_indicators drop column if exists rollup_weight;
-- alter table nextus_domain_indicators drop column if exists floor_value;
-- alter table nextus_domain_indicators drop column if exists target_value;
