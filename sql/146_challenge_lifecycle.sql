-- 146_challenge_lifecycle.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- Challenge lifecycle — Close (reversible) and Delete (permanent tombstone).
-- (June 2026.)
--
-- The trigger isn't close-versus-delete, it's visible-versus-hidden. A node
-- sits in the lineage chain only while it's visible. Hidden and deleted nodes
-- are spliced out, and their children present under the nearest visible
-- ancestor. Everything below falls out of that one rule.
--
--   active            — live, joinable, in the chain.
--   closed + listed   — benign retirement. No new take-ons; stays in the
--                       chain (lineage intact); reversible.
--   closed + unlisted — closed and hidden. Spliced from the public chain;
--                       row untouched, so reopen snaps it back.
--   deleted           — permanent tombstone. Children physically re-parented
--                       to the grandparent, slug freed, row kept so the
--                       participant evidence under ON DELETE CASCADE survives.
--
-- Why a tombstone and not a DROP: actor_call_participants.call_id is
-- ON DELETE CASCADE. A hard delete would erase every participant's record of
-- the work they did. On an accrual platform that's the wrong primitive, so the
-- row persists, unlisted and re-rooted. True row removal (challenge_hard_purge)
-- is reserved for challenges nobody ever joined.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Lifecycle columns ─────────────────────────────────────────────────────────

ALTER TABLE actor_calls
  ADD COLUMN IF NOT EXISTS lifecycle_state text NOT NULL DEFAULT 'active'
    CHECK (lifecycle_state IN ('active', 'closed', 'deleted'));

-- Remembered so reopen restores the listing the call had before it was hidden.
ALTER TABLE actor_calls
  ADD COLUMN IF NOT EXISTS prior_visibility text
    CHECK (prior_visibility IS NULL OR prior_visibility IN ('draft', 'link_only', 'community'));

ALTER TABLE actor_calls ADD COLUMN IF NOT EXISTS closed_at  timestamptz;
ALTER TABLE actor_calls ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

COMMENT ON COLUMN actor_calls.lifecycle_state IS
  'active | closed | deleted. Closed is reversible (reopen). Deleted is a permanent tombstone: row kept so participant evidence survives, children re-parented to grandparent.';
COMMENT ON COLUMN actor_calls.prior_visibility IS
  'The visibility a call held before being hidden on close, so reopen can restore it. NULL when the call was closed-but-listed.';

CREATE INDEX IF NOT EXISTS idx_actor_calls_lifecycle
  ON actor_calls (lifecycle_state)
  WHERE lifecycle_state <> 'active';

-- ── Soft delete — reparent children, free slug, tombstone ─────────────────────
-- Promotes direct children to this node's parent (NULL = they become roots),
-- frees the unique slug so the title can be reused, and marks the row deleted.
-- Participant rows are deliberately untouched. Atomic.

CREATE OR REPLACE FUNCTION challenge_soft_delete(p_call_id uuid)
RETURNS TABLE (reparented int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_parent uuid;
  v_count  int;
BEGIN
  SELECT parent_call_id INTO v_parent
    FROM actor_calls WHERE id = p_call_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'challenge % not found', p_call_id;
  END IF;

  -- Promote direct children one notch higher.
  UPDATE actor_calls
     SET parent_call_id = v_parent, updated_at = now()
   WHERE parent_call_id = p_call_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- Tombstone: unlist, free the slug, mark deleted. Suffixing the slug keeps the
  -- row's UNIQUE constraint satisfied while releasing the original value.
  UPDATE actor_calls
     SET lifecycle_state  = 'deleted',
         deleted_at       = now(),
         visibility       = 'draft',
         prior_visibility = NULL,
         slug             = CASE
                              WHEN slug IS NULL THEN NULL
                              ELSE left(slug, 48) || '-x' || substr(md5(random()::text), 1, 6)
                            END,
         updated_at       = now()
   WHERE id = p_call_id;

  reparented := v_count;
  RETURN NEXT;
END;
$$;

-- ── Hard purge — true removal, only for challenges nobody joined ───────────────
-- Reparents children, then deletes the row outright. Guarded twice so a purge
-- can never destroy participant evidence: it refuses if taken_on_count > 0 or
-- if any participation row exists.

CREATE OR REPLACE FUNCTION challenge_hard_purge(p_call_id uuid)
RETURNS TABLE (reparented int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_parent uuid;
  v_taken  int;
  v_count  int;
BEGIN
  SELECT parent_call_id, taken_on_count INTO v_parent, v_taken
    FROM actor_calls WHERE id = p_call_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'challenge % not found', p_call_id;
  END IF;
  IF COALESCE(v_taken, 0) > 0 THEN
    RAISE EXCEPTION 'cannot purge a challenge with participants (taken_on_count=%); use soft delete', v_taken;
  END IF;
  IF EXISTS (SELECT 1 FROM actor_call_participants WHERE call_id = p_call_id) THEN
    RAISE EXCEPTION 'cannot purge a challenge with participation records; use soft delete';
  END IF;

  UPDATE actor_calls
     SET parent_call_id = v_parent, updated_at = now()
   WHERE parent_call_id = p_call_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;

  DELETE FROM actor_calls WHERE id = p_call_id;

  reparented := v_count;
  RETURN NEXT;
END;
$$;

-- Lifecycle mutations run through the service-role API, which authorises the
-- caller (author or founder) before calling. Not exposed to anon/authenticated.
REVOKE ALL ON FUNCTION challenge_soft_delete(uuid) FROM anon, authenticated;
REVOKE ALL ON FUNCTION challenge_hard_purge(uuid)  FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION challenge_soft_delete(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION challenge_hard_purge(uuid)  TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- Lineage, re-cut for the splice (supersedes the bodies from migration 140).
--
-- Old behaviour: the walk stopped at any non-community node, so a hidden parent
-- visually orphaned its children. New behaviour: the walk passes THROUGH hidden
-- and deleted nodes but never emits them, and depth is counted in visible nodes
-- only, so children present contiguously under the nearest visible ancestor.
--
-- A node is a visible chain participant when:  visibility = 'community'
--                                         AND  lifecycle_state <> 'deleted'.
-- A closed-but-listed node is still community, so it stays in the chain. A
-- closed-and-hidden node (visibility dropped to draft) is walked through.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Ancestor path (root-first, includes the focus node at depth 0) ────────────

CREATE OR REPLACE FUNCTION challenge_ancestors(p_call_id uuid)
RETURNS TABLE (
  id               uuid,
  parent_call_id   uuid,
  title            text,
  slug             text,
  type             text,
  domain           text,
  the_move         text,
  taken_on_count   int,
  active_count     int,
  actor_id         uuid,
  actor_name       text,
  actor_image_url  text,
  actor_slug       text,
  depth_from_focus int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH RECURSIVE chain AS (
    -- Anchor at the focus, then walk the full parent chain regardless of
    -- visibility. Emission is filtered afterwards, so hidden ancestors are
    -- traversed but never returned (their titles never leak).
    SELECT c.id, c.parent_call_id, c.title, c.slug, c.type, c.domain,
           c.the_move, c.taken_on_count, c.active_count, c.actor_id,
           c.visibility, c.lifecycle_state, 0 AS raw_depth
      FROM actor_calls c
     WHERE c.id = p_call_id
    UNION ALL
    SELECT p.id, p.parent_call_id, p.title, p.slug, p.type, p.domain,
           p.the_move, p.taken_on_count, p.active_count, p.actor_id,
           p.visibility, p.lifecycle_state, ch.raw_depth + 1
      FROM actor_calls p
      JOIN chain ch ON ch.parent_call_id = p.id
     WHERE ch.raw_depth < 64                       -- defensive cycle guard
  ),
  visible AS (
    SELECT * FROM chain
     WHERE visibility = 'community'
       AND lifecycle_state <> 'deleted'
  ),
  ranked AS (
    -- Re-rank to contiguous distance-from-focus so spliced nodes leave no gap.
    SELECT v.*, (row_number() OVER (ORDER BY raw_depth ASC))::int - 1 AS depth_from_focus
      FROM visible v
  )
  SELECT r.id, r.parent_call_id, r.title, r.slug, r.type, r.domain,
         r.the_move, r.taken_on_count, r.active_count,
         a.id        AS actor_id,
         a.name      AS actor_name,
         a.image_url AS actor_image_url,
         a.slug      AS actor_slug,
         r.depth_from_focus
    FROM ranked r
    LEFT JOIN nextus_actors a ON a.id = r.actor_id
   ORDER BY r.depth_from_focus DESC;          -- root first, focus last
$$;

-- ── Descendants (visible-depth; hidden nodes spliced, children promoted) ──────
-- p_max_depth counts VISIBLE layers (NULL = whole subtree). vis_rank carries the
-- count of visible nodes on the path so far; a node emits at depth = vis_rank.

CREATE OR REPLACE FUNCTION challenge_descendants(
  p_call_id   uuid,
  p_max_depth int DEFAULT NULL
)
RETURNS TABLE (
  id                uuid,
  parent_call_id    uuid,
  title             text,
  slug              text,
  type              text,
  domain            text,
  the_move          text,
  taken_on_count    int,
  active_count      int,
  actor_id          uuid,
  actor_name        text,
  actor_image_url   text,
  actor_slug        text,
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
           c.visibility, c.lifecycle_state,
           1 AS raw_depth,
           CASE WHEN c.visibility = 'community' AND c.lifecycle_state <> 'deleted'
                THEN 1 ELSE 0 END AS vis_rank
      FROM actor_calls c
     WHERE c.parent_call_id = p_call_id
    UNION ALL
    SELECT c.id, c.parent_call_id, c.title, c.slug, c.type, c.domain,
           c.the_move, c.taken_on_count, c.active_count, c.actor_id,
           c.visibility, c.lifecycle_state,
           st.raw_depth + 1,
           st.vis_rank + CASE WHEN c.visibility = 'community' AND c.lifecycle_state <> 'deleted'
                              THEN 1 ELSE 0 END
      FROM actor_calls c
      JOIN subtree st ON c.parent_call_id = st.id
     WHERE st.raw_depth < 64                       -- defensive cycle guard
       AND (p_max_depth IS NULL OR st.vis_rank < p_max_depth)
  )
  SELECT st.id, st.parent_call_id, st.title, st.slug, st.type, st.domain,
         st.the_move, st.taken_on_count, st.active_count,
         a.id        AS actor_id,
         a.name      AS actor_name,
         a.image_url AS actor_image_url,
         a.slug      AS actor_slug,
         st.vis_rank AS depth_below_focus
    FROM subtree st
    LEFT JOIN nextus_actors a ON a.id = st.actor_id
   WHERE st.visibility = 'community'
     AND st.lifecycle_state <> 'deleted'
   ORDER BY st.vis_rank ASC, st.taken_on_count DESC;
$$;

GRANT EXECUTE ON FUNCTION challenge_ancestors(uuid)        TO anon, authenticated;
GRANT EXECUTE ON FUNCTION challenge_descendants(uuid, int) TO anon, authenticated;
