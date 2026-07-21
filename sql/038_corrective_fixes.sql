-- 038_corrective_fixes.sql (v2)
--
-- Corrective migration. Fixes issues found by comparing the live schema
-- against what the Atlas build code expects.
--
-- This v2 corrects a SQL bug in v1 where ORDER BY referenced a column named
-- "rank", which collides with the built-in Postgres rank() window function.
-- The fix: inline the ts_rank expression in ORDER BY, not via the column alias.
--
-- Changes:
--   1. Adds status column to nextus_actors
--   2. Adds slug column with auto-generation trigger and backfill
--   3. Broadens type check to include 'place' and 'group'
--   4. Ensures search_vector trigger + index on nextus_actors, actor_offers, actor_needs
--   5. Creates search_actors, search_offers, search_needs RPC functions
--
-- Safe to re-run. All operations are idempotent.

-- ── 1. status column ─────────────────────────────────────────────────────────

ALTER TABLE public.nextus_actors
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'live';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'nextus_actors_status_check'
  ) THEN
    ALTER TABLE public.nextus_actors
      ADD CONSTRAINT nextus_actors_status_check
      CHECK (status IN ('live', 'pending', 'suspended', 'draft'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_nextus_actors_status
  ON public.nextus_actors (status);

-- ── 2. slug column ───────────────────────────────────────────────────────────

ALTER TABLE public.nextus_actors
  ADD COLUMN IF NOT EXISTS slug text;

-- Slug generation function (idempotent — CREATE OR REPLACE)
CREATE OR REPLACE FUNCTION public.generate_actor_slug(actor_name text)
RETURNS text AS $$
DECLARE
  base_slug text;
  final_slug text;
  counter integer := 0;
BEGIN
  base_slug := lower(actor_name);
  base_slug := regexp_replace(base_slug, '[^a-z0-9]+', '-', 'g');
  base_slug := regexp_replace(base_slug, '^-+|-+$', '', 'g');

  IF base_slug = '' THEN
    base_slug := 'actor';
  END IF;

  final_slug := base_slug;
  WHILE EXISTS (SELECT 1 FROM public.nextus_actors WHERE slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;

  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Backfill existing rows without a slug
UPDATE public.nextus_actors
SET slug = public.generate_actor_slug(name)
WHERE slug IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'nextus_actors_slug_key'
  ) THEN
    ALTER TABLE public.nextus_actors
      ADD CONSTRAINT nextus_actors_slug_key UNIQUE (slug);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_nextus_actors_slug
  ON public.nextus_actors (slug);

-- Auto-generate slug on insert if not provided
CREATE OR REPLACE FUNCTION public.nextus_actors_slug_trigger()
RETURNS trigger AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := public.generate_actor_slug(NEW.name);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS nextus_actors_slug_autogenerate ON public.nextus_actors;
CREATE TRIGGER nextus_actors_slug_autogenerate
  BEFORE INSERT ON public.nextus_actors
  FOR EACH ROW
  EXECUTE FUNCTION public.nextus_actors_slug_trigger();

-- ── 3. Broaden type check constraint ─────────────────────────────────────────

ALTER TABLE public.nextus_actors
  DROP CONSTRAINT IF EXISTS nextus_actors_type_check;

ALTER TABLE public.nextus_actors
  ADD CONSTRAINT nextus_actors_type_check
  CHECK (type IN ('organisation', 'project', 'practitioner', 'programme', 'place', 'group', 'resource'));

-- ── 4. Search vector triggers and indexes ───────────────────────────────────

-- nextus_actors search_vector update function
CREATE OR REPLACE FUNCTION public.nextus_actors_search_vector_update()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.name,             '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.tagline,          '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.location_name,    '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.description,      '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.mission_statement,'')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.working_on_now,   '')), 'C') ||
    setweight(to_tsvector('english', coalesce(NEW.impact_summary,   '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS nextus_actors_search_vector_trigger ON public.nextus_actors;
CREATE TRIGGER nextus_actors_search_vector_trigger
  BEFORE INSERT OR UPDATE ON public.nextus_actors
  FOR EACH ROW EXECUTE FUNCTION public.nextus_actors_search_vector_update();

-- Direct backfill of search vectors on existing rows (no trigger needed)
UPDATE public.nextus_actors
SET search_vector =
  setweight(to_tsvector('english', coalesce(name,             '')), 'A') ||
  setweight(to_tsvector('english', coalesce(tagline,          '')), 'A') ||
  setweight(to_tsvector('english', coalesce(location_name,    '')), 'B') ||
  setweight(to_tsvector('english', coalesce(description,      '')), 'B') ||
  setweight(to_tsvector('english', coalesce(mission_statement,'')), 'B') ||
  setweight(to_tsvector('english', coalesce(working_on_now,   '')), 'C') ||
  setweight(to_tsvector('english', coalesce(impact_summary,   '')), 'C')
WHERE search_vector IS NULL;

CREATE INDEX IF NOT EXISTS idx_nextus_actors_search
  ON public.nextus_actors USING GIN (search_vector);

-- actor_offers
ALTER TABLE public.actor_offers
  ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE OR REPLACE FUNCTION public.actor_offers_search_vector_update()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.title,       '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.location_specifics, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS actor_offers_search_vector_trigger ON public.actor_offers;
CREATE TRIGGER actor_offers_search_vector_trigger
  BEFORE INSERT OR UPDATE ON public.actor_offers
  FOR EACH ROW EXECUTE FUNCTION public.actor_offers_search_vector_update();

UPDATE public.actor_offers
SET search_vector =
  setweight(to_tsvector('english', coalesce(title,       '')), 'A') ||
  setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(location_specifics, '')), 'C')
WHERE search_vector IS NULL;

CREATE INDEX IF NOT EXISTS idx_actor_offers_search
  ON public.actor_offers USING GIN (search_vector);

-- actor_needs
ALTER TABLE public.actor_needs
  ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE OR REPLACE FUNCTION public.actor_needs_search_vector_update()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.title,       '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.location_specifics, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS actor_needs_search_vector_trigger ON public.actor_needs;
CREATE TRIGGER actor_needs_search_vector_trigger
  BEFORE INSERT OR UPDATE ON public.actor_needs
  FOR EACH ROW EXECUTE FUNCTION public.actor_needs_search_vector_update();

UPDATE public.actor_needs
SET search_vector =
  setweight(to_tsvector('english', coalesce(title,       '')), 'A') ||
  setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(location_specifics, '')), 'C')
WHERE search_vector IS NULL;

CREATE INDEX IF NOT EXISTS idx_actor_needs_search
  ON public.actor_needs USING GIN (search_vector);

-- ── 5. Search RPC functions ──────────────────────────────────────────────────
-- The ORDER BY clauses inline the ts_rank expression rather than referencing
-- the column alias "rank" — which collides with Postgres's built-in rank()
-- window function and produces "column rank does not exist".

-- Need to drop and recreate the function rather than CREATE OR REPLACE
-- because the signature includes a RETURNS clause with OUT parameters that
-- may differ from any pre-existing version.

DROP FUNCTION IF EXISTS public.search_actors(text, text, text, text, int);

CREATE FUNCTION public.search_actors(
  q          text,
  domain     text DEFAULT NULL,
  actor_type text DEFAULT NULL,
  scale      text DEFAULT NULL,
  limit_n    int  DEFAULT 30
)
RETURNS SETOF public.nextus_actors AS $$
  SELECT a.*
  FROM public.nextus_actors a
  WHERE a.status = 'live'
    AND (q = '' OR q IS NULL OR a.search_vector @@ plainto_tsquery('english', q))
    AND (domain     IS NULL OR domain = ANY(a.domains) OR a.domain_id = domain)
    AND (actor_type IS NULL OR a.type = actor_type)
    AND (scale      IS NULL OR a.scale = scale)
  ORDER BY
    CASE WHEN q = '' OR q IS NULL THEN 0::real
         ELSE ts_rank(a.search_vector, plainto_tsquery('english', q)) END DESC,
    a.alignment_score DESC NULLS LAST,
    a.created_at DESC
  LIMIT limit_n
$$ LANGUAGE sql STABLE;

DROP FUNCTION IF EXISTS public.search_offers(text, text, int);

CREATE FUNCTION public.search_offers(
  q       text,
  domain  text DEFAULT NULL,
  limit_n int  DEFAULT 30
)
RETURNS TABLE (
  id                 uuid,
  actor_id           uuid,
  title              text,
  description        text,
  domains            text[],
  location_mode      text,
  location_specifics text,
  actor_name         text,
  actor_slug         text,
  actor_type         text,
  actor_image        text,
  actor_tagline      text,
  match_rank         real
) AS $$
  SELECT
    o.id, o.actor_id, o.title, o.description, o.domains,
    o.location_mode, o.location_specifics,
    a.name, a.slug, a.type, a.image_url, a.tagline,
    (CASE WHEN q = '' OR q IS NULL THEN 0::real
          ELSE ts_rank(o.search_vector, plainto_tsquery('english', q)) END) AS match_rank
  FROM public.actor_offers o
  JOIN public.nextus_actors a ON a.id = o.actor_id
  WHERE o.active = true
    AND a.status = 'live'
    AND (q = '' OR q IS NULL OR o.search_vector @@ plainto_tsquery('english', q))
    AND (domain IS NULL OR domain = ANY(coalesce(o.domains, a.domains)))
  ORDER BY
    (CASE WHEN q = '' OR q IS NULL THEN 0::real
          ELSE ts_rank(o.search_vector, plainto_tsquery('english', q)) END) DESC,
    o.created_at DESC
  LIMIT limit_n
$$ LANGUAGE sql STABLE;

DROP FUNCTION IF EXISTS public.search_needs(text, text, int);

CREATE FUNCTION public.search_needs(
  q       text,
  domain  text DEFAULT NULL,
  limit_n int  DEFAULT 30
)
RETURNS TABLE (
  id                 uuid,
  actor_id           uuid,
  title              text,
  description        text,
  domains            text[],
  location_mode      text,
  location_specifics text,
  actor_name         text,
  actor_slug         text,
  actor_type         text,
  actor_image        text,
  actor_tagline      text,
  match_rank         real
) AS $$
  SELECT
    n.id, n.actor_id, n.title, n.description, n.domains,
    n.location_mode, n.location_specifics,
    a.name, a.slug, a.type, a.image_url, a.tagline,
    (CASE WHEN q = '' OR q IS NULL THEN 0::real
          ELSE ts_rank(n.search_vector, plainto_tsquery('english', q)) END) AS match_rank
  FROM public.actor_needs n
  JOIN public.nextus_actors a ON a.id = n.actor_id
  WHERE n.active = true
    AND a.status = 'live'
    AND (q = '' OR q IS NULL OR n.search_vector @@ plainto_tsquery('english', q))
    AND (domain IS NULL OR domain = ANY(coalesce(n.domains, a.domains)))
  ORDER BY
    (CASE WHEN q = '' OR q IS NULL THEN 0::real
          ELSE ts_rank(n.search_vector, plainto_tsquery('english', q)) END) DESC,
    n.created_at DESC
  LIMIT limit_n
$$ LANGUAGE sql STABLE;

-- ── Done ─────────────────────────────────────────────────────────────────────
-- After this runs, verify with:
--
--   SELECT name, slug, status FROM nextus_actors LIMIT 5;
--   SELECT name FROM search_actors('', NULL, NULL, NULL, 5);  -- empty query, returns top 5
--   SELECT routine_name FROM information_schema.routines
--     WHERE routine_schema = 'public'
--       AND routine_name IN ('search_actors', 'search_offers', 'search_needs');
