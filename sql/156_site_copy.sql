-- 156_site_copy.sql (renumbered from 152 to resolve collision with 152_constellation_beacon.sql)
--
-- Founder-editable site copy. Every editable string on the public site is
-- registered in code with a stable id and a built-in default. This table holds
-- only the founder's *overrides* — a row exists for an id only once it has been
-- edited away from its default. The site reads overrides at load and falls back
-- to the in-code default for anything not present here, so an empty table is a
-- perfectly working site.
--
-- SECURITY MODEL:
-- Reads are public (this is public-facing copy). Writes are founder-only,
-- enforced here at the database via is_founder(), which trusts ONLY app_metadata
-- (server-set, not changeable from the client). is_founder() is (re)defined here
-- so this migration is self-contained and does not depend on 148 having run.

-- ── is_founder() ──────────────────────────────────────────────
-- Idempotent: identical to the definition in 148. Safe to run either order.
create or replace function public.is_founder()
returns boolean
language sql
stable
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'founder', false)
$$;

-- ── site_copy ─────────────────────────────────────────────────
create table if not exists public.site_copy (
  id          text primary key,                 -- matches the registry id in code
  value       text not null,                    -- the founder's override text
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users(id)
);

alter table public.site_copy enable row level security;

-- Public read: the copy is shown to signed-out visitors.
drop policy if exists "site_copy public read" on public.site_copy;
create policy "site_copy public read"
  on public.site_copy
  for select
  using (true);

-- Founder write: insert / update / delete, founder only.
drop policy if exists "site_copy founder insert" on public.site_copy;
create policy "site_copy founder insert"
  on public.site_copy
  for insert
  with check (public.is_founder());

drop policy if exists "site_copy founder update" on public.site_copy;
create policy "site_copy founder update"
  on public.site_copy
  for update
  using      (public.is_founder())
  with check (public.is_founder());

drop policy if exists "site_copy founder delete" on public.site_copy;
create policy "site_copy founder delete"
  on public.site_copy
  for delete
  using (public.is_founder());
