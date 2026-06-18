-- ─────────────────────────────────────────────────────────────
-- 135_daily_practice_progress.sql
--
-- Resume-in-place for the daily walk. One in-progress row per
-- (user, entrance). The runner freezes the day's block list into
-- block_ids on entry, writes step_index on every move, and stows
-- per-beat drafts so leaving the app and coming back lands you on
-- the exact beat with your words intact.
--
-- practice_date is the day the row was opened. On a new day the
-- runner overwrites the row (a fresh walk), so this never grows
-- without bound and "resume" only ever offers today's session.
--
-- Developmental-rail data: owner-private, never public.
-- ─────────────────────────────────────────────────────────────

create table if not exists daily_practice_progress (
  user_id       uuid        not null references auth.users(id) on delete cascade,
  entrance      text        not null,                 -- 'morning' | 'midday' | 'evening'
  practice_date date        not null default (now() at time zone 'utc')::date,
  block_ids     jsonb       not null default '[]'::jsonb,  -- the frozen line for this session
  step_index    integer     not null default 0,            -- where the walk is
  drafts        jsonb       not null default '{}'::jsonb,   -- { block_id: text } in-flight writing
  completed     boolean     not null default false,
  updated_at    timestamptz not null default now(),
  primary key (user_id, entrance)
);

alter table daily_practice_progress enable row level security;

drop policy if exists "own daily progress — select" on daily_practice_progress;
create policy "own daily progress — select"
  on daily_practice_progress for select
  using (auth.uid() = user_id);

drop policy if exists "own daily progress — insert" on daily_practice_progress;
create policy "own daily progress — insert"
  on daily_practice_progress for insert
  with check (auth.uid() = user_id);

drop policy if exists "own daily progress — update" on daily_practice_progress;
create policy "own daily progress — update"
  on daily_practice_progress for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "own daily progress — delete" on daily_practice_progress;
create policy "own daily progress — delete"
  on daily_practice_progress for delete
  using (auth.uid() = user_id);
