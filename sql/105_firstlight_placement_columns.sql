-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 105 — First Light placement columns on contributor_profiles_beta
--
-- Adds columns written by the First Light placement screen (Screen 3).
-- location_focus_id already exists — no action needed for that one.
-- problem_chains receives the background-resolved chain slugs.
-- Idempotent: safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

begin;

alter table public.contributor_profiles_beta
  add column if not exists welcome_vision    text,
  add column if not exists welcome_concerns  text[]  not null default '{}',
  add column if not exists welcome_scale     text
    check (welcome_scale in ('circle', 'city', 'country', 'planet')),
  add column if not exists problem_chains    text[]  not null default '{}';

commit;

-- Verify:
-- select column_name, data_type
--   from information_schema.columns
--  where table_schema = 'public'
--    and table_name   = 'contributor_profiles_beta'
--    and column_name  in ('welcome_vision','welcome_concerns','welcome_scale','problem_chains');
