-- ─────────────────────────────────────────────────────────────────────────────
-- 079_threshold_task_completion.sql
--
-- Adds task completion and carryover support to horizon_practice_thresholds.
--
-- completed_at  — when the user ticked the task done. Distinct from crossed_at
--                 (which triggers the mid-day Horizon Self Refresh). A task can
--                 be crossed without being complete, and completed without being
--                 crossed first.
--
-- carried_from_id — uuid of the source threshold row from a prior day. Present
--                   when a task was silently rolled forward from yesterday.
--                   NULL for tasks set fresh in the morning Plan beat.
-- ─────────────────────────────────────────────────────────────────────────────

begin;

alter table public.horizon_practice_thresholds
  add column if not exists completed_at    timestamptz,
  add column if not exists carried_from_id uuid references public.horizon_practice_thresholds(id) on delete set null;

create index if not exists horizon_practice_thresholds_carried_idx
  on public.horizon_practice_thresholds (carried_from_id)
  where carried_from_id is not null;

commit;
