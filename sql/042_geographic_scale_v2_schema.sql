-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 042 — Geographic Scale Architecture v2, Phase v2.1
--
-- Schema extension for the Focus primitive. All additive, all idempotent.
-- Builds on the existing nextus_focuses table (created pre-tracked migrations,
-- referenced by indicator schema beta/020 and by app code).
--
-- What this migration does
-- ─────────────────────────
-- 1. Extends nextus_focuses with the columns v2 requires:
--      - kind            (text)        — typology axis (political, ecological, etc.)
--      - description     (text)        — plain-language description
--      - coordinates     (jsonb)       — { lat, lng } for map display
--      - geonames_id     (bigint)      — stable GeoNames reference (nullable, unique)
--      - wikidata_qid    (text)        — Wikidata QID, e.g. "Q16" (nullable, unique)
--
-- 2. Expands the allowed values of nextus_focuses.type to the full v2 scale
--    taxonomy. Preserves every existing v1 value. Adds the new ones.
--
-- 3. Adds CHECK on nextus_focuses.kind enumerating the v2 kind taxonomy.
--    NULL allowed during rollout — existing rows backfill in a later phase.
--
-- 4. Creates four new tables that v2 introduces as first-class concepts:
--      - nextus_focus_designations   externally-sourced status overlays
--      - nextus_focus_touches        non-hierarchical adjacency relations
--      - nextus_user_affiliations    user-declared personal relationships
--      - nextus_focus_responses      responder-to-crisis-zone links
--
-- 5. Wires Row-Level Security policies on nextus_user_affiliations enforcing
--    the per-affiliation visibility flag (public / visible_to_matches / private).
--
-- What this migration does NOT do
-- ────────────────────────────────
-- - Does not modify any existing column on nextus_focuses
-- - Does not change the existing nextus_focus_goals table
-- - Does not touch nextus_domain_indicators, nextus_domain_indicator_values,
--   or nextus_indicator_fetch_log
-- - Does not seed any data (data seeding is a separate migration)
-- - Does not break v1 — the type CHECK constraint is loosened, not tightened
--
-- Source: NextUs Geographic Scale Architecture v2.0, Section 2 (Core Framework)
-- and Section 8 (Build Sequence, Phase v2.1).
-- ─────────────────────────────────────────────────────────────────────────────

begin;

-- ─── 1. nextus_focuses column extensions ────────────────────────────────────

alter table public.nextus_focuses
  add column if not exists kind          text,
  add column if not exists description   text,
  add column if not exists coordinates   jsonb,
  add column if not exists geonames_id   bigint,
  add column if not exists wikidata_qid  text;

-- Unique-where-present indexes for the external reference columns.
-- A given GeoNames entity should not be ingested twice.

create unique index if not exists nextus_focuses_geonames_id_uq
  on public.nextus_focuses (geonames_id)
  where geonames_id is not null;

create unique index if not exists nextus_focuses_wikidata_qid_uq
  on public.nextus_focuses (wikidata_qid)
  where wikidata_qid is not null;

-- ─── 2. nextus_focuses.type — extend allowed values ─────────────────────────
--
-- v1 supported: continent, nation, province, city, neighbourhood (+ planet).
-- v2 adds the full taxonomy. v1 values are preserved.
--
-- Note on naming: v2 architecture doc uses 'country' as the canonical scale
-- name (matches GeoNames PCLI feature code and avoids the political/ethnic
-- ambiguity of 'nation'). v1 code uses 'nation' in CHECK and seed data.
-- Both are accepted in v2 to keep v1 code unbroken; the canonical name in
-- new ingest is 'country', and a future migration may merge 'nation' rows
-- into 'country' once UI updates land.

do $$
declare
  c record;
begin
  -- Drop any CHECK constraint that references the type column on
  -- nextus_focuses, by whatever name. Defensive: the original v1
  -- constraint may have been auto-named or manually-named.
  for c in
    select con.conname
    from pg_constraint con
    join pg_attribute  att on att.attrelid = con.conrelid
                          and att.attnum   = any(con.conkey)
    where con.conrelid = 'public.nextus_focuses'::regclass
      and con.contype  = 'c'
      and att.attname  = 'type'
  loop
    execute format('alter table public.nextus_focuses drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.nextus_focuses
  add constraint nextus_focuses_type_check
  check (type in (
    -- Top of tree
    'planet',
    'continent',
    'ocean',
    'sea',
    -- Political and administrative
    'country',           -- canonical v2 name
    'nation',            -- v1 backward compatibility
    'state_or_province',
    'province',          -- v1 backward compatibility
    'region',
    'city',
    'neighbourhood',
    -- Hydrological
    'river',
    'lake',
    'watershed',
    -- Geological
    'mountain_range',
    'mountain',
    'desert',
    'island',
    'archipelago',
    'geological_feature',
    'polar_region',
    -- Ecological
    'ecoregion',
    'biome',
    'realm',
    'bioregion',
    'forest',
    -- Designation-as-scale
    'protected_area',
    'heritage_site',
    'sacred_site',
    -- Atmospheric and orbital (named in architecture, deferred from launch)
    'atmosphere_layer',
    'orbital_zone',
    -- Organisation-as-Focus (named in v1 doc as future entity type)
    'organisation'
  ));

-- ─── 3. nextus_focuses.kind — enumeration CHECK ─────────────────────────────
--
-- Kind is the typology axis. NULL allowed during rollout; backfill happens
-- as part of the GeoNames ingest in Phase v2.2.

alter table public.nextus_focuses
  drop constraint if exists nextus_focuses_kind_check;

alter table public.nextus_focuses
  add constraint nextus_focuses_kind_check
  check (kind is null or kind in (
    'political',
    'hydrological',
    'geological',
    'ecological',
    'cultural',
    'designated',
    'disrupted',
    'atmospheric',
    'orbital'
  ));

-- ─── 4. nextus_focus_designations — externally-sourced status overlays ──────
--
-- A Focus can carry zero or more designations. Each is attributed to its
-- source. The platform never originates a designation; it ingests and
-- attributes.

create table if not exists public.nextus_focus_designations (
  id                uuid primary key default gen_random_uuid(),
  focus_id          uuid not null references public.nextus_focuses(id) on delete cascade,
  designation_type  text not null check (designation_type in (
                      'priority_ecoregion',
                      'ecoregion_conservation_status',
                      'protected_area',
                      'world_heritage_site',
                      'crisis_zone',
                      'disrupted_zone',
                      -- Target upstreams reserved at schema level so the
                      -- registry does not require future schema migrations
                      -- to onboard them
                      'biodiversity_hotspot',
                      'marine_ecoregion',
                      'watershed_classification',
                      'key_biodiversity_area',
                      'aze_site',
                      'ramsar_wetland',
                      'iucn_ecosystem_status',
                      'intangible_heritage',
                      'slavery_prevalence',
                      'climate_emergency'
                    )),
  source_name       text not null,           -- e.g. 'WWF Global 200', 'UNESCO', 'ACLED'
  source_ref        text,                    -- upstream stable ID for this designation
  attribution       text not null,           -- credit line to display
  valid_from        timestamptz,
  valid_to          timestamptz,             -- null = still valid
  status_metadata   jsonb not null default '{}'::jsonb,
                                             -- crisis_zone uses this for status,
                                             -- crisis_type, onset_date, last_update
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists nextus_focus_designations_focus_idx
  on public.nextus_focus_designations (focus_id);

create index if not exists nextus_focus_designations_type_idx
  on public.nextus_focus_designations (designation_type);

create index if not exists nextus_focus_designations_active_idx
  on public.nextus_focus_designations (focus_id, designation_type)
  where valid_to is null;

-- A given Focus can carry only one active instance of a given designation
-- from a given source. (A Focus can be a UNESCO heritage site once, not twice.)
create unique index if not exists nextus_focus_designations_unique_active
  on public.nextus_focus_designations (focus_id, designation_type, source_name)
  where valid_to is null;

-- ─── 5. nextus_focus_touches — non-hierarchical adjacency ───────────────────
--
-- parent_id captures canonical containment (single parent). Real geography
-- has adjacency that parent_id cannot express: the Mediterranean touches
-- three continents; Cascadia spans two countries; a watershed crosses
-- multiple states. This table holds those relations.

create table if not exists public.nextus_focus_touches (
  id              uuid primary key default gen_random_uuid(),
  focus_id_a      uuid not null references public.nextus_focuses(id) on delete cascade,
  focus_id_b      uuid not null references public.nextus_focuses(id) on delete cascade,
  relation_type   text not null check (relation_type in (
                    'touches',           -- generic adjacency
                    'shares_border_with',-- political border
                    'contains_part_of',  -- partial containment, e.g. river through country
                    'flows_into',        -- hydrological connection
                    'overlaps'           -- region overlap, e.g. bioregion across countries
                  )),
  source_name     text,                  -- where this relation came from (Wikidata, editorial)
  source_ref      text,
  created_at      timestamptz not null default now(),
  -- A relation is undirected for 'touches' and 'shares_border_with' but
  -- directional for 'flows_into'. We normalise undirected relations by
  -- always storing the lower UUID in focus_id_a.
  check (focus_id_a <> focus_id_b)
);

create index if not exists nextus_focus_touches_a_idx
  on public.nextus_focus_touches (focus_id_a);

create index if not exists nextus_focus_touches_b_idx
  on public.nextus_focus_touches (focus_id_b);

-- Prevent duplicate relations (same pair, same type, same source).
create unique index if not exists nextus_focus_touches_unique
  on public.nextus_focus_touches (focus_id_a, focus_id_b, relation_type, coalesce(source_name, ''));

-- ─── 6. nextus_user_affiliations — user-declared personal relationships ─────
--
-- A user can hold multiple affiliations to the same Focus (born in Canada
-- AND citizen of Canada AND former resident of Toronto). A user can hold
-- affiliations across many Focuses at any scale. Visibility is per-record.

create table if not exists public.nextus_user_affiliations (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  focus_id            uuid not null references public.nextus_focuses(id) on delete cascade,
  relationship_type   text not null check (relationship_type in (
                        'citizen',
                        'resident',
                        'former_resident',
                        'born_here',
                        'heritage',
                        'working_here',
                        'connected_to'
                      )),
  visibility          text not null default 'public' check (visibility in (
                        'public',
                        'visible_to_matches',
                        'private'
                      )),
  note                text,                  -- optional user-written context
  declared_at         timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- A user can declare each relationship_type once per Focus. (You're a citizen
-- of Canada once, not twice.) Multiple different relationships to the same
-- Focus are allowed via different relationship_type values.
create unique index if not exists nextus_user_affiliations_unique
  on public.nextus_user_affiliations (user_id, focus_id, relationship_type);

create index if not exists nextus_user_affiliations_user_idx
  on public.nextus_user_affiliations (user_id);

create index if not exists nextus_user_affiliations_focus_idx
  on public.nextus_user_affiliations (focus_id);

-- ─── 7. Row-Level Security on nextus_user_affiliations ──────────────────────
--
-- Visibility is enforced at the database layer, not the application layer.
-- The visibility flag on each row drives who can see it.
--
-- Policies:
--   - A user can always read, insert, update, and delete their own affiliations
--     regardless of visibility.
--   - Any authenticated or anonymous user can read affiliations where
--     visibility = 'public'.
--   - Affiliations with visibility = 'visible_to_matches' are NOT readable by
--     the public; the matching layer will require its own policy (deferred
--     to phase v2.5 — until then these rows are effectively private to the
--     owner).
--   - Affiliations with visibility = 'private' are only readable by the owner.

alter table public.nextus_user_affiliations enable row level security;

drop policy if exists "users read own affiliations" on public.nextus_user_affiliations;
create policy "users read own affiliations"
  on public.nextus_user_affiliations
  for select
  using (auth.uid() = user_id);

drop policy if exists "anyone reads public affiliations" on public.nextus_user_affiliations;
create policy "anyone reads public affiliations"
  on public.nextus_user_affiliations
  for select
  using (visibility = 'public');

drop policy if exists "users insert own affiliations" on public.nextus_user_affiliations;
create policy "users insert own affiliations"
  on public.nextus_user_affiliations
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "users update own affiliations" on public.nextus_user_affiliations;
create policy "users update own affiliations"
  on public.nextus_user_affiliations
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "users delete own affiliations" on public.nextus_user_affiliations;
create policy "users delete own affiliations"
  on public.nextus_user_affiliations
  for delete
  using (auth.uid() = user_id);

-- ─── 8. nextus_focus_responses — responder-to-crisis-zone links ─────────────
--
-- When a Focus carries an active crisis_zone designation, actors can be
-- linked as responders. This is the bridge from honest seeing to meaningful
-- doing — the platform's deepest answer to "what can I do."

create table if not exists public.nextus_focus_responses (
  id                  uuid primary key default gen_random_uuid(),
  responder_actor_id  uuid not null references public.nextus_actors(id) on delete cascade,
  target_focus_id     uuid not null references public.nextus_focuses(id) on delete cascade,
  response_mode       text not null check (response_mode in (
                        'provides_aid',
                        'documents',
                        'advocates',
                        'repairs',
                        'organises',
                        'witnesses',
                        'treats',
                        'defends',
                        'hosts_displaced',
                        'funds_response'
                      )),
  status              text not null default 'active' check (status in (
                        'active',
                        'completed',
                        'paused'
                      )),
  source              text not null default 'self' check (source in (
                        'self',          -- responder declared
                        'community',     -- community-flagged
                        'editorial'      -- NextUs-added
                      )),
  note                text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- A responder can have multiple response modes to the same Focus (an org
-- might both provide aid and document), so the unique key includes mode.
create unique index if not exists nextus_focus_responses_unique
  on public.nextus_focus_responses (responder_actor_id, target_focus_id, response_mode);

create index if not exists nextus_focus_responses_focus_idx
  on public.nextus_focus_responses (target_focus_id);

create index if not exists nextus_focus_responses_actor_idx
  on public.nextus_focus_responses (responder_actor_id);

-- ─── 9. updated_at triggers ─────────────────────────────────────────────────
--
-- Generic trigger function (idempotent — create if not exists pattern).
-- If you already have a project-wide tg_set_updated_at, this duplicates
-- harmlessly; the OR REPLACE makes it safe.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at on public.nextus_focus_designations;
create trigger set_updated_at
  before update on public.nextus_focus_designations
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.nextus_user_affiliations;
create trigger set_updated_at
  before update on public.nextus_user_affiliations
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.nextus_focus_responses;
create trigger set_updated_at
  before update on public.nextus_focus_responses
  for each row execute function public.set_updated_at();

commit;

-- ─── Verification queries (run manually after migration) ────────────────────
-- select column_name, data_type from information_schema.columns
--   where table_name = 'nextus_focuses' order by ordinal_position;
--
-- select conname, pg_get_constraintdef(oid) from pg_constraint
--   where conrelid = 'public.nextus_focuses'::regclass;
--
-- select tablename from pg_tables where schemaname = 'public'
--   and tablename like 'nextus_focus_%' or tablename = 'nextus_user_affiliations';
--
-- select tablename, rowsecurity from pg_tables
--   where tablename = 'nextus_user_affiliations';
