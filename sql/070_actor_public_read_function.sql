-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 070 — Privacy lock: get_actor_public()
--
-- The architectural commitment in the Atlas Actor Profile Architecture
-- Section 5 is non-negotiable:
--
--   "The aggregate is publicly visible and prominent.
--    The number is private at the actor level. It is never shown on the
--    actor's public profile."
--
-- This migration adds the SECURITY DEFINER function that enforces the
-- privacy lock at the database boundary. The function returns the actor
-- row with people_in_the_work nulled out for non-owners.
--
-- Implementation note: rather than enumerate every column on nextus_actors
-- (brittle as the schema evolves), we SELECT * into a row variable and
-- conditionally null the two private fields before returning. This stays
-- correct regardless of future column additions, as long as those columns
-- aren't themselves private.
--
-- The existing supabase.from('nextus_actors').select('*') paths remain —
-- they go through RLS as normal. Owners reading their own actor still see
-- their own number through those paths.
--
-- For public-facing reads where the caller wants safety regardless of
-- whether the viewer is the owner, this function is the entry point.
--
-- Idempotent: CREATE OR REPLACE on the function.
-- ─────────────────────────────────────────────────────────────────────────────

begin;

create or replace function public.get_actor_public(p_actor_id_or_slug text)
returns setof public.nextus_actors
language plpgsql
security definer
set search_path = public
as $$
declare
  is_uuid boolean;
  caller_uid uuid;
  result public.nextus_actors;
begin
  caller_uid := auth.uid();

  -- UUID test (case-insensitive)
  is_uuid := p_actor_id_or_slug ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

  -- Fetch the row by either path
  if is_uuid then
    select * into result
      from public.nextus_actors
     where id::text = p_actor_id_or_slug
       and status = 'live'
     limit 1;
  else
    select * into result
      from public.nextus_actors
     where slug = p_actor_id_or_slug
       and status = 'live'
     limit 1;
  end if;

  -- If nothing found, return nothing
  if result.id is null then
    return;
  end if;

  -- Strip private fields for non-owners. The owner sees their own values.
  if caller_uid is null or result.profile_owner is null or result.profile_owner != caller_uid then
    result.people_in_the_work := null;
    result.people_in_the_work_updated_at := null;
  end if;

  return next result;
  return;
end;
$$;

-- Allow anon and authenticated to call this function.
grant execute on function public.get_actor_public(text) to anon, authenticated;

comment on function public.get_actor_public(text) is
  'Public-safe actor read by id or slug. Strips people_in_the_work and people_in_the_work_updated_at for non-owners.';

commit;
