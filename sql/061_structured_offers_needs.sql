-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 061 — Structured offers/needs + pull tabs + reach-out context
--
-- Extends actor_offers and actor_needs with structured fields that make them
-- comparable, filterable, and matchable against user profiles by scale.
--
-- Adds the pull-tab primitive: nextus_interest_pulls records a single
-- public, identified gesture of interest from a user to an offer or need.
-- The poster (the actor's owner) sees who pulled the tab; the puller sees
-- their pulls in My Interests.
--
-- Adds reference context to messages so a "Reach out" from an offer's
-- card carries the offer reference into the inbox.
--
-- Adds list_offers_matching_user / list_needs_matching_user RPCs that
-- honour the scale principle: items match a user's Active Focus exactly,
-- not by cascade up or down.
-- ─────────────────────────────────────────────────────────────────────────────

begin;

-- ─── 1. New columns on actor_offers ──────────────────────────────────────────

alter table public.actor_offers
  add column if not exists why                text,
  add column if not exists timing             text default 'flexible'
    check (timing in ('ongoing', 'one_time', 'by_date', 'flexible')),
  add column if not exists timing_date        date,
  add column if not exists exchange_type      text default 'not_applicable'
    check (exchange_type in ('paid', 'unpaid', 'volunteer', 'barter', 'mutual', 'not_applicable')),
  add column if not exists compensation_range text,
  add column if not exists format             text
    check (format in ('service', 'consultation', 'asset', 'introduction', 'mentorship', 'collaboration', 'other')),
  add column if not exists urgency            text default 'low'
    check (urgency in ('low', 'medium', 'high')),
  -- The scale this offer is pitched at. References a Focus.
  -- NULL means location-agnostic (matches any Active Focus).
  add column if not exists target_focus_id    uuid references public.nextus_focuses(id) on delete set null;

create index if not exists idx_actor_offers_target_focus
  on public.actor_offers (target_focus_id) where target_focus_id is not null;

create index if not exists idx_actor_offers_timing_urgency
  on public.actor_offers (timing, urgency) where active = true;

-- ─── 2. Same columns on actor_needs ──────────────────────────────────────────

alter table public.actor_needs
  add column if not exists why                text,
  add column if not exists timing             text default 'flexible'
    check (timing in ('ongoing', 'one_time', 'by_date', 'flexible')),
  add column if not exists timing_date        date,
  add column if not exists exchange_type      text default 'not_applicable'
    check (exchange_type in ('paid', 'unpaid', 'volunteer', 'barter', 'mutual', 'not_applicable')),
  add column if not exists compensation_range text,
  add column if not exists format             text
    check (format in ('service', 'consultation', 'asset', 'introduction', 'mentorship', 'collaboration', 'other')),
  add column if not exists urgency            text default 'low'
    check (urgency in ('low', 'medium', 'high')),
  add column if not exists target_focus_id    uuid references public.nextus_focuses(id) on delete set null;

create index if not exists idx_actor_needs_target_focus
  on public.actor_needs (target_focus_id) where target_focus_id is not null;

create index if not exists idx_actor_needs_timing_urgency
  on public.actor_needs (timing, urgency) where active = true;

-- ─── 3. nextus_interest_pulls — the pull tab ─────────────────────────────────
-- A single act of interest from a user toward an offer or need.
-- Identified (not anonymous). One row per (user, target) pair.

create table if not exists public.nextus_interest_pulls (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  target_type  text not null check (target_type in ('offer', 'need')),
  target_id    uuid not null,
  created_at   timestamptz not null default now(),
  unique (user_id, target_type, target_id)
);

create index if not exists idx_interest_pulls_user
  on public.nextus_interest_pulls (user_id, created_at desc);

create index if not exists idx_interest_pulls_target
  on public.nextus_interest_pulls (target_type, target_id);

alter table public.nextus_interest_pulls enable row level security;

-- The puller can see their own pulls
drop policy if exists "users see their own pulls" on public.nextus_interest_pulls;
create policy "users see their own pulls" on public.nextus_interest_pulls
  for select using (auth.uid() = user_id);

-- Owners of the target offer/need can see pulls on their items
drop policy if exists "owners see pulls on their items" on public.nextus_interest_pulls;
create policy "owners see pulls on their items" on public.nextus_interest_pulls
  for select using (
    (target_type = 'offer' and exists (
      select 1 from public.actor_offers o
      join public.nextus_actors a on a.id = o.actor_id
      where o.id = nextus_interest_pulls.target_id
        and a.profile_owner = auth.uid()
    ))
    or
    (target_type = 'need' and exists (
      select 1 from public.actor_needs n
      join public.nextus_actors a on a.id = n.actor_id
      where n.id = nextus_interest_pulls.target_id
        and a.profile_owner = auth.uid()
    ))
  );

-- Users can pull their own (insert)
drop policy if exists "users pull tabs" on public.nextus_interest_pulls;
create policy "users pull tabs" on public.nextus_interest_pulls
  for insert with check (auth.uid() = user_id);

-- Users can release their own (delete)
drop policy if exists "users release their pulls" on public.nextus_interest_pulls;
create policy "users release their pulls" on public.nextus_interest_pulls
  for delete using (auth.uid() = user_id);

-- ─── 4. nextus_messages: reference context ───────────────────────────────────

alter table public.nextus_messages
  add column if not exists reference_type text
    check (reference_type in ('offer', 'need')),
  add column if not exists reference_id   uuid;

create index if not exists idx_messages_reference
  on public.nextus_messages (reference_type, reference_id)
  where reference_type is not null;

-- ─── 5. RPC: pull / release interest ────────────────────────────────────────

create or replace function public.pull_interest(
  p_target_type text,
  p_target_id   uuid
)
returns table (interest_count bigint, pulled boolean) as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Authentication required to express interest';
  end if;
  if p_target_type not in ('offer', 'need') then
    raise exception 'Invalid target type';
  end if;
  -- Verify target exists
  if p_target_type = 'offer' then
    if not exists (select 1 from public.actor_offers where id = p_target_id) then
      raise exception 'Offer not found';
    end if;
  else
    if not exists (select 1 from public.actor_needs where id = p_target_id) then
      raise exception 'Need not found';
    end if;
  end if;
  insert into public.nextus_interest_pulls (user_id, target_type, target_id)
  values (v_user, p_target_type, p_target_id)
  on conflict (user_id, target_type, target_id) do nothing;

  return query select
    (select count(*) from public.nextus_interest_pulls
       where target_type = p_target_type and target_id = p_target_id),
    true;
end;
$$ language plpgsql security definer;

create or replace function public.release_interest(
  p_target_type text,
  p_target_id   uuid
)
returns table (interest_count bigint, pulled boolean) as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then return; end if;
  delete from public.nextus_interest_pulls
  where user_id = v_user and target_type = p_target_type and target_id = p_target_id;

  return query select
    (select count(*) from public.nextus_interest_pulls
       where target_type = p_target_type and target_id = p_target_id),
    false;
end;
$$ language plpgsql security definer;

grant execute on function public.pull_interest(text, uuid) to authenticated;
grant execute on function public.release_interest(text, uuid) to authenticated;

-- ─── 6. RPC: match offers/needs to user at their scale ──────────────────────
-- The scale principle: an offer matches if its target_focus_id equals the
-- user's active focus, OR if target_focus_id is NULL (location-agnostic).
-- No cascade up, no cascade down. Exact scale match.
--
-- Optional filters narrow further: domains, timing, exchange, urgency.

create or replace function public.list_offers_matching_user(
  p_user_id    uuid default null,
  p_domain     text default null,
  p_timing     text default null,
  p_exchange   text default null,
  p_urgency    text default null,
  p_limit      int  default 30
)
returns table (
  id                 uuid,
  actor_id           uuid,
  title              text,
  description        text,
  why                text,
  domains            text[],
  timing             text,
  timing_date        date,
  exchange_type      text,
  compensation_range text,
  format             text,
  urgency            text,
  target_focus_id    uuid,
  location_mode      text,
  location_specifics text,
  actor_name         text,
  actor_slug         text,
  actor_type         text,
  actor_image        text,
  actor_tagline      text,
  interest_count     bigint
) as $$
declare
  v_user uuid := coalesce(p_user_id, auth.uid());
  v_focus_places  uuid[];
  v_focus_domains text[];
begin
  if v_user is not null then
    select focus_place_ids, focus_domain_slugs
      into v_focus_places, v_focus_domains
    from public.nextus_user_focus
    where user_id = v_user;
  end if;

  return query
  select
    o.id, o.actor_id, o.title, o.description, o.why, o.domains,
    o.timing, o.timing_date, o.exchange_type, o.compensation_range,
    o.format, o.urgency, o.target_focus_id, o.location_mode, o.location_specifics,
    a.name, a.slug, a.type, a.image_url, a.tagline,
    (select count(*) from public.nextus_interest_pulls
       where target_type = 'offer' and target_id = o.id) as interest_count
  from public.actor_offers o
  join public.nextus_actors a on a.id = o.actor_id
  where o.active = true
    and a.status = 'live'
    -- SCALE MATCH: an offer matches if:
    --   - the user has no place focus set (sees everything), OR
    --   - the offer is location-agnostic (target_focus_id IS NULL), OR
    --   - the offer's scale matches one of the user's active place focuses exactly
    and (v_focus_places is null
         or array_length(v_focus_places, 1) is null
         or o.target_focus_id is null
         or o.target_focus_id = any(v_focus_places))
    -- DOMAIN MATCH: same principle. If user has domain focuses set, offer must
    -- align with one of them. If the offer has no domains, fall back to its
    -- actor's domains.
    and (v_focus_domains is null
         or array_length(v_focus_domains, 1) is null
         or coalesce(o.domains, a.domains) && v_focus_domains)
    -- Optional discrete filters
    and (p_domain   is null or p_domain = any(coalesce(o.domains, a.domains)))
    and (p_timing   is null or o.timing = p_timing)
    and (p_exchange is null or o.exchange_type = p_exchange)
    and (p_urgency  is null or o.urgency = p_urgency)
  order by
    case o.urgency when 'high' then 1 when 'medium' then 2 else 3 end,
    o.created_at desc
  limit p_limit;
end;
$$ language plpgsql stable security definer;

create or replace function public.list_needs_matching_user(
  p_user_id    uuid default null,
  p_domain     text default null,
  p_timing     text default null,
  p_exchange   text default null,
  p_urgency    text default null,
  p_limit      int  default 30
)
returns table (
  id                 uuid,
  actor_id           uuid,
  title              text,
  description        text,
  why                text,
  domains            text[],
  timing             text,
  timing_date        date,
  exchange_type      text,
  compensation_range text,
  format             text,
  urgency            text,
  target_focus_id    uuid,
  location_mode      text,
  location_specifics text,
  actor_name         text,
  actor_slug         text,
  actor_type         text,
  actor_image        text,
  actor_tagline      text,
  interest_count     bigint
) as $$
declare
  v_user uuid := coalesce(p_user_id, auth.uid());
  v_focus_places  uuid[];
  v_focus_domains text[];
begin
  if v_user is not null then
    select focus_place_ids, focus_domain_slugs
      into v_focus_places, v_focus_domains
    from public.nextus_user_focus
    where user_id = v_user;
  end if;

  return query
  select
    n.id, n.actor_id, n.title, n.description, n.why, n.domains,
    n.timing, n.timing_date, n.exchange_type, n.compensation_range,
    n.format, n.urgency, n.target_focus_id, n.location_mode, n.location_specifics,
    a.name, a.slug, a.type, a.image_url, a.tagline,
    (select count(*) from public.nextus_interest_pulls
       where target_type = 'need' and target_id = n.id) as interest_count
  from public.actor_needs n
  join public.nextus_actors a on a.id = n.actor_id
  where n.active = true
    and a.status = 'live'
    and (v_focus_places is null
         or array_length(v_focus_places, 1) is null
         or n.target_focus_id is null
         or n.target_focus_id = any(v_focus_places))
    and (v_focus_domains is null
         or array_length(v_focus_domains, 1) is null
         or coalesce(n.domains, a.domains) && v_focus_domains)
    and (p_domain   is null or p_domain = any(coalesce(n.domains, a.domains)))
    and (p_timing   is null or n.timing = p_timing)
    and (p_exchange is null or n.exchange_type = p_exchange)
    and (p_urgency  is null or n.urgency = p_urgency)
  order by
    case n.urgency when 'high' then 1 when 'medium' then 2 else 3 end,
    n.created_at desc
  limit p_limit;
end;
$$ language plpgsql stable security definer;

grant execute on function public.list_offers_matching_user(uuid, text, text, text, text, int) to authenticated;
grant execute on function public.list_needs_matching_user(uuid, text, text, text, text, int) to authenticated;

-- ─── 7. RPC: list a user's own interest pulls (My Interests) ────────────────

create or replace function public.my_interests()
returns table (
  pull_id         uuid,
  pull_created_at timestamptz,
  target_type     text,
  target_id       uuid,
  title           text,
  description     text,
  timing          text,
  exchange_type   text,
  urgency         text,
  actor_name      text,
  actor_slug      text,
  actor_image     text,
  active          boolean
) as $$
  select
    p.id, p.created_at, p.target_type, p.target_id,
    coalesce(o.title, n.title),
    coalesce(o.description, n.description),
    coalesce(o.timing, n.timing),
    coalesce(o.exchange_type, n.exchange_type),
    coalesce(o.urgency, n.urgency),
    a.name, a.slug, a.image_url,
    coalesce(o.active, n.active, false)
  from public.nextus_interest_pulls p
  left join public.actor_offers o on p.target_type = 'offer' and o.id = p.target_id
  left join public.actor_needs  n on p.target_type = 'need'  and n.id = p.target_id
  left join public.nextus_actors a on a.id = coalesce(o.actor_id, n.actor_id)
  where p.user_id = auth.uid()
  order by p.created_at desc;
$$ language sql stable security definer;

grant execute on function public.my_interests() to authenticated;

-- ─── 8. RPC: interest count for a specific target (for cards) ───────────────

create or replace function public.interest_count(
  p_target_type text,
  p_target_id   uuid
)
returns table (count bigint, mine boolean) as $$
  select
    (select count(*) from public.nextus_interest_pulls
       where target_type = p_target_type and target_id = p_target_id),
    exists (select 1 from public.nextus_interest_pulls
       where target_type = p_target_type and target_id = p_target_id
       and user_id = auth.uid());
$$ language sql stable security definer;

grant execute on function public.interest_count(text, uuid) to authenticated;

commit;

-- ─── Verification ───────────────────────────────────────────────────────────
-- After running, verify:
--
--   -- Schema additions present
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'actor_offers'
--     AND column_name IN ('why','timing','exchange_type','format','urgency','target_focus_id');
--
--   -- RPCs created
--   SELECT routine_name FROM information_schema.routines
--   WHERE routine_schema = 'public'
--     AND routine_name IN ('pull_interest','release_interest','list_offers_matching_user',
--                          'list_needs_matching_user','my_interests','interest_count');
