-- ─────────────────────────────────────────────────────────────────────────────
-- 108_offering_personal_domains.sql
--
-- The smallest possible migration for personal-side domain tagging on
-- offerings. nextus_actor_offerings.domain_ids already exists but holds
-- the CIVILISATIONAL vocabulary (human-being / society / nature / …).
-- Pathways routes in the PERSONAL seven — a separate, owner-entered
-- array keeps the two vocabularies from ever mixing.
--
-- Owner-only law: the extractor never populates offerings — tagging is
-- owner-entered (OrgManage offering form).
-- ─────────────────────────────────────────────────────────────────────────────

begin;

alter table public.nextus_actor_offerings
  add column if not exists personal_domains text[] not null default '{}';

do $$
begin
  if not exists (select 1 from pg_constraint
                 where conname = 'nextus_actor_offerings_personal_domains_check') then
    alter table public.nextus_actor_offerings
      add constraint nextus_actor_offerings_personal_domains_check
      check (personal_domains <@ array[
        'path','spark','body','finances','connection','inner_game','signal'
      ]::text[]);
  end if;
end$$;

create index if not exists nextus_actor_offerings_personal_domains_idx
  on public.nextus_actor_offerings using gin (personal_domains);

comment on column public.nextus_actor_offerings.personal_domains is
  'Personal-side domains this offering serves (path/spark/body/finances/connection/inner_game/signal). Owner-entered only — the extractor never writes this. Pathways reads it to surface accepting practitioners.';

commit;
