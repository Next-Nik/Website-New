-- ============================================================================
-- 176_horizon_actions_and_north_star.sql
--
-- BP-18 · The pending engines.
--
--   horizon_actions — the accrual spine. A drive|recovery ledger: real steps
--     accrued from write paths (summon / Daily / Stretch / check-ins). Once
--     this is the source of truth, tended-thing growth and the step-toward
--     line switch from counting check-ins to reading this ledger. Every row
--     is a REAL act — nothing synthetic is ever written here.
--
--   north_star — the whole-life synthesis. A single owner-authored line held
--     verbatim (never AI-summarised), surfaced near The Map.
--
-- Numbering: 172-175 taken; this is 176.
-- Idempotent. Run manually in the Supabase SQL editor.
-- ============================================================================

begin;

create table if not exists public.horizon_actions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  -- drive = a step forward; recovery = rest/repair that the ledger honours as
  -- real, not as failure (grace, not guilt).
  kind       text not null default 'drive' check (kind in ('drive', 'recovery')),
  source     text,   -- 'summon' | 'daily' | 'stretch' | 'checkin' | 'moment' | …
  domain     text,
  weight     int  not null default 1 check (weight between 1 and 100),
  note       text check (note is null or char_length(note) <= 280),
  created_at timestamptz not null default now()
);
create index if not exists horizon_actions_user_idx on public.horizon_actions (user_id, created_at desc);

alter table public.horizon_actions enable row level security;

drop policy if exists "own horizon actions read" on public.horizon_actions;
create policy "own horizon actions read" on public.horizon_actions
  for select using (auth.uid() = user_id);
drop policy if exists "own horizon actions insert" on public.horizon_actions;
create policy "own horizon actions insert" on public.horizon_actions
  for insert with check (auth.uid() = user_id);

-- The whole-life synthesis line. One per person, verbatim.
create table if not exists public.north_star (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  synthesis  text not null check (char_length(btrim(synthesis)) between 1 and 240),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

alter table public.north_star enable row level security;

drop policy if exists "own north star all" on public.north_star;
create policy "own north star all" on public.north_star
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

commit;

-- ─── Verification (run manually) ────────────────────────────────────────────
-- select count(*) from public.horizon_actions;   -- 0 initially
-- select count(*) from public.north_star;         -- 0 initially
