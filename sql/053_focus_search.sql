-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 053 — Focus search infrastructure
--
-- Background: nextus_focuses has ~760k rows after the GeoNames ingest. The
-- ActiveFocusPrompt place-search was running `ilike '%canada%'` with no index
-- on `name`, which triggered full sequential scans and timed out.
--
-- This migration adds:
--   1. pg_trgm extension (idempotent)
--   2. GIN trigram index on name — supports `ILIKE '%foo%'` and similarity()
--   3. Btree index on lower(name) — supports prefix `ILIKE 'foo%'` very fast
--   4. search_focuses(query, limit) RPC — ranked place search:
--        - prefix matches first (+1 bump)
--        - then trigram similarity
--        - then alphabetical
--      Returns top N rows server-side, so the client doesn't sort huge sets.
--
-- This file is committed for the audit trail; the SQL was run manually in
-- Supabase Studio on 2026-05-19. Re-running is safe (all statements are
-- idempotent / CREATE OR REPLACE).
-- ─────────────────────────────────────────────────────────────────────────────

-- pg_trgm extension (idempotent)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Trigram index on name — supports ILIKE '%foo%' and similarity()
CREATE INDEX IF NOT EXISTS nextus_focuses_name_trgm_idx
  ON public.nextus_focuses
  USING gin (name gin_trgm_ops);

-- Plain btree on lower(name) — supports prefix ILIKE 'foo%' very fast,
-- and helps the ORDER BY name when combined with the trigram filter.
CREATE INDEX IF NOT EXISTS nextus_focuses_lower_name_idx
  ON public.nextus_focuses
  USING btree (lower(name));

-- Ranked place search. Prefix matches first, then substring matches,
-- ordered by trigram similarity. Cap at 20.
CREATE OR REPLACE FUNCTION public.search_focuses(
  p_query text,
  p_limit int DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  slug text,
  name text,
  type text,
  rank real
)
LANGUAGE sql
STABLE
AS $$
  WITH q AS (SELECT lower(trim(p_query)) AS s)
  SELECT
    f.id,
    f.slug,
    f.name,
    f.type,
    -- Prefix matches get a +1 bump so they always sort first
    (CASE WHEN lower(f.name) LIKE (SELECT s FROM q) || '%' THEN 1.0 ELSE 0.0 END
     + similarity(f.name, (SELECT s FROM q))
    )::real AS rank
  FROM public.nextus_focuses f
  WHERE f.name ILIKE '%' || (SELECT s FROM q) || '%'
  ORDER BY rank DESC, f.name ASC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.search_focuses(text, int) TO anon, authenticated;
