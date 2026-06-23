-- 147_challenge_cover_image.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- A face for the challenge (June 2026).
--
-- Migration 142 gave a challenge a longer body and an embedded video. It never
-- gave it an image of its own. The author actor has an avatar; the challenge
-- has nothing. The root of a constellation, in particular, wants to lead with a
-- single image that carries the invitation before a word is read.
--
--   • cover_image_url — a single hero image, shown at the top of the challenge
--                       page above the title. A URL: a path under /public for
--                       platform-authored roots, or a Storage URL once author
--                       upload lands. Square or landscape both render; the page
--                       constrains it to a centred plate, it is never cropped.
--
-- No bucket dependency in this migration. The column takes any URL; the upload
-- flow that writes Storage URLs into it is a separate, later piece.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE actor_calls
  ADD COLUMN IF NOT EXISTS cover_image_url text;

COMMENT ON COLUMN actor_calls.cover_image_url IS
  'Optional hero image for the challenge, shown above the title on the public page. A URL (path under /public or a Storage URL). Constrained to a centred plate on render, never cropped.';
