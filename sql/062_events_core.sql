-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 062 — Events core
--
-- Adds the Events primitive per NextUs Events Architecture v1.0 (May 2026).
--
-- An Event is a bounded occurrence produced by one or more actors. It happens
-- at a time, at a venue, optionally hosted at a Space (an Atlas `place` actor),
-- carries domain placement(s) and Event Types, and supports recurring and
-- series structures.
--
-- New tables:
--   nextus_venues                    — lightweight geo-located places
--   nextus_event_types               — registry of Event Type tags
--   nextus_events                    — the Event primitive
--   nextus_event_domain_placements   — join table to domain slugs
--   nextus_event_actor_relationships — bilateral relationships (host / feature /
--                                      sponsor / partner). Producer is on the
--                                      Event row itself.
--   nextus_user_event_interests      — "I want to remember this"
--   nextus_user_event_registrations  — "I plan to be there"
--   nextus_user_event_attendances    — "I was there"
--
-- Extends:
--   nextus_user_watches.entity_type  — adds 'event' to the allowed values
--
-- Geographic anchoring:
--   Venues reference nextus_focuses(id) for city/neighbourhood placement.
--   The repo's existing geographic-scale model uses nextus_focuses with a
--   type column ('city', 'neighbourhood', 'region', etc.) — venues anchor
--   there rather than introducing a separate cities table.
--
-- Seeds:
--   nextus_event_types — canonical list per architecture spec Section 2.4.
--
-- Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

begin;

-- ─── 1. nextus_venues ────────────────────────────────────────────────────────
-- Lightweight reference data. Most venues never need an Atlas actor entry.
-- A venue can be promoted to a `place` actor (HAAB-style) via promoted_to_actor_id.

create table if not exists public.nextus_venues (
  id                   uuid primary key default gen_random_uuid(),
  name                 text not null,
  address              text,
  focus_id             uuid references public.nextus_focuses(id) on delete set null,
    -- City, neighbourhood, or other geographic focus. Null for unspecified or online.
  country_code         text,
    -- ISO 3166-1 alpha-2, kept denormalised for easy filtering.
  latitude             numeric(9,6),
  longitude            numeric(9,6),
  is_online            boolean not null default false,
  promoted_to_actor_id uuid references public.nextus_actors(id) on delete set null,
    -- If this venue is also an Atlas `place` actor, link to it. Most stay null.
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists nextus_venues_focus_idx
  on public.nextus_venues (focus_id);

create index if not exists nextus_venues_country_idx
  on public.nextus_venues (country_code) where country_code is not null;

create index if not exists nextus_venues_name_trgm
  on public.nextus_venues using gin (name gin_trgm_ops);
  -- Search-as-you-type. pg_trgm extension is already enabled per migration 037.

alter table public.nextus_venues enable row level security;

-- Venues are reference data: anyone can read.
drop policy if exists "venues are public" on public.nextus_venues;
create policy "venues are public"
  on public.nextus_venues for select
  using (true);

-- Any authenticated user can insert a venue (same trust default as actors).
drop policy if exists "authenticated users insert venues" on public.nextus_venues;
create policy "authenticated users insert venues"
  on public.nextus_venues for insert
  with check (auth.uid() is not null);

-- Anyone authenticated can update a venue. Venues are not owned in v1.
-- If a venue is promoted to an actor, edits should happen on the actor record.
drop policy if exists "authenticated users update venues" on public.nextus_venues;
create policy "authenticated users update venues"
  on public.nextus_venues for update
  using (auth.uid() is not null);

-- ─── 2. nextus_event_types — the registry ────────────────────────────────────
-- One row per canonical or proposed Event Type. Slugs are kebab-case.
-- Hierarchy is optional (parent_slug self-reference). is_canonical false means
-- the type was user-proposed at Event creation and is awaiting editorial review.

create table if not exists public.nextus_event_types (
  slug         text primary key,
  label        text not null,
  description  text,
  parent_slug  text references public.nextus_event_types(slug) on delete set null,
  is_canonical boolean not null default false,
  created_at   timestamptz not null default now()
);

create index if not exists nextus_event_types_parent_idx
  on public.nextus_event_types (parent_slug) where parent_slug is not null;

create index if not exists nextus_event_types_canonical_idx
  on public.nextus_event_types (is_canonical, slug);

alter table public.nextus_event_types enable row level security;

drop policy if exists "event types are public" on public.nextus_event_types;
create policy "event types are public"
  on public.nextus_event_types for select
  using (true);

-- Any authenticated user can propose a new type. Editorial canonicalises later.
drop policy if exists "authenticated users propose types" on public.nextus_event_types;
create policy "authenticated users propose types"
  on public.nextus_event_types for insert
  with check (auth.uid() is not null and is_canonical = false);

-- Only founders update existing types (canonicalise, edit label, set parent).
drop policy if exists "founders update types" on public.nextus_event_types;
create policy "founders update types"
  on public.nextus_event_types for update
  using (
    coalesce(
      (auth.jwt() -> 'user_metadata' ->> 'role') = 'founder',
      false
    )
  );

-- ─── 3. nextus_events ────────────────────────────────────────────────────────
-- Producers live in an array column. Required non-empty (enforced via check).
-- parent_event_id and recurrence_rule are mutually exclusive — a single row
-- is either a recurring Event, a series parent, or a series child / one-off.

create table if not exists public.nextus_events (
  id                   uuid primary key default gen_random_uuid(),
  title                text not null,
  description          text,
    -- Two-sentence Atlas convention: what happens + signal of specificity.

  -- Producers. Cannot be empty. At least one actor must produce the Event.
  producer_actor_ids   uuid[] not null,

  -- Series / recurrence (mutually exclusive at the same row).
  parent_event_id      uuid references public.nextus_events(id) on delete set null,
  recurrence_rule      text,  -- iCal RRULE; null for one-offs and series rows

  -- Time. starts_at carries offset; timezone stored explicitly for display.
  starts_at            timestamptz,
    -- Null on a series parent that exists only as a container.
  ends_at              timestamptz,
  timezone             text,
    -- IANA name, e.g. 'America/Mexico_City'.

  -- Place.
  venue_id             uuid references public.nextus_venues(id) on delete set null,
  host_space_actor_id  uuid references public.nextus_actors(id) on delete set null,
    -- Set when the venue is itself an Atlas place actor (HAAB hosting Cuéntame).
  online_url           text,

  -- Type taxonomy (see nextus_event_domain_placements for domain join).
  event_types          text[] not null default '{}',
    -- Array of nextus_event_types.slug. Empty allowed at draft; required at publish.

  -- Operational fields.
  capacity             integer,
  ticket_url           text,
  cover_image_url      text,

  status               text not null default 'draft'
    check (status in ('draft', 'published', 'cancelled', 'completed')),
  visibility           text not null default 'public'
    check (visibility in ('public', 'unlisted', 'private')),

  was_historical       boolean not null default false,
    -- True when the Event is seeded as archival data (Marko's 2024 slams,
    -- Eras Tour stops already past). Distinguishes archival from forward-looking
    -- listings. v1 inclusion per Open Question 5.

  -- Provenance and ownership — identical model to nextus_actors.
  seeded_by            text not null default 'self'
    check (seeded_by in ('self', 'community', 'nextus')),
  owner_id             uuid references auth.users(id) on delete set null,
    -- Inherited from the primary producer's owner at create time; updates as
    -- producer ownership changes.

  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),

  -- Producers cannot be empty.
  constraint events_have_producers
    check (array_length(producer_actor_ids, 1) >= 1),

  -- parent_event_id and recurrence_rule are mutually exclusive.
  constraint events_series_or_recurring
    check (
      not (parent_event_id is not null and recurrence_rule is not null)
    )
);

create index if not exists nextus_events_starts_at_idx
  on public.nextus_events (starts_at) where status = 'published';

create index if not exists nextus_events_parent_idx
  on public.nextus_events (parent_event_id) where parent_event_id is not null;

create index if not exists nextus_events_venue_idx
  on public.nextus_events (venue_id);

create index if not exists nextus_events_host_space_idx
  on public.nextus_events (host_space_actor_id) where host_space_actor_id is not null;

create index if not exists nextus_events_producers_gin
  on public.nextus_events using gin (producer_actor_ids);

create index if not exists nextus_events_event_types_gin
  on public.nextus_events using gin (event_types);

alter table public.nextus_events enable row level security;

-- Public Events visible to all; unlisted readable only by direct id (RLS does
-- not gate by URL — that's app-level). Private visible only to owner.
drop policy if exists "public events are readable" on public.nextus_events;
create policy "public events are readable"
  on public.nextus_events for select
  using (
    visibility = 'public'
    or visibility = 'unlisted'
    or owner_id = auth.uid()
  );

-- Insert: any authenticated user can create an Event. Provenance is set by
-- the application based on whether the user owns the primary producer.
drop policy if exists "authenticated users insert events" on public.nextus_events;
create policy "authenticated users insert events"
  on public.nextus_events for insert
  with check (auth.uid() is not null);

-- Update: only the owner. Ownership cascades from the primary producer actor.
drop policy if exists "owners update events" on public.nextus_events;
create policy "owners update events"
  on public.nextus_events for update
  using (owner_id = auth.uid());

-- Delete: only the owner. Soft-delete via status='cancelled' is preferred;
-- hard delete is allowed for drafts.
drop policy if exists "owners delete events" on public.nextus_events;
create policy "owners delete events"
  on public.nextus_events for delete
  using (owner_id = auth.uid());

-- ─── 4. nextus_event_domain_placements ───────────────────────────────────────
-- Mirrors actor domain placements. One Event can sit in multiple domains.

create table if not exists public.nextus_event_domain_placements (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references public.nextus_events(id) on delete cascade,
  domain_slug  text not null,
  is_primary   boolean not null default false,
  created_at   timestamptz not null default now(),
  unique (event_id, domain_slug)
);

create index if not exists nextus_event_dp_event_idx
  on public.nextus_event_domain_placements (event_id);

create index if not exists nextus_event_dp_domain_idx
  on public.nextus_event_domain_placements (domain_slug);

-- Enforce at most one primary placement per Event.
create unique index if not exists nextus_event_dp_one_primary
  on public.nextus_event_domain_placements (event_id)
  where is_primary = true;

alter table public.nextus_event_domain_placements enable row level security;

drop policy if exists "event domains are public" on public.nextus_event_domain_placements;
create policy "event domains are public"
  on public.nextus_event_domain_placements for select
  using (true);

-- Insert/update/delete: only the Event's owner.
drop policy if exists "owners manage event domains" on public.nextus_event_domain_placements;
create policy "owners manage event domains"
  on public.nextus_event_domain_placements for all
  using (
    event_id in (
      select id from public.nextus_events where owner_id = auth.uid()
    )
  )
  with check (
    event_id in (
      select id from public.nextus_events where owner_id = auth.uid()
    )
  );

-- ─── 5. nextus_event_actor_relationships ─────────────────────────────────────
-- Secondary relationships beyond producer. Bilateral confirmation pattern:
-- one party proposes, the other confirms. Until confirmed, status='pending'
-- and the relationship is not displayed publicly.

create table if not exists public.nextus_event_actor_relationships (
  id              uuid primary key default gen_random_uuid(),
  event_id        uuid not null references public.nextus_events(id) on delete cascade,
  actor_id        uuid not null references public.nextus_actors(id) on delete cascade,
  relationship    text not null
    check (relationship in ('hosts', 'features', 'sponsors', 'partners_with')),
    -- 'produces' lives in nextus_events.producer_actor_ids — not duplicated here.
  status          text not null default 'pending'
    check (status in ('pending', 'confirmed', 'declined')),
  proposed_by     uuid references auth.users(id) on delete set null,
  confirmed_at    timestamptz,
  notes           text,
  created_at      timestamptz not null default now(),
  unique (event_id, actor_id, relationship)
);

create index if not exists nextus_event_rel_event_idx
  on public.nextus_event_actor_relationships (event_id);

create index if not exists nextus_event_rel_actor_idx
  on public.nextus_event_actor_relationships (actor_id, status);

alter table public.nextus_event_actor_relationships enable row level security;

-- Confirmed relationships are public. Pending visible to the proposer, the
-- Event owner, and the related actor's owner.
drop policy if exists "confirmed event relationships are public" on public.nextus_event_actor_relationships;
create policy "confirmed event relationships are public"
  on public.nextus_event_actor_relationships for select
  using (
    status = 'confirmed'
    or proposed_by = auth.uid()
    or event_id in (select id from public.nextus_events where owner_id = auth.uid())
    or actor_id in (select id from public.nextus_actors where profile_owner = auth.uid())
  );

-- Event owners can propose relationships from their Event side.
drop policy if exists "event owners propose relationships" on public.nextus_event_actor_relationships;
create policy "event owners propose relationships"
  on public.nextus_event_actor_relationships for insert
  with check (
    auth.uid() is not null
    and event_id in (select id from public.nextus_events where owner_id = auth.uid())
  );

-- Actor owners can confirm or decline a pending relationship pointing at them.
drop policy if exists "actor owners update relationships" on public.nextus_event_actor_relationships;
create policy "actor owners update relationships"
  on public.nextus_event_actor_relationships for update
  using (
    actor_id in (select id from public.nextus_actors where profile_owner = auth.uid())
    or event_id in (select id from public.nextus_events where owner_id = auth.uid())
  );

drop policy if exists "owners delete relationships" on public.nextus_event_actor_relationships;
create policy "owners delete relationships"
  on public.nextus_event_actor_relationships for delete
  using (
    actor_id in (select id from public.nextus_actors where profile_owner = auth.uid())
    or event_id in (select id from public.nextus_events where owner_id = auth.uid())
  );

-- ─── 6. nextus_user_event_interests ──────────────────────────────────────────
-- "I want to remember this." Cheapest signal. Private to the user.

create table if not exists public.nextus_user_event_interests (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  event_id   uuid not null references public.nextus_events(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, event_id)
);

create index if not exists nextus_user_event_interests_user_idx
  on public.nextus_user_event_interests (user_id);

create index if not exists nextus_user_event_interests_event_idx
  on public.nextus_user_event_interests (event_id);

alter table public.nextus_user_event_interests enable row level security;

drop policy if exists "users read own interests" on public.nextus_user_event_interests;
create policy "users read own interests"
  on public.nextus_user_event_interests for select
  using (auth.uid() = user_id);

drop policy if exists "users insert own interests" on public.nextus_user_event_interests;
create policy "users insert own interests"
  on public.nextus_user_event_interests for insert
  with check (auth.uid() = user_id);

drop policy if exists "users delete own interests" on public.nextus_user_event_interests;
create policy "users delete own interests"
  on public.nextus_user_event_interests for delete
  using (auth.uid() = user_id);

-- ─── 7. nextus_user_event_registrations ──────────────────────────────────────
-- "I plan to be there." Surfaces in Mission Control. The platform does not
-- ticket — ticket_url stays external — but does carry the I'm-coming signal.

create table if not exists public.nextus_user_event_registrations (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  event_id      uuid not null references public.nextus_events(id) on delete cascade,
  registered_at timestamptz not null default now(),
  notes         text,
  unique (user_id, event_id)
);

create index if not exists nextus_user_event_reg_user_idx
  on public.nextus_user_event_registrations (user_id);

create index if not exists nextus_user_event_reg_event_idx
  on public.nextus_user_event_registrations (event_id);

alter table public.nextus_user_event_registrations enable row level security;

-- Registrations are visible to the user and to the Event's owner (producer).
drop policy if exists "users and event owners read registrations" on public.nextus_user_event_registrations;
create policy "users and event owners read registrations"
  on public.nextus_user_event_registrations for select
  using (
    auth.uid() = user_id
    or event_id in (select id from public.nextus_events where owner_id = auth.uid())
  );

drop policy if exists "users insert own registrations" on public.nextus_user_event_registrations;
create policy "users insert own registrations"
  on public.nextus_user_event_registrations for insert
  with check (auth.uid() = user_id);

drop policy if exists "users update own registrations" on public.nextus_user_event_registrations;
create policy "users update own registrations"
  on public.nextus_user_event_registrations for update
  using (auth.uid() = user_id);

drop policy if exists "users delete own registrations" on public.nextus_user_event_registrations;
create policy "users delete own registrations"
  on public.nextus_user_event_registrations for delete
  using (auth.uid() = user_id);

-- ─── 8. nextus_user_event_attendances ────────────────────────────────────────
-- "I was there." Post-Event signal. Can be self-declared by the user or marked
-- by the producer; producer-marked attendances are confirmed bilaterally.

create table if not exists public.nextus_user_event_attendances (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  event_id     uuid not null references public.nextus_events(id) on delete cascade,
  source       text not null default 'self'
    check (source in ('self', 'producer')),
  confirmed    boolean not null default false,
    -- Self-declared attendances are auto-confirmed. Producer-declared ones
    -- require the user to confirm before counting toward alignment loops.
  attended_at  timestamptz not null default now(),
  unique (user_id, event_id)
);

create index if not exists nextus_user_event_att_user_idx
  on public.nextus_user_event_attendances (user_id);

create index if not exists nextus_user_event_att_event_idx
  on public.nextus_user_event_attendances (event_id);

alter table public.nextus_user_event_attendances enable row level security;

drop policy if exists "users and event owners read attendances" on public.nextus_user_event_attendances;
create policy "users and event owners read attendances"
  on public.nextus_user_event_attendances for select
  using (
    auth.uid() = user_id
    or event_id in (select id from public.nextus_events where owner_id = auth.uid())
  );

-- User can self-declare attendance (source='self', auto-confirmed).
drop policy if exists "users insert own attendances" on public.nextus_user_event_attendances;
create policy "users insert own attendances"
  on public.nextus_user_event_attendances for insert
  with check (auth.uid() = user_id);

-- Producer can declare attendance for users (source='producer', unconfirmed).
drop policy if exists "producers declare attendances" on public.nextus_user_event_attendances;
create policy "producers declare attendances"
  on public.nextus_user_event_attendances for insert
  with check (
    source = 'producer'
    and confirmed = false
    and event_id in (select id from public.nextus_events where owner_id = auth.uid())
  );

-- Users confirm producer-declared attendances on themselves.
drop policy if exists "users confirm own attendances" on public.nextus_user_event_attendances;
create policy "users confirm own attendances"
  on public.nextus_user_event_attendances for update
  using (auth.uid() = user_id);

drop policy if exists "users delete own attendances" on public.nextus_user_event_attendances;
create policy "users delete own attendances"
  on public.nextus_user_event_attendances for delete
  using (auth.uid() = user_id);

-- ─── 9. Extend nextus_user_watches to allow entity_type='event' ──────────────
-- The Watch surface is polymorphic across focus / actor / person. Add 'event'.

do $$
declare
  c record;
begin
  for c in
    select con.conname
    from pg_constraint con
    join pg_attribute  att on att.attrelid = con.conrelid
                          and att.attnum   = any(con.conkey)
    where con.conrelid = 'public.nextus_user_watches'::regclass
      and con.contype  = 'c'
      and att.attname  = 'entity_type'
  loop
    execute format('alter table public.nextus_user_watches drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.nextus_user_watches
  add constraint nextus_user_watches_entity_type_check
  check (entity_type in ('focus', 'actor', 'person', 'event'));

-- ─── 10. Seed canonical Event Types ──────────────────────────────────────────
-- Initial canonical list per architecture spec Section 2.4. Parent slugs link
-- specific types to broader parents where relevant (story-slam → storytelling).

insert into public.nextus_event_types (slug, label, description, parent_slug, is_canonical) values
  -- Format-leaning
  ('talk',                'Talk',                'A single-speaker or panel presentation.',                                              null, true),
  ('concert',             'Concert',             'A musical performance with one or more performers.',                                   null, true),
  ('workshop',            'Workshop',            'A participatory session focused on developing a skill or capacity.',                   null, true),
  ('retreat',             'Retreat',             'A multi-day immersive gathering, usually residential.',                                null, true),
  ('class',               'Class',               'A structured teaching session, often part of a series.',                               null, true),
  ('panel',               'Panel',               'Multiple speakers in moderated conversation.',                                         'talk', true),
  ('screening',           'Screening',           'A film, video, or recorded media viewing.',                                            null, true),
  ('reading',             'Reading',             'An author or poet reading their work aloud.',                                          null, true),
  ('exhibition',          'Exhibition',          'A curated display of visual or material work.',                                        null, true),
  ('installation',        'Installation',        'A site-specific art or experiential work.',                                            null, true),
  ('performance',         'Performance',         'A live performed work — theatre, dance, multidisciplinary.',                           null, true),
  ('open-mic',            'Open Mic',            'An open-stage event where anyone can perform or share.',                               null, true),
  ('conference',          'Conference',          'A multi-session gathering with a programme of speakers.',                              null, true),
  ('meetup',              'Meetup',              'An informal gathering of people with shared interest.',                                null, true),
  ('ceremony',            'Ceremony',            'A ritual or sacramental gathering.',                                                   null, true),
  ('service',             'Service',             'A spiritual or religious service.',                                                    null, true),
  ('dinner',              'Dinner',              'A shared meal as the central event.',                                                  null, true),
  ('tour',                'Tour',                'A guided journey through a place or topic.',                                           null, true),
  ('march',               'March',               'A walking demonstration or pilgrimage.',                                               null, true),
  ('protest',             'Protest',             'A demonstration of dissent or solidarity.',                                            null, true),
  ('meditation',          'Meditation',          'A group meditation session.',                                                          null, true),

  -- Modality-leaning
  ('storytelling',        'Storytelling',        'A storytelling-format gathering.',                                                     null, true),
  ('story-slam',          'Story Slam',          'A competitive or curated storytelling event with rotating themes.',                    'storytelling', true),
  ('solo-show',           'Solo Show',           'A one-person performance or storytelling work.',                                       'storytelling', true),
  ('ecstatic-dance',      'Ecstatic Dance',      'A facilitated free-movement session with no talking.',                                 null, true),
  ('breathwork',          'Breathwork',          'A facilitated breathing practice session.',                                            null, true),
  ('cacao-ceremony',      'Cacao Ceremony',      'A ceremonial cacao-sharing gathering.',                                                'ceremony', true),
  ('sound-bath',          'Sound Bath',          'A sound-immersion session with bowls, gongs, or voice.',                               null, true),
  ('contact-improv',      'Contact Improvisation','A movement and partnered exploration practice.',                                      null, true),
  ('council',             'Council',             'A structured group sharing circle with talking-piece protocol.',                       null, true),
  ('mens-work',           'Men''s Work',         'A men''s group, circle, or intensive.',                                                null, true),
  ('womens-work',         'Women''s Work',       'A women''s group, circle, or intensive.',                                              null, true),
  ('gift-economy',        'Gift Economy',        'A gathering organised around giving without expectation of return.',                   null, true),
  ('mutual-aid',          'Mutual Aid',          'A community self-help gathering or distribution.',                                     null, true),
  ('community-garden',    'Community Garden',    'A shared gardening session or open community garden gathering.',                       null, true),
  ('plant-giveaway',      'Plant Giveaway',      'An event distributing plants, seeds, or cuttings freely.',                             'mutual-aid', true),
  ('clean-up',            'Clean-up',            'A community cleaning or restoration gathering.',                                       null, true),
  ('repair-cafe',         'Repair Cafe',         'A gathering where attendees fix things together.',                                     null, true),
  ('skill-share',         'Skill Share',         'A gathering where attendees teach each other.',                                        null, true),
  ('forum',               'Forum',               'A structured public deliberation or discussion event.',                                null, true),
  ('roundtable',          'Roundtable',          'A peer-discussion gathering, often invitation-based.',                                 null, true)
on conflict (slug) do nothing;

-- ─── 11. Helper RPC: list_upcoming_events_for_actor ──────────────────────────
-- Returns published events for a given actor (as producer or host), ordered
-- by start time, separating upcoming (starts_at >= now) and recent past.

create or replace function public.list_upcoming_events_for_actor(
  p_actor_id uuid,
  p_include_past boolean default false,
  p_limit integer default 50
)
returns setof public.nextus_events
language sql
security invoker
stable
as $$
  select e.*
  from public.nextus_events e
  where e.status = 'published'
    and e.visibility in ('public', 'unlisted')
    and (
      p_actor_id = any(e.producer_actor_ids)
      or e.host_space_actor_id = p_actor_id
    )
    and (
      p_include_past = true
      or e.starts_at is null
      or e.starts_at >= (now() - interval '6 hours')
    )
  order by
    case when e.starts_at is null then 1 else 0 end,  -- nulls last
    e.starts_at asc nulls last
  limit p_limit;
$$;

grant execute on function public.list_upcoming_events_for_actor(uuid, boolean, integer) to authenticated, anon;

-- ─── 12. updated_at triggers ─────────────────────────────────────────────────
-- Standard pattern used elsewhere in the schema.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_events_updated_at on public.nextus_events;
create trigger trg_events_updated_at
  before update on public.nextus_events
  for each row execute function public.set_updated_at();

drop trigger if exists trg_venues_updated_at on public.nextus_venues;
create trigger trg_venues_updated_at
  before update on public.nextus_venues
  for each row execute function public.set_updated_at();

commit;

-- ─── Verification (run manually) ─────────────────────────────────────────────
-- -- Should show all the new tables:
-- select table_name from information_schema.tables
-- where table_schema = 'public' and table_name like 'nextus_event%' or table_name = 'nextus_venues'
-- order by table_name;
--
-- -- Should return all canonical Event Types:
-- select slug, label, parent_slug from public.nextus_event_types
-- where is_canonical = true order by parent_slug nulls first, slug;
--
-- -- Should show 'event' as allowed in watches:
-- select pg_get_constraintdef(oid) from pg_constraint
-- where conname = 'nextus_user_watches_entity_type_check';
