-- 154_push_subscriptions.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- Web push subscriptions (June 2026). No email — these power the beacon's
-- commitment reminders and momentum nudges straight to the device.
--
-- One row per browser/device push endpoint. A user can have several (phone,
-- desktop). Dead endpoints (404/410 on send) are cleaned up by the sender.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint    text NOT NULL UNIQUE,
  p256dh      text NOT NULL,
  auth        text NOT NULL,
  user_agent  text
);

CREATE INDEX IF NOT EXISTS idx_push_subs_user ON push_subscriptions (user_id);

COMMENT ON TABLE push_subscriptions IS
  'Web push endpoints for beacon reminders/nudges. One row per device. Service role writes via api/push-subscribe; dead endpoints removed by the sender.';

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own push subscriptions" ON push_subscriptions;
CREATE POLICY "Users manage own push subscriptions"
  ON push_subscriptions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
