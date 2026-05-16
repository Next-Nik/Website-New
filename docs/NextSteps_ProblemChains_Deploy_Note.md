# NextSteps — Problem-Chains Build (v2)

Follow-up to the v1 build. This adds the **away-from bridge**: orgs and
practitioners can be matched not only on domain alignment but on the
specific problem-chains a person's away-from concern resonates with.

Orgs are not asked to write away-from language themselves. The platform
auto-tags them from their existing forward-facing text.

---

## What's in this delivery

**Schema (new):**
- `sql/040_problem_chains.sql` — `nextus_problem_chains` reference table
  (~36 seeded entries), search_vector updated to include `problem_chains`,
  helper view `nextus_actor_chain_coverage` for admin visibility
- `sql/041_nextsteps_tracks_problem_chains.sql` — adds `problem_chains
  text[]` to `nextsteps_tracks` so each Track stores the away-from chains
  the person's concern resonated with

**Backend (new):**
- `api/nextsteps-tag-actor.js` — AI-assisted tagger. Three modes:
    - `POST { actor_id }` — single actor
    - `POST { actor_ids: [...] }` — batch
    - `POST { mode: 'all_untagged' }` — backfill every live actor with
      no chains set

**Backend (edited):**
- `api/nextsteps-chat.js` — system prompt now extracts `problem_chains`
  from the person's concern using the controlled vocabulary; the
  Reflection output contract is extended
- `api/nextsteps-track.js` — Track creation persists `problem_chains`
- `api/nextsteps-path.js` — `shortlistActors` matches on chain overlap
  OR domain overlap, re-ranking chain matches first; the path prompt
  shows each actor's mission_statement (was tagline) and chain coverage
- `api/nextsteps-actors-sample.js` — chain-aware matching for the
  Domain Landing "not first, not alone" sample; returns
  mission_statement

**Frontend (edited):**
- `src/tools/nextsteps/NextSteps.jsx` — passes `problem_chains` from
  reflection into Track creation
- `src/tools/nextsteps/phases/DomainLanding.jsx` — passes chains to the
  sample endpoint; renders mission_statement preferentially over tagline
- `src/app/components/manage/VoiceTab.jsx` — `mission_statement` field
  relabelled to invite toward grammar. Field name unchanged in DB. Label
  is now "What you're building toward"; hint and placeholder lead with
  toward framing

**Wiring (edited):**
- `src/constants/routes.js` — `nextStepsTagActor` registered
- `vercel.json` — tag-actor endpoint and rewrite registered;
  maxDuration 300s for the bulk backfill case

---

## Deploy order

### 1. Run the two migrations, in sequence
```sql
\i sql/040_problem_chains.sql
\i sql/041_nextsteps_tracks_problem_chains.sql
```

Verify:
```sql
-- Vocabulary present
SELECT count(*) FROM nextus_problem_chains WHERE status = 'active';
-- expect: 36

-- Sample of seeded chains
SELECT slug, label FROM nextus_problem_chains ORDER BY slug LIMIT 5;

-- Tracks table extended
SELECT column_name FROM information_schema.columns
 WHERE table_name = 'nextsteps_tracks' AND column_name = 'problem_chains';
-- expect: 1 row

-- Existing actors have problem_chains column ready (it pre-existed)
SELECT chain_count, count(*) FROM nextus_actor_chain_coverage
 WHERE status = 'live' GROUP BY chain_count ORDER BY chain_count;
-- expect: most rows in chain_count=0 before backfill
```

### 2. Deploy the build
Push the repo. Vercel auto-deploys. The new endpoint registers.

### 3. Run the backfill

This tags every live actor with no `problem_chains` set. Uses the
AI-assisted tagger (each actor = ~1 Claude call). Takes 5–20 minutes
depending on actor count and rate limits.

From your terminal, or any authenticated context with service-role:
```bash
curl -X POST https://nextus.world/api/nextsteps-tag-actor \
  -H "Content-Type: application/json" \
  -d '{"mode": "all_untagged"}'
```

Response is a JSON list of every actor processed with their assigned
chains and the tagger's reasoning. Review a sample to verify quality.

To re-tag a single actor (e.g. after they update mission_statement):
```bash
curl -X POST https://nextus.world/api/nextsteps-tag-actor \
  -H "Content-Type: application/json" \
  -d '{"actor_id": "uuid-here"}'
```

### 4. Smoke test the chain matching

End-to-end against a fixture:
1. From `/tools/nextsteps`, send: *"I just saw what's happening to the
   rainforests and I can't sit here doing nothing."*
2. After the Reflection lands, inspect the Track in Supabase:
   ```sql
   SELECT problem_chains, domains, scale FROM nextsteps_tracks
    ORDER BY created_at DESC LIMIT 1;
   ```
   Expect `problem_chains` to include `deforestation`, `biodiversity-loss`,
   or both. `domains` should include `nature`.
3. Click through to Phase 4 (Path). The candidate actors surfaced should
   prefer those tagged with `deforestation` / `biodiversity-loss` over
   generic Nature-domain actors.

Repeat with the other three fixtures (Hot Grievance → `gendered-violence`
or `wealth-concentration`; Subtle → `lost-meaning`; Diffuse → empty
chains is acceptable).

---

## What was NOT done

1. **`problem_chains` is not surfaced on the public actor profile.** Orgs
   should not see "you are tagged with: extinction, deforestation" on
   their public page — that's away-from grammar visible to the world.
   The column is internal matching infrastructure. If you want admins
   to *see* and edit it, the AdminConsole edit path through Domains tab
   already supports this.

2. **Auto-tagging on actor create/update is not wired automatically.**
   New actors won't be tagged until someone calls the endpoint. Wiring
   this into the Add/Edit flow is a small follow-up: call
   `nextsteps-tag-actor` with the new actor's id when claim/save succeeds.

3. **No mission_statement backfill.** Some orgs have only `tagline` and
   no `mission_statement`. They'll be partially tagged (the tagger reads
   tagline too) but the Domain Landing will fall back to tagline when
   mission_statement is empty. Consider an editorial pass to translate
   taglines into mission_statements for the top-30 most-claimed orgs.

4. **Cron for periodic re-tagging.** If actors update their text, their
   chains may drift. A weekly cron that re-tags any actor whose
   `mission_statement` changed in the last 7 days would keep coverage
   accurate. Easy to add later.

5. **The vocabulary is editorial.** New chains get added when NextSteps
   sees away-from sentences that don't match anything. A small admin
   tool to view "uncategorised concerns" from `nextsteps_tracks` with
   empty `problem_chains` would surface what to add. Future work.

---

## Rollback

If anything goes wrong:

1. **Schema rollback** — both migrations are additive. To roll back:
   ```sql
   ALTER TABLE nextsteps_tracks DROP COLUMN IF EXISTS problem_chains;
   DROP VIEW IF EXISTS nextus_actor_chain_coverage;
   DROP TABLE IF EXISTS nextus_problem_chains;
   ```
   Existing actor `problem_chains` data (pre-existing column) is
   untouched.

2. **Reverting search_vector** — the `nextus_actors_search_vector_update`
   function was updated to include `problem_chains`. The previous
   definition is in `sql/037_atlas_search.sql`. Re-run that file to
   restore.

3. **Tag-actor endpoint** — harmless to leave in place even if disabled.

4. **Voice tab label rollback** — pure text change. Revert
   `src/app/components/manage/VoiceTab.jsx` from git.
