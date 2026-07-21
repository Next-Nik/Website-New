-- ─────────────────────────────────────────────────────────────
-- nextus_domain_scores_daily
--
-- Daily snapshot of the seven civilisational domain scores plus
-- the per-indicator breakdown used by Mission Control's planet
-- wheel and World View panel.
--
-- Written by /api/cron/compute-daily-snapshot (Vercel Cron, 03:30 UTC).
-- Read by useCivDomainScores() in the React app.
--
-- One row per day. snapshot_date is the primary key — re-running
-- the cron for the same day updates that day's row.
--
-- details_json holds the full per-indicator scored array per
-- domain, so the panel can render every breakdown from a single
-- snapshot read with zero further queries.
-- ─────────────────────────────────────────────────────────────

create table if not exists nextus_domain_scores_daily (
  snapshot_date     date primary key,
  vision            numeric,
  human             numeric,
  nature            numeric,
  finance           numeric,
  tech              numeric,
  legacy            numeric,
  society           numeric,
  details_json      jsonb        not null default '{}'::jsonb,
  computed_at       timestamptz  not null default now()
);

-- ── Index for fast "most recent snapshot" lookups ───────────
create index if not exists nextus_domain_scores_daily_date_desc_idx
  on nextus_domain_scores_daily (snapshot_date desc);

-- ── RLS: public read, service-role write ────────────────────
alter table nextus_domain_scores_daily enable row level security;

-- Anyone can read the snapshot — these are public global scores.
drop policy if exists "Anyone can read domain scores snapshot"
  on nextus_domain_scores_daily;
create policy "Anyone can read domain scores snapshot"
  on nextus_domain_scores_daily
  for select
  using (true);

-- Only the cron function (service-role key) can write. No public
-- write policy means anon and authenticated cannot insert/update.

-- ── Verify ──────────────────────────────────────────────────
-- After running this, the cron function will populate the first
-- row at next run. To force an immediate seed without waiting for
-- the cron, POST to /api/cron/compute-daily-snapshot with the
-- x-cron-secret header matching CRON_SECRET env var.
