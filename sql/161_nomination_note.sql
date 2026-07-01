-- 161_nomination_note.sql
-- Supports the human-vouched nomination note (2a). The note is system-sent but
-- carries a community vouch, honours by demonstration (the drafted profile does
-- the work), and offers a real one-click exit. These columns back the exit and
-- the opt-in naming. The 7-day send clock reuses outreach_sent_at (migration 113).
BEGIN;

ALTER TABLE nextus_actors
  ADD COLUMN IF NOT EXISTS decline_token       text,
  ADD COLUMN IF NOT EXISTS declined_at         timestamptz,
  ADD COLUMN IF NOT EXISTS nominator_can_name  boolean NOT NULL DEFAULT false;

-- One-click exit resolves the actor by this token, so it must be unique.
CREATE UNIQUE INDEX IF NOT EXISTS idx_actors_decline_token
  ON nextus_actors(decline_token) WHERE decline_token IS NOT NULL;

COMMENT ON COLUMN nextus_actors.decline_token IS
  'Opaque token in the nomination-note exit link (/remove/:token). One-click take-down.';
COMMENT ON COLUMN nextus_actors.declined_at IS
  'Set when the org used the exit link. Row is also moved to status=suspended so it leaves public view.';
COMMENT ON COLUMN nextus_actors.nominator_can_name IS
  'Opt-in from the nominator: may we name them to the org, turning the vouch from "someone in the community" into a named person.';

COMMIT;
