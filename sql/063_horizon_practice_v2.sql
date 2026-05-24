-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 063 — Horizon Practice v2 (the five-beat architecture)
--
-- This migration introduces three new tables that express the locked
-- Horizon Practice Living Architecture v1.3:
--
--   horizon_practice_morning_runs  — one row per morning, captures the
--                                    five-beat sequence (Commit → Ground →
--                                    Plan → Anchor → Act)
--
--   horizon_practice_entries       — unified in-moment log: Hit (was
--                                    Action-Glow), Drift (was Pitfall),
--                                    Listening-Glow, Receipt
--
--   horizon_practice_thresholds    — the day's active thresholds (set in
--                                    the morning Plan beat, crossed during
--                                    the day)
--
-- The previous tables (horizon_practice_setup, horizon_practice_checkins,
-- horizon_practice_skills, horizon_practice_loops) remain in place for
-- backward compat with any existing user data. They are no longer written
-- by the new tool and can be archived in a future migration once data
-- migration / cleanup is complete.
--
-- The synthesised Horizon Self statement is read from map_results.life_ia_statement
-- (already populated by The Map's synthesis). Per-domain "I am" statements
-- continue to come from horizon_profile.ia_statement.
--
-- See: Horizon_Practice_Living_Architecture_v1_3.md
-- ─────────────────────────────────────────────────────────────────────────────

begin;

-- ─── horizon_practice_morning_runs ─────────────────────────────────────────
-- One row per morning the user runs. The five beats are captured as columns
-- and jsonb. Commit answers, ground confirmation, plan threshold selections,
-- anchor voicing progress, act completion.

create table if not exists public.horizon_practice_morning_runs (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  run_date            date not null default current_date,

  -- Commit beat
  commit_ready        text check (commit_ready in ('yes', 'no')),
  commit_allowed      text check (commit_allowed in ('yes', 'no')),
  commit_choosing     text check (commit_choosing in ('yes', 'no')),
  commit_covenant_seen boolean default false,
  light_run           boolean default false,

  -- Ground beat — minimal capture; just confirmed
  ground_confirmed_at timestamptz,

  -- Plan beat — threshold ids selected (also written to horizon_practice_thresholds)
  plan_threshold_count int default 0,

  -- Anchor beat — voicing progress
  anchor_domains_voiced text[],          -- e.g. ['path', 'spark', 'body', ...]
  anchor_fast_mode     boolean default false,
  anchor_whole_voiced  boolean default false,

  -- Act beat
  act_completed_at     timestamptz,

  -- Lifecycle
  started_at           timestamptz not null default now(),
  completed_at         timestamptz,
  created_at           timestamptz not null default now(),

  -- One run per user per date (re-opens update the existing row)
  unique (user_id, run_date)
);

create index if not exists horizon_practice_morning_runs_user_idx
  on public.horizon_practice_morning_runs (user_id, run_date desc);

-- ─── horizon_practice_entries ──────────────────────────────────────────────
-- Unified in-moment log table. Replaces the prior horizon_practice_checkins
-- model (which was T.E.A. journaling). The four kinds — Hit, Drift,
-- Listening-Glow, Receipt — are distinguished by the `kind` column. Hit and
-- Drift are in-moment flags (architecture §4 Movement 5). Listening-Glow
-- and Receipt are capture-only — never prompted, always available.

create table if not exists public.horizon_practice_entries (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,

  kind            text not null check (kind in ('hit', 'drift', 'listening_glow', 'receipt')),

  -- Free-text content. For 'listening_glow', this is what they said.
  -- For 'receipt', this is the formatted "I used to X. Now I Y." string.
  -- For 'hit' / 'drift', this is the optional line the user added.
  text            text,

  -- Hit / Drift may have an associated "what would my Horizon Self do"
  -- response (when the user ran the Refresh sequence). Stored for the
  -- proof file.
  refresh_task    text,                 -- "what's in front of you"
  refresh_his     text,                 -- "how would your Horizon Self handle this"
  refresh_variant text check (refresh_variant in ('standard', 'cross')),

  -- Listening-Glow specific
  from_who        text,                  -- "Marcus (friend, Bali)"

  -- Receipt specific (also reflected in the formatted `text` above)
  used_to         text,
  now_i           text,

  -- When linked to a threshold cross-event
  threshold_id    uuid,                  -- references horizon_practice_thresholds(id)

  -- Lifecycle
  occurred_at     timestamptz not null default now(),
  created_at      timestamptz not null default now()
);

create index if not exists horizon_practice_entries_user_kind_idx
  on public.horizon_practice_entries (user_id, kind, occurred_at desc);

create index if not exists horizon_practice_entries_user_date_idx
  on public.horizon_practice_entries (user_id, occurred_at desc);

-- ─── horizon_practice_thresholds ───────────────────────────────────────────
-- The day's active thresholds. Set in the morning Plan beat. Crossed (or not)
-- during the day. One row per threshold the user names for a given day.

create table if not exists public.horizon_practice_thresholds (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  morning_run_id  uuid references public.horizon_practice_morning_runs(id) on delete set null,

  -- Threshold content
  title           text not null,
  time_label      text,                  -- e.g. "10:00" — display only
  note            text,                  -- "Their voice can take me out."
  source          text default 'manual' check (source in ('manual', 'calendar', 'sprint')),
  source_ref      text,                  -- calendar event id, sprint action id, etc.

  -- Lifecycle
  run_date        date not null default current_date,
  crossed_at      timestamptz,
  created_at      timestamptz not null default now()
);

create index if not exists horizon_practice_thresholds_user_date_idx
  on public.horizon_practice_thresholds (user_id, run_date desc);

-- ─── Row Level Security ─────────────────────────────────────────────────────
-- Standard pattern: users see and modify only their own rows.

alter table public.horizon_practice_morning_runs enable row level security;
alter table public.horizon_practice_entries enable row level security;
alter table public.horizon_practice_thresholds enable row level security;

-- Morning runs
drop policy if exists "users select own morning runs" on public.horizon_practice_morning_runs;
create policy "users select own morning runs"
  on public.horizon_practice_morning_runs
  for select using (auth.uid() = user_id);

drop policy if exists "users insert own morning runs" on public.horizon_practice_morning_runs;
create policy "users insert own morning runs"
  on public.horizon_practice_morning_runs
  for insert with check (auth.uid() = user_id);

drop policy if exists "users update own morning runs" on public.horizon_practice_morning_runs;
create policy "users update own morning runs"
  on public.horizon_practice_morning_runs
  for update using (auth.uid() = user_id);

drop policy if exists "users delete own morning runs" on public.horizon_practice_morning_runs;
create policy "users delete own morning runs"
  on public.horizon_practice_morning_runs
  for delete using (auth.uid() = user_id);

-- Entries
drop policy if exists "users select own entries" on public.horizon_practice_entries;
create policy "users select own entries"
  on public.horizon_practice_entries
  for select using (auth.uid() = user_id);

drop policy if exists "users insert own entries" on public.horizon_practice_entries;
create policy "users insert own entries"
  on public.horizon_practice_entries
  for insert with check (auth.uid() = user_id);

drop policy if exists "users update own entries" on public.horizon_practice_entries;
create policy "users update own entries"
  on public.horizon_practice_entries
  for update using (auth.uid() = user_id);

drop policy if exists "users delete own entries" on public.horizon_practice_entries;
create policy "users delete own entries"
  on public.horizon_practice_entries
  for delete using (auth.uid() = user_id);

-- Thresholds
drop policy if exists "users select own thresholds" on public.horizon_practice_thresholds;
create policy "users select own thresholds"
  on public.horizon_practice_thresholds
  for select using (auth.uid() = user_id);

drop policy if exists "users insert own thresholds" on public.horizon_practice_thresholds;
create policy "users insert own thresholds"
  on public.horizon_practice_thresholds
  for insert with check (auth.uid() = user_id);

drop policy if exists "users update own thresholds" on public.horizon_practice_thresholds;
create policy "users update own thresholds"
  on public.horizon_practice_thresholds
  for update using (auth.uid() = user_id);

drop policy if exists "users delete own thresholds" on public.horizon_practice_thresholds;
create policy "users delete own thresholds"
  on public.horizon_practice_thresholds
  for delete using (auth.uid() = user_id);

commit;
