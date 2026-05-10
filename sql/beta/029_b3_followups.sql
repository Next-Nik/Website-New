-- ─────────────────────────────────────────────────────────────────────────────
-- Module 11.8 — B-3 follow-ups: schema additions and the WGI fix
--
-- This migration packages four follow-up changes that came out of the B-3
-- post-deploy audit:
--
--   1. Source suggestions table — community-contributed source pointers
--      surfaced anywhere a Tier 2 / not-implemented indicator is shown.
--      Honest gaps become invitations.
--
--   2. Indicator aliases — many-to-many between catalog rows. When the
--      same metric reads through multiple domain lenses (R&D in
--      Technology and Vision; refugees in Human Being and Society;
--      indigenous land in Nature and Legacy), the canonical fetch
--      writes once and the alias surfaces in the other domain. Saves
--      redundant API calls and gives the UI a way to say "also read in:
--      [Vision]" instead of duplicating the fact silently.
--
--   3. WGI source=3 fix — three Worldwide Governance Indicators in the
--      Society catalog (VA.EST, RL.EST, CC.EST) live on World Bank API
--      source=3 (WGI), not the default source=2 (WDI). Without that
--      param the API returns no rows and the indicators fail silently
--      every cron run. One-line URL fix per indicator.
--
--   4. Three canonical alias seedings — the three known cross-domain
--      indicators that exist in the B-3 catalog as duplicates. With
--      the alias table they collapse to one canonical row each.
--
-- Idempotent throughout. Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

begin;

-- ─── 1. Source suggestions table ─────────────────────────────────────────────
--
-- Anyone — anonymous or signed in — can suggest a data source for an
-- indicator that doesn't yet have a working fetcher. We capture the
-- suggestion, who made it (if known), and an optional note. Indicator-
-- level moderation happens via the existing founder admin console.
--
-- Status flow: 'submitted' → 'reviewing' → 'accepted' | 'declined' |
-- 'duplicate'. No public exposure of declined suggestions; accepted
-- ones may surface as "the community suggested this source" once a
-- fetcher is built against them.

create table if not exists nextus_source_suggestions (
  id              uuid primary key default gen_random_uuid(),
  indicator_id    uuid not null references nextus_domain_indicators(id) on delete cascade,
  contributor_id  uuid references contributor_profiles_beta(id) on delete set null,
  source_name     text not null,
  source_url      text not null,
  endpoint_url    text,           -- optional, if the contributor knows it
  cadence_hint    text,           -- 'daily' | 'monthly' | 'annual' | 'event-driven' | freeform
  notes           text,           -- why this source, methodology caveat, etc.
  status          text not null default 'submitted',
  reviewer_notes  text,           -- founder-side notes on accept/decline
  reviewed_by     uuid references contributor_profiles_beta(id) on delete set null,
  reviewed_at     timestamptz,
  submitted_at    timestamptz not null default now(),
  -- contact channel for anonymous submissions
  contact_email   text,
  -- soft uniqueness — same indicator + same URL is a dup
  constraint source_suggestions_status_chk
    check (status in ('submitted', 'reviewing', 'accepted', 'declined', 'duplicate'))
);

create index if not exists idx_source_suggestions_indicator
  on nextus_source_suggestions (indicator_id, status);

create index if not exists idx_source_suggestions_status_submitted
  on nextus_source_suggestions (status, submitted_at desc);

-- Public-readable accepted suggestions; everything else founder-only.
alter table nextus_source_suggestions enable row level security;

-- Anyone may insert a suggestion — including anonymous. The API route
-- enforces rate limiting and minimal validation, but we do not gate on
-- auth for submission; that defeats the point.
drop policy if exists insert_any_source_suggestion on nextus_source_suggestions;
create policy insert_any_source_suggestion
  on nextus_source_suggestions
  for insert
  to anon, authenticated
  with check (
    char_length(source_name) between 2 and 200
    and char_length(source_url) between 8 and 2000
    and (notes is null or char_length(notes) <= 2000)
  );

-- Anyone may read accepted suggestions (so the UI can show "the
-- community pointed us at this source"). Other states stay founder-only.
drop policy if exists read_accepted_source_suggestions on nextus_source_suggestions;
create policy read_accepted_source_suggestions
  on nextus_source_suggestions
  for select
  to anon, authenticated
  using (status = 'accepted');


-- ─── 2. Indicator aliases ────────────────────────────────────────────────────
--
-- Each indicator may have one canonical row and zero-to-many alias rows.
-- The alias points at the canonical via canonical_indicator_id. Values
-- written to the canonical surface read-through to aliases via the
-- view nextus_indicator_values_resolved (defined below).
--
-- This is intentionally additive — it does not require existing duplicate
-- rows to be deleted. The alias rows can stay in the catalog as
-- domain-specific reading lenses while only the canonical is fetched.

create table if not exists nextus_indicator_aliases (
  id                       uuid primary key default gen_random_uuid(),
  alias_indicator_id       uuid not null references nextus_domain_indicators(id) on delete cascade,
  canonical_indicator_id   uuid not null references nextus_domain_indicators(id) on delete cascade,
  alias_lens               text,  -- 'tech-substrate' | 'future-orientation' | 'legacy-stewardship' etc.
  created_at               timestamptz not null default now(),
  -- Aliases are unique per (alias, canonical) pair, and an alias can only
  -- point at one canonical to keep the data flow simple.
  constraint alias_unique         unique (alias_indicator_id),
  constraint alias_not_self_chk   check (alias_indicator_id <> canonical_indicator_id)
);

create index if not exists idx_indicator_aliases_canonical
  on nextus_indicator_aliases (canonical_indicator_id);

-- Read-through view: any indicator's "current value" is its own values
-- if it has them, else the canonical's values via the alias table. The
-- read-side hooks query this view instead of nextus_domain_indicator_values
-- directly.

create or replace view nextus_indicator_values_resolved as
  select
    v.indicator_id    as queried_indicator_id,
    v.indicator_id    as actual_indicator_id,
    v.focus_id,
    v.value_numeric,
    v.value_text,
    v.observed_at,
    v.fetched_at,
    v.source_record_id,
    v.is_current,
    v.confidence,
    false             as via_alias
  from nextus_domain_indicator_values v
union all
  select
    a.alias_indicator_id      as queried_indicator_id,
    v.indicator_id            as actual_indicator_id,
    v.focus_id,
    v.value_numeric,
    v.value_text,
    v.observed_at,
    v.fetched_at,
    v.source_record_id,
    v.is_current,
    v.confidence,
    true                       as via_alias
  from nextus_indicator_aliases a
  join nextus_domain_indicator_values v
    on v.indicator_id = a.canonical_indicator_id
  -- only surface alias-routed value if the alias row itself has no
  -- direct value for that focus_id × observed_at
  where not exists (
    select 1 from nextus_domain_indicator_values v2
    where v2.indicator_id = a.alias_indicator_id
      and coalesce(v2.focus_id::text, '∅') = coalesce(v.focus_id::text, '∅')
      and v2.observed_at = v.observed_at
  );


-- ─── 3. WGI source=3 fix ─────────────────────────────────────────────────────
--
-- The three Worldwide Governance Indicators in the Society catalog
-- (Voice & Accountability, Rule of Law, Control of Corruption) were
-- pointed at default-source URLs. They live on source=3 (WGI), not
-- source=2 (WDI). Empty rows on every cron run, logged as 'failed'
-- with message 'World Bank returned no rows'.
--
-- One-line URL fix per indicator. Uses replace() so the migration is
-- idempotent and tolerant of any subsequent URL adjustments.

update nextus_domain_indicators
  set endpoint_url = replace(endpoint_url, '?format=json&per_page=20', '?format=json&source=3&per_page=20')
  where domain_id = 'society'
    and source_name = 'World Bank WDI'
    and name in ('Voice and Accountability (WGI)',
                 'Rule of Law (WGI)',
                 'Control of Corruption (WGI)')
    and endpoint_url like '%?format=json&per_page=20';


-- ─── 4. Canonical alias seedings ─────────────────────────────────────────────
--
-- Three known cross-domain duplicates in the B-3 catalog. We pick one
-- canonical per metric and alias the others to it.
--
-- Canonical choice: the domain where the metric most directly reads
-- against the Horizon Goal lens.
--   - R&D expenditure: canonical in Technology (substrate health),
--     aliased in Vision (future-orientation lens).
--   - Internet penetration: canonical in Technology (access-
--     infrastructure), aliased in Society (information-integrity lens).
--   - Mobile cellular subscriptions: canonical in Technology, aliased
--     in Society.
--
-- Refugees by country of origin appears in the Society domain only
-- (the Human Being seed mentions displacement but uses different
-- indicators) so no alias needed.
--
-- Idempotent: the unique constraint on alias_indicator_id ensures the
-- on conflict do nothing branch keeps re-runs safe.

with
  rd_canonical as (
    select id from nextus_domain_indicators
    where domain_id = 'technology'
      and name = 'R&D expenditure'
      and source_name = 'World Bank WDI'
    limit 1
  ),
  rd_alias as (
    select id from nextus_domain_indicators
    where domain_id = 'vision'
      and name = 'R&D expenditure'
      and source_name = 'World Bank WDI'
    limit 1
  ),
  net_canonical as (
    select id from nextus_domain_indicators
    where domain_id = 'technology'
      and name = 'Internet penetration'
      and source_name = 'World Bank WDI'
    limit 1
  ),
  net_alias as (
    select id from nextus_domain_indicators
    where domain_id = 'society'
      and name = 'Internet penetration'
      and source_name = 'World Bank WDI'
    limit 1
  ),
  mob_canonical as (
    select id from nextus_domain_indicators
    where domain_id = 'technology'
      and name = 'Mobile cellular subscriptions'
      and source_name = 'World Bank WDI'
    limit 1
  ),
  mob_alias as (
    select id from nextus_domain_indicators
    where domain_id = 'society'
      and name = 'Mobile cellular subscriptions'
      and source_name = 'World Bank WDI'
    limit 1
  )
insert into nextus_indicator_aliases (alias_indicator_id, canonical_indicator_id, alias_lens)
select rd_alias.id, rd_canonical.id, 'future-orientation'
  from rd_alias, rd_canonical
union all
select net_alias.id, net_canonical.id, 'information-integrity'
  from net_alias, net_canonical
union all
select mob_alias.id, mob_canonical.id, 'information-integrity'
  from mob_alias, mob_canonical
on conflict (alias_indicator_id) do nothing;

commit;

-- ─── Rollback (reference only)
-- drop view if exists nextus_indicator_values_resolved;
-- drop table if exists nextus_indicator_aliases;
-- drop table if exists nextus_source_suggestions;
