-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 057 — Junk cleanup (batched, optional)
--
-- The earlier ingest left ~760k non-country rows (rivers, creeks, ridges,
-- populated places, etc.) in nextus_focuses. Migration 055 seeded the
-- canonical 250 countries on top of these but did not delete the junk —
-- the all-in-one delete timed out against Supabase Studio's statement
-- timeout.
--
-- This migration deletes junk rows in batches of 50,000 so each
-- statement completes well under the timeout. RUN THIS REPEATEDLY in
-- the Supabase SQL Editor until the verification at the bottom reports
-- "Junk remaining: 0".
--
-- What gets deleted:
--   - Every row that is NOT a country, planet, or city (so the canonical
--     countries from 055 and cities from 056 are safe).
--   - Every row whose id is NOT referenced by any user's focus_place_ids.
--
-- What stays:
--   - All 250 country rows
--   - The Earth (planet) row
--   - All city rows from migration 056
--   - Any junk row that someone has set as their focus (e.g. Toronto)
--
-- This script is safe to run any number of times. Once all junk is gone,
-- the DELETE matches zero rows and the migration is a no-op.
-- ─────────────────────────────────────────────────────────────────────────────

begin;

-- Single batched delete. Limit pattern uses a subquery because PostgreSQL
-- DELETE doesn't accept a direct LIMIT clause.
with batch as (
  select id
  from public.nextus_focuses
  where (type is null or type not in ('country', 'planet', 'city'))
    and slug != 'earth'
    and id not in (
      select unnest(focus_place_ids)
      from public.nextus_user_focus
    )
  limit 50000
)
delete from public.nextus_focuses
where id in (select id from batch);

-- Verification: how much junk remains? Run this migration again if > 0.
do $$
declare
  v_junk      int;
  v_countries int;
  v_cities    int;
  v_total     int;
begin
  select count(*) into v_junk
    from public.nextus_focuses
    where (type is null or type not in ('country', 'planet', 'city'))
      and slug != 'earth'
      and id not in (
        select unnest(focus_place_ids)
        from public.nextus_user_focus
      );
  select count(*) into v_countries from public.nextus_focuses where type = 'country';
  select count(*) into v_cities    from public.nextus_focuses where type = 'city';
  select count(*) into v_total     from public.nextus_focuses;
  raise notice '--- Migration 057 batch complete ---';
  raise notice 'Junk remaining: % (re-run this migration if > 0)', v_junk;
  raise notice 'Countries:      %', v_countries;
  raise notice 'Cities:         %', v_cities;
  raise notice 'Total rows:     %', v_total;
end $$;

commit;

notify pgrst, 'reload schema';
