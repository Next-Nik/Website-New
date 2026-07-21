-- Migration 125 — First Light skip signal on public.users
--
-- Lets a user step into the platform without completing First Light.
-- The gate (App.jsx RootRoute) sends a brand-new user (neither
-- completed nor skipped) to First Light on first landing, but once
-- they skip, '/' resolves to Mission Control. The re-prompt
-- (FirstLightPrompt) keys off first_light_completed_at being null,
-- so skippers keep getting gently invited back until they finish.
begin;
alter table public.users
  add column if not exists first_light_skipped_at  timestamptz;
commit;
