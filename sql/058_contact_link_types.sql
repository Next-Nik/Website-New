-- 058_contact_link_types.sql
--
-- Broadens actor_links.link_type CHECK constraint to recognise contact-
-- specific link types: email, contact_form, calendly.
--
-- Why: The Atlas needs to surface how to reach a practitioner or org.
-- Until those connections live in-platform, contact lives outside —
-- a mailto, a contact form on their site, or a Calendly link.
--
-- Idempotent. Safe to re-run.

begin;

-- Drop the existing CHECK constraint (must be done before re-adding it broadened)
alter table public.actor_links
  drop constraint if exists actor_links_link_type_check;

-- Add the broadened constraint
alter table public.actor_links
  add constraint actor_links_link_type_check
  check (link_type in (
    -- Original web/social/media types
    'website',
    'podcast_rss',
    'podcast_apple',
    'podcast_spotify',
    'youtube_channel',
    'youtube_video',
    'vimeo',
    'substack',
    'newsletter',
    'instagram',
    'twitter',
    'tiktok',
    'facebook',
    'linkedin',
    'medium',
    'github',
    'book',
    -- Contact-specific link types (new in 058)
    'email',
    'contact_form',
    'calendly',
    'phone',
    -- Fallback
    'other'
  ));

commit;

-- Verification:
--   SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
--   WHERE conname = 'actor_links_link_type_check';
