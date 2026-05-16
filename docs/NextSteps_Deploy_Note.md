# NextSteps — Deploy Note

This is what to do, in order, to get NextSteps live. Stage 1 + 2 of the
build thread is shipping; Stage 3 (this) is the ship-prep.

## What's in this delivery

**Backend (new):**
- `api/nextsteps-chat.js` — Phase 1+2 conversational endpoint
- `api/nextsteps-track.js` — Track CRUD (create/read/list/update)
- `api/nextsteps-path.js` — Phase 4 path generation
- `api/nextsteps-actors-sample.js` — Atlas sample for Domain Landing

**Schema (new):**
- `sql/039_nextsteps_tables.sql` — `nextsteps_tracks`, `nextsteps_steps`,
  RLS, the `nextsteps_tracks_with_counts` view, triggers

**Fixtures (new):**
- `tests/nextsteps-fixtures.js` — the four canonical acceptance cases

**Frontend (new):**
- `src/tools/nextsteps/NextSteps.jsx` — the five-phase state machine
- `src/tools/nextsteps/phases/ArrivalReflection.jsx` — Phase 1+2
- `src/tools/nextsteps/phases/DomainLanding.jsx` — Phase 3
- `src/tools/nextsteps/phases/PathView.jsx` — Phase 4
- `src/tools/nextsteps/phases/TrackLoop.jsx` — Phase 5

**Wiring (edited):**
- `src/constants/tools.js` — NextSteps added as the first tool, `featured: true`
- `src/constants/routes.js` — `nextSteps` path + 4 API entries registered
- `src/App.jsx` — route mounted; `/tools/orienteering` now redirects to
  `/tools/nextsteps` (was redirecting to north-star)
- `vercel.json` — 4 new endpoints + 4 new rewrites
- `src/app/pages/MissionControl.jsx` — NextSteps tile at top of BOTH rails

## Deploy order — do these in sequence

### 1. Run the schema migration
On the production Supabase, run:
```sql
\i sql/039_nextsteps_tables.sql
```
Or paste it into the SQL editor. Migration is idempotent (safe to re-run).

Verify with:
```sql
SELECT table_name FROM information_schema.tables
 WHERE table_schema='public' AND table_name LIKE 'nextsteps_%';
-- expect: nextsteps_tracks, nextsteps_steps, nextsteps_tracks_with_counts

SELECT polname FROM pg_policy
 WHERE polrelid::regclass::text LIKE 'nextsteps_%';
-- expect: nextsteps_tracks_owner_all, nextsteps_steps_owner_all
```

### 2. Confirm env vars
NextSteps reuses the platform's existing env vars. No new ones required:
- `ANTHROPIC_API_KEY` (chat + path endpoints)
- `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` (track + path + actors-sample)

### 3. Deploy the build
Push the repo. Vercel auto-deploys. The four new API endpoints are
registered in `vercel.json` and will appear as serverless functions.

### 4. Smoke test (in order)

**A. The Mission Control tile.** Log in and land on `/`. Verify:
- The ✧ NEXTSTEPS tile appears at the top of BOTH side rails.
- Clicking it navigates to `/tools/nextsteps`.

**B. Phase 1 + 2.** From `/tools/nextsteps` with no existing tracks, you
should land in Arrival. Send: *"Honestly? Tear down the patriarchy. Burn
the whole thing."* — this is the canonical Hot Grievance fixture. After
1–2 turns the endpoint should emit a structured Reflection. The screen
will pause on the reframe text for ~1.8s then advance to the Domain
Landing.

Verify against the fixtures (`tests/nextsteps-fixtures.js`):
- Reframe doesn't flinch at "burn the whole thing"
- Bridge sentence appears ("if [X] were replaced...")
- Domain lands on `society`, scale `civ`
- No forbidden phrases ("let me reframe," "what you really mean," etc.)

**C. Phase 3.** Domain Landing should show:
- The reframe text (italicised)
- The toward-sentence in a card with gold left-border
- The domain badge (SOCIETY) + Horizon Goal text
- Up to 3 Atlas actors in the "You are not first" block
- A primary CTA: "Show me my path"

**D. Phase 4.** Click the CTA. The path endpoint runs (loading state
"Reading where you are…"), then 2–3 ordered Steps appear, each with a
route_type, description, and "Take this step" action.

**E. Phase 5.** Click "Back to your tracks." You should see the Track
card with status (Walking if a step was activated, Planning if not),
toward-sentence, domain, and step counts.

**F. Run the other 3 fixtures.** Repeat with:
- "I just saw what's happening to the rainforests…" (Activated → Nature/civ)
- "Earning a living is a scam…" (Subtle → Path or Spark/self, both-ways
  language must appear)
- "Everything is broken and I can't sit still." (Diffuse → branch:mirror,
  no reframe attempted)

### 5. Watch the logs

The chat endpoint logs to `console.error` on failures. The most likely
issues:
- **`@anthropic-ai/sdk` model error** — confirm `claude-sonnet-4-20250514`
  is reachable on the production API key.
- **RLS denial** on insert — confirm the user is authenticated and
  `auth.uid()` matches `user_id` (it should, the endpoint reads from the
  authenticated request).
- **Empty Atlas shortlist** — graceful fallback exists; the Domain Landing
  shows "People are building toward this — we'll surface them in your
  path." Not a bug.

## What was NOT done in this build

These are deliberate carry-forwards, not omissions:

1. **Orienteering files are NOT yet moved to `archive/`.** The route at
   `/tools/orienteering` now redirects to `/tools/nextsteps`. The original
   source files stay on disk for one verification cycle. After NextSteps
   is verified live, move:
   - `src/tools/orienteering/` → `archive/legacy-orienteering/`
   - `api/orienteering-chat.js` → `archive/legacy-orienteering-chat.js`
   - Remove the `/tools/north-star` route from `App.jsx` (it currently
     still resolves to `NorthStarPage` which renders Orienteering)
   - Remove the orienteering-chat entries from `vercel.json`
   That's a separate small commit.

2. **NextSteps does not have a Mission Control Panel.** The side tile
   direct-links to `/tools/nextsteps`. Other tools open a Panel inside
   Mission Control before fully launching. The Foundation calls for
   NextSteps to feel approachable and direct; the direct-link is more
   honest about what the tool is. If you want a Panel as a "preview"
   surface (showing active tracks inline), that's a v1.1 feature.

3. **The ✧ glyph is a unicode character, not a bespoke SVG.** Other
   tools have designed glyph components (`MapPinGlyph`, `PurposePieceGlyph`).
   When the icon question is settled, swap the ✧ for a NextStepsGlyph
   component.

4. **`target-stretch` route alias.** `PathView.jsx` routes `route_target:
   'target-stretch'` to `ROUTES.targetSprint` (the existing path). When
   Target Sprint → Target Stretch is renamed in URL/code, that one line
   updates.

5. **Decision Analytics scoring layer.** Per Foundation 2.4, the path
   endpoint uses the Atlas as-is (no scoring). The interim is explicit
   and honest. When scoring goes live, `shortlistActors()` in
   `api/nextsteps-path.js` is the single function to update.

## Rollback

If anything goes wrong:

1. The migration is additive — no existing tables were touched. To roll
   back the schema, drop the two new tables (`nextsteps_steps` first
   because of the FK, then `nextsteps_tracks`).
2. To pull NextSteps off the site without rolling back: remove the
   `/tools/nextsteps` route from `App.jsx` and the Mission Control tiles
   from both rails. The endpoints can stay (they're harmless without UI).
