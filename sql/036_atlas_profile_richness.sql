-- 036_atlas_profile_richness.sql
--
-- Adds the structures that make Atlas profiles useful as coordination surfaces.
--
-- New columns on nextus_actors:
--   tagline             — short one-liner (e.g. "Transformational Leader | Speaker | Author")
--   image_url           — single anchor image (logo for orgs, portrait for practitioners)
--   mission_statement   — first-person voice (owner-only, empty until claimed)
--   working_on_now      — current focus (owner-only, freeform)
--   lifecycle_status    — 'in_development' | 'active' | 'dormant'
--
-- New tables:
--   actor_links         — typed external links (website, podcast, youtube, substack, etc.)
--   actor_press         — "as seen in" press mentions
--   actor_offers        — what the actor offers (simple list items)
--   actor_needs         — what the actor needs (simple list items)
--
-- Safe to re-run (IF NOT EXISTS / IF NOT COLUMN throughout).

-- ── 1. nextus_actors: new profile columns ─────────────────────────────────────

ALTER TABLE public.nextus_actors
  ADD COLUMN IF NOT EXISTS tagline           text,
  ADD COLUMN IF NOT EXISTS image_url         text,
  ADD COLUMN IF NOT EXISTS mission_statement text,
  ADD COLUMN IF NOT EXISTS working_on_now    text,
  ADD COLUMN IF NOT EXISTS lifecycle_status  text DEFAULT 'active'
    CHECK (lifecycle_status IN ('in_development', 'active', 'dormant'));

-- ── 2. actor_links ────────────────────────────────────────────────────────────
-- Typed external links. One actor has many links. Type drives the renderer
-- (podcast_rss feeds an embedded player, youtube_channel embeds latest videos,
-- substack pulls latest posts, others render as labelled icons).

CREATE TABLE IF NOT EXISTS public.actor_links (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    uuid NOT NULL REFERENCES public.nextus_actors(id) ON DELETE CASCADE,
  link_type   text NOT NULL CHECK (link_type IN (
    'website',
    'podcast_rss',
    'podcast_apple',
    'podcast_spotify',
    'youtube_channel',
    'youtube_video',
    'vimeo',
    'substack',
    'newsletter',
    'instagram',
    'twitter',
    'tiktok',
    'facebook',
    'linkedin',
    'medium',
    'github',
    'book',
    'other'
  )),
  url         text NOT NULL,
  label       text,                       -- optional display label override
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (actor_id, link_type, url)
);

CREATE INDEX IF NOT EXISTS idx_actor_links_actor
  ON public.actor_links (actor_id, sort_order);

ALTER TABLE public.actor_links ENABLE ROW LEVEL SECURITY;

-- Public can read all links (they appear on public profiles)
CREATE POLICY "Actor links are public"
  ON public.actor_links FOR SELECT
  USING (true);

-- Actor owners can manage their own links
CREATE POLICY "Owners manage their actor links"
  ON public.actor_links FOR ALL
  USING (
    actor_id IN (
      SELECT id FROM public.nextus_actors WHERE profile_owner = auth.uid()
    )
  )
  WITH CHECK (
    actor_id IN (
      SELECT id FROM public.nextus_actors WHERE profile_owner = auth.uid()
    )
  );

-- ── 3. actor_press ────────────────────────────────────────────────────────────
-- "As seen in" mentions. Evidence-layer field, can be AI-extracted or owner-added.

CREATE TABLE IF NOT EXISTS public.actor_press (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id     uuid NOT NULL REFERENCES public.nextus_actors(id) ON DELETE CASCADE,
  publication  text NOT NULL,       -- e.g. "BBC", "Forbes", "Huffington Post"
  url          text,                -- optional link to the piece
  title        text,                -- optional piece title
  published_at date,                -- optional date
  sort_order   integer NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_actor_press_actor
  ON public.actor_press (actor_id, sort_order);

ALTER TABLE public.actor_press ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Actor press is public"
  ON public.actor_press FOR SELECT
  USING (true);

CREATE POLICY "Owners manage their actor press"
  ON public.actor_press FOR ALL
  USING (
    actor_id IN (
      SELECT id FROM public.nextus_actors WHERE profile_owner = auth.uid()
    )
  )
  WITH CHECK (
    actor_id IN (
      SELECT id FROM public.nextus_actors WHERE profile_owner = auth.uid()
    )
  );

-- ── 4. actor_offers ───────────────────────────────────────────────────────────
-- What the actor brings. Simple list items, no enforced categories.
-- Inherits actor domains by default, can be overridden.
-- Location mode handles the "anywhere / specific / local only" distinction.

CREATE TABLE IF NOT EXISTS public.actor_offers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id        uuid NOT NULL REFERENCES public.nextus_actors(id) ON DELETE CASCADE,
  title           text NOT NULL,
  description     text,
  active          boolean NOT NULL DEFAULT true,

  -- Optional domain override. If empty/null, inherits from actor.
  domains         text[],

  -- Location mode:
  --   'anywhere'      — open to working anywhere
  --   'local_only'    — wants engagements local to actor's location
  --   'specific'      — specific places listed in location_specifics
  location_mode   text NOT NULL DEFAULT 'anywhere'
    CHECK (location_mode IN ('anywhere', 'local_only', 'specific')),
  location_specifics text,            -- freeform, used when mode = 'specific'

  sort_order      integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_actor_offers_actor
  ON public.actor_offers (actor_id, active, sort_order);

CREATE INDEX IF NOT EXISTS idx_actor_offers_active
  ON public.actor_offers (active, created_at DESC)
  WHERE active = true;

-- GIN index on domains array for domain-page filtering
CREATE INDEX IF NOT EXISTS idx_actor_offers_domains
  ON public.actor_offers USING GIN (domains);

ALTER TABLE public.actor_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active actor offers are public"
  ON public.actor_offers FOR SELECT
  USING (active = true);

CREATE POLICY "Owners read all their offers"
  ON public.actor_offers FOR SELECT
  USING (
    actor_id IN (
      SELECT id FROM public.nextus_actors WHERE profile_owner = auth.uid()
    )
  );

CREATE POLICY "Owners manage their offers"
  ON public.actor_offers FOR ALL
  USING (
    actor_id IN (
      SELECT id FROM public.nextus_actors WHERE profile_owner = auth.uid()
    )
  )
  WITH CHECK (
    actor_id IN (
      SELECT id FROM public.nextus_actors WHERE profile_owner = auth.uid()
    )
  );

-- ── 5. actor_needs ────────────────────────────────────────────────────────────
-- What the actor is actively looking for. Same shape as offers.

CREATE TABLE IF NOT EXISTS public.actor_needs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id        uuid NOT NULL REFERENCES public.nextus_actors(id) ON DELETE CASCADE,
  title           text NOT NULL,
  description     text,
  active          boolean NOT NULL DEFAULT true,

  -- Optional domain override
  domains         text[],

  location_mode   text NOT NULL DEFAULT 'anywhere'
    CHECK (location_mode IN ('anywhere', 'local_only', 'specific')),
  location_specifics text,

  sort_order      integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_actor_needs_actor
  ON public.actor_needs (actor_id, active, sort_order);

CREATE INDEX IF NOT EXISTS idx_actor_needs_active
  ON public.actor_needs (active, created_at DESC)
  WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_actor_needs_domains
  ON public.actor_needs USING GIN (domains);

ALTER TABLE public.actor_needs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active actor needs are public"
  ON public.actor_needs FOR SELECT
  USING (active = true);

CREATE POLICY "Owners read all their needs"
  ON public.actor_needs FOR SELECT
  USING (
    actor_id IN (
      SELECT id FROM public.nextus_actors WHERE profile_owner = auth.uid()
    )
  );

CREATE POLICY "Owners manage their needs"
  ON public.actor_needs FOR ALL
  USING (
    actor_id IN (
      SELECT id FROM public.nextus_actors WHERE profile_owner = auth.uid()
    )
  )
  WITH CHECK (
    actor_id IN (
      SELECT id FROM public.nextus_actors WHERE profile_owner = auth.uid()
    )
  );

-- ── Done ──────────────────────────────────────────────────────────────────────
-- New columns on nextus_actors: tagline, image_url, mission_statement,
--                                working_on_now, lifecycle_status
-- New tables: actor_links, actor_press, actor_offers, actor_needs
-- All with RLS, public reads where appropriate, owner-managed writes.
