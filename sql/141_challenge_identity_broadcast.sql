-- 141_challenge_identity_broadcast.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- Per-org identity + author broadcast (June 2026).
--
-- Two net-new builds land here:
--   • author_statement — the one line a challenge's author gets to say in their
--     own voice, rendered italic inside the contained identity panel. The MET
--     frame: the platform owns the wall and the type; the org owns the words.
--   • the broadcast channel — an author writes one update to everyone running
--     their challenge. One way. Taking it on is consent; a mute ends it. A
--     broadcast reaches only that author's own takers and never cascades down
--     the lineage tree, because it is keyed to a single call_id and only that
--     call's participants can read it.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── The author's voice line ───────────────────────────────────────────────────

ALTER TABLE actor_calls
  ADD COLUMN IF NOT EXISTS author_statement text;

COMMENT ON COLUMN actor_calls.author_statement IS
  'One statement in the author''s own voice, shown italic in the contained identity panel. Owner-authored only.';

-- ── Mute (consent is the take-on; this is the off switch) ──────────────────────

ALTER TABLE actor_call_participants
  ADD COLUMN IF NOT EXISTS muted boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN actor_call_participants.muted IS
  'A taker mutes an author''s broadcasts without leaving the run. Default false; taking on is the consent to receive.';

-- ── Broadcasts ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS actor_call_broadcasts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  call_id         uuid NOT NULL REFERENCES actor_calls(id) ON DELETE CASCADE,
  author_user_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body            text NOT NULL,
  send_email      boolean NOT NULL DEFAULT false
);

COMMENT ON TABLE actor_call_broadcasts IS
  'One-way author updates to the takers of a single challenge. No cascade: rows are keyed to one call_id and only that call''s participants may read them.';

CREATE INDEX IF NOT EXISTS idx_call_broadcasts_call_created
  ON actor_call_broadcasts (call_id, created_at DESC);

-- ── RLS ───────────────────────────────────────────────────────────────────────
-- Read: a participant of the call (not muted), or the author. Write: the author
-- of the call only. The API runs as service role and re-checks ownership; these
-- policies cover any direct client access.

ALTER TABLE actor_call_broadcasts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Takers and author read broadcasts" ON actor_call_broadcasts;
CREATE POLICY "Takers and author read broadcasts"
  ON actor_call_broadcasts FOR SELECT
  USING (
    -- the author of the call
    EXISTS (
      SELECT 1 FROM actor_calls c
      WHERE c.id = actor_call_broadcasts.call_id
        AND (c.user_id = auth.uid()
             OR c.actor_id IN (SELECT id FROM nextus_actors WHERE profile_owner = auth.uid()))
    )
    OR
    -- an un-muted participant of that same call (no cascade: same call_id only)
    EXISTS (
      SELECT 1 FROM actor_call_participants p
      WHERE p.call_id = actor_call_broadcasts.call_id
        AND p.user_id = auth.uid()
        AND p.muted = false
    )
  );

DROP POLICY IF EXISTS "Author writes broadcasts" ON actor_call_broadcasts;
CREATE POLICY "Author writes broadcasts"
  ON actor_call_broadcasts FOR INSERT
  WITH CHECK (
    author_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM actor_calls c
      WHERE c.id = actor_call_broadcasts.call_id
        AND (c.user_id = auth.uid()
             OR c.actor_id IN (SELECT id FROM nextus_actors WHERE profile_owner = auth.uid()))
    )
  );
