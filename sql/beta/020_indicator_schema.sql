-- ─────────────────────────────────────────────────────────────────────────────
-- Module 11 — Data Sourcing Layer schema
--
-- Three additive tables. No changes to nextus_actors, contributor_profiles,
-- or nextus_focuses. Idempotent: safe to re-run.
--
-- Source: NextUs Data Sourcing Layer Living Architecture v1, Section 3.1.
-- ─────────────────────────────────────────────────────────────────────────────

begin;

-- ─── nextus_domain_indicators (catalog) ──────────────────────────────────────

create table if not exists nextus_domain_indicators (
  id                  uuid primary key default gen_random_uuid(),
  domain_id           text not null check (domain_id in (
                        'human-being',
                        'society',
                        'nature',
                        'technology',
                        'finance-economy',
                        'legacy',
                        'vision'
                      )),
  subdomain_slug      text,
  lens_slugs          text[] not null default '{}',
  name                text not null,
  unit                text,
  tier                text not null check (tier in ('api', 'scrape', 'contributor')),
  source_name         text not null,
  source_url          text,
  endpoint_url        text,
  native_resolution   text not null check (native_resolution in ('local', 'regional', 'planetary')),
  refresh_cadence     text not null check (refresh_cadence in (
                        'daily', 'weekly', 'monthly', 'annual', 'event-driven'
                      )),
  direction_preferred text not null check (direction_preferred in ('up', 'down', 'context')),
  methodology_note    text,
  status              text not null default 'active' check (status in (
                        'active', 'proposed', 'deprecated'
                      )),
  -- Module 11 additions per build brief
  structure_version   text not null default 'v2',
  tagged_principles   text[] not null default '{}',
  -- Treated as "headline" indicator for the domain page hero cluster
  is_headline         boolean not null default false,
  -- Display ordering inside the headline cluster (lower = first)
  headline_order      smallint,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists nextus_domain_indicators_domain_idx
  on nextus_domain_indicators (domain_id);

create index if not exists nextus_domain_indicators_status_idx
  on nextus_domain_indicators (status);

create index if not exists nextus_domain_indicators_headline_idx
  on nextus_domain_indicators (domain_id, is_headline, headline_order)
  where is_headline = true;

-- A given indicator name within a domain is unique by source. Prevents
-- duplicate seed rows from re-running the seed.
create unique index if not exists nextus_domain_indicators_unique_name
  on nextus_domain_indicators (domain_id, name, source_name);

-- ─── nextus_domain_indicator_values (historical series) ──────────────────────

create table if not exists nextus_domain_indicator_values (
  id                uuid primary key default gen_random_uuid(),
  indicator_id      uuid not null references nextus_domain_indicators(id) on delete cascade,
  -- Focus is optional. Planetary indicators store NULL; per-Focus indicators
  -- carry the Focus id. The read path's inheritance walk handles both.
  focus_id          uuid references nextus_focuses(id) on delete set null,
  value_numeric     numeric,
  value_text        text,
  observed_at       timestamptz not null,
  fetched_at        timestamptz not null default now(),
  source_record_id  text,
  is_current        boolean not null default true,
  confidence        text check (confidence in ('high', 'medium', 'low', 'preliminary'))
);

-- Idempotency for cron retries. Two observations of the same indicator at
-- the same Focus and the same source-side timestamp collapse to one row.
-- COALESCE on focus_id keeps the constraint working for planetary rows.
create unique index if not exists nextus_domain_indicator_values_unique
  on nextus_domain_indicator_values (
    indicator_id,
    coalesce(focus_id, '00000000-0000-0000-0000-000000000000'),
    observed_at
  );

create index if not exists nextus_domain_indicator_values_current_idx
  on nextus_domain_indicator_values (indicator_id, focus_id, is_current)
  where is_current = true;

create index if not exists nextus_domain_indicator_values_observed_idx
  on nextus_domain_indicator_values (indicator_id, observed_at desc);

-- ─── nextus_contributor_signals (Tier 3) ─────────────────────────────────────

create table if not exists nextus_contributor_signals (
  id                  uuid primary key default gen_random_uuid(),
  domain_id           text not null check (domain_id in (
                        'human-being',
                        'society',
                        'nature',
                        'technology',
                        'finance-economy',
                        'legacy',
                        'vision'
                      )),
  subdomain_slug      text,
  lens_slugs          text[] not null default '{}',
  focus_id            uuid references nextus_focuses(id) on delete set null,
  contributor_id      uuid references auth.users(id) on delete set null,
  signal_type         text not null check (signal_type in (
                        'observation', 'scenario', 'story', 'measurement'
                      )),
  signal_text         text not null,
  signal_value_numeric numeric,
  submitted_at        timestamptz not null default now(),
  expires_at          timestamptz,
  visibility          text not null default 'public' check (visibility in (
                        'public', 'attributed', 'anonymous'
                      )),
  vetting_status      text not null default 'self_submitted' check (vetting_status in (
                        'self_submitted', 'reviewed', 'flagged'
                      )),
  -- Module 11 additions per build brief
  tagged_principles   text[] not null default '{}',
  created_at          timestamptz not null default now()
);

create index if not exists nextus_contributor_signals_domain_idx
  on nextus_contributor_signals (domain_id);

create index if not exists nextus_contributor_signals_contributor_idx
  on nextus_contributor_signals (contributor_id);

create index if not exists nextus_contributor_signals_active_idx
  on nextus_contributor_signals (domain_id, expires_at)
  where vetting_status <> 'flagged';

-- ─── Cron failure log ────────────────────────────────────────────────────────
-- Per-indicator failure logging per the brief. The cron writes one row per
-- failed fetch so stale data has a paper trail.

create table if not exists nextus_indicator_fetch_log (
  id            uuid primary key default gen_random_uuid(),
  indicator_id  uuid references nextus_domain_indicators(id) on delete cascade,
  run_at        timestamptz not null default now(),
  status        text not null check (status in ('ok', 'skipped', 'failed', 'not-implemented')),
  http_status   int,
  message       text,
  duration_ms   int
);

create index if not exists nextus_indicator_fetch_log_indicator_idx
  on nextus_indicator_fetch_log (indicator_id, run_at desc);

create index if not exists nextus_indicator_fetch_log_failures_idx
  on nextus_indicator_fetch_log (run_at desc)
  where status in ('failed', 'not-implemented');

-- ─── RLS ─────────────────────────────────────────────────────────────────────
-- Catalog and historical values are public-readable (they are public data
-- the platform is republishing under its own provenance). Writes are
-- service-role only — the cron uses the service key, no end-user write
-- path exists.
--
-- Contributor signals are public-readable when not flagged. Contributors
-- write their own rows. Curators (founder/admin/curator) update vetting.

alter table nextus_domain_indicators        enable row level security;
alter table nextus_domain_indicator_values  enable row level security;
alter table nextus_contributor_signals      enable row level security;
alter table nextus_indicator_fetch_log      enable row level security;

drop policy if exists "indicators_public_read" on nextus_domain_indicators;
create policy "indicators_public_read"
  on nextus_domain_indicators for select using (status = 'active');

drop policy if exists "indicator_values_public_read" on nextus_domain_indicator_values;
create policy "indicator_values_public_read"
  on nextus_domain_indicator_values for select using (true);

drop policy if exists "contributor_signals_public_read" on nextus_contributor_signals;
create policy "contributor_signals_public_read"
  on nextus_contributor_signals for select
  using (vetting_status <> 'flagged' and (expires_at is null or expires_at > now()));

drop policy if exists "contributor_signals_self_insert" on nextus_contributor_signals;
create policy "contributor_signals_self_insert"
  on nextus_contributor_signals for insert
  with check (auth.uid() = contributor_id);

drop policy if exists "contributor_signals_self_update" on nextus_contributor_signals;
create policy "contributor_signals_self_update"
  on nextus_contributor_signals for update
  using (auth.uid() = contributor_id);

drop policy if exists "fetch_log_curator_read" on nextus_indicator_fetch_log;
create policy "fetch_log_curator_read"
  on nextus_indicator_fetch_log for select
  using (
    coalesce(
      (auth.jwt() -> 'user_metadata' ->> 'role') in ('founder', 'admin', 'curator'),
      false
    )
  );

commit;

-- ─── Rollback ────────────────────────────────────────────────────────────────
-- drop table if exists nextus_indicator_fetch_log;
-- drop table if exists nextus_contributor_signals;
-- drop table if exists nextus_domain_indicator_values;
-- drop table if exists nextus_domain_indicators;
