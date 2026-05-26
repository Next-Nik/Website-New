-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 067 — actor_testimonials
--
-- Unified testimonials primitive across all actor types.
-- Owner-curated, owner-entered. The flag system handles abuse.
--
-- v1: source_mode is always 'owner_entered'. The 'requested' mode (where a
-- client writes and approves their own testimonial) is reserved for a future
-- build but the column is present now so the schema doesn't need to change
-- when that feature ships.
--
-- The attribution field is freeform — the actor decides how to identify the
-- person whose words these are: full name, initials, role, "anonymous". No
-- platform-imposed naming rules.
-- ─────────────────────────────────────────────────────────────────────────────

begin;

create table if not exists public.actor_testimonials (
  id            uuid primary key default gen_random_uuid(),
  actor_id      uuid not null references public.nextus_actors(id) on delete cascade,

  quote         text not null,
  attribution   text,
  context       text,

  source_mode   text not null default 'owner_entered'
    check (source_mode in ('owner_entered', 'requested')),

  featured      boolean not null default false,
  sort_order    integer not null default 0,
  active        boolean not null default true,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_actor_testimonials_actor
  on public.actor_testimonials (actor_id, active, sort_order);

create index if not exists idx_actor_testimonials_featured
  on public.actor_testimonials (actor_id, featured)
  where featured = true and active = true;

alter table public.actor_testimonials enable row level security;

-- Public read of active testimonials
drop policy if exists "Active testimonials are public" on public.actor_testimonials;
create policy "Active testimonials are public"
  on public.actor_testimonials for select
  using (active = true);

-- Owners can read all their own (including inactive/drafts)
drop policy if exists "Owners read all their testimonials" on public.actor_testimonials;
create policy "Owners read all their testimonials"
  on public.actor_testimonials for select
  using (
    actor_id in (
      select id from public.nextus_actors where profile_owner = auth.uid()
    )
  );

-- Owners manage their testimonials
drop policy if exists "Owners manage their testimonials" on public.actor_testimonials;
create policy "Owners manage their testimonials"
  on public.actor_testimonials for all
  using (
    actor_id in (
      select id from public.nextus_actors where profile_owner = auth.uid()
    )
  )
  with check (
    actor_id in (
      select id from public.nextus_actors where profile_owner = auth.uid()
    )
  );

-- updated_at maintenance
create or replace function public.actor_testimonials_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists actor_testimonials_updated_at on public.actor_testimonials;
create trigger actor_testimonials_updated_at
  before update on public.actor_testimonials
  for each row execute function public.actor_testimonials_set_updated_at();

comment on table public.actor_testimonials is
  'Owner-curated testimonials for any actor type. v1: source_mode always owner_entered. Trust default + flag system.';

commit;
