-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 064 — iCal feed URL for calendar integration
--
-- Adds ical_url to contributor_profiles_beta so the user can paste their
-- private iCal feed URL once (Google Calendar, Apple Calendar, Outlook,
-- Fastmail, Proton, any CalDAV-compatible source). The Plan beat in
-- Horizon Practice fetches today's events via the server-side ical-proxy
-- endpoint and renders them as selectable thresholds.
--
-- The URL is stored on the user's profile (not per-tool) because calendar
-- access will eventually be useful across the platform — Practice today,
-- possibly Target Sprint and Horizon State scheduling later.
-- ─────────────────────────────────────────────────────────────────────────────

begin;

alter table public.contributor_profiles_beta
  add column if not exists ical_url text;

comment on column public.contributor_profiles_beta.ical_url is
  'Private iCal feed URL (Google Calendar, Apple, Outlook, etc). Stored once, used by Horizon Practice Plan beat and any future scheduling features.';

commit;
