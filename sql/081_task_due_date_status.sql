-- ─────────────────────────────────────────────────────────────────────────────
-- 081_task_due_date_status.sql
--
-- Adds due_date and status to horizon_practice_thresholds.
--
-- due_date   — when the task should be done (YYYY-MM-DD). NULL = no date set
--              (backlog). Separate from run_date (when it was created).
--
-- status     — 'open' | 'done' | 'someday'
--              open:    active, incomplete
--              done:    completed (completed_at already handles timestamp)
--              someday: no date, no urgency — parked until deliberate action
--
-- priority   — 1 (high) | 2 (medium) | 3 (low). NULL = unprioritised.
--              Reserved for future use; not shown in UI yet.
-- ─────────────────────────────────────────────────────────────────────────────

begin;

alter table public.horizon_practice_thresholds
  add column if not exists due_date  date,
  add column if not exists status    text not null default 'open'
                             check (status in ('open','done','someday')),
  add column if not exists priority  integer check (priority in (1,2,3));

-- Index for efficient today/upcoming queries
create index if not exists hpt_due_date_idx
  on public.horizon_practice_thresholds (user_id, due_date)
  where due_date is not null and status = 'open';

-- Index for backlog (open, no due date)
create index if not exists hpt_backlog_idx
  on public.horizon_practice_thresholds (user_id, created_at)
  where due_date is null and status = 'open';

commit;
