-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 065 — Actor profile richness v2
--
-- Extends nextus_actors with the columns required by the Practitioner Profile
-- Architecture and the Atlas Actor Profile Architecture (sibling documents,
-- May 2026).
--
-- New columns on nextus_actors:
--   story                      — long-form narrative (first or third person, owner's choice)
--   is_platform_founder        — small visible badge on identity strip; admin-set only
--   show_developmental_link    — practitioner toggle for bridge to dev profile
--   accepting_status           — accepting clients / waitlist / not now (practitioner signal)
--   medium                     — digital / in_person / either
--   actor_mode                 — practice / enterprise / platform / collective / mixed
--   membership_status          — open / application_required / invite_only / closed / not_applicable
--   people_in_the_work         — owner-private count contributing to the effort signal
--   people_in_the_work_updated_at
--
-- Constraints are deferred where the check needs DO blocks to remain idempotent.
-- Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

begin;

alter table public.nextus_actors
  add column if not exists story                          text,
  add column if not exists is_platform_founder            boolean not null default false,
  add column if not exists show_developmental_link        boolean not null default false,
  add column if not exists accepting_status               text,
  add column if not exists medium                         text,
  add column if not exists actor_mode                     text,
  add column if not exists membership_status              text,
  add column if not exists people_in_the_work             integer,
  add column if not exists people_in_the_work_updated_at  timestamptz;

-- ── Check constraints (idempotent via pg_constraint lookups) ─────────────────

-- accepting_status: yes / waitlist / not_now, or NULL
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'nextus_actors_accepting_status_check') then
    alter table public.nextus_actors
      add constraint nextus_actors_accepting_status_check
      check (accepting_status is null
        or accepting_status in ('yes', 'waitlist', 'not_now'));
  end if;
end$$;

-- medium: digital / in_person / either, or NULL
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'nextus_actors_medium_check') then
    alter table public.nextus_actors
      add constraint nextus_actors_medium_check
      check (medium is null
        or medium in ('digital', 'in_person', 'either'));
  end if;
end$$;

-- actor_mode: five mutually exclusive values, or NULL (unset)
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'nextus_actors_actor_mode_check') then
    alter table public.nextus_actors
      add constraint nextus_actors_actor_mode_check
      check (actor_mode is null
        or actor_mode in ('practice', 'enterprise', 'platform', 'collective', 'mixed'));
  end if;
end$$;

-- membership_status: five values, or NULL (most actors)
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'nextus_actors_membership_status_check') then
    alter table public.nextus_actors
      add constraint nextus_actors_membership_status_check
      check (membership_status is null
        or membership_status in ('open', 'application_required', 'invite_only', 'closed', 'not_applicable'));
  end if;
end$$;

-- people_in_the_work: non-negative when set
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'nextus_actors_people_in_the_work_check') then
    alter table public.nextus_actors
      add constraint nextus_actors_people_in_the_work_check
      check (people_in_the_work is null or people_in_the_work >= 0);
  end if;
end$$;

-- ── Indices for query patterns we expect ─────────────────────────────────────

-- accepting_status used in matching queries (only 'yes' practitioners surface)
create index if not exists idx_nextus_actors_accepting_status
  on public.nextus_actors (accepting_status)
  where accepting_status is not null;

-- actor_mode used in matching queries (practice + mixed surface as practitioner-like)
create index if not exists idx_nextus_actors_mode
  on public.nextus_actors (actor_mode)
  where actor_mode is not null;

-- ── Column comments — useful in psql and Supabase Studio ─────────────────────

comment on column public.nextus_actors.story is
  'Long-form narrative for the actor profile. First or third person. Owner-written.';

comment on column public.nextus_actors.is_platform_founder is
  'Admin-set only. Renders a small "Founder of NextUs" line on the identity strip.';

comment on column public.nextus_actors.show_developmental_link is
  'Practitioner toggle. When true, the practitioner profile renders a bridge link to /profile/:profile_owner.';

comment on column public.nextus_actors.accepting_status is
  'For practitioners (and practice-mode orgs): yes / waitlist / not_now. NULL when not applicable.';

comment on column public.nextus_actors.medium is
  'How the work is delivered: digital / in_person / either. NULL for actor types where it does not apply.';

comment on column public.nextus_actors.actor_mode is
  'How the actor operates: practice / enterprise / platform / collective / mixed. Independent of actor_type.';

comment on column public.nextus_actors.membership_status is
  'For groups, places, and other actors with joinable membership. NULL otherwise.';

comment on column public.nextus_actors.people_in_the_work is
  'OWNER-PRIVATE. The honestly-declared count of people currently in this actor''s work. Contributes to domain-level effort signal aggregate. Never publicly displayed at actor level.';

comment on column public.nextus_actors.people_in_the_work_updated_at is
  'When the actor last updated their people_in_the_work declaration.';

commit;
