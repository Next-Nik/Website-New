-- 158_actor_public_insert.sql
-- The public /add flow inserts an actor row directly from the browser under the
-- adder's own session, so it's subject to RLS. No INSERT policy existed for
-- ordinary users on nextus_actors, so every non-service-role add was denied 403.
--
-- Scope: authenticated only (anon cannot create Atlas entries); an adder may not
-- forge ownership · profile_owner must be NULL (community entry) or their own id
-- (representing themselves). That closes the one access-relevant field the client
-- controls. vetting_status='approved' / status='live' stay client-set, which is
-- the existing "goes live immediately" design, not changed here.

alter table public.nextus_actors enable row level security;

drop policy if exists "Authenticated may add actors" on public.nextus_actors;
create policy "Authenticated may add actors"
  on public.nextus_actors
  for insert
  to authenticated
  with check (
    profile_owner is null
    or profile_owner = auth.uid()
  );
