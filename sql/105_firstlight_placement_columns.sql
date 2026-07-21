-- Migration 105 — First Light placement columns on contributor_profiles_beta
begin;
alter table public.contributor_profiles_beta
  add column if not exists welcome_vision    text,
  add column if not exists welcome_concerns  text[]  not null default '{}',
  add column if not exists welcome_scale     text
    check (welcome_scale in ('circle', 'city', 'country', 'planet')),
  add column if not exists problem_chains    text[]  not null default '{}';
commit;
