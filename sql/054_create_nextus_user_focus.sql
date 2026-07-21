-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 054 — Create nextus_user_focus (surgical / idempotent)
--
-- Background: Migration 051 introduced nextus_user_focus alongside the
-- domain/subdomain/field taxonomy. In practice 051 was run partially on
-- production (the taxonomy tables got created and seeded, but the
-- nextus_user_focus table at the end of the file did not land).
--
-- The runtime symptom: the ActiveFocusPrompt save() upsert returned
-- "Could not find the table 'public.nextus_user_focus' in the schema cache"
-- from PostgREST.
--
-- This migration is surgical: it creates only what's missing for Active
-- Focus to work. It does NOT touch domains/subdomains/fields/seeds. It is
-- fully idempotent — every statement is guarded so re-running it (or
-- running 051 later) is a no-op against this table.
--
-- Verification queries (run after this migration; both should succeed):
--   select column_name from information_schema.columns
--    where table_schema='public' and table_name='nextus_user_focus';
--   select * from public.nextus_user_focus limit 1;
-- ─────────────────────────────────────────────────────────────────────────────

begin;

create table if not exists public.nextus_user_focus (
  user_id             uuid primary key references auth.users(id) on delete cascade,
  focus_place_ids     uuid[]      not null default array[]::uuid[],
  focus_domain_slugs  text[]      not null default array[]::text[],
  focus_subdomain_ids uuid[]      not null default array[]::uuid[],
  focus_field_ids     uuid[]      not null default array[]::uuid[],
  focus_actor_ids     uuid[]      not null default array[]::uuid[],
  participation       text[]      not null default array[]::text[],
  updated_at          timestamptz not null default now()
);

alter table public.nextus_user_focus enable row level security;

drop policy if exists "users read own focus"   on public.nextus_user_focus;
drop policy if exists "users insert own focus" on public.nextus_user_focus;
drop policy if exists "users update own focus" on public.nextus_user_focus;
drop policy if exists "users delete own focus" on public.nextus_user_focus;

create policy "users read own focus" on public.nextus_user_focus
  for select using (auth.uid() = user_id);

create policy "users insert own focus" on public.nextus_user_focus
  for insert with check (auth.uid() = user_id);

create policy "users update own focus" on public.nextus_user_focus
  for update using (auth.uid() = user_id);

create policy "users delete own focus" on public.nextus_user_focus
  for delete using (auth.uid() = user_id);

commit;

-- Force PostgREST to refresh its schema cache so the new table is visible
-- immediately without waiting for the cache to expire. Safe to call any time.
notify pgrst, 'reload schema';
