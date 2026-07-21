-- ─────────────────────────────────────────────────────────────────────────────
-- Patch 101 — Voice fields for Nik + NextUs + Horizon Leap offering
--
-- Lands the mission_statement and working_on_now fields for both actors,
-- and adds the second offering on Nik's profile (Horizon Leap — by application).
--
-- Resolves user_id from nik@nextus.world. Idempotent: re-running is safe.
-- ─────────────────────────────────────────────────────────────────────────────

begin;

do $$
declare
  v_user_id    uuid;
  v_nik_id     uuid;
  v_nextus_id  uuid;
begin
  -- Resolve user_id and the two actor rows
  select id into v_user_id from auth.users where email = 'nik@nextus.world' limit 1;

  if v_user_id is null then
    raise exception 'No auth.users row for nik@nextus.world';
  end if;

  select id into v_nik_id    from public.nextus_actors where slug = 'nik-wood' limit 1;
  select id into v_nextus_id from public.nextus_actors where slug = 'nextus'   limit 1;

  if v_nik_id is null or v_nextus_id is null then
    raise exception 'Seed actors not found — run 100_seed_nik_and_nextus.sql first';
  end if;

  -- ── Nik voice fields ─────────────────────────────────────────────────────

  update public.nextus_actors
     set mission_statement = 'To live into a world where everyone is firmly on their path and actively levelling up to their full yes life.',
         working_on_now    = 'Building NextUs — a Future Building platform that treats personal development and civilisational coordination as two pieces of the same work. Taking on a select number of one-on-one clients alongside that work.'
   where id = v_nik_id;

  -- ── NextUs voice fields ──────────────────────────────────────────────────

  update public.nextus_actors
     set mission_statement = 'A thriving planet. A future worth building, a life worth living.',
         working_on_now    = 'Supercharging you to make the world better now. Expanding the ecosystem to include as many aligned people, practitioners, and organisations as possible to create the future we want to live in.'
   where id = v_nextus_id;

  -- ── Second offering on Nik: Horizon Leap ─────────────────────────────────

  insert into public.actor_offers (actor_id, title, description, active, location_mode, sort_order)
  select v_nik_id,
    'Horizon Leap',
    'Facilitated identity-level work. By application only.',
    true,
    'anywhere',
    1
  where not exists (
    select 1 from public.actor_offers where actor_id = v_nik_id and title = 'Horizon Leap'
  );

  raise notice 'Patch 101 complete. nik=% nextus=%', v_nik_id, v_nextus_id;
end$$;

commit;

-- Verify:
-- select slug, mission_statement, working_on_now from public.nextus_actors
--  where slug in ('nik-wood', 'nextus');
-- select a.slug, o.title, o.description, o.active
--   from public.actor_offers o join public.nextus_actors a on a.id = o.actor_id
--  where a.slug = 'nik-wood' order by o.sort_order;
