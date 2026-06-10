-- Migration 104 — First Light columns on public.users
begin;
alter table public.users
  add column if not exists first_light_completed_at  timestamptz,
  add column if not exists welcome_scores            jsonb,
  add column if not exists welcome_challenges        jsonb;
commit;
