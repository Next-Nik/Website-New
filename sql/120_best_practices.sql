-- ─────────────────────────────────────────────────────────────────────────────
-- 120_best_practices.sql
-- Best Practices — Slice 1: the object model (June 2026).
--
-- A problem-chain is the away-from: people arrive saying X. A best practice is
-- the toward-answer: here is what works for X. These are first-class objects so
-- evidence attaches to the APPROACH, never to the person — a ranking of actors
-- by number is forbidden by the honesty locks.
--
-- What "best" means here, on the record so the scoring layer inherits it:
--   A best practice moves toward its domain's Horizon Goal, WITHIN the
--   constraint of keeping us here and whole, and among those, the ones that do
--   it with the most grace rise. Movement and grace are both GATES (either can
--   eliminate). Grace is also the ranking once a candidate is through the gates.
--
-- Three objects: nextus_practices, nextus_practice_tiers (Decathlon-style
-- right-sized levels, every tier dignified — entry tier is "the right place to
-- start," never "the basic one"), and nextus_practice_embodiments (practice ↔
-- actor edges, owner-confirmed).
--
-- SELF-HEALING. A nextus_practices table may already exist in this database
-- from earlier ad-hoc work. This migration creates it if absent, then adds every
-- column with `add column if not exists`, so `status` (and the rest) are
-- guaranteed present before any index or policy references them — whether the
-- table is new or a leftover. Idempotent. Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

begin;

-- ── 1. The practice (self-healing) ────────────────────────────────────────────

create table if not exists public.nextus_practices (
  id uuid primary key default gen_random_uuid()
);

alter table public.nextus_practices
  add column if not exists created_at       timestamptz not null default now(),
  add column if not exists updated_at       timestamptz not null default now(),
  add column if not exists slug             text,
  add column if not exists name             text,
  add column if not exists statement        text,
  add column if not exists domains          text[] not null default '{}',
  add column if not exists subdomains       text[] not null default '{}',
  add column if not exists fields           text[] not null default '{}',
  add column if not exists problem_chains   text[] not null default '{}',
  add column if not exists horizon_domain   text,
  add column if not exists data_metrics     jsonb,
  add column if not exists data_source      text,
  add column if not exists discernment      jsonb,
  add column if not exists status           text not null default 'candidate',
  add column if not exists origin           text not null default 'extracted',
  add column if not exists provenance_label text;

-- Constraints, guarded so a re-run is a no-op.
do $$ begin
  alter table public.nextus_practices
    add constraint nextus_practices_status_check
    check (status in ('candidate','scored','above_break','below_break','established','retired'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.nextus_practices
    add constraint nextus_practices_origin_check
    check (origin in ('extracted','authored','emergent'));
exception when duplicate_object then null; end $$;

-- slug uniqueness via index (nulls allowed; multiple nulls are fine in Postgres).
create unique index if not exists idx_practices_slug_unique on public.nextus_practices (slug);
create index if not exists idx_practices_status  on public.nextus_practices (status);
create index if not exists idx_practices_origin  on public.nextus_practices (origin);
create index if not exists idx_practices_domains on public.nextus_practices using gin (domains);
create index if not exists idx_practices_chains  on public.nextus_practices using gin (problem_chains);


-- ── 2. The tiers ──────────────────────────────────────────────────────────────
-- Decathlon-style: right-sized levels of the SAME practice. FIT, not rank.
-- Every tier clears a quality-and-respect floor; entry tier is "the right place
-- to start," never "the basic one." Separate table because evidence and
-- embodiments attach at the tier level.

create table if not exists public.nextus_practice_tiers (
  id uuid primary key default gen_random_uuid()
);

alter table public.nextus_practice_tiers
  add column if not exists created_at     timestamptz not null default now(),
  add column if not exists updated_at     timestamptz not null default now(),
  add column if not exists practice_id    uuid,
  add column if not exists position       int,
  add column if not exists label          text,
  add column if not exists looks_like     text,
  add column if not exists resource_level text,
  add column if not exists scale          text,
  add column if not exists meets_floor    boolean not null default false;

do $$ begin
  alter table public.nextus_practice_tiers
    add constraint nextus_practice_tiers_practice_fk
    foreign key (practice_id) references public.nextus_practices (id) on delete cascade;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.nextus_practice_tiers
    add constraint nextus_practice_tiers_resource_check
    check (resource_level is null or resource_level in ('low','moderate','high'));
exception when duplicate_object then null; end $$;

create unique index if not exists idx_practice_tiers_practice_pos
  on public.nextus_practice_tiers (practice_id, position);
create index if not exists idx_practice_tiers_practice
  on public.nextus_practice_tiers (practice_id);


-- ── 3. The embodiments (practice ↔ actor) ─────────────────────────────────────
-- Who does this, at what tier. Evidence attaches HERE, never as an actor score.
-- Extracted embodiments are unconfirmed until the owner confirms (consent posture
-- of the claim flow).

create table if not exists public.nextus_practice_embodiments (
  id uuid primary key default gen_random_uuid()
);

alter table public.nextus_practice_embodiments
  add column if not exists created_at    timestamptz not null default now(),
  add column if not exists practice_id   uuid,
  add column if not exists actor_id      uuid,
  add column if not exists tier_id       uuid,
  add column if not exists confirmed     boolean not null default false,
  add column if not exists evidence_note text;

do $$ begin
  alter table public.nextus_practice_embodiments
    add constraint nextus_practice_embodiments_practice_fk
    foreign key (practice_id) references public.nextus_practices (id) on delete cascade;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.nextus_practice_embodiments
    add constraint nextus_practice_embodiments_actor_fk
    foreign key (actor_id) references public.nextus_actors (id) on delete cascade;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.nextus_practice_embodiments
    add constraint nextus_practice_embodiments_tier_fk
    foreign key (tier_id) references public.nextus_practice_tiers (id) on delete set null;
exception when duplicate_object then null; end $$;

create unique index if not exists idx_practice_embodiments_pair
  on public.nextus_practice_embodiments (practice_id, actor_id);
create index if not exists idx_practice_embodiments_practice on public.nextus_practice_embodiments (practice_id);
create index if not exists idx_practice_embodiments_actor    on public.nextus_practice_embodiments (actor_id);


-- ── 4. RLS ────────────────────────────────────────────────────────────────────
-- Established practices (and their tiers/confirmed embodiments) are public, like
-- the Atlas. Candidates and below-break entries are not public; admin tools reach
-- them via the service role, which bypasses RLS. Writes are service-role only for
-- now (extractor seeds, admin promotes, owner-confirm endpoint next slice).

alter table public.nextus_practices            enable row level security;
alter table public.nextus_practice_tiers       enable row level security;
alter table public.nextus_practice_embodiments enable row level security;

drop policy if exists nextus_practices_public_read on public.nextus_practices;
create policy nextus_practices_public_read
  on public.nextus_practices for select
  using (status = 'established');

drop policy if exists nextus_practice_tiers_public_read on public.nextus_practice_tiers;
create policy nextus_practice_tiers_public_read
  on public.nextus_practice_tiers for select
  using (exists (
    select 1 from public.nextus_practices p
    where p.id = practice_id and p.status = 'established'
  ));

drop policy if exists nextus_practice_embodiments_public_read on public.nextus_practice_embodiments;
create policy nextus_practice_embodiments_public_read
  on public.nextus_practice_embodiments for select
  using (confirmed = true and exists (
    select 1 from public.nextus_practices p
    where p.id = practice_id and p.status = 'established'
  ));

commit;

-- ── Verification ──────────────────────────────────────────────────────────────
--   select column_name, data_type from information_schema.columns
--     where table_name = 'nextus_practices' order by ordinal_position;
--   select status, count(*) from public.nextus_practices group by status;
--
-- ── Rollback (only if the tables are disposable) ───────────────────────────────
--   begin;
--   drop table if exists public.nextus_practice_embodiments;
--   drop table if exists public.nextus_practice_tiers;
--   drop table if exists public.nextus_practices;
--   commit;
