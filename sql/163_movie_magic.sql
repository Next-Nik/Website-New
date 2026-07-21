-- 163_movie_magic.sql
--
-- Movie Magic: hidden, founder-only story-structure boards.
-- One row per user holding the entire wall state as jsonb
-- (projects, boards, sticky notes, inbox). Last-write-wins is
-- acceptable: single user, debounced saves.
--
-- SECURITY MODEL:
-- The page is unlinked and UI-gated, but real enforcement is here:
-- every operation requires BOTH ownership (auth.uid() = user_id)
-- AND is_founder() (app_metadata only, server-set). A signed-in
-- non-founder gets nothing even if they discover the route.

-- ── is_founder() ──────────────────────────────────────────────
-- Idempotent: identical to the definition in 148/156. Safe in any order.
create or replace function public.is_founder()
returns boolean
language sql
stable
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'founder', false)
$$;

-- ── movie_magic ─────────────────────────────────────────────────
create table if not exists public.movie_magic (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  state       jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

alter table public.movie_magic enable row level security;

drop policy if exists "movie_magic owner founder select" on public.movie_magic;
create policy "movie_magic owner founder select"
  on public.movie_magic
  for select
  using (auth.uid() = user_id and public.is_founder());

drop policy if exists "movie_magic owner founder insert" on public.movie_magic;
create policy "movie_magic owner founder insert"
  on public.movie_magic
  for insert
  with check (auth.uid() = user_id and public.is_founder());

drop policy if exists "movie_magic owner founder update" on public.movie_magic;
create policy "movie_magic owner founder update"
  on public.movie_magic
  for update
  using (auth.uid() = user_id and public.is_founder())
  with check (auth.uid() = user_id and public.is_founder());

drop policy if exists "movie_magic owner founder delete" on public.movie_magic;
create policy "movie_magic owner founder delete"
  on public.movie_magic
  for delete
  using (auth.uid() = user_id and public.is_founder());
