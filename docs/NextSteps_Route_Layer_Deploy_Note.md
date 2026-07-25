# NextSteps — the Route Layer (v2.0.1) — Deploy Note

25 July 2026. The phase layer, personal rail. Civ route schema shipped and
seeded empty, per the scope decision in the brief thread.

**What this is:** NextSteps already existed and worked. This is not a new tool,
it is a spine transplant. A **Phase** now sits between Track and Step:

```
Track   the standing record of one concern being walked
  └─ Phase   one node in the ordered ROUTE (3 to 6 of them)
       └─ Step    one node in the ordered PATH inside the current phase
```

The load-bearing rule, enforced in schema, in the drafting validator and in the
copy: **a phase is defined by its exit condition, not by time.** There is no
date column on a phase and there never should be.

---

## Deploy order

### 1. Run migration 180

In the Supabase SQL editor, run `sql/180_nextsteps_phases.sql`. Idempotent, safe
to re-run. It is additive apart from one swap: the old
`nextsteps_steps_track_position_unique` constraint is replaced with an index that
scopes step position to its phase (phase 1 step 1 and phase 2 step 1 both need to
exist). Legacy steps with no phase keep the old guarantee.

Note that the migration **drops and recreates** `nextsteps_tracks_with_counts`
rather than using `CREATE OR REPLACE`. That is deliberate: the view selects
`t.*`, this migration adds six columns to `nextsteps_tracks`, and Postgres
refuses to REPLACE a view whose column positions move. Using `CREATE OR REPLACE`
fails halfway through with `cannot change name of view column`. This was caught
by running the migration against a real Postgres 16, not by reading it.

Verify:

```sql
SELECT table_name FROM information_schema.tables
 WHERE table_schema='public' AND table_name='nextsteps_phases';

SELECT indexname FROM pg_indexes WHERE tablename='nextsteps_phases';
-- expect nextsteps_phases_one_current_per_track among them

SELECT * FROM nextsteps_tracks_with_counts LIMIT 1;
-- expect the new columns: total_phases, cleared_phases, current_phase_*
```

### 2. Deploy the build

Two new endpoints are registered in `vercel.json` and will appear as functions:
`/api/nextsteps-route` and `/api/nextsteps-route-draft`. No new env vars;
both reuse `ANTHROPIC_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`.

### 3. DELETE THE OLD FOLDER BY HAND

`src/tools/nextsteps/phases/` has been renamed to `src/tools/nextsteps/stages/`,
because "phase" is now the route object and the screens could not keep the name.

**A drag-and-drop merge will not remove the old folder.** After dragging this
delivery in, delete `src/tools/nextsteps/phases/` in GitHub. Nothing imports it
after this change, so the app is correct either way, but leaving it there leaves
a second copy of four files that a future session will read and be misled by.
That is the exact bug class the July repo cleanup was about.

---

## Smoke test

1. **Sketch a route.** Open `/tools/nextsteps`, run a concern through to the
   Domain Landing, click through. You should see "Sketching the stages…" and
   then 3 to 6 phases, each with a name, a description of the work, and one
   exit condition.

2. **Check it is a proposal, not a verdict.** Every field on that screen should
   be directly editable on one click, with no Edit button anywhere. Change a
   phase name, tab out, reload the page: the change is still there.

3. **Move and cut.** Reorder two phases, cross one out, add one. Positions
   should renumber contiguously each time.

4. **Ratify.** "This is my route" flips the track to ratified and lights phase
   one. Confirm in SQL that exactly one phase is `current`.

5. **Walk.** The path screen should now show the current phase at the top with
   its exit condition, then the steps inside it. Steps generated here are
   phase-scoped: `SELECT phase_id FROM nextsteps_steps` should be non-null.

6. **Clear a phase.** "Has this phase ended?" shows the exit condition and asks
   the person. "Yes, that is true" clears it and lights the next. "Not yet"
   costs nothing and closes the panel.

7. **Legacy tracks still work.** Open a track created before this migration. It
   should show its steps exactly as before, with no route and no error.

8. **The exit-condition guard.** `node tests/nextsteps-exit-conditions.js`
   should print "All checkability rules hold." This is the regression guard on
   the Sacred Limit and it is worth running before any future NextSteps deploy.

---

## Decisions taken inside the build

- **Nothing is current until ratification.** A drafted route has every phase
  `upcoming` and the track at `route_state='drafted'`. An unratified route is a
  suggestion, and the data says so rather than the UI saying so.
- **The checkability rule is code, not a prompt.** `api/_exit-condition.js`
  refuses feeling-exits, deadline grammar and unanswerable vagueness. The
  drafting endpoint gets two attempts, the second one fed the validator's own
  objections, and **returns an error rather than persisting a soft exit
  condition**. A phase that cannot state a checkable exit is not finished being
  designed, so it does not ship. A prompt alone would have produced "you feel
  more confident" some percentage of the time, and each one of those quietly
  converts the instrument into fabricated progress.
- **Frequency is not a deadline.** "Three times a week for a month" passes.
  "By the end of March" does not.
- **The validator judges the machine, never the person.** It runs on AI drafts
  only. A person's own edit to their own exit condition is saved as written:
  policing their wording would be a verdict about the person (Tone Law 1), and
  they know their life better than the validator does.
- **`route_edits` is recorded** on the track: how many phase fields the owner
  changed before ratifying. Not a score, never displayed. The Evolution Protocol
  says to revisit the ratification moment if people defer rather than own, and
  this is the only honest way to see that happening. **A pattern of routes
  ratified with 0 edits is the signal to watch for.**
- **A phase clears only when a person says yes.** Nothing infers it from step
  counts or elapsed time.
- **Civ rail shipped inert.** `route_authorship`, `civ_domain`,
  `route_published` and two editorial RLS policies exist; zero rows match any of
  them. When the needs lists are authored, the civ side is a seeding job rather
  than a schema job.

## Two fixes made in passing

Both were in code this change had to touch anyway.

1. **`GET /api/nextsteps-track?id=…` did not check ownership.** Anyone with a
   track id could read another person's verbatim concern in their own words.
   Every write path was already gated; this read was not. Now gated.
2. **`/api/nextsteps-path` returned steps with no ids** (it inserted without
   `.select()`), so the UI had no `step_id` to PATCH and "Take this step" could
   not record anything. Now returns the inserted rows.

## Not in this build, by decision

- **The daily-tool read switch.** The current phase is the intended feed for the
  daily surfaces, but migration 176's ledger is only partly wired and touching
  Horizon Practice plus DailySurface in the same window is the territory breach
  we agreed to avoid. Follow-on.
- **The civ editorial routes themselves.** Unauthored content, not code.
- **Orienteering.** Stays live and untouched, per v2.0.1.
- **Target Stretch linkage on a step** still points at `target_sprint_sessions`.
  Unchanged by this build; it moves when the rename does.

## Rollback

Drop the two functions and `DROP TABLE nextsteps_phases CASCADE`, then re-run
039's view block. The six new `nextsteps_tracks` columns are additive and
harmless if left in place. To pull the route layer out of the UI without
touching the database, revert `NextSteps.jsx`: the path screen falls back to
v1.1 behaviour whenever a track has no current phase.

---

## Verification run before delivery

- `npm run build` — green, 506 modules, no new warnings.
- `npm run audit` — **zero new violations on every law.** Identical to baseline
  (the same 3 pre-existing italic flags in `MomentsReviewQueue.jsx` and
  `MarketingHome.jsx`, none of them touched here). Gold 0, retired fonts 0,
  svg-style 0, 100vh 0, orphan-token 0, size 0, opacity 0.
- **Migrations 039 → 041 → 180 applied to a real PostgreSQL 16**, then 180
  re-applied to prove idempotency. Twelve lifecycle assertions passed:
  no phase current before ratification · empty exit condition refused by the
  schema · ratify lights exactly phase one · ratify is not re-runnable · two
  current phases impossible (unique index) · steps in different phases may share
  a position · duplicate position inside one phase still refused · clearing
  advances the route and stamps `cleared_at` · clearing a non-current phase
  refused · the view reports the right current phase · walking to the end
  completes the track and leaves nothing current · no date-like column exists on
  a phase.
- **RLS checked under a non-superuser role**: a stranger sees zero phases and
  zero tracks; the owner sees their own three. Legacy no-phase tracks read
  through the view without error.
- `node tests/nextsteps-exit-conditions.js` — 12 checkable conditions pass,
  19 softened conditions refused, 5 route-shape rules hold.
