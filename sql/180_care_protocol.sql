-- 180_care_protocol.sql
--
-- The Care Protocol: a needs-communication tool that turns birth data and a
-- short assessment run into a shareable "Care Card".
--
-- SECURITY MODEL — three layers, and the important one is here, not in the UI.
--
--   1. care_profiles is founder-only, exactly like movie_magic (163). Every
--      operation requires BOTH ownership (auth.uid() = user_id) AND
--      is_founder() (app_metadata only, server-set). The page is unlinked and
--      UI-gated as well, but that is convenience, not enforcement.
--
--   2. care_shares carries a RENDERED CARD SNAPSHOT, not a foreign key into
--      care_profiles. This is deliberate. A public reader must never be able
--      to reach the profile row, because the profile row holds birth time and
--      birth coordinates — which are, between them, close to identifying and
--      are the last thing anyone should leak from a product about intimacy.
--      The snapshot holds only what the card face displays.
--
--   3. Public read is BUILT BUT DARK. The anon policy exists and is correct,
--      but it is gated behind care_public_enabled(), which returns false. The
--      Care Protocol ships hidden for testing; when public sharing is wanted,
--      replace that one function with `select true` and the route lights up
--      with no other change. Nothing is publicly readable before then.

-- ── is_founder() ──────────────────────────────────────────────
-- Idempotent: identical to the definition in 148/156/163. Safe in any order.
create or replace function public.is_founder()
returns boolean
language sql
stable
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'founder', false)
$$;

-- ── care_public_enabled() ─────────────────────────────────────
-- THE SWITCH. False means no anonymous read of any shared card, regardless of
-- the is_live flag on the row. Flip to `select true` to open public sharing.
create or replace function public.care_public_enabled()
returns boolean
language sql
immutable
as $$
  select false
$$;

-- ── care_profiles ─────────────────────────────────────────────
-- One row per person. Birth data plus the computed chart, the human design
-- output, every instrument response, the AI synthesis, and the living
-- "Right now" note.
create table if not exists public.care_profiles (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  display_name  text,
  card_number   integer not null default 1,

  -- Birth data. Sensitive: time and coordinates together are near-identifying.
  -- Never exposed beyond the owning founder; the public snapshot excludes it.
  birth_date    date,
  birth_time    time,
  birth_place   text,
  birth_lat     double precision,
  birth_lon     double precision,
  birth_unknown_time boolean not null default false,

  -- Computed layers, cached so we never repeat ~200ms of ephemeris work.
  chart         jsonb not null default '{}'::jsonb,
  human_design  jsonb not null default '{}'::jsonb,
  extras        jsonb not null default '{}'::jsonb,

  -- Flat map of item id to response, across every instrument.
  responses     jsonb not null default '{}'::jsonb,

  -- Output of api/care-synthesis.js: wired portrait, convergences, tensions.
  synthesis     jsonb not null default '{}'::jsonb,

  -- The only living section of the card.
  right_now     jsonb not null default '{}'::jsonb,

  engine_version text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.care_profiles enable row level security;

drop policy if exists "care_profiles owner founder select" on public.care_profiles;
create policy "care_profiles owner founder select"
  on public.care_profiles
  for select
  using (auth.uid() = user_id and public.is_founder());

drop policy if exists "care_profiles owner founder insert" on public.care_profiles;
create policy "care_profiles owner founder insert"
  on public.care_profiles
  for insert
  with check (auth.uid() = user_id and public.is_founder());

drop policy if exists "care_profiles owner founder update" on public.care_profiles;
create policy "care_profiles owner founder update"
  on public.care_profiles
  for update
  using (auth.uid() = user_id and public.is_founder())
  with check (auth.uid() = user_id and public.is_founder());

drop policy if exists "care_profiles owner founder delete" on public.care_profiles;
create policy "care_profiles owner founder delete"
  on public.care_profiles
  for delete
  using (auth.uid() = user_id and public.is_founder());

-- ── care_shares ───────────────────────────────────────────────
-- Tokenised partner links. `card` is a rendered snapshot: the card face and
-- nothing else. No birth time, no coordinates, no raw instrument responses.
create table if not exists public.care_shares (
  token          text primary key,
  user_id        uuid not null references auth.users(id) on delete cascade,
  card           jsonb not null default '{}'::jsonb,
  is_live        boolean not null default false,
  show_right_now boolean not null default true,
  view_count     integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  revoked_at     timestamptz
);

create index if not exists care_shares_user_idx on public.care_shares (user_id);

alter table public.care_shares enable row level security;

-- Owner side: the founder manages their own share links.
drop policy if exists "care_shares owner founder select" on public.care_shares;
create policy "care_shares owner founder select"
  on public.care_shares
  for select
  using (auth.uid() = user_id and public.is_founder());

drop policy if exists "care_shares owner founder insert" on public.care_shares;
create policy "care_shares owner founder insert"
  on public.care_shares
  for insert
  with check (auth.uid() = user_id and public.is_founder());

drop policy if exists "care_shares owner founder update" on public.care_shares;
create policy "care_shares owner founder update"
  on public.care_shares
  for update
  using (auth.uid() = user_id and public.is_founder())
  with check (auth.uid() = user_id and public.is_founder());

drop policy if exists "care_shares owner founder delete" on public.care_shares;
create policy "care_shares owner founder delete"
  on public.care_shares
  for delete
  using (auth.uid() = user_id and public.is_founder());

-- Public side: BUILT BUT DARK. care_public_enabled() is false, so this policy
-- currently grants nothing to anyone. Every other condition is already correct
-- so that going live is a one-function change and not a security redesign.
drop policy if exists "care_shares public read when enabled" on public.care_shares;
create policy "care_shares public read when enabled"
  on public.care_shares
  for select
  to anon, authenticated
  using (
    public.care_public_enabled()
    and is_live
    and revoked_at is null
  );

-- ── updated_at ────────────────────────────────────────────────
create or replace function public.care_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end
$$;

drop trigger if exists care_profiles_touch on public.care_profiles;
create trigger care_profiles_touch
  before update on public.care_profiles
  for each row execute function public.care_touch_updated_at();

drop trigger if exists care_shares_touch on public.care_shares;
create trigger care_shares_touch
  before update on public.care_shares
  for each row execute function public.care_touch_updated_at();
