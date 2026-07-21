-- ─────────────────────────────────────────────────────────────────────────────
-- Patch 130 — NextUs (org) up to the profile floor
--
-- Nik Wood (the practice) was fully seeded — tagline, links, podcast RSS,
-- Substack. NextUs (the org) was given its voice fields (mission_statement,
-- working_on_now in patch 101) but never a tagline, channels, or a contact
-- path. As the flagship and the standard-setter, it should clear the floor.
--
-- This patch sets:
--   • tagline           (proposed default — Nik may override)
--   • actor_links        website · podcast RSS · Spotify · Substack
--   • contact link       email (outreach@nextus.world)
--
-- It does NOT set:
--   • image_url (logo)  — pending the public `actor-images` storage bucket
--   • story             — drafted below as a commented block for Nik to read
--                          and uncomment if he wants it; story is his voice
--   • is_platform_founder — that badge belongs on nik-wood, not the org
--
-- NOTE: This patch first ensures the actor_links.link_type CHECK constraint
-- recognises the contact link types (email / contact_form / calendly / phone).
-- That broadening shipped as migration 058, but is re-applied here so 130 is
-- self-contained and safe to run regardless of which earlier patches landed.
--
-- Idempotent: re-running is safe. Resolves the org by slug = 'nextus'.
-- ─────────────────────────────────────────────────────────────────────────────

begin;

-- ── Ensure the link_type constraint allows contact types (re-applies 058) ────
-- DDL is transactional in Postgres; if anything below fails the whole patch
-- rolls back, including this constraint swap.

alter table public.actor_links
  drop constraint if exists actor_links_link_type_check;

alter table public.actor_links
  add constraint actor_links_link_type_check
  check (link_type in (
    -- web / social / media
    'website', 'podcast_rss', 'podcast_apple', 'podcast_spotify',
    'youtube_channel', 'youtube_video', 'vimeo', 'substack', 'newsletter',
    'instagram', 'twitter', 'tiktok', 'facebook', 'linkedin', 'medium',
    'github', 'book',
    -- contact
    'email', 'contact_form', 'calendly', 'phone',
    -- fallback
    'other'
  ));

do $$
declare
  v_nextus_id uuid;
begin
  select id into v_nextus_id from public.nextus_actors where slug = 'nextus' limit 1;

  if v_nextus_id is null then
    raise exception 'nextus org actor not found — run the NextUs seed first';
  end if;

  -- ── Tagline ───────────────────────────────────────────────────────────────
  -- Names what it does and at what scale, distinct from the mission_statement
  -- ("A thriving planet. A future worth building, a life worth living.").
  -- PROPOSED — change the string if you want different wording.

  update public.nextus_actors
     set tagline = 'A Future Building platform for the person and the planet.'
   where id = v_nextus_id;

  -- ── Story (OPTIONAL — read, then uncomment if you want it live) ────────────
  -- Third person, TED-tight, drawn from what NextUs already says about itself.
  --
  -- update public.nextus_actors
  --    set story = $story$NextUs is a Future Building platform that works at two scales at once. On one rail, a development practice helps individuals get firmly on their path and level up the seven domains of a life worth living. On the other, the Atlas holds organisations, practitioners, places, and projects in honest placement across the seven civilisational domains, so the people already doing the work can find each other.
  --
  -- The thesis underneath both rails is that personal flourishing and civilisational flourishing are the same problem at different scales. The same seven problems recur, the same instruments apply, and progress on one rail feeds the other.
  --
  -- NextUs is building the surface where that holds together: a place to do the inner work, and a map that makes the larger effort visible and reachable.$story$
  --  where id = v_nextus_id;

  -- ── Channels ──────────────────────────────────────────────────────────────
  -- These are NextUs platform channels; they belong on the org entry.

  insert into public.actor_links (actor_id, link_type, url, sort_order)
  select v_nextus_id, 'website', 'https://nextus.world', 0
  where not exists (
    select 1 from public.actor_links
     where actor_id = v_nextus_id and link_type = 'website'
  );

  insert into public.actor_links (actor_id, link_type, url, sort_order)
  select v_nextus_id, 'podcast_rss', 'http://feeds.libsyn.com/66392/rss', 1
  where not exists (
    select 1 from public.actor_links
     where actor_id = v_nextus_id and link_type = 'podcast_rss'
  );

  insert into public.actor_links (actor_id, link_type, url, sort_order)
  select v_nextus_id, 'podcast_spotify', 'https://open.spotify.com/show/65LzAbOCuOZW7mvHTKsIbY', 2
  where not exists (
    select 1 from public.actor_links
     where actor_id = v_nextus_id and link_type = 'podcast_spotify'
  );

  insert into public.actor_links (actor_id, link_type, url, sort_order)
  select v_nextus_id, 'substack', 'https://substack.com/@nextus', 3
  where not exists (
    select 1 from public.actor_links
     where actor_id = v_nextus_id and link_type = 'substack'
  );

  -- ── Contact path ──────────────────────────────────────────────────────────
  -- The floor requires at least one. PROPOSED — swap to a contact_form URL or a
  -- different address if you'd rather route inbound elsewhere.

  insert into public.actor_links (actor_id, link_type, url, sort_order)
  select v_nextus_id, 'email', 'mailto:outreach@nextus.world', 4
  where not exists (
    select 1 from public.actor_links
     where actor_id = v_nextus_id and link_type = 'email'
  );

  raise notice 'Patch 130 complete. nextus=%', v_nextus_id;
end$$;

commit;

-- Verify:
-- select slug, tagline, left(coalesce(story,''), 60) as story_preview
--   from public.nextus_actors where slug = 'nextus';
-- select link_type, url, sort_order from public.actor_links
--   join public.nextus_actors on nextus_actors.id = actor_links.actor_id
--  where slug = 'nextus' order by sort_order;
