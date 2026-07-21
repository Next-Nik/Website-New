-- ─────────────────────────────────────────────────────────────────────────────
-- 121_practice_standing.sql
-- Best Practices — the standing model (June 2026).
--
-- Eliminated options can't vanish. An invisible "no" gets re-proposed forever;
-- the world runs on folklore about what "doesn't work" because nobody kept the
-- reasoning. So every issue shows three bands: the best, the viable
-- alternatives, and the not-viable. All judged bands are backed up, never just
-- asserted.
--
-- The viable / not-viable line is the GRACE GATE, not the statistical break:
--   - alternative — passed the gates (toward the Horizon Goal, within the human
--     constraint), but ranks lower: slower, costlier, no harm to the cause.
--     "All the power to you" lives across this whole band.
--   - ruled_out — failed a gate: counterproductive or graceless. Shown with the
--     backed-up reason, but "all the power to you" never extends here.
--
-- Reconsideration exists but the bar is a substantive change, never a debate.
-- reconsideration_open defaults true (a genuine tweak can reopen it); the
-- settled-bad get it set false, and the system declines to reopen them. That is
-- how "we don't relitigate flat earth" becomes structural.
--
-- DIGNITY: the not-viable band shows the practice and the reason — never the
-- actors doing it. Naming them would be a ranking-by-shame and trips the
-- honesty locks. Ruled-out shows the what and the why, never the who. So tier
-- and embodiment visibility stays gated to best/alternative only.
--
-- Additive and idempotent. Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

begin;

-- ── 1. Standing columns ───────────────────────────────────────────────────────
-- `standing` is the display band (judgment outcome), distinct from `status`
-- (pipeline state). status tracks where a practice is in scoring; standing is
-- which section a person sees it in.

alter table public.nextus_practices
  add column if not exists standing             text not null default 'unjudged',
  add column if not exists standing_rationale   text,
  add column if not exists standing_sources     text[] not null default '{}',
  add column if not exists reconsideration_open boolean not null default true;

do $$ begin
  alter table public.nextus_practices
    add constraint nextus_practices_standing_check
    check (standing in ('best','alternative','ruled_out','unjudged'));
exception when duplicate_object then null; end $$;

create index if not exists idx_practices_standing on public.nextus_practices (standing);


-- ── 2. Visibility moves from "established only" to "any judged band" ───────────
-- The Issue View shows best, alternative, and ruled_out. Unjudged candidates
-- stay private (admin/service only).

drop policy if exists nextus_practices_public_read on public.nextus_practices;
create policy nextus_practices_public_read
  on public.nextus_practices for select
  using (standing in ('best','alternative','ruled_out'));


-- ── 3. Tiers and actor names: best/alternative only, never ruled_out ──────────
-- A ruled-out idea has no "how to do it well" ladder to show, and the actors
-- doing it are never named. Tier and embodiment visibility is gated to the
-- adoptable bands.

drop policy if exists nextus_practice_tiers_public_read on public.nextus_practice_tiers;
create policy nextus_practice_tiers_public_read
  on public.nextus_practice_tiers for select
  using (exists (
    select 1 from public.nextus_practices p
    where p.id = practice_id and p.standing in ('best','alternative')
  ));

drop policy if exists nextus_practice_embodiments_public_read on public.nextus_practice_embodiments;
create policy nextus_practice_embodiments_public_read
  on public.nextus_practice_embodiments for select
  using (confirmed = true and exists (
    select 1 from public.nextus_practices p
    where p.id = practice_id and p.standing in ('best','alternative')
  ));

commit;

-- ── Verification ──────────────────────────────────────────────────────────────
--   select standing, count(*) from public.nextus_practices group by standing;
--   select name, standing, reconsideration_open from public.nextus_practices
--     where standing = 'ruled_out';
--
-- ── Rollback ───────────────────────────────────────────────────────────────────
--   begin;
--   alter table public.nextus_practices
--     drop column if exists standing,
--     drop column if exists standing_rationale,
--     drop column if exists standing_sources,
--     drop column if exists reconsideration_open;
--   -- (re-run 120's policy block to restore status-based visibility if needed)
--   commit;
