-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 073 — Problem-chain proposals (vocabulary grows from seeding)
--
-- When the extractor (api/org-extract.js) seeds an actor whose core
-- problem-shape has no honest match in the controlled problem-chain
-- vocabulary (nextus_problem_chains), it proposes a NEW chain rather than
-- force-fitting an existing one or leaving the actor untagged.
--
-- Those proposals land here, linked to the actor they surfaced from, for
-- admin review. A proposal is never auto-applied to an actor and never
-- auto-promoted into nextus_problem_chains — an admin approves it, which is
-- when the chain becomes real and matchable.
--
-- This is the mechanism by which the vocabulary grows from real seeding
-- (e.g. a 'political-exclusion' chain surfacing the first time an org like
-- electHER Now is seeded) instead of being guessed in advance.
--
-- Idempotent. Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

begin;

create table if not exists public.nextus_problem_chain_proposals (
  id             uuid primary key default gen_random_uuid(),

  -- Proposed chain definition (mirrors the shape of nextus_problem_chains).
  -- proposed_slug is NOT a foreign key — the chain does not exist yet.
  proposed_slug  text not null,
  label          text not null,
  description    text,
  domains        text[] not null default '{}',
  aliases        text[] not null default '{}',

  -- Why no existing chain fit — the extractor's one-line justification.
  rationale      text,

  -- The actor this proposal surfaced from (context for the reviewing admin).
  actor_id       uuid references public.nextus_actors(id) on delete set null,

  -- Who triggered the seeding that produced this proposal.
  proposed_by    uuid references auth.users(id) on delete set null,

  -- Lifecycle. On 'approved', an admin promotes the chain into
  -- nextus_problem_chains (a separate, deliberate action).
  status         text not null default 'pending'
                   check (status in ('pending', 'approved', 'rejected')),

  reviewed_by    uuid references auth.users(id) on delete set null,
  reviewed_at    timestamptz,

  created_at     timestamptz not null default now()
);

create index if not exists idx_problem_chain_proposals_status
  on public.nextus_problem_chain_proposals (status);

create index if not exists idx_problem_chain_proposals_slug
  on public.nextus_problem_chain_proposals (proposed_slug);

create index if not exists idx_problem_chain_proposals_actor
  on public.nextus_problem_chain_proposals (actor_id);


-- ── RLS ────────────────────────────────────────────────────────────────────
-- Mirror the flags pattern (035): authenticated users insert their own rows;
-- a proposer can read their own. Admin review reads/writes via the service
-- role, which bypasses RLS — so no admin-specific policy is asserted here
-- (there is no canonical is_admin() predicate to depend on).

alter table public.nextus_problem_chain_proposals enable row level security;

drop policy if exists "authenticated insert own proposals"
  on public.nextus_problem_chain_proposals;
create policy "authenticated insert own proposals"
  on public.nextus_problem_chain_proposals
  for insert
  with check (proposed_by is null or auth.uid() = proposed_by);

drop policy if exists "proposer reads own proposals"
  on public.nextus_problem_chain_proposals;
create policy "proposer reads own proposals"
  on public.nextus_problem_chain_proposals
  for select
  using (auth.uid() = proposed_by);

commit;

-- ── Verification (run manually) ──────────────────────────────────────────────
-- select count(*) from public.nextus_problem_chain_proposals;
-- select proposed_slug, label, status, actor_id
--   from public.nextus_problem_chain_proposals
--   order by created_at desc limit 10;
