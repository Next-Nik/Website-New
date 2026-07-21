-- ============================================================================
-- 175_trails_and_boards.sql
--
-- BP-16 · Trails + boards. A route toward a horizon becomes a shareable,
-- walkable object; a domain board holds three time-layers.
--
-- Trails:
--   The practices + challenges + stretch a real person assembled toward their
--   horizon, as a first-class object. Public when the walker publishes it, so
--   someone with a rhyming horizon can walk and adapt it. "How do I get there"
--   is never abstract — always "here is how someone real is getting there."
--
-- Boards (per user per domain, three layers):
--   • reality  — present reality, PRIVATE by default.
--   • horizon  — the dreamed images (the Pinterest layer). Aspiration may be
--                dreamed → uploadable/添加able.
--   • path     — the earned layer. It CANNOT be uploaded to. It is not stored
--                in board_items at all; it is rendered from real witnessed
--                steps (the person's own moments in that domain). Enforced two
--                ways: board_items forbids layer='path' by CHECK, and there is
--                no write path to it. The path must be earned.
--
-- Numbering: 172-174 taken; this is 175.
-- Idempotent. Run manually in the Supabase SQL editor.
-- ============================================================================

begin;

create table if not exists public.trails (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  title        text not null check (char_length(btrim(title)) between 1 and 120),
  -- Snapshot of the horizon this trail moves toward (BP-8), verbatim.
  horizon_text text check (horizon_text is null or char_length(horizon_text) <= 240),
  summary      text check (summary is null or char_length(summary) <= 600),
  domain       text,
  is_public    boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists trails_user_idx on public.trails (user_id);
create index if not exists trails_public_idx on public.trails (is_public) where is_public = true;

create table if not exists public.trail_steps (
  id          uuid primary key default gen_random_uuid(),
  trail_id    uuid not null references public.trails(id) on delete cascade,
  kind        text not null check (kind in ('practice', 'challenge', 'stretch', 'note')),
  ref_slug    text,   -- optional link target (challenge slug, practice slug…)
  label       text not null check (char_length(btrim(label)) between 1 and 160),
  note        text check (note is null or char_length(note) <= 400),
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists trail_steps_trail_idx on public.trail_steps (trail_id, sort_order);

create table if not exists public.boards (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  domain     text not null,
  created_at timestamptz not null default now(),
  unique (user_id, domain)
);

create table if not exists public.board_items (
  id         uuid primary key default gen_random_uuid(),
  board_id   uuid not null references public.boards(id) on delete cascade,
  -- Only the dreamable layers are storable. 'path' is earned, never stored
  -- here — it renders from the person's real moments in the domain.
  layer      text not null check (layer in ('reality', 'horizon')),
  image_url  text,
  caption    text check (caption is null or char_length(caption) <= 240),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  constraint board_item_has_content check (image_url is not null or caption is not null)
);
create index if not exists board_items_board_idx on public.board_items (board_id, layer, sort_order);

alter table public.trails enable row level security;
alter table public.trail_steps enable row level security;
alter table public.boards enable row level security;
alter table public.board_items enable row level security;

-- Trails: owner full; anyone signed-in reads a published trail (it exists to
-- be walked).
drop policy if exists "trail owner all" on public.trails;
create policy "trail owner all" on public.trails
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "trail public read" on public.trails;
create policy "trail public read" on public.trails
  for select using (is_public = true and auth.uid() is not null);

-- Trail steps: readable when the parent trail is readable; writable by owner.
drop policy if exists "trail steps read" on public.trail_steps;
create policy "trail steps read" on public.trail_steps
  for select using (exists (
    select 1 from public.trails t where t.id = trail_id
      and (t.user_id = auth.uid() or (t.is_public and auth.uid() is not null))
  ));
drop policy if exists "trail steps owner write" on public.trail_steps;
create policy "trail steps owner write" on public.trail_steps
  for all using (exists (select 1 from public.trails t where t.id = trail_id and t.user_id = auth.uid()))
  with check (exists (select 1 from public.trails t where t.id = trail_id and t.user_id = auth.uid()));

-- Boards: owner-only (reality is private; the whole board stays personal in v1).
drop policy if exists "board owner all" on public.boards;
create policy "board owner all" on public.boards
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Board items: owner-only, and NEVER the path layer (CHECK already forbids it,
-- this makes the ownership boundary explicit too).
drop policy if exists "board items owner read" on public.board_items;
create policy "board items owner read" on public.board_items
  for select using (exists (select 1 from public.boards b where b.id = board_id and b.user_id = auth.uid()));
drop policy if exists "board items owner write" on public.board_items;
create policy "board items owner write" on public.board_items
  for all using (exists (select 1 from public.boards b where b.id = board_id and b.user_id = auth.uid()))
  with check (
    layer in ('reality', 'horizon')
    and exists (select 1 from public.boards b where b.id = board_id and b.user_id = auth.uid())
  );

commit;

-- ─── Verification (run manually) ────────────────────────────────────────────
-- -- The path layer is unstorable — this must FAIL the CHECK:
-- -- insert into public.board_items (board_id, layer, caption)
-- --   values ('<board-uuid>', 'path', 'should not work');
