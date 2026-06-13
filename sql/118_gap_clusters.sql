-- ─────────────────────────────────────────────────────────────────────────────
-- 118_gap_clusters.sql
-- Demand-side vocabulary learning — Slice 2: Cluster + Threshold (June 2026).
--
-- Slice 1 captures scrubbed concern-shapes that no live chain could hold into
-- nextsteps_chain_gaps. This migration adds the structure the clustering pass
-- (api/chain-cluster-cron.js) writes into.
--
-- People say the same concern many ways. The cron groups varied phrasings of
-- the same not-yet-named concern semantically (model-batch — no embedding
-- infrastructure needed at this volume). Each cluster accumulates the varied
-- phrasings it absorbs; on promotion (Slice 3) those seed the new chain's
-- aliases, so the next person who says it any of those ways matches instantly.
--
-- A cluster surfaces for review only once 5 DISTINCT PEOPLE stand behind it.
-- The count is of distinct people, not rows, so one person restating
-- themselves cannot manufacture a chain — same honesty instinct as the
-- effort-signal locks.
--
-- Idempotent. Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

begin;

-- ── 1. The clusters ──────────────────────────────────────────────────────────

create table if not exists public.nextsteps_gap_clusters (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  -- Model-produced identity, in away-from grammar (how people speak it).
  label             text not null,
  description       text,
  proposed_slug     text not null,

  -- The varied phrasings the cluster has absorbed. On promotion (Slice 3)
  -- these seed the new chain's aliases.
  aliases           text[] not null default '{}',

  -- Aggregate placement — union / mode of member-gap domains.
  domains           text[] not null default '{}',

  -- Weight. people_count (distinct people) is the threshold metric;
  -- gap_count is the total captured shapes behind it.
  people_count      int not null default 0,
  gap_count         int not null default 0,

  -- Lifecycle.
  --   forming   — below threshold, still accumulating
  --   surfaced  — crossed threshold; a demand proposal was written
  --   promoted  — proposal approved; chain is live (Slice 3)
  --   dismissed — reviewed, not vocabulary-worthy
  status            text not null default 'forming'
                      check (status in ('forming', 'surfaced', 'promoted', 'dismissed')),

  -- The proposal row this cluster surfaced into (reused proposals table).
  proposal_id       uuid references public.nextus_problem_chain_proposals(id) on delete set null,

  last_clustered_at timestamptz
);

create index if not exists idx_gap_clusters_status
  on public.nextsteps_gap_clusters (status);
create index if not exists idx_gap_clusters_slug
  on public.nextsteps_gap_clusters (proposed_slug);


-- ── 2. Close the soft reference from Slice 1 ─────────────────────────────────
-- chain_gaps.cluster_id was created without a FK (the clusters table didn't
-- exist yet). Now it does. Add the constraint, guarded so re-runs are safe.

do $$
begin
  alter table public.nextsteps_chain_gaps
    add constraint nextsteps_chain_gaps_cluster_fk
    foreign key (cluster_id)
    references public.nextsteps_gap_clusters (id)
    on delete set null;
exception
  when duplicate_object then null;
end
$$;


-- ── 3. RLS — internal learning data, service-role only ───────────────────────
-- Written and read only by the service-role cron and admin review. No
-- anon/authenticated policy, so RLS denies all such access while the service
-- role bypasses it. Same posture as chain_gaps (117) and proposals (073).

alter table public.nextsteps_gap_clusters enable row level security;

commit;

-- ── Verification ──────────────────────────────────────────────────────────────
--   select status, count(*) from public.nextsteps_gap_clusters group by status;
--   select label, people_count, gap_count, status
--     from public.nextsteps_gap_clusters order by people_count desc limit 20;
--   -- confirm the FK landed:
--   select conname from pg_constraint where conname = 'nextsteps_chain_gaps_cluster_fk';
--
-- ── Rollback ───────────────────────────────────────────────────────────────────
--   begin;
--   alter table public.nextsteps_chain_gaps
--     drop constraint if exists nextsteps_chain_gaps_cluster_fk;
--   drop table if exists public.nextsteps_gap_clusters;
--   commit;
