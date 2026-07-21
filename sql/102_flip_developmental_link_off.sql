-- ─────────────────────────────────────────────────────────────────────────────
-- Patch 102 — Flip dormant show_developmental_link flag off on Nik's row
--
-- The bridge feature was removed from the public practitioner page and from
-- OrgManage (May 2026). The schema column lingers as dormant. This patch
-- flips Nik's value back to the default `false` for cleanliness — nothing
-- reads the column anymore, so this is bookkeeping rather than behavior.
--
-- Optional: run if you want a clean row. Not required for anything to work.
-- ─────────────────────────────────────────────────────────────────────────────

begin;

update public.nextus_actors
   set show_developmental_link = false
 where slug = 'nik-wood';

commit;

-- Verify:
-- select slug, show_developmental_link from public.nextus_actors where slug = 'nik-wood';
