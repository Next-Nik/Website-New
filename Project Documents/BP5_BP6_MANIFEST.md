# BP-5 (capture) + BP-6 (daily surface / gallery) · 20 July 2026

The photo chain, end to end. A user can now add a photo at check-in, and a place exists to see them.

## Files
- src/app/components/MomentCapture.jsx (NEW) — BP-5. "+ Add a photo or a line" after a check-in. Optional photo + optional line (own words, never pre-filled). Uses the BP-2 captureMoment lib. Carries challenge id + domain.
- src/app/pages/MyChallenges.jsx — renders MomentCapture under each completed strand check-in.
- src/app/pages/DailySurface.jsx (NEW) — BP-6. Route /today. Finite daily "window to now": today's moments as photo + line, warm count, no ranking/infinite scroll. Report affordance on every moment (pairs with the BP-2 founder queue). Empty/loading/error states dignified.
- src/App.jsx — /today route.
- src/app/pages/MissionControl.jsx — TODAY tile on the Our Planet rail (front door).
- sql/171_moments_public_read.sql — communal read policy: signed-in people may read undeleted moments (surface renders lines/photos + warm counts only, never per-user ranking).

## Manual steps (in order)
1. Run sql/171_moments_public_read.sql in the Supabase editor. (Prereqs from BP-2 must already be done: run 170, create the public 'moment-images' bucket.)
2. Deploy this zip to the test branch.

## Walk-through to verify
Check in on a challenge → "+ Add a photo or a line" appears → add either → "Added to your moments." Then open Mission Control → TODAY tile → /today shows the moment. The ⋯ on a moment reports it; it disappears for you and lands in Admin → Moments.

## Audit
Font floor clean (all ≥13px). esbuild passes all files. The 3 ITALIC audit flags are user-voice (a person's own line rendered italic) — correct usage, whitelist when you next touch the audit config.

## Not yet
Step-toward horizon framing on moments (needs BP-8 declaration). Echo/lifted-moment/ticker-on-surface are BP-6's second wave. The surface currently shows the day's moments plainly; atmosphere pass is BP-17.
