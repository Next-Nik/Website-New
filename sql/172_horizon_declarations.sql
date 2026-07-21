-- ============================================================================
-- 172_horizon_declarations.sql
--
-- BP-8 · The horizon declaration. The platform's most identity-laden act:
-- one line, opt-in, verbatim — the future a person is moving toward.
--
-- Hard locks encoded here:
--   • One declaration per person (unique user_id). Stored VERBATIM.
--   • Never auto-derived, never AI-summarised, never rewritten — the row
--     exists only because the person performed the declaration act. Nothing
--     in this schema writes it on their behalf.
--   • Length-capped so it stays a line, not an essay.
--   • communal_visible defaults FALSE. Personal-rail-only is the safe default
--     (BP-8 display scope). A row is visible to others ONLY when the owner has
--     opted in — and the app additionally gates communal render behind a
--     build flag (HORIZON_COMMUNAL_ENABLED) so Nik can flip it after seeing it.
--
-- Numbering: 169/170/171 are taken (field notes, moments, moments-read);
-- 145 is subdomains. This is 172, the next free number.
--
-- Idempotent. Run manually in the Supabase SQL editor.
-- ============================================================================

begin;

create table if not exists public.horizon_declarations (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  line             text not null
                     check (char_length(btrim(line)) between 1 and 240),
  communal_visible boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (user_id)
);

create index if not exists horizon_declarations_communal_idx
  on public.horizon_declarations (communal_visible)
  where communal_visible = true;

alter table public.horizon_declarations enable row level security;

-- Owner may read their own declaration.
drop policy if exists "own horizon read" on public.horizon_declarations;
create policy "own horizon read"
  on public.horizon_declarations
  for select
  using (auth.uid() = user_id);

-- Signed-in people may read a declaration ONLY where the owner has opted it
-- into communal display. (The app keeps communal render behind a flag until
-- Nik enables it; this policy makes the opt-in the hard boundary regardless.)
drop policy if exists "communal horizon read" on public.horizon_declarations;
create policy "communal horizon read"
  on public.horizon_declarations
  for select
  using (communal_visible = true and auth.uid() is not null);

-- Owner may create their own declaration — the declaration act.
drop policy if exists "own horizon insert" on public.horizon_declarations;
create policy "own horizon insert"
  on public.horizon_declarations
  for insert
  with check (auth.uid() = user_id);

-- Owner may update their own line and its visibility.
drop policy if exists "own horizon update" on public.horizon_declarations;
create policy "own horizon update"
  on public.horizon_declarations
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Owner may withdraw their declaration.
drop policy if exists "own horizon delete" on public.horizon_declarations;
create policy "own horizon delete"
  on public.horizon_declarations
  for delete
  using (auth.uid() = user_id);

commit;

-- ─── Verification (run manually) ────────────────────────────────────────────
-- -- Should return 0 initially:
-- select count(*) from public.horizon_declarations;
--
-- -- Should fail the CHECK (blank line):
-- -- insert into public.horizon_declarations (user_id, line)
-- --   values (auth.uid(), '   ');
--
-- -- Should fail the CHECK (over 240 chars):
-- -- insert into public.horizon_declarations (user_id, line)
-- --   values (auth.uid(), repeat('x', 241));
