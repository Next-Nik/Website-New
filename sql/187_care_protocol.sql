-- 187_care_protocol.sql
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
--   3. Public read is BUILT BUT DARK, and goes through a SECURITY DEFINER
--      FUNCTION, not a table policy. care_card_by_token(text) takes the token
--      as an argument, so possession of the token is the only way to name a
--      row. There is deliberately no anon select policy on care_shares — see
--      the long note above that function for why a policy cannot do this job
--      safely. Both the function and the anon path are gated behind
--      care_public_enabled(), which returns false; when public sharing is
--      wanted, replace that one function with `select true`.

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
  -- Note: care_card_by_token bumps view_count on every anonymous read via the
  -- same UPDATE statement, so the care_shares_touch trigger below also moves
  -- updated_at on every view, not only on a founder edit. Nothing currently
  -- reads updated_at on this table, so that drift is harmless today — flagged
  -- here so a future "last edited" display doesn't get built on top of it
  -- without noticing.
  updated_at     timestamptz not null default now(),
  revoked_at     timestamptz
);

create index if not exists care_shares_user_idx on public.care_shares (user_id);

-- At most one un-revoked share per person. Without this, a double-click on
-- "Create share link" inserts a second live row, the client's .maybeSingle()
-- load then errors, the UI falls back to offering "create" again, and the
-- extra rows are live but unreachable — so they can never be revoked.
create unique index if not exists care_shares_one_live_per_user
  on public.care_shares (user_id)
  where revoked_at is null;

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

-- ── Public side ───────────────────────────────────────────────
--
-- THERE IS DELIBERATELY NO ANON SELECT POLICY ON THIS TABLE.
--
-- A row-level policy cannot scope a read to "the one token the caller asked
-- for". RLS evaluates a predicate per row; the `?token=eq.…` filter is the
-- CLIENT's choice and the client can simply omit it. A policy of the form
--
--   using (care_public_enabled() and is_live and revoked_at is null)
--
-- therefore does not mean "readers may fetch a card by token" — it means
-- "anyone holding the publishable key may enumerate every live card in the
-- table", names, portraits, attachment scores, "Right now" notes and owner
-- UUIDs included. The token would stop being a capability the moment public
-- sharing was switched on.
--
-- The correct shape is a security-definer function that takes the token as an
-- argument, so possession of the token is the only way to name a row.

drop policy if exists "care_shares public read when enabled" on public.care_shares;

create or replace function public.care_card_by_token(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  row_card       jsonb;
  row_show_right boolean;
begin
  if not public.care_public_enabled() then
    return null;
  end if;

  -- A short token is never legitimate and should not reach the index.
  if p_token is null or length(p_token) < 16 then
    return null;
  end if;

  -- Bump view_count and read back the row in one statement, so a concurrent
  -- reader can never observe the row between the select and the update and
  -- lose a count. The column existed since the first migration but nothing
  -- ever wrote to it — a share panel showing "0 views" forever regardless of
  -- real traffic is worse than not showing a count at all.
  update public.care_shares
     set view_count = view_count + 1
   where token = p_token
     and is_live
     and revoked_at is null
  returning card, show_right_now into row_card, row_show_right;

  if not found then
    return null;
  end if;

  -- Honour the per-share toggle HERE rather than in the client, so a reader
  -- who calls the endpoint directly cannot read a hidden "Right now" out of
  -- the raw JSON.
  if not coalesce(row_show_right, true) then
    row_card := row_card - 'rightNow';
  end if;

  return jsonb_build_object('card', row_card, 'show_right_now', coalesce(row_show_right, true));
end
$$;

revoke all on function public.care_card_by_token(text) from public;
grant execute on function public.care_card_by_token(text) to anon, authenticated;

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
