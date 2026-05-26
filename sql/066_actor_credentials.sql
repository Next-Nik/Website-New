-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 066 — actor_credentials
--
-- Unified credentials primitive across all actor types.
-- kind discriminates: training, certification, membership, license, award, lineage.
--
-- Practitioners typically use training and lineage.
-- Orgs typically use certification, membership, license, award.
-- The Manage UI labels sections appropriately based on kind groupings.
--
-- Public read, owner-write — same RLS shape as actor_links / actor_press.
-- ─────────────────────────────────────────────────────────────────────────────

begin;

create table if not exists public.actor_credentials (
  id           uuid primary key default gen_random_uuid(),
  actor_id     uuid not null references public.nextus_actors(id) on delete cascade,

  kind         text not null check (kind in (
    'training',       -- person: course, certification programme, apprenticeship
    'certification',  -- org: B-Corp, Fairtrade, regulatory certification
    'membership',     -- any: belongs to a network or association
    'license',        -- any: license to operate or practice
    'award',          -- any: recognition received
    'lineage'         -- person or practice-org: the tradition the work comes from
  )),

  title        text not null,
  institution  text,
  year         integer,
  url          text,

  sort_order   integer not null default 0,
  created_at   timestamptz not null default now()
);

create index if not exists idx_actor_credentials_actor
  on public.actor_credentials (actor_id, sort_order);

create index if not exists idx_actor_credentials_kind
  on public.actor_credentials (actor_id, kind, sort_order);

alter table public.actor_credentials enable row level security;

-- Public read: anyone can read any credential row
drop policy if exists "Actor credentials are public" on public.actor_credentials;
create policy "Actor credentials are public"
  on public.actor_credentials for select
  using (true);

-- Owner-only write: only the actor's profile_owner can insert/update/delete
drop policy if exists "Owners manage their credentials" on public.actor_credentials;
create policy "Owners manage their credentials"
  on public.actor_credentials for all
  using (
    actor_id in (
      select id from public.nextus_actors where profile_owner = auth.uid()
    )
  )
  with check (
    actor_id in (
      select id from public.nextus_actors where profile_owner = auth.uid()
    )
  );

comment on table public.actor_credentials is
  'Unified credentials for all actor types. kind discriminates training / certification / membership / license / award / lineage.';

commit;
