-- ─────────────────────────────────────────────────────────────────────────────
-- 109_living_ecosystem.sql
--
-- The Living Ecosystem layer (design session 11 June 2026):
--
--   1. Topic tune-ins — nextus_user_watches.entity_type widens to
--      include 'domain', 'subdomain', and 'field' so a person can
--      tune in to a TOPIC, not just an org. (The TED moment: the talk
--      ends, and there's finally an entry point — tune in to the
--      field itself.) entity_id stays uuid: the taxonomy tables
--      (nextus_domains / nextus_subdomains / nextus_fields) all carry
--      uuid primary keys.
--
--   2. nextus_platform_activity — the live tracker. A public,
--      append-only ticker of ecosystem motion: who joined the map,
--      what was contributed, where people are tuning in. Empty at
--      launch by design; it fills as the ecosystem moves.
--
-- PRIVACY LAW (structural, not behavioural):
--   This table has NO user_id column at all. Private actions (a
--   tune-in) are recorded as anonymous motion — "someone tuned in to
--   Ocean Restoration" — never attributed. Public entities (a new
--   actor on the Atlas, a contributed practice) are named because
--   they are already public. Watching remains private per migration
--   048; this table cannot leak what it never stores.
-- ─────────────────────────────────────────────────────────────────────────────

begin;

-- ── 1. Widen the watch entity types ─────────────────────────────────────────
-- Current constraint (after 062): ('focus','actor','person','event').

alter table public.nextus_user_watches
  drop constraint if exists nextus_user_watches_entity_type_check;

alter table public.nextus_user_watches
  add constraint nextus_user_watches_entity_type_check
  check (entity_type in ('focus','actor','person','event','domain','subdomain','field'));

-- ── 2. The platform activity ticker ─────────────────────────────────────────

create table if not exists public.nextus_platform_activity (
  id            uuid primary key default gen_random_uuid(),

  event_type    text not null check (event_type in (
                  'actor_added',      -- a new actor went live on the Atlas
                  'practice_added',   -- a practice was contributed
                  'tune_in',          -- someone tuned in (always anonymous)
                  'need_posted',      -- an actor posted a need
                  'event_published',  -- an event went up
                  'step_forward',     -- someone stepped forward on a need (anonymous)
                  'listing_added'     -- a NextMarket listing went live (future)
                )),

  -- The PUBLIC subject of the event (never the acting user).
  subject_type  text check (subject_type in ('actor','practice','domain','subdomain','field','focus','event','need','listing')),
  subject_id    uuid,
  subject_name  text,     -- display name at time of event (denormalised on purpose)
  subject_slug  text,     -- for linking

  domain        text,     -- civ domain slug when known (human-being … vision)
  detail        text,     -- optional short line, system-authored

  created_at    timestamptz not null default now()
);

create index if not exists nextus_platform_activity_recent_idx
  on public.nextus_platform_activity (created_at desc);

create index if not exists nextus_platform_activity_domain_idx
  on public.nextus_platform_activity (domain, created_at desc);

-- ── RLS ──────────────────────────────────────────────────────────────────────
-- Public read: this is the public pulse of the ecosystem.
-- Insert: any authenticated session may append (rows carry no user
-- identity, so an append is never a disclosure). No update, no delete.

alter table public.nextus_platform_activity enable row level security;

drop policy if exists "platform activity is public" on public.nextus_platform_activity;
create policy "platform activity is public"
  on public.nextus_platform_activity
  for select using (true);

drop policy if exists "authenticated may append activity" on public.nextus_platform_activity;
create policy "authenticated may append activity"
  on public.nextus_platform_activity
  for insert to authenticated
  with check (true);

commit;
