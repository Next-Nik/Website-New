-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 069 — Effort signal aggregate + per-offering people_in_the_work
--
-- Adds the daily aggregate table for the bottom-up effort signal (the visible
-- companion to the top-down planetary scores) and the optional per-offering
-- people_in_the_work column.
--
-- The aggregate is computed by a separate scheduled function (Phase 3 of the
-- build). This migration creates the destination table so the aggregate
-- writes have a home, and adds the per-offering column so the Manage surface
-- (Phase 2) can collect per-offering breakdowns.
--
-- Per the Atlas Actor Profile Architecture Section 5:
--   - Actor-level people_in_the_work is owner-private (stripped from public reads
--     by Phase 1's get_actor_public function in migration 070).
--   - Aggregate is public.
--   - No actor is identifiable from the aggregate (Lock 3: minimum slice size
--     enforced at display time, not at storage; the storage holds raw
--     aggregates and the API/UI applies the threshold).
-- ─────────────────────────────────────────────────────────────────────────────

begin;

-- ── 1. Per-offering people_in_the_work ───────────────────────────────────────
-- Optional. When set, contributes to the actor's total and provides finer-
-- grained breakdown for the actor's own Manage view. Owner-private — same
-- visibility treatment as actor-level people_in_the_work.

alter table public.actor_offers
  add column if not exists people_in_the_work integer;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'actor_offers_people_in_the_work_check') then
    alter table public.actor_offers
      add constraint actor_offers_people_in_the_work_check
      check (people_in_the_work is null or people_in_the_work >= 0);
  end if;
end$$;

comment on column public.actor_offers.people_in_the_work is
  'OWNER-PRIVATE. Optional per-offering count of people currently in this offering. Contributes to actor-level total and the effort signal aggregate.';

-- ── 2. nextus_effort_signal_daily — domain-level aggregate ───────────────────

create table if not exists public.nextus_effort_signal_daily (
  snapshot_date     date not null,
  domain            text not null,
  domain_track      text not null check (domain_track in ('civ', 'self')),

  -- Counts
  active_actors            integer not null default 0,
  total_people_in_the_work integer not null default 0,

  -- Distributions (jsonb for flexibility while the slice taxonomy evolves)
  by_scale          jsonb,
  by_mode           jsonb,
  by_actor_type     jsonb,

  computed_at       timestamptz not null default now(),

  primary key (snapshot_date, domain, domain_track)
);

create index if not exists idx_effort_signal_recent
  on public.nextus_effort_signal_daily (snapshot_date desc, domain_track);

alter table public.nextus_effort_signal_daily enable row level security;

-- Public read on the aggregate (this is the hugely-visible bottom-up signal)
drop policy if exists "Effort signal aggregates are public" on public.nextus_effort_signal_daily;
create policy "Effort signal aggregates are public"
  on public.nextus_effort_signal_daily for select
  using (true);

-- No insert/update/delete policies — writes happen via service role from the
-- scheduled compute function. RLS blocks all client writes by default once
-- enabled and no permissive policy is added.

comment on table public.nextus_effort_signal_daily is
  'Daily aggregate of the bottom-up effort signal — actors active + people in the work, by domain. Public read; service-role write.';

commit;
