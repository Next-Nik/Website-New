-- 188_practice.sql
--
-- THE PRACTICE — recovery-informed daily tools. Its own standalone tool with
-- its own front door (Profile panel, alongside Admin Console, Movie Magic,
-- Care Protocol, Prism Lab) and its own table, `practice_events`.
--
-- (Numbering note, per 187's standing warning about first-free-number
-- collisions: at the time of writing, 187 is the highest APPLIED migration
-- in sql/, so 188 is claimed here. Note that src/pages/Homecoming.jsx's own
-- header comment references a not-yet-present "sql/188_homecoming.sql" —
-- that migration does not exist in this tree, so there is no live collision
-- today, but if it lands first, move this file to the next free number and
-- leave a tombstone, matching the established pattern.)
--
-- DESIGN — append-only, deliberately, complete from day one (this table has
-- never shipped under an earlier, narrower kind list, so there is no
-- two-step migration history to preserve here).
--
--   1. One table of EVENTS, not a state row. A check-in, an urge, a closed
--      loop, a receiving-window open/close, a tape revision, a bookend, a
--      breath session — each is one INSERT. There is no UPDATE policy at
--      all, so the conflict-merge machinery other profile tables need
--      (last-write-wins across devices, unioned merges) simply has no
--      equivalent here: two devices logging at once produce two rows, which
--      is the correct answer. Mistaken entries are DELETEd, never edited —
--      an edited log is not a log.
--
--   2. Founder-only, same two-layer model as care_profiles: every policy
--      requires ownership AND is_founder() (app_metadata, server-set). The
--      UI gate on the page is convenience; this is enforcement.
--
--   3. NOTHING here is reachable from any other tool's public/shared path
--      (Care Protocol's care_shares, or any future one). Recovery data is at
--      least as sensitive as birth coordinates; it gets the same structural
--      guarantee (a missing edge, not a filter). Care Protocol's synthesis
--      MAY read this table directly, by explicit founder-approved design, to
--      build a trends-only recovery context — but that read never touches
--      any shareable snapshot table.
--
--   4. The tape (and scene-last, and per-state counters) live here too, as
--      their own event kinds with newest-wins semantics, rather than as
--      columns elsewhere — keeping this feature to exactly one table, and
--      giving revisions history for free.

create table if not exists public.practice_events (
  id       uuid primary key default gen_random_uuid(),
  user_id  uuid not null references auth.users(id) on delete cascade,

  -- 'state'         payload: { state: 'settled'|'fog'|'charged'|'crashed', note? }
  -- 'urge'          payload: { pull, trigger?, action, bookended?, duringWindow?, duringBookend? }
  -- 'loop'          payload: { loop: 'ask'|'number'|'boundary'|'custom', label }
  -- 'receipt'       payload: { text }   -- proof the baseline is moving
  -- 'anchor'        payload: {}         -- the morning practice happened (one bit)
  -- 'return'        payload: { off?, well?, clear? }  -- the evening return
  -- 'window_open'   payload: { note? }   -- what landed
  -- 'window_close'  payload: {}         -- it landed; window closed on purpose
  -- 'tape'          payload: { text }   -- newest tape event wins
  -- 'scene_last'    payload: { text }   -- the documented ending alone; newest wins
  -- 'counter'       payload: { state, text }  -- founder's own counter-line per state; newest-per-state wins
  -- 'breath'        payload: { seconds }      -- one cyclic-sighing session
  -- 'bookend_open'  payload: { action }       -- a scary action, named before
  -- 'bookend_close' payload: { outcome?, talked }  -- talked: 'before'|'after'|'both'|'neither'
  -- 'coreg'         payload: { who? }         -- one dose of safe co-regulation
  -- 'proxy'         payload: { text }         -- the optional monthly number, as a plain sentence
  kind     text not null check (kind in (
    'state', 'urge', 'loop', 'receipt', 'anchor', 'return',
    'window_open', 'window_close', 'tape',
    'scene_last', 'counter', 'breath',
    'bookend_open', 'bookend_close', 'coreg', 'proxy'
  )),
  payload  jsonb not null default '{}'::jsonb,

  at       timestamptz not null default now()
);

create index if not exists practice_events_user_at_idx
  on public.practice_events (user_id, at desc);

alter table public.practice_events enable row level security;

drop policy if exists "practice owner founder select" on public.practice_events;
create policy "practice owner founder select"
  on public.practice_events
  for select
  using (auth.uid() = user_id and public.is_founder());

drop policy if exists "practice owner founder insert" on public.practice_events;
create policy "practice owner founder insert"
  on public.practice_events
  for insert
  with check (auth.uid() = user_id and public.is_founder());

-- Delete: allowed, for mistaken entries. There is deliberately NO update
-- policy — see the design note above.
drop policy if exists "practice owner founder delete" on public.practice_events;
create policy "practice owner founder delete"
  on public.practice_events
  for delete
  using (auth.uid() = user_id and public.is_founder());
