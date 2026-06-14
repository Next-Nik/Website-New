-- ─────────────────────────────────────────────────────────────────────────────
-- Patch 103 — Nik tagline + description update, three additional links
--
-- Tagline shifts from "edge of capability" (read as strain) to "visionaries
-- expanding what they bring into the world" (read as expansion).
-- Description aligned to match.
--
-- Adds three links to Nik's practitioner page: LinkedIn (personal),
-- Spotify podcast, Substack. The podcast and Substack are formally platform
-- channels but Nik is the voice behind both; the practitioner page is the
-- "engage with Nik" destination, so they belong here too.
--
-- Idempotent on the link side.
-- ─────────────────────────────────────────────────────────────────────────────

begin;

do $$
declare
  v_nik_id  uuid;
begin
  select id into v_nik_id from public.nextus_actors where slug = 'nik-wood' limit 1;

  if v_nik_id is null then
    raise exception 'nik-wood actor not found';
  end if;

  -- ── Tagline + description ────────────────────────────────────────────────

  update public.nextus_actors
     set tagline     = 'Coach for visionaries expanding what they bring into the world.',
         description = 'Nik Wood has coached for nearly 30 years, working with visionaries who are expanding what they bring into the world.'
   where id = v_nik_id;

  -- ── LinkedIn ─────────────────────────────────────────────────────────────

  insert into public.actor_links (actor_id, link_type, url, sort_order)
  select v_nik_id, 'linkedin', 'https://www.linkedin.com/in/nikwood-nextus/', 1
  where not exists (
    select 1 from public.actor_links
     where actor_id = v_nik_id and link_type = 'linkedin'
  );

  -- ── Substack ─────────────────────────────────────────────────────────────

  insert into public.actor_links (actor_id, link_type, url, sort_order)
  select v_nik_id, 'substack', 'https://substack.com/@nextus', 2
  where not exists (
    select 1 from public.actor_links
     where actor_id = v_nik_id and link_type = 'substack'
  );

  -- ── Podcast (Spotify) ────────────────────────────────────────────────────

  insert into public.actor_links (actor_id, link_type, url, sort_order)
  select v_nik_id, 'podcast_spotify', 'https://open.spotify.com/show/65LzAbOCuOZW7mvHTKsIbY', 3
  where not exists (
    select 1 from public.actor_links
     where actor_id = v_nik_id and link_type = 'podcast_spotify'
  );

  raise notice 'Patch 103 complete. nik=%', v_nik_id;
end$$;

commit;

-- Verify:
-- select slug, tagline, left(description, 80) as description_preview
--   from public.nextus_actors where slug = 'nik-wood';
-- select link_type, url, sort_order from public.actor_links
--   join public.nextus_actors on nextus_actors.id = actor_links.actor_id
--  where slug = 'nik-wood' order by sort_order;
