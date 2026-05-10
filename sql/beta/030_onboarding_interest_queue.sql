-- ─────────────────────────────────────────────────────────────────────────────
-- Module 11.9 — Onboarding interest queue
--
-- A small table that captures interest from visitors who reach the
-- end of an org or practitioner intro before the corresponding
-- onboarding flow exists. Two fields the queue needs: their email
-- and which path they came down.
--
-- Replaced (in usage, not in schema) when the real onboarding flows
-- ship — the table stays as a historical record and as a place to
-- email people once the path opens.
--
-- Idempotent. Anyone may insert; only the founder may read.
-- ─────────────────────────────────────────────────────────────────────────────

begin;

create table if not exists nextus_onboarding_interest (
  id            uuid primary key default gen_random_uuid(),
  email         text not null,
  kind          text not null,   -- 'organisation' | 'practitioner'
  path          text,            -- the URL they came from
  notes         text,
  notified_at   timestamptz,
  submitted_at  timestamptz not null default now(),

  constraint onboarding_interest_email_chk
    check (char_length(email) between 5 and 200
           and email like '%@%.%'),
  constraint onboarding_interest_kind_chk
    check (kind in ('organisation', 'practitioner'))
);

create index if not exists idx_onboarding_interest_kind
  on nextus_onboarding_interest (kind, submitted_at desc);

create index if not exists idx_onboarding_interest_unnotified
  on nextus_onboarding_interest (kind, submitted_at)
  where notified_at is null;

-- RLS — anyone may insert (this is a public submission surface),
-- only authenticated users with founder/admin role may read.
alter table nextus_onboarding_interest enable row level security;

drop policy if exists insert_any_onboarding_interest on nextus_onboarding_interest;
create policy insert_any_onboarding_interest
  on nextus_onboarding_interest
  for insert
  to anon, authenticated
  with check (
    char_length(email) between 5 and 200
    and kind in ('organisation', 'practitioner')
  );

drop policy if exists founder_read_onboarding_interest on nextus_onboarding_interest;
create policy founder_read_onboarding_interest
  on nextus_onboarding_interest
  for select
  using (
    coalesce(
      (auth.jwt() -> 'user_metadata' ->> 'role') in ('founder', 'admin'),
      false
    )
  );

commit;

-- Rollback (reference only):
--   drop table if exists nextus_onboarding_interest;
