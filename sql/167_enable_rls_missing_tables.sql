-- ============================================================================
-- 167_enable_rls_missing_tables.sql
--
-- Closes the Supabase advisor warning "rls_disabled_in_public" (email of
-- 12 Jul 2026). Seven tables in the public schema were created without
-- Row-Level Security, leaving them fully readable and writable by anyone
-- holding the anon key.
--
-- Fix pattern:
--   1. Service-role-only tables (written by Vercel API routes, which use
--      the service-role key and bypass RLS): enable RLS with NO policies.
--      Result: invisible to anon/authenticated clients, unchanged for APIs.
--        - actor_outreach_log   (113) — contains recipient email addresses
--        - ask_overflow_log     (115)
--        - geonames_raw         (044) — ingest staging, no app access
--
--   2. Public reference data read by the frontend with the anon key:
--      enable RLS + public SELECT policy. Writes remain service-role only.
--        - nextus_focus_touches       (042) — read in useFocusProfile.js
--        - nextus_indicator_aliases   (beta/029) — read in useDomainIndicators.js
--        - nextus_focus_designations  (042) — same class, dormant today
--        - nextus_focus_responses     (042) — same class, dormant today
--
-- Idempotent: safe to run even if RLS was already enabled on some of these
-- via the dashboard. Run manually in the Supabase SQL editor.
-- ============================================================================

-- ─── 1. Service-role only: RLS on, no policies ──────────────────────────────

alter table public.actor_outreach_log enable row level security;

alter table public.ask_overflow_log enable row level security;

alter table public.geonames_raw enable row level security;

-- ─── 2. Public reference data: RLS on + read-only for everyone ──────────────

alter table public.nextus_focus_touches enable row level security;

drop policy if exists "anyone reads focus touches" on public.nextus_focus_touches;
create policy "anyone reads focus touches"
  on public.nextus_focus_touches
  for select
  using (true);

alter table public.nextus_indicator_aliases enable row level security;

drop policy if exists "anyone reads indicator aliases" on public.nextus_indicator_aliases;
create policy "anyone reads indicator aliases"
  on public.nextus_indicator_aliases
  for select
  using (true);

alter table public.nextus_focus_designations enable row level security;

drop policy if exists "anyone reads focus designations" on public.nextus_focus_designations;
create policy "anyone reads focus designations"
  on public.nextus_focus_designations
  for select
  using (true);

alter table public.nextus_focus_responses enable row level security;

drop policy if exists "anyone reads focus responses" on public.nextus_focus_responses;
create policy "anyone reads focus responses"
  on public.nextus_focus_responses
  for select
  using (true);

-- ─── Verification ────────────────────────────────────────────────────────────
-- Run after applying; every row should show rowsecurity = true.
--
--   select tablename, rowsecurity
--   from pg_tables
--   where schemaname = 'public'
--     and tablename in (
--       'actor_outreach_log', 'ask_overflow_log', 'geonames_raw',
--       'nextus_focus_touches', 'nextus_indicator_aliases',
--       'nextus_focus_designations', 'nextus_focus_responses'
--     );
