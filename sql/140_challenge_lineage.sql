-- 140_challenge_lineage.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- Challenge lineage — the living tree (June 2026).
--
-- A constellation is bound two ways at once. The shared-goal binding (every
-- challenge laddering to one Horizon Goal) already exists via
-- actor_calls.horizon_goal_id. This migration adds the second structure: the
-- lineage, the record of who carried it to whom. The NextUs profile authors a
-- root, an org takes it on and authors a child beneath it, and that child can
-- spawn children of its own.
--
-- One column does the structural work: parent_call_id. The tree is read
-- viewer-relative — the node in focus sits largest, ancestors shrink with
-- distance, descendants fan below — so the API exposes two reads: the ancestor
-- path up to the root, and the descendants beneath a node.
--
-- A broadcast never travels this tree (that rule lives in the broadcast layer,
-- not here). Lineage is for showing the shape, not for reaching down it.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── The link ─────────────────────────────────────────────────────────────────

ALTER TABLE actor_calls
  ADD COLUMN IF NOT EXISTS parent_call_id uuid
    REFERENCES actor_calls(id) ON DELETE SET NULL;

-- A node can never be its own parent. Deeper cycles are guarded in the API
-- (can't point at a descendant); this stops the trivial case at the schema.
ALTER TABLE actor_calls
  DROP CONSTRAINT IF EXISTS actor_calls_parent_not_self;
ALTER TABLE actor_calls
  ADD CONSTRAINT actor_calls_parent_not_self
    CHECK (parent_call_id IS NULL OR parent_call_id <> id);

COMMENT ON COLUMN actor_calls.parent_call_id IS
  'The challenge this one builds on. NULL = a root. ON DELETE SET NULL so removing a parent orphans its children to root rather than felling the forest.';

CREATE INDEX IF NOT EXISTS idx_actor_calls_parent
  ON actor_calls (parent_call_id)
  WHERE parent_call_id IS NOT NULL;

-- ── Ancestor path (root-first, includes the node itself) ──────────────────────
-- Returns the chain from the root down to p_call_id, ordered root → … → focus,
-- with a depth so the renderer can size each node by distance from focus.
-- Only community-visible challenges appear in a public tree. If an ancestor is
-- draft or unlisted the walk stops there (a private node is never exposed as a parent).

CREATE OR REPLACE FUNCTION challenge_ancestors(p_call_id uuid)
RETURNS TABLE (
  id              uuid,
  parent_call_id  uuid,
  title           text,
  slug            text,
  type            text,
  domain          text,
  the_move        text,
  taken_on_count  int,
  active_count    int,
  actor_id        uuid,
  actor_name      text,
  actor_image_url text,
  actor_slug      text,
  depth_from_focus int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH RECURSIVE chain AS (
    SELECT c.id, c.parent_call_id, c.title, c.slug, c.type, c.domain,
           c.the_move, c.taken_on_count, c.active_count, c.actor_id,
           c.visibility, 0 AS depth_from_focus
      FROM actor_calls c
     WHERE c.id = p_call_id
       AND c.visibility = 'community'
    UNION ALL
    SELECT p.id, p.parent_call_id, p.title, p.slug, p.type, p.domain,
           p.the_move, p.taken_on_count, p.active_count, p.actor_id,
           p.visibility, ch.depth_from_focus + 1
      FROM actor_calls p
      JOIN chain ch ON ch.parent_call_id = p.id
     WHERE p.visibility = 'community'
  )
  SELECT ch.id, ch.parent_call_id, ch.title, ch.slug, ch.type, ch.domain,
         ch.the_move, ch.taken_on_count, ch.active_count,
         a.id   AS actor_id,
         a.name AS actor_name,
         a.image_url AS actor_image_url,
         a.slug AS actor_slug,
         ch.depth_from_focus
    FROM chain ch
    LEFT JOIN nextus_actors a ON a.id = ch.actor_id
   ORDER BY ch.depth_from_focus DESC;   -- root first, focus last
$$;

-- ── Descendants (immediate children by default, full subtree when asked) ──────
-- p_max_depth NULL = whole subtree; 1 = direct children only. Each row carries
-- its own taken_on_count so the renderer can show summing sub-tallies without
-- a second round trip. Draft and unlisted nodes are pruned with their branch.

CREATE OR REPLACE FUNCTION challenge_descendants(
  p_call_id   uuid,
  p_max_depth int DEFAULT NULL
)
RETURNS TABLE (
  id              uuid,
  parent_call_id  uuid,
  title           text,
  slug            text,
  type            text,
  domain          text,
  the_move        text,
  taken_on_count  int,
  active_count    int,
  actor_id        uuid,
  actor_name      text,
  actor_image_url text,
  actor_slug      text,
  depth_below_focus int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH RECURSIVE subtree AS (
    SELECT c.id, c.parent_call_id, c.title, c.slug, c.type, c.domain,
           c.the_move, c.taken_on_count, c.active_count, c.actor_id,
           1 AS depth_below_focus
      FROM actor_calls c
     WHERE c.parent_call_id = p_call_id
       AND c.visibility = 'community'
    UNION ALL
    SELECT c.id, c.parent_call_id, c.title, c.slug, c.type, c.domain,
           c.the_move, c.taken_on_count, c.active_count, c.actor_id,
           st.depth_below_focus + 1
      FROM actor_calls c
      JOIN subtree st ON c.parent_call_id = st.id
     WHERE c.visibility = 'community'
       AND (p_max_depth IS NULL OR st.depth_below_focus < p_max_depth)
  )
  SELECT st.id, st.parent_call_id, st.title, st.slug, st.type, st.domain,
         st.the_move, st.taken_on_count, st.active_count,
         a.id   AS actor_id,
         a.name AS actor_name,
         a.image_url AS actor_image_url,
         a.slug AS actor_slug,
         st.depth_below_focus
    FROM subtree st
    LEFT JOIN nextus_actors a ON a.id = st.actor_id
   ORDER BY st.depth_below_focus ASC, st.taken_on_count DESC;
$$;

GRANT EXECUTE ON FUNCTION challenge_ancestors(uuid)            TO anon, authenticated;
GRANT EXECUTE ON FUNCTION challenge_descendants(uuid, int)     TO anon, authenticated;
