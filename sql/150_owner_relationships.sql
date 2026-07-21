-- 150_owner_relationships.sql
--
-- Lets a profile owner manage the relationships their actor is party to from the
-- Relationships tab: propose partnerships and memberships, and confirm or decline
-- ones proposed to them.
--
-- Why this is needed: the base policies (033/035) key visibility off
-- initiated_by / confirmed_by, which means the TARGET of a pending proposal
-- can neither see nor confirm it — confirmed_by is still null until they act, and
-- they didn't initiate it. These add ownership-by-actor: if you own either actor
-- on the row, you can read it; if you own the originating actor you can propose;
-- if you own either actor you can confirm or sever. Permissive and additive, so
-- nothing here weakens the existing party-based access.

-- True when the caller owns the given actor.
create or replace function public.owns_actor(a uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.nextus_actors n
    where n.id = a and n.profile_owner = auth.uid()
  )
$$;

-- Read any relationship your actor sits on either side of, including pending
-- proposals aimed at you.
drop policy if exists "Owners read relationships on their actors" on public.nextus_relationships;
create policy "Owners read relationships on their actors"
  on public.nextus_relationships for select
  using (public.owns_actor(actor_id) or public.owns_actor(related_actor_id));

-- Propose from an actor you own (you must be the initiator).
drop policy if exists "Owners propose from their actors" on public.nextus_relationships;
create policy "Owners propose from their actors"
  on public.nextus_relationships for insert
  with check (initiated_by = auth.uid() and public.owns_actor(actor_id));

-- Confirm or sever a relationship your actor is on either side of.
drop policy if exists "Owners update relationships on their actors" on public.nextus_relationships;
create policy "Owners update relationships on their actors"
  on public.nextus_relationships for update
  using      (public.owns_actor(actor_id) or public.owns_actor(related_actor_id))
  with check (public.owns_actor(actor_id) or public.owns_actor(related_actor_id));
