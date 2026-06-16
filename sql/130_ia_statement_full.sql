-- ─────────────────────────────────────────────────────────────
-- 130_ia_statement_full.sql
--
-- Per-domain "I Am" gains a full version alongside the distillation.
--
--   ia_statement       (existing) — the one-line distillation. The anchor
--                       voiced and written every morning. Stays canonical
--                       everywhere it is already read (the Anchor beat, the
--                       daily writing tool, Mission Control, the feed).
--   ia_statement_full  (new)      — the optional longer text behind it. The
--                       daily surfaces show the distillation; "See full"
--                       reveals this. North Star drafts the distillation
--                       from this full version; the user owns the line.
--
-- Existing rows hold their long text in ia_statement. They are left
-- untouched. The first time a user distils a domain, North Star drafts a
-- one-line ia_statement and the original text is preserved into
-- ia_statement_full — non-destructive, user-initiated, in the editor.
--
-- Row-level security on horizon_profile already scopes every row to its
-- owner; a new column needs no new policy.
-- ─────────────────────────────────────────────────────────────

alter table public.horizon_profile
  add column if not exists ia_statement_full text;

comment on column public.horizon_profile.ia_statement_full is
  'Optional full I Am text per domain. ia_statement holds the one-line distillation (the daily anchor); this holds the longer version surfaced behind "See full". North Star drafts the distillation from this.';
