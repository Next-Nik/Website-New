-- ─────────────────────────────────────────────────────────────────────────────
-- 107_pathways_events.sql
--
-- Pathways v1 infrastructure:
--   1. pathways_events — the demand window's foundation. One row per
--      card impression or open. Practitioners will ONLY ever see
--      aggregates derived from this table, never identities. No public
--      select policy exists by design; aggregates come later via a
--      view or endpoint (out of scope in this migration).
--   2. contributor_profiles_beta.pathways_primed_at — when the person
--      acknowledged the spine-and-specialists explainer. The first
--      Pathways render shows the explainer until this is set.
--
-- Privacy law (10 June 2026 decisions log): routing reads
-- horizon_profile scores only; a "match" is an anonymous impression
-- until the person reaches out.
-- ─────────────────────────────────────────────────────────────────────────────

begin;

create table if not exists public.pathways_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete set null,  -- nullable: signed-out
  surface     text not null check (surface in ('map_debrief', 'mc_domain')),
  domain      text not null check (domain in
                ('path','spark','body','finances','connection','inner_game','signal')),
  card_type   text not null check (card_type in ('journey','practitioner','founder')),
  target_id   uuid,                                               -- nextus_actors.id for practitioner cards
  event       text not null check (event in ('impression','open')),
  created_at  timestamptz not null default now()
);

create index if not exists pathways_events_target_idx
  on public.pathways_events (target_id, created_at);

create index if not exists pathways_events_domain_idx
  on public.pathways_events (domain, surface, created_at);

-- ─── Row Level Security ──────────────────────────────────────────────────────
-- Insert own (or anonymous with null user_id). NO select policy:
-- identities never leave this table; aggregates only, later, server-side.

alter table public.pathways_events enable row level security;

drop policy if exists "insert own pathways events" on public.pathways_events;
create policy "insert own pathways events"
  on public.pathways_events
  for insert
  with check (user_id is null or auth.uid() = user_id);

-- ─── Priming acknowledgement ─────────────────────────────────────────────────

alter table public.contributor_profiles_beta
  add column if not exists pathways_primed_at timestamptz;

comment on column public.contributor_profiles_beta.pathways_primed_at is
  'When the person acknowledged the Pathways spine-and-specialists explainer. Null = explainer shows before the first rail render.';

commit;
