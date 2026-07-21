-- ─────────────────────────────────────────────────────────────────────────────
-- 080_practice_streak.sql
--
-- Streak system for Horizon Practice.
--
-- horizon_practice_streak
--   One row per user. Tracks current streak, longest streak, cadence
--   preference, last engagement date, and milestone acknowledgements.
--
-- Cadence options: 'daily' | 'weekdays' | '3x' | 'custom'
-- Custom cadence days stored as array of ints: 0=Sun, 1=Mon … 6=Sat
--
-- last_engaged_date  — local date string (YYYY-MM-DD) of most recent
--                      practice engagement. Used to compute streak on open.
--
-- streak_current     — consecutive committed-day streak as of last_engaged_date
-- streak_longest     — all-time personal best
--
-- milestone_21_at / milestone_40_at — timestamptz when user first hit each
--                      milestone, so we only celebrate once.
-- ─────────────────────────────────────────────────────────────────────────────

begin;

create table if not exists public.horizon_practice_streak (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,

  cadence             text not null default 'daily'
                        check (cadence in ('daily','weekdays','3x','custom')),
  custom_days         integer[],            -- only used when cadence = 'custom'

  streak_current      integer not null default 0,
  streak_longest      integer not null default 0,

  last_engaged_date   date,                 -- local date of last engagement
  streak_broken_at    timestamptz,          -- when the last streak broke (for return prompt)

  milestone_21_at     timestamptz,
  milestone_40_at     timestamptz,

  -- notification permission
  badge_permission    boolean not null default false,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint horizon_practice_streak_user_unique unique (user_id)
);

-- RLS
alter table public.horizon_practice_streak enable row level security;

create policy "Users manage own streak"
  on public.horizon_practice_streak
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Auto-update updated_at
create or replace function public.touch_streak_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger streak_updated_at
  before update on public.horizon_practice_streak
  for each row execute function public.touch_streak_updated_at();

commit;
