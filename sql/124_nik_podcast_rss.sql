-- ─────────────────────────────────────────────────────────────────────────────
-- Patch 124 — Nik podcast RSS link
--
-- The practitioner-page podcast player keys off a `podcast_rss` link in
-- actor_links (the Spotify/Apple links are subscribe shortcuts only; the RSS
-- feed is what the player parses for episodes + audio).
--
-- Adds the NextUs Conversations Libsyn RSS feed to Nik's practitioner page.
-- Idempotent.
-- ─────────────────────────────────────────────────────────────────────────────

begin;

do $$
declare
  v_nik_id uuid;
begin
  select id into v_nik_id from public.nextus_actors where slug = 'nik-wood' limit 1;
  if v_nik_id is null then
    raise exception 'nik-wood actor not found';
  end if;

  insert into public.actor_links (actor_id, link_type, url, sort_order)
  select v_nik_id, 'podcast_rss', 'http://feeds.libsyn.com/66392/rss', 2
  where not exists (
    select 1 from public.actor_links
     where actor_id = v_nik_id and link_type = 'podcast_rss'
  );

  raise notice 'Patch 124 complete. nik=%', v_nik_id;
end$$;

commit;

-- Verify:
-- select link_type, url, sort_order from public.actor_links
--   join public.nextus_actors on nextus_actors.id = actor_links.actor_id
--  where slug = 'nik-wood' order by sort_order;
