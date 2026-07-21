-- 037_atlas_search.sql
--
-- Adds Postgres full-text search support to the Atlas.
--
-- Approach: per-table tsvector columns, kept in sync via triggers.
-- This keeps search fast (GIN indexes) and lets us search each surface
-- (actors / offers / needs / press) independently or together.

-- ── 1. nextus_actors search vector ────────────────────────────────────────────

ALTER TABLE public.nextus_actors
  ADD COLUMN IF NOT EXISTS search_vector tsvector;

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

-- Populate existing rows
UPDATE public.nextus_actors SET search_vector = NULL WHERE search_vector IS NULL;
-- Trigger fires on UPDATE so the set NULL actually populates them

CREATE INDEX IF NOT EXISTS idx_nextus_actors_search
  ON public.nextus_actors USING GIN (search_vector);

-- ── 2. actor_offers search vector ─────────────────────────────────────────────

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

UPDATE public.actor_offers SET search_vector = NULL WHERE search_vector IS NULL;

CREATE INDEX IF NOT EXISTS idx_actor_offers_search
  ON public.actor_offers USING GIN (search_vector);

-- ── 3. actor_needs search vector ──────────────────────────────────────────────

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

UPDATE public.actor_needs SET search_vector = NULL WHERE search_vector IS NULL;

CREATE INDEX IF NOT EXISTS idx_actor_needs_search
  ON public.actor_needs USING GIN (search_vector);

-- ── 4. RPC functions for ranked search ────────────────────────────────────────
-- Postgres-side ranking via ts_rank. Supabase clients call these via .rpc().

CREATE OR REPLACE FUNCTION public.search_actors(
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
    CASE WHEN q = '' OR q IS NULL THEN 0
         ELSE ts_rank(a.search_vector, plainto_tsquery('english', q)) END DESC,
    a.alignment_score DESC NULLS LAST,
    a.created_at DESC
  LIMIT limit_n
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION public.search_offers(
  q       text,
  domain  text DEFAULT NULL,
  limit_n int  DEFAULT 30
)
RETURNS TABLE (
  id            uuid,
  actor_id      uuid,
  title         text,
  description   text,
  domains       text[],
  location_mode text,
  location_specifics text,
  actor_name    text,
  actor_slug    text,
  actor_type    text,
  actor_image   text,
  actor_tagline text,
  rank          real
) AS $$
  SELECT
    o.id, o.actor_id, o.title, o.description, o.domains,
    o.location_mode, o.location_specifics,
    a.name, a.slug, a.type, a.image_url, a.tagline,
    CASE WHEN q = '' OR q IS NULL THEN 0
         ELSE ts_rank(o.search_vector, plainto_tsquery('english', q)) END
  FROM public.actor_offers o
  JOIN public.nextus_actors a ON a.id = o.actor_id
  WHERE o.active = true
    AND a.status = 'live'
    AND (q = '' OR q IS NULL OR o.search_vector @@ plainto_tsquery('english', q))
    AND (domain IS NULL OR domain = ANY(coalesce(o.domains, a.domains)))
  ORDER BY rank DESC, o.created_at DESC
  LIMIT limit_n
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION public.search_needs(
  q       text,
  domain  text DEFAULT NULL,
  limit_n int  DEFAULT 30
)
RETURNS TABLE (
  id            uuid,
  actor_id      uuid,
  title         text,
  description   text,
  domains       text[],
  location_mode text,
  location_specifics text,
  actor_name    text,
  actor_slug    text,
  actor_type    text,
  actor_image   text,
  actor_tagline text,
  rank          real
) AS $$
  SELECT
    n.id, n.actor_id, n.title, n.description, n.domains,
    n.location_mode, n.location_specifics,
    a.name, a.slug, a.type, a.image_url, a.tagline,
    CASE WHEN q = '' OR q IS NULL THEN 0
         ELSE ts_rank(n.search_vector, plainto_tsquery('english', q)) END
  FROM public.actor_needs n
  JOIN public.nextus_actors a ON a.id = n.actor_id
  WHERE n.active = true
    AND a.status = 'live'
    AND (q = '' OR q IS NULL OR n.search_vector @@ plainto_tsquery('english', q))
    AND (domain IS NULL OR domain = ANY(coalesce(n.domains, a.domains)))
  ORDER BY rank DESC, n.created_at DESC
  LIMIT limit_n
$$ LANGUAGE sql STABLE;

-- ── Done ─────────────────────────────────────────────────────────────────────
-- New columns: search_vector on nextus_actors, actor_offers, actor_needs
-- New indexes: GIN on each search_vector
-- New functions: search_actors(), search_offers(), search_needs()
