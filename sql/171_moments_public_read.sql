-- 171_moments_public_read.sql
--
-- BP-6 · The daily surface shows moments communally. BP-2 opened moments to
-- owner + founder only; this adds a read policy for signed-in people to see
-- moments that are (a) not soft-deleted and (b) from today's surface window.
--
-- We do NOT expose the poster's user_id through the surface UI — the read
-- returns the row, but the surface renders first-name/aggregate framing only,
-- consistent with the honesty locks (no public user–actor pairs, no ranking).
-- The daily surface is finite: the client filters to the current day; this
-- policy simply permits reading undeleted moments.
--
-- Owner and founder policies from 170 remain; this is additive.
-- Run manually in the Supabase SQL editor.

drop policy if exists moments_public_read on public.moments;
create policy moments_public_read on public.moments
  for select
  using (deleted_at is null and auth.uid() is not null);

comment on policy moments_public_read on public.moments is
  'Signed-in people may read undeleted moments for the daily surface. The surface UI renders names/aggregates only, never a ranked or per-user-per-actor view.';
