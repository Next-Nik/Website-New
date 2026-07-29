-- 190_timekeeper.sql
--
-- TIMEKEEPER — a plain time tracker (start/stop entries with categories, a
-- week view, and running totals). Its own standalone tool with its own front
-- door (Profile panel, alongside Admin Console, Movie Magic, Care Protocol,
-- The Practice, Homecoming, Prism Lab), route /time, page
-- src/pages/Timekeeper.jsx, engine src/lib/timekeeper.
--
-- (Numbering note, per 187's standing warning about first-free-number
-- collisions: at the time of writing, 189_homecoming.sql is the highest
-- migration present in sql/, so 190 is claimed here.)
--
-- DESIGN
--
--   1. Two tables. `time_entries` is the record itself: one row per tracked
--      span, `started_at` always set, `ended_at` NULL while the timer runs.
--      `time_categories` is the founder's own short list of category names.
--
--   2. UPDATE is allowed here, deliberately — a divergence from
--      practice_events' append-only rule, and a correct one. A practice log
--      is testimony (an edited log is not a log); a time entry is a
--      measurement whose lifecycle REQUIRES one update: stopping the timer
--      writes `ended_at` onto the running row. The update policy is
--      owner+founder scoped like everything else. Mistaken entries are
--      deleted, and corrections are added as manual entries.
--
--   3. Founder-only, same two-layer model as practice_events: every policy
--      requires ownership AND is_founder() (app_metadata, server-set). The
--      UI gate on the page is convenience; this is enforcement.
--
--   4. NOTHING here is reachable from any shared or public path. Same
--      structural guarantee practice_events has: no card, snapshot, or
--      public route touches these tables. The ONLY cross-tool reads are the
--      founder-approved trends-only recovery context (Care Protocol's
--      synthesis and The Practice's reflections read a summary via
--      buildTimeContext() in src/lib/timekeeper — aggregate hours, never
--      entry descriptions).

create table if not exists public.time_categories (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 60),
  archived   boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists time_categories_user_idx
  on public.time_categories (user_id, archived, created_at);

create table if not exists public.time_entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,

  description text not null default '' check (char_length(description) <= 200),
  -- category is stored BY NAME, not by foreign key, on purpose: archiving or
  -- deleting a category must never orphan or rewrite history. The entry
  -- keeps the name it was tracked under; the categories table only drives
  -- the picker.
  category    text not null default '' check (char_length(category) <= 60),

  started_at  timestamptz not null,
  ended_at    timestamptz,          -- NULL = the timer is running
  check (ended_at is null or ended_at >= started_at),

  created_at  timestamptz not null default now()
);

create index if not exists time_entries_user_started_idx
  on public.time_entries (user_id, started_at desc);

alter table public.time_categories enable row level security;
alter table public.time_entries enable row level security;

-- time_categories -----------------------------------------------------------

drop policy if exists "timekeeper categories owner founder select" on public.time_categories;
create policy "timekeeper categories owner founder select"
  on public.time_categories
  for select
  using (auth.uid() = user_id and public.is_founder());

drop policy if exists "timekeeper categories owner founder insert" on public.time_categories;
create policy "timekeeper categories owner founder insert"
  on public.time_categories
  for insert
  with check (auth.uid() = user_id and public.is_founder());

drop policy if exists "timekeeper categories owner founder update" on public.time_categories;
create policy "timekeeper categories owner founder update"
  on public.time_categories
  for update
  using (auth.uid() = user_id and public.is_founder())
  with check (auth.uid() = user_id and public.is_founder());

drop policy if exists "timekeeper categories owner founder delete" on public.time_categories;
create policy "timekeeper categories owner founder delete"
  on public.time_categories
  for delete
  using (auth.uid() = user_id and public.is_founder());

-- time_entries --------------------------------------------------------------

drop policy if exists "timekeeper entries owner founder select" on public.time_entries;
create policy "timekeeper entries owner founder select"
  on public.time_entries
  for select
  using (auth.uid() = user_id and public.is_founder());

drop policy if exists "timekeeper entries owner founder insert" on public.time_entries;
create policy "timekeeper entries owner founder insert"
  on public.time_entries
  for insert
  with check (auth.uid() = user_id and public.is_founder());

-- Update: required by the timer lifecycle (stop = write ended_at). See
-- design note 2 above.
drop policy if exists "timekeeper entries owner founder update" on public.time_entries;
create policy "timekeeper entries owner founder update"
  on public.time_entries
  for update
  using (auth.uid() = user_id and public.is_founder())
  with check (auth.uid() = user_id and public.is_founder());

drop policy if exists "timekeeper entries owner founder delete" on public.time_entries;
create policy "timekeeper entries owner founder delete"
  on public.time_entries
  for delete
  using (auth.uid() = user_id and public.is_founder());
