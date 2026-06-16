-- 134_retire_joined_challenge_sessions.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- Retire joined-challenge sessions (June 2026).
--
-- take_on used to create a sibling civ session for every joined challenge so
-- it would render in the Target Stretch tool's Planet Sprint panel. That
-- conflated joined challenges with a person's OWN Planet Sprint and mislabeled
-- personal challenges. /challenges (participation + strand log) is now the sole
-- home, so take_on no longer creates that session.
--
-- This removes the orphaned ones. A taken-on challenge's session is the only
-- kind that carries a challenge_id; a person's own personal stretch and own
-- Planet Sprint both have challenge_id NULL and are left untouched.
-- actor_call_participants.session_id is ON DELETE SET NULL, so participation
-- rows are preserved — they just drop their now-defunct session pointer.
-- ─────────────────────────────────────────────────────────────────────────────

DELETE FROM target_sprint_sessions
WHERE challenge_id IS NOT NULL;
