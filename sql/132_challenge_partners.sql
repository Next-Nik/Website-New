-- 132_challenge_partners.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- Challenge partners — Phase 2 (June 2026).
--
-- A challenge carries its author in the byline ("Offered by ..."). It may also
-- credit one or more PARTNERS ("... in partnership with ..."). This is an
-- authorship credit, not the co-sign (which counts actors who stand behind a
-- challenge). The two are independent.
--
-- ── The handshake ─────────────────────────────────────────────────────────────
-- A partnership is always consent-gated and can be initiated from either side:
--   • the challenge's author names another actor as partner            → request to that actor
--   • an actor asks to be added as a partner on someone's challenge     → request to the author
-- Nothing appears publicly until the OTHER party accepts. A pending request is
-- visible only to the two parties.
--
-- A partner is an Atlas actor (it needs a profile to send or accept). No cap on
-- the number of partners.
--
-- Ownership gates on nextus_actors.profile_owner ONLY (canonical; there is no
-- owner_id column on nextus_actors).
--
-- Idempotent: safe to re-run after a partial application.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS actor_call_partners (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),

  call_id           uuid NOT NULL REFERENCES actor_calls(id)   ON DELETE CASCADE,
  partner_actor_id  uuid NOT NULL REFERENCES nextus_actors(id) ON DELETE CASCADE,

  status            text NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'accepted', 'declined', 'withdrawn')),

  initiated_by      text NOT NULL
                      CHECK (initiated_by IN ('author', 'partner')),

  requested_by_user uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  responded_by_user uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  responded_at      timestamptz,

  UNIQUE (call_id, partner_actor_id)
);

COMMENT ON TABLE actor_call_partners IS
  'Challenge partner credits. Bidirectional, consent-gated handshake: nothing public until status=accepted. Independent of co-signers.';
COMMENT ON COLUMN actor_call_partners.initiated_by IS
  'author = the call author named this partner (partner accepts). partner = this actor asked to join (author accepts).';

CREATE INDEX IF NOT EXISTS idx_call_partners_call_status
  ON actor_call_partners (call_id, status);
CREATE INDEX IF NOT EXISTS idx_call_partners_partner_status
  ON actor_call_partners (partner_actor_id, status);

ALTER TABLE actor_call_partners ENABLE ROW LEVEL SECURITY;

-- Drop-then-create so the migration is idempotent.
DROP POLICY IF EXISTS "Public read accepted partnerships" ON actor_call_partners;
CREATE POLICY "Public read accepted partnerships"
  ON actor_call_partners FOR SELECT
  USING (status = 'accepted');

DROP POLICY IF EXISTS "Parties read their own partnership rows" ON actor_call_partners;
CREATE POLICY "Parties read their own partnership rows"
  ON actor_call_partners FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (
      -- the call's author (user-authored or owns the authoring actor)
      EXISTS (
        SELECT 1 FROM actor_calls c
        WHERE c.id = actor_call_partners.call_id
          AND (
            c.user_id = auth.uid()
            OR EXISTS (
              SELECT 1 FROM nextus_actors a
              WHERE a.id = c.actor_id
                AND a.profile_owner = auth.uid()
            )
          )
      )
      -- or owns the partner actor
      OR EXISTS (
        SELECT 1 FROM nextus_actors a
        WHERE a.id = actor_call_partners.partner_actor_id
          AND a.profile_owner = auth.uid()
      )
    )
  );
