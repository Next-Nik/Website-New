# Wave 1 + 2 Build · 20 July 2026
First real build from the demo. Assumptions (Nik "build fully", demo leans): stars register · brass tier marks (heritage gold pending your whitelist sign-off — one-line change) · blanks named-but-unfilled · ticker captures aggregate-only, no names · companion threshold hidden (3 actions across 60+ days, internal constant, never displayed) · "Your guide" label and /guide slug PROVISIONAL, flagged for the naming session.

## Run first
sql/169_actor_field_notes.sql in the Supabase editor. (168 reserved for the showcase layer.) Everything else degrades gracefully until it runs — the ticker skips sighting events, the guide shows every actor as not met.

## Wave 1 · the check-in, felt
- api/actor-calls.js · log_strand response now returns others_today (distinct others who logged that strand today) + sparks_today. Backward-compatible.
- MyChallenges.jsx · after check-in, one quiet line fades in: "Day 6 of 21 · 4 others did this today" (omitted when zero). Strike-through on done strands REMOVED — done shifts to verdigris. Today's habit dot ignites brass with a glow on check-in, live, no refetch.
- _beaconStrip.js + BeaconStrip.jsx + EarthLive.jsx · new aggregate ticker sentence: "{n} organisations were written into guides today". No user names, no user–actor pairs, defensive if the table is missing.

## Wave 2 · the guide
- sql/169_actor_field_notes.sql · private notes, RLS owner-only, one per user per actor, non-empty enforced in the schema.
- src/app/lib/guideTiers.js · tier derivation from real events only (watches, notes, participation, strand logs). Batched queries.
- src/app/pages/FieldGuide.jsx · the grid: domain chips, subdomain groups, tier marks (dashed = not met · verdigris = known/following · brass = allied/companion), the user's note in italic, required-note capture inline ("Add to my guide" dead until text exists), every card links to /org/{slug}. Signed-out renders fully with a sign-in affordance. Load failure shows an error line with retry, never an eternal spinner.
- App.jsx · /guide route. MissionControl.jsx · YOUR GUIDE tile on the Our Planet rail, between SEARCH and MY ORG.

## Verified
esbuild on every JSX/JS file · node --check on api files · full vite build passes · scripts/audit-design.js clean · /guide smoke-tested in a browser (render, routing, error path). NOT verifiable from this sandbox: the happy path against live data — Supabase is unreachable from here, so first deploy deserves a 2-minute look at /guide and one real check-in.
