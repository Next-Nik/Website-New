-- ============================================================================
-- 182_milestones.sql
--
-- Social half · item 6 (tier two) · Celebration, loud at the milestones. The
-- bloom itself is client-side; this table is the thing that makes it safe.
-- Without a fired-once record, a milestone re-fires on every refetch and a
-- loud moment becomes wallpaper within a day.
--
-- Locks encoded here:
--   • Fires exactly once, ever. The unique key is (user_id, kind, ref) — a
--     seven-day streak on one practice is a different row from a seven-day
--     streak on another, and neither can fire twice.
--   • This is NOT a score. There is no count, no points column, no rank, and
--     nothing here is readable by anyone but its owner. It records that a
--     moment was SHOWN, not that a thing was EARNED.
--   • No public read policy, ever. There is no communal "who hit 21 days"
--     surface and this table must never become one.
--   • Milestones are recorded from the client only after the real event has
--     already been written by its own path (a check-in, a stage-up, a
--     declaration). Nothing here is the source of truth for anything.
--
-- Numbering: 181 is sparks; this is 182, the next free.
--
-- Idempotent. Run manually in the Supabase SQL editor.
-- ============================================================================

begin;

create table if not exists public.milestones_seen (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references auth.users(id) on delete cascade,

  -- What kind of moment. Constrained so a typo in a client can never open a
  -- new milestone the design never agreed to.
  kind      text not null check (kind in (
              'first_moment',    -- the first thing they ever put into the world here
              'stage_up',        -- the tended thing came into leaf / began thriving
              'streak_7',        -- seven days kept
              'streak_21',       -- twenty-one days kept
              'run_complete',    -- the run is finished
              'grove_crest',     -- the constellation's grove came into leaf
              'horizon_named',   -- they said where they are going
              'domain_recovery'  -- a domain came back up
            )),

  -- What it was about: a challenge id, a domain slug, a stage number. Empty
  -- string for the once-per-person kinds, so the unique index still bites.
  ref       text not null default '',

  shown_at  timestamptz not null default now(),

  unique (user_id, kind, ref)
);

create index if not exists milestones_seen_user_idx
  on public.milestones_seen (user_id, shown_at desc);

comment on table public.milestones_seen is
  'A record that a celebration was shown, so it is never shown twice. Not a score, not a badge, not readable by anyone else. Owner-only by RLS with no exceptions.';

alter table public.milestones_seen enable row level security;

drop policy if exists "own milestone read" on public.milestones_seen;
create policy "own milestone read"
  on public.milestones_seen for select
  using (auth.uid() = user_id);

drop policy if exists "own milestone insert" on public.milestones_seen;
create policy "own milestone insert"
  on public.milestones_seen for insert
  with check (auth.uid() = user_id);

-- No update policy and no delete policy: a moment that was shown was shown.

commit;

-- ─── Verification (run manually) ────────────────────────────────────────────
-- -- Should return 0 initially:
-- select count(*) from public.milestones_seen;
-- -- The second insert should be swallowed by the unique index (on conflict do nothing):
-- insert into public.milestones_seen (user_id, kind, ref)
--   values (auth.uid(), 'first_moment', '') on conflict do nothing;
