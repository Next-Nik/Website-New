-- ─────────────────────────────────────────────────────────────────────────────
-- Patch 149 — Re-seed the two founder actors: Nik Wood + NextUs
--
-- The original 100_seed_nik_and_nextus.sql ran once and was never committed.
-- Both rows were since deleted during the profile-floor rebuild. This patch
-- recreates the BASE rows only — owned by Nik, live, valid against every
-- constraint — so they can be re-authored to the new standard through the
-- platform (OrgManage / VoiceTab).
--
-- It sets ONLY structural / non-voice fields:
--   • name · slug · type · actor_mode · primary + domains · status
--   • profile_owner (Nik) · seeded_by = 'self' · is_platform_founder (Nik only)
--
-- It deliberately leaves EVERY owner-voice field NULL for Nik to author:
--   tagline · description · story · mission_statement · working_on_now ·
--   offerings · credentials · testimonials · image_url · links · contact path
--
-- Column set mirrors the app's own insert path (src/app/pages/Add.jsx →
-- buildPayload), which is the proof that these fields satisfy all NOT NULL
-- and CHECK constraints. Runs in the SQL editor as the service role, so RLS
-- is bypassed; profile_owner is set explicitly.
--
-- Defaults chosen (override the literals if you want different placement):
--   • NextUs   → type 'organisation', actor_mode 'platform', domain 'vision'
--   • Nik Wood → type 'practitioner',  actor_mode 'practice', domain 'human-being'
--
-- Idempotent: inserts only if a row with that slug does not already exist.
-- Resolves the owner from auth.users where email = 'nik@nextus.world'.
-- ─────────────────────────────────────────────────────────────────────────────

begin;

do $$
declare
  v_user_id   uuid;
  v_nik_id    uuid;
  v_nextus_id uuid;
begin
  -- ── Resolve the owner ──────────────────────────────────────────────────────
  select id into v_user_id from auth.users where email = 'nik@nextus.world' limit 1;

  if v_user_id is null then
    raise exception 'No auth.users row for nik@nextus.world — cannot set profile_owner.';
  end if;

  -- ── NextUs (org) ───────────────────────────────────────────────────────────
  select id into v_nextus_id from public.nextus_actors where slug = 'nextus' limit 1;

  if v_nextus_id is null then
    insert into public.nextus_actors (
      name, slug, type, actor_mode,
      domain_id, domains,
      seeded_by, profile_owner, represented_by_adder,
      is_platform_founder,
      vetting_status, status, lifecycle_status,
      data_source
    ) values (
      'NextUs', 'nextus', 'organisation', 'platform',
      'vision', array['vision']::text[],
      'self', v_user_id, true,
      false,
      'approved', 'live', 'active',
      'self | founder reseed'
    )
    returning id into v_nextus_id;
    raise notice 'Inserted NextUs org. id=%', v_nextus_id;
  else
    raise notice 'NextUs org already present (id=%) — left untouched.', v_nextus_id;
  end if;

  -- ── Nik Wood (practitioner) ────────────────────────────────────────────────
  select id into v_nik_id from public.nextus_actors where slug = 'nik-wood' limit 1;

  if v_nik_id is null then
    insert into public.nextus_actors (
      name, slug, type, actor_mode,
      domain_id, domains,
      seeded_by, profile_owner, represented_by_adder,
      is_platform_founder,
      vetting_status, status, lifecycle_status,
      data_source
    ) values (
      'Nik Wood', 'nik-wood', 'practitioner', 'practice',
      'human-being', array['human-being']::text[],
      'self', v_user_id, true,
      true,
      'approved', 'live', 'active',
      'self | founder reseed'
    )
    returning id into v_nik_id;
    raise notice 'Inserted Nik Wood practitioner. id=%', v_nik_id;
  else
    raise notice 'Nik Wood already present (id=%) — left untouched.', v_nik_id;
  end if;

  raise notice 'Patch 149 complete. owner=% nextus=% nik=%', v_user_id, v_nextus_id, v_nik_id;
end$$;

commit;

-- Verify:
-- select slug, name, type, actor_mode, domain_id, is_platform_founder,
--        seeded_by, status, (profile_owner is not null) as owned
--   from public.nextus_actors
--  where slug in ('nextus', 'nik-wood')
--  order by slug;
