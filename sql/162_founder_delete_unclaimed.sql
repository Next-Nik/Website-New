-- 162_founder_delete_unclaimed.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- The AdminConsole Actors tab delete button ran a client-side DELETE on
-- nextus_actors with no policy permitting it: RLS silently matched zero rows,
-- the client never checked the result, and the console toasted "Deleted"
-- while the row survived.
--
-- This grants the founder DELETE on UNCLAIMED actors only — the same scope
-- and the same is_founder() helper (app_metadata only) as migration 148.
-- Claimed profiles (profile_owner set) remain undeletable from the console:
-- removing a claimed actor is a dispute-queue matter, not a button.
--
-- Run in the Supabase SQL editor. Idempotent.
-- ─────────────────────────────────────────────────────────────────────────────

drop policy if exists "Founder deletes unclaimed actors" on public.nextus_actors;
create policy "Founder deletes unclaimed actors"
  on public.nextus_actors
  for delete
  using (public.is_founder() and profile_owner is null);

-- Verify:
--   select policyname, cmd from pg_policies
--   where tablename = 'nextus_actors' order by policyname;
