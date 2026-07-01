-- 160_challenge_invites.sql
-- Relational invite flow. A member invites an organisation to take part.
-- The member sends the drafted message themselves, from their own email —
-- NextUs never contacts an org that has not heard of it. Nothing is authored
-- in the org's name; this record is purely the relationship, resolved by the
-- unguessable token on the invitation landing (/i/:token).
--
-- Single transaction. Idempotent.
BEGIN;

CREATE TABLE IF NOT EXISTS challenge_invites (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token             text NOT NULL UNIQUE,           -- capability in the landing link
  inviter_user_id   uuid NOT NULL,                  -- who is reaching out
  inviter_name      text,                           -- shown on the landing ("X invited you")
  actor_id          uuid NOT NULL REFERENCES nextus_actors(id) ON DELETE CASCADE,
  challenge_id      uuid,                            -- optional; usually null (relational)
  context_label     text,                           -- "the Nature constellation", a challenge title, etc.
  message           text,                            -- the drafted message the member sent
  status            text NOT NULL DEFAULT 'sent',    -- sent | claimed | declined
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_challenge_invites_actor   ON challenge_invites(actor_id);
CREATE INDEX IF NOT EXISTS idx_challenge_invites_inviter ON challenge_invites(inviter_user_id);

ALTER TABLE challenge_invites ENABLE ROW LEVEL SECURITY;

-- Landing must resolve without auth; the token is the capability and the row
-- carries no sensitive data beyond the inviter's chosen display name.
DROP POLICY IF EXISTS challenge_invites_select ON challenge_invites;
CREATE POLICY challenge_invites_select ON challenge_invites
  FOR SELECT USING (true);

-- An authenticated member may create an invite, and only as themselves.
DROP POLICY IF EXISTS challenge_invites_insert ON challenge_invites;
CREATE POLICY challenge_invites_insert ON challenge_invites
  FOR INSERT WITH CHECK (inviter_user_id = auth.uid());

-- The inviter may update their own invite's status (e.g. mark withdrawn).
DROP POLICY IF EXISTS challenge_invites_update ON challenge_invites;
CREATE POLICY challenge_invites_update ON challenge_invites
  FOR UPDATE USING (inviter_user_id = auth.uid());

COMMIT;
