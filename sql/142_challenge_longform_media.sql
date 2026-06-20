-- 142_challenge_longform_media.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- Room to say more (June 2026).
--
-- A challenge has a short move and a one-line voice statement. The root of a
-- constellation, and many richer challenges, need more: a longer piece in the
-- author's own hand, and a video that carries the invitation better than text.
--
--   • body_long — free prose, rendered as paragraphs beneath the move.
--   • video_url — a YouTube or Vimeo link, embedded responsively on the page.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE actor_calls
  ADD COLUMN IF NOT EXISTS body_long text,
  ADD COLUMN IF NOT EXISTS video_url text;

COMMENT ON COLUMN actor_calls.body_long IS
  'A longer piece in the author''s voice, shown as paragraphs on the challenge page.';
COMMENT ON COLUMN actor_calls.video_url IS
  'Optional YouTube or Vimeo link, embedded on the challenge page.';
