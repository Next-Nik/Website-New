# NextUs Ecosystem Build — April 2026

Complete output from the bidirectional contribution platform build session.

## Deployment order

### 1. CB runs first (Supabase)
Run `docs/supabase-integrity.sql` in the Supabase SQL editor.
Add to Vercel environment variables:
- `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_SECRET` (any strong random string)

### 2. Deploy to Website-New repo

| File | Destination | What changed |
|---|---|---|
| `src/App.jsx` | `src/App.jsx` | Two new routes: /nextus/contributors and /nextus/contributors/:id |
| `src/pages/NextUsActorManage.jsx` | `src/pages/` | Offerings tab, Domains tab, Matches tab, integrity warning banner |
| `src/pages/NextUsActor.jsx` | `src/pages/` | Offerings section, domain alignment notes, dormancy signal, needs_visible gate |
| `src/pages/NextUsActors.jsx` | `src/pages/` | Matches for you panel |
| `src/pages/NextUsContributor.jsx` | `src/pages/` | NEW — public contributor profile page at /nextus/contributors/:id |
| `src/pages/NextUsContributors.jsx` | `src/pages/` | NEW — contributor landing page at /nextus/contributors |
| `src/pages/NextUs.jsx` | `src/pages/` | How it works section, contributors link |
| `src/pages/Profile.jsx` | `src/pages/` | Contributor offer card in NextUs slot, contributor profile link |
| `api/nextus-match.js` | `api/` | NEW — bidirectional matching engine |
| `api/integrity-cron.js` | `api/` | NEW — nightly integrity enforcement cron |
| `vercel.json` | root | Cron schedule, two new function registrations, two new rewrites |

### 3. Living architecture documents (docs/)
- `NextUs_Schema_Spec_v1.docx` — full schema spec for CB
- `NextUs_Contribution_Mode_Taxonomy_v1.docx` — 81 named roles across 4 modes
- `supabase-integrity.sql` — run once in Supabase SQL editor

## What was built

**The platform shifted from org-centric needs directory to a two-sided ecosystem.**

- Orgs: Orient → Offer → Need → Receive → Close the loop
- Contributors: Orient → Offer → Discover → Give → Build a record
- Four contribution modes: Functional, Expressive, Relational, Intellectual
- Bidirectional matching engine
- Structural integrity mechanics (loop closure gate, dormancy signals, earned alignment scores)
- Nightly cron enforcing platform integrity
- Contributor landing page honouring artists, healers, writers, performers
- Public contributor profiles visible on the map
- Contributor offer cards in the personal profile (NextUs slot)
- Purpose Piece output seeds contributor profile automatically

## Notes for CB
- `contributor_profiles` view requires service role — create with SECURITY DEFINER
- `nextus_contributor_enquiries` table needed for reach-out messages
- `needs_visible`, `dormant_since`, `alignment_score_computed` columns added to `nextus_actors`
- All SQL in `docs/supabase-integrity.sql`
