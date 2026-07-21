-- 155_ask_details.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- "How to complete this" for asks (June 2026). Free text the org provides so a
-- contributor can act directly: e-transfer or bank details for money, a shipping
-- address for materials, a link, instructions. NextUs does not route the money
-- or the goods; it surfaces the org's own details and the contributor deals with
-- them directly. Revealed once someone has accepted the ask.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE actor_calls ADD COLUMN IF NOT EXISTS ask_details text;

COMMENT ON COLUMN actor_calls.ask_details IS
  'How to complete an ask, contributor-facing: bank/e-transfer details, shipping address, link, or instructions. Surfaced after a contributor accepts; NextUs does not custody funds or goods.';
