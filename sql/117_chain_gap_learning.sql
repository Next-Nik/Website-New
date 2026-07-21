-- ─────────────────────────────────────────────────────────────────────────────
-- 117_chain_gap_learning.sql
-- Demand-side vocabulary learning — Slice 1: Foundation + Capture (June 2026).
--
-- The problem-chain vocabulary has only ever grown from the SUPPLY side: the
-- extractor (api/org-extract.js) proposes a chain when it seeds an actor with
-- no honest match, and an admin promotes it (073). The DEMAND side learned
-- nothing. When a real person walked into NextSteps with an away-from concern
-- the vocabulary could not hold, the chat was told to return an empty chain
-- array and move on. The miss was dropped.
--
-- That miss is the most valuable signal the system can collect: a concern the
-- world has no shared language for yet, spoken by the person living inside it.
-- This migration captures it.
--
-- When NextSteps detects a clear away-from concern that no live chain matched
-- (chain_gap), the reflection produces a PII-scrubbed concern-shape and the
-- track endpoint writes it here. The verbatim original_concern on the track is
-- NEVER touched — it stays the person's own record. The scrub is hygiene
-- (de-identification at capture), not consent: learning from usage is covered
-- by the Terms of Use, and a concern-shape with the person stripped out is no
-- longer their personal information.
--
-- Two additions:
--   1. nextsteps_chain_gaps           — the captured, scrubbed miss corpus.
--   2. nextus_problem_chain_proposals — gains a `source` discriminator
--      (supply | demand) plus demand-side evidence columns, so the cluster
--      pass (Slice 2) reuses the existing proposal / review / promote rails
--      (073 + AdminConsole Add tab) instead of a parallel surface.
--
-- Idempotent. Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

begin;

-- ── 1. The captured miss corpus ──────────────────────────────────────────────

create table if not exists public.nextsteps_chain_gaps (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),

  -- The de-identified, normalised away-from shape. NOT the verbatim concern.
  -- Names, specific places, employers, named people, and incidental personal
  -- details are stripped upstream (in the reflection) before this is written.
  concern_shape   text not null,

  -- Where the concern landed, for cluster scoping. domains mirror the civ
  -- domain keys on nextsteps_tracks. v1 captures the civ scale only.
  domains         text[] not null default '{}',
  scale           text not null default 'civ' check (scale in ('civ', 'self')),

  -- Provenance. The track this surfaced from (context only; nullable so a
  -- deleted track does not erase the learning signal). user_id supports the
  -- distinct-PERSON threshold in Slice 2 — clusters count distinct people, not
  -- rows, so one person restating themselves cannot manufacture a cluster.
  track_id        uuid references public.nextsteps_tracks(id) on delete set null,
  user_id         uuid references auth.users(id)             on delete set null,

  -- Lifecycle.
  --   pending    — captured, not yet clustered
  --   clustered  — assigned to a cluster (Slice 2)
  --   promoted   — its cluster became a live chain (Slice 3)
  --   dismissed  — reviewed, not vocabulary-worthy
  status          text not null default 'pending'
                    check (status in ('pending', 'clustered', 'promoted', 'dismissed')),

  -- Soft reference to the cluster. Deliberately NOT a foreign key yet — it
  -- mirrors the no-FK pattern on nextsteps_tracks.problem_chains (a referenced
  -- row may not exist or may be retired). The clusters table and its FK land
  -- with Slice 2.
  cluster_id      uuid
);

create index if not exists idx_chain_gaps_status
  on public.nextsteps_chain_gaps (status);
create index if not exists idx_chain_gaps_cluster
  on public.nextsteps_chain_gaps (cluster_id);
create index if not exists idx_chain_gaps_user
  on public.nextsteps_chain_gaps (user_id);
create index if not exists idx_chain_gaps_created
  on public.nextsteps_chain_gaps (created_at);
create index if not exists idx_chain_gaps_domains
  on public.nextsteps_chain_gaps using gin (domains);


-- ── 2. RLS — internal learning data, service-role only ───────────────────────
-- These rows are never user-facing. They are written by the service-role
-- track endpoint (api/nextsteps-track.js) and read by the clustering pass and
-- admin review (both service-role). No anon/authenticated policy is asserted,
-- so RLS denies all such access while the service role bypasses it. Same
-- posture as the proposals table (073).

alter table public.nextsteps_chain_gaps enable row level security;


-- ── 3. Demand-side reuse of the proposals table ──────────────────────────────
-- Slice 2 writes demand clusters into the SAME proposals table the extractor
-- already uses, so Slice 3 reuses the AdminConsole Add-tab review/promote UI.
-- A discriminator separates the two origins; evidence columns carry the
-- cluster's weight (how many distinct people, sample phrasings) so a reviewing
-- admin sees real demand, not a single guess. Existing rows backfill to
-- 'supply' via the column default.

alter table public.nextus_problem_chain_proposals
  add column if not exists source text not null default 'supply'
    check (source in ('supply', 'demand'));

alter table public.nextus_problem_chain_proposals
  add column if not exists people_count int;

alter table public.nextus_problem_chain_proposals
  add column if not exists sample_shapes text[] not null default '{}';

alter table public.nextus_problem_chain_proposals
  add column if not exists cluster_id uuid;

create index if not exists idx_problem_chain_proposals_source
  on public.nextus_problem_chain_proposals (source);

commit;

-- ── Verification ──────────────────────────────────────────────────────────────
--   select count(*) from public.nextsteps_chain_gaps;
--   select column_name, data_type from information_schema.columns
--     where table_name = 'nextus_problem_chain_proposals' and column_name in
--       ('source','people_count','sample_shapes','cluster_id');
--   -- confirm existing proposals defaulted to supply:
--   select source, count(*) from public.nextus_problem_chain_proposals group by source;
--
-- ── Rollback ───────────────────────────────────────────────────────────────────
--   begin;
--   drop table if exists public.nextsteps_chain_gaps;
--   alter table public.nextus_problem_chain_proposals
--     drop column if exists source,
--     drop column if exists people_count,
--     drop column if exists sample_shapes,
--     drop column if exists cluster_id;
--   commit;
