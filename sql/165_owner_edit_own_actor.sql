-- ─────────────────────────────────────────────────────────────────────────────
-- 165_owner_edit_own_actor.sql
--
-- Guarantee: a claimed owner can edit their own actor row.
--
-- The base nextus_actors policies predate the numbered migration series and
-- live only in the dashboard, so the repo cannot prove an owner-update policy
-- exists. Tomorrow's claimants are the first non-founder owners the platform
-- has ever had; if the live update policies are founder-scoped only, their
-- first OrgManage save fails silently against RLS.
--
-- Safe to run regardless: permissive policies OR together, so if an owner
-- policy already exists under another name this simply restates it.
-- Ownership on nextus_actors is profile_owner ONLY (no owner_id column).
--
-- Run manually in the Supabase SQL editor before outreach begins.
-- ─────────────────────────────────────────────────────────────────────────────

drop policy if exists "Owners update their own actor" on public.nextus_actors;
create policy "Owners update their own actor"
  on public.nextus_actors
  for update
  using      (profile_owner = auth.uid())
  with check (profile_owner = auth.uid());

-- Verify what's live (read the output — you want this policy plus the
-- founder-on-unclaimed pair from 148/162):
-- select policyname, cmd from pg_policies where tablename = 'nextus_actors';
