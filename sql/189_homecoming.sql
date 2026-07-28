-- 189_homecoming.sql
--
-- Homecoming: a hidden, founder-only tool that guides one short daily session
-- to lower a chronically-elevated allostatic set-point and to reassign (not
-- clear) the protectors that defend the old set-point. See the build brief
-- (Homecoming_Setpoint_Tool_Build_Brief.md) and the two companion docs:
-- Resetting_the_Allostatic_Setpoint_Homecoming.md (science) and
-- Protector_Reassignment_Covenant.md (the four posts).
--
-- SECURITY MODEL — same as Care Protocol (187), minus the public path.
--   * Founder-only. Every op requires ownership (auth.uid() = user_id) AND
--     is_founder() (app_metadata only, server-set, not client-editable).
--   * There is NO share surface and NO anon/public path at all. Nothing here
--     is ever meant to leave the founder's own account. This is, by design,
--     the most private tool in the app: it holds felt states, sabotage urges,
--     and the covenant. That absence of an outward edge is the safeguard.
--
-- MIGRATION NUMBER: originally drafted as 188, but a parallel workstream landed
-- 188_practice.sql first, so this moved to 189 — the exact "first free number"
-- collision the Care build note keeps warning about. 189 is free at authoring
-- time; CONFIRM it is still free at merge and bump if not. Every object below is
-- uniquely named, so running an already-applied copy alongside the real one is
-- harmless.

-- ── is_founder() ──────────────────────────────────────────────
-- Idempotent: identical to the definition in 148/156/163/187. Safe in any
-- order; re-declaring costs nothing.
create or replace function public.is_founder()
returns boolean
language sql
stable
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'founder', false)
$$;

-- ── homecoming_profile ────────────────────────────────────────
-- One row per founder. The old set-point and the target "proper home" in the
-- user's own words, the four reassigned covenant posts, per-guard settings,
-- and the cyclic-sigh default. Small and personal; no computed/cached layers.
create table if not exists public.homecoming_profile (
  user_id        uuid primary key references auth.users(id) on delete cascade,

  -- Named in the user's own words at Threshold. Free text on purpose.
  old_number     text,          -- the set-point the body has been defending
  target_state   text,          -- the state that would be "a proper home"

  -- The reassigned protector covenant. Shape (per the covenant doc):
  --   { solvency: {line, mode}, connection: {...}, love: {...}, joy: {...} }
  posts          jsonb not null default '{}'::jsonb,

  -- Per-guard on/off + calibration (heroic cap, breath length, etc.).
  guards         jsonb not null default '{}'::jsonb,

  -- Cyclic-sighing default length in seconds (5 min). Editable, gently capped.
  breath_seconds integer not null default 300,

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table public.homecoming_profile enable row level security;

drop policy if exists "homecoming_profile owner founder select" on public.homecoming_profile;
create policy "homecoming_profile owner founder select"
  on public.homecoming_profile for select
  using (auth.uid() = user_id and public.is_founder());

drop policy if exists "homecoming_profile owner founder insert" on public.homecoming_profile;
create policy "homecoming_profile owner founder insert"
  on public.homecoming_profile for insert
  with check (auth.uid() = user_id and public.is_founder());

drop policy if exists "homecoming_profile owner founder update" on public.homecoming_profile;
create policy "homecoming_profile owner founder update"
  on public.homecoming_profile for update
  using (auth.uid() = user_id and public.is_founder())
  with check (auth.uid() = user_id and public.is_founder());

drop policy if exists "homecoming_profile owner founder delete" on public.homecoming_profile;
create policy "homecoming_profile owner founder delete"
  on public.homecoming_profile for delete
  using (auth.uid() = user_id and public.is_founder());

-- ── homecoming_entries ────────────────────────────────────────
-- One row per daily Return, plus between-session guard captures. `kind`
-- discriminates:
--   'return'   — a completed Daily Return (carries state / post / mode / landed)
--   'receipt'  — a proof the new set-point is real (Move 5). Mirror of the
--                Practice's Receipt; at build, prefer writing these straight
--                into horizon_practice_entries so there is ONE Receipt log.
--   'urge'     — a withdrawal/sabotage capture (the Urge log named in the
--                Underearning Physiology doc). Logged as defense, not relapse.
--   'setpoint' — a rolling proxy reading (resting HR/HRV, or a 1-10 baseline).
--                Read over WEEKS in the Evidence view — never judged per-day
--                (the Limerick-Monday guard).
create table if not exists public.homecoming_entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  kind        text not null check (kind in ('return','receipt','urge','setpoint')),

  state       text,             -- Move 1 felt-state: settled|revved|shutdown|mixed
  post        text,             -- Move 4 post: solvency|connection|love|joy
  mode        text check (mode is null or mode in ('gardener','sentry')),
  landed      boolean,          -- Move 5 land-vs-numb answer
  note        text,             -- Receipt / Urge free text
  value       numeric,          -- setpoint proxy value

  created_at  timestamptz not null default now()
);

alter table public.homecoming_entries enable row level security;

drop policy if exists "homecoming_entries owner founder select" on public.homecoming_entries;
create policy "homecoming_entries owner founder select"
  on public.homecoming_entries for select
  using (auth.uid() = user_id and public.is_founder());

drop policy if exists "homecoming_entries owner founder insert" on public.homecoming_entries;
create policy "homecoming_entries owner founder insert"
  on public.homecoming_entries for insert
  with check (auth.uid() = user_id and public.is_founder());

drop policy if exists "homecoming_entries owner founder update" on public.homecoming_entries;
create policy "homecoming_entries owner founder update"
  on public.homecoming_entries for update
  using (auth.uid() = user_id and public.is_founder())
  with check (auth.uid() = user_id and public.is_founder());

drop policy if exists "homecoming_entries owner founder delete" on public.homecoming_entries;
create policy "homecoming_entries owner founder delete"
  on public.homecoming_entries for delete
  using (auth.uid() = user_id and public.is_founder());

-- Read path for the Evidence view: newest-first per kind, per owner.
create index if not exists homecoming_entries_user_kind_time
  on public.homecoming_entries (user_id, kind, created_at desc);
