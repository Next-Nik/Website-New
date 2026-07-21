-- ─────────────────────────────────────────────────────────────────────────────
-- 122_embodiment_declined.sql
-- Best Practices — Slice 4: owner consent needs a remembered "no."
--
-- An owner can confirm a proposed embodiment ("yes, we do this") or decline it.
-- A decline must persist, not just delete the row — otherwise the extractor
-- re-proposes the same practice next pass and the owner is asked again forever.
-- Same retention instinct as the chain-gap corpus: a "no" is information.
--
-- Pending  = confirmed false, declined false
-- Confirmed = confirmed true,  declined false
-- Declined  = confirmed false, declined true
--
-- Public read already requires confirmed = true, so declined rows never surface
-- publicly. The persist endpoint skips re-linking where any embodiment row
-- already exists, so a decline blocks re-proposal.
--
-- Additive and idempotent.
-- ─────────────────────────────────────────────────────────────────────────────

begin;

alter table public.nextus_practice_embodiments
  add column if not exists declined boolean not null default false;

create index if not exists idx_practice_embodiments_declined
  on public.nextus_practice_embodiments (declined);

commit;

-- ── Rollback ───────────────────────────────────────────────────────────────────
--   alter table public.nextus_practice_embodiments drop column if exists declined;
