-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 047 — Focus cascade helpers
--
-- The Russian-doll math. Every affiliation, every count, every nested-content
-- view on a Focus profile needs to walk the parent chain. These two functions
-- are the canonical helpers — written once, used everywhere.
--
-- focus_ancestors(focus_id):
--   Walks upward from focus_id through parent_id to the root.
--   Returns all ancestors, ordered by distance (closest first).
--   Used for: rendering breadcrumbs, cascading affiliations up
--   (Toronto → Ontario → Canada → North America → Earth).
--
-- focus_descendants(focus_id):
--   Walks downward through parent_id from focus_id, transitive closure.
--   Returns all descendants at every depth.
--   Used for: counting affiliated people on a country page (includes
--   everyone affiliated to anything inside that country), listing actors
--   with location_focus_id anywhere in the tree below.
--
-- Both functions are STABLE (deterministic for a given DB state), so the
-- planner can cache them across a single query. Both are SECURITY INVOKER —
-- they respect the caller's RLS, which means the application doesn't
-- accidentally leak affiliations through a cascade query.
--
-- Source: NextUs Geographic Scale Architecture v2.1, Section 2.7 (Russian-doll
-- cascade math) and Phase v2.5 build sequence.
-- ─────────────────────────────────────────────────────────────────────────────

begin;

-- ─── focus_ancestors ───────────────────────────────────────────────────────
-- Returns the chain of ancestors above focus_id, closest-first.
-- The focus itself is NOT included. If the focus has no parent, returns empty.
--
-- Example: focus_ancestors('<toronto-uuid>') returns
--   depth=1 → Ontario
--   depth=2 → Canada
--   depth=3 → North America
--   depth=4 → Earth

create or replace function public.focus_ancestors(p_focus_id uuid)
returns table (
  id         uuid,
  slug       text,
  name       text,
  type       text,
  kind       text,
  parent_id  uuid,
  depth      integer
)
language sql
stable
security invoker
as $$
  with recursive walk as (
    select
      f.id,
      f.slug,
      f.name,
      f.type,
      f.kind,
      f.parent_id,
      1 as depth
    from public.nextus_focuses f
    where f.id = (
      select parent_id from public.nextus_focuses where id = p_focus_id
    )

    union all

    select
      f.id,
      f.slug,
      f.name,
      f.type,
      f.kind,
      f.parent_id,
      w.depth + 1
    from public.nextus_focuses f
    join walk w on f.id = w.parent_id
    -- Safety: cap the recursion depth at 20. Geographic trees in practice
    -- never go below ~6 (Earth → continent → country → state → region →
    -- city → neighbourhood). 20 is paranoid headroom.
    where w.depth < 20
  )
  select id, slug, name, type, kind, parent_id, depth from walk;
$$;

comment on function public.focus_ancestors(uuid) is
  'Returns the chain of ancestors above the given focus, ordered closest-first. Used for breadcrumb rendering and cascading affiliations upward through the parent chain.';

-- ─── focus_descendants ─────────────────────────────────────────────────────
-- Returns the transitive closure of descendants below focus_id.
-- The focus itself is NOT included. If the focus has no children, returns empty.
--
-- Example: focus_descendants('<canada-uuid>') returns every province,
-- city, neighbourhood, river, mountain, etc. that lives anywhere in
-- Canada's subtree. Used for counting affiliations and listing actors
-- located in the country at any depth.
--
-- Performance note: this is a transitive-closure walk against a table with
-- ~2M rows after the v2.2 ingest. The parent_id column needs an index for
-- this to be fast. The index is added below.

create or replace function public.focus_descendants(p_focus_id uuid)
returns table (
  id         uuid,
  slug       text,
  name       text,
  type       text,
  kind       text,
  parent_id  uuid,
  depth      integer
)
language sql
stable
security invoker
as $$
  with recursive walk as (
    select
      f.id,
      f.slug,
      f.name,
      f.type,
      f.kind,
      f.parent_id,
      1 as depth
    from public.nextus_focuses f
    where f.parent_id = p_focus_id

    union all

    select
      f.id,
      f.slug,
      f.name,
      f.type,
      f.kind,
      f.parent_id,
      w.depth + 1
    from public.nextus_focuses f
    join walk w on f.parent_id = w.id
    where w.depth < 20
  )
  select id, slug, name, type, kind, parent_id, depth from walk;
$$;

comment on function public.focus_descendants(uuid) is
  'Returns all descendants below the given focus at every depth. Used for cascading affiliation counts (Canada page shows everyone affiliated to anything inside Canada) and listing actors located in the geographic subtree.';

-- ─── Performance index on parent_id ────────────────────────────────────────
-- Both helpers walk parent_id. The unique index on geonames_id and the
-- primary key on id are present, but parent_id needs its own index for
-- the recursive joins to perform.

create index if not exists nextus_focuses_parent_id_idx
  on public.nextus_focuses (parent_id)
  where parent_id is not null;

-- ─── Convenience: focus_affiliation_counts_cascaded ────────────────────────
-- A single-call helper that returns the cascaded affiliation counts for a
-- Focus, grouped by relationship_type, respecting visibility = 'public'.
-- This is the function the Focus profile page calls to render the
-- "Affiliated people" layer.
--
-- The function returns one row per relationship_type that has at least
-- one public affiliation in the focus or any descendant. relationship_types
-- with zero public affiliations are omitted (the UI can render absence
-- however it wants).
--
-- For `citizen`, only direct affiliations to this focus count — citizenship
-- doesn't cascade. For every other relationship type, descendants count.

create or replace function public.focus_affiliation_counts_cascaded(p_focus_id uuid)
returns table (
  relationship_type text,
  affiliation_count bigint
)
language sql
stable
security invoker
as $$
  -- The cascade set: the focus itself plus all descendants.
  with cascade_focuses as (
    select p_focus_id as id
    union
    select id from public.focus_descendants(p_focus_id)
  ),
  -- Citizenship is special: only direct claims to this focus count.
  citizen_counts as (
    select
      'citizen'::text as relationship_type,
      count(*)::bigint as affiliation_count
    from public.nextus_user_affiliations a
    where a.focus_id = p_focus_id
      and a.relationship_type = 'citizen'
      and a.visibility = 'public'
  ),
  -- Every other relationship type cascades through descendants.
  other_counts as (
    select
      a.relationship_type,
      count(*)::bigint as affiliation_count
    from public.nextus_user_affiliations a
    join cascade_focuses cf on a.focus_id = cf.id
    where a.relationship_type <> 'citizen'
      and a.visibility = 'public'
    group by a.relationship_type
  )
  select * from citizen_counts where affiliation_count > 0
  union all
  select * from other_counts where affiliation_count > 0;
$$;

comment on function public.focus_affiliation_counts_cascaded(uuid) is
  'Returns public affiliation counts for a focus, cascaded through descendants for all relationship types except citizen (which is only counted at the polity scale where it was declared).';

commit;

-- ─── Verification queries (run manually after migration) ────────────────────
-- -- Walk up from a known focus (e.g., a Canadian city if seeded):
-- select * from public.focus_ancestors(
--   (select id from public.nextus_focuses where slug = 'ca' limit 1)
-- );
--
-- -- Walk down from Canada:
-- select count(*) from public.focus_descendants(
--   (select id from public.nextus_focuses where slug = 'ca' limit 1)
-- );
--
-- -- Cascade-aware counts for Canada:
-- select * from public.focus_affiliation_counts_cascaded(
--   (select id from public.nextus_focuses where slug = 'ca' limit 1)
-- );
