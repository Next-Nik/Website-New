# Care Protocol — build note and validation record

**Status:** v1 built, hidden inside NextUs. Founder-only.
**Migration:** `sql/187_care_protocol.sql`
**Entry point:** a `CARE PROTOCOL →` button in the Profile panel
(`src/app/components/mission-control/ProfileMissionPanel.jsx`), founder-gated
alongside Admin Console and Movie Magic. The route is unlinked from all other
navigation. (It briefly lived inside the Movie Magic topbar instead — see §10;
that button has been removed so there is exactly one door.)

---

## 1. Where everything lives

| Piece | Path |
|---|---|
| Engine (portable, no app dependencies) | `src/lib/care/` |
| Card renderer | `src/components/care/CareCard.jsx` |
| One-renderer-any-instrument | `src/components/care/InstrumentRunner.jsx` |
| Hidden working page | `src/pages/CareProtocol.jsx` → `/care-protocol` |
| Public card route (dark) | `src/pages/CareCardPublic.jsx` → `/care/:token` |
| Synthesis endpoint | `api/care-synthesis.js` |
| Tables and RLS | `sql/187_care_protocol.sql` |

Nothing in `src/lib/care/` imports from the NextUs app, Supabase, or React —
design tokens are touched only by the renderer. Placement stays a question of
"where does this ship next", never a rewrite.

---

## 2. Three security layers

1. **UI gate.** `isFounder(user)`, tolerant of either metadata source, mirroring
   Movie Magic and AdminConsole. Convenience only.
2. **RLS.** Every operation on `care_profiles` and `care_shares` requires
   ownership *and* `is_founder()`, which reads `app_metadata` — server-set and
   not client-editable. This is the real boundary.
3. **Endpoint.** `api/care-synthesis.js` verifies the bearer token server-side
   and rejects anyone whose `app_metadata.role` is not `founder`.

**The public route is built but dark**, and goes through a `security definer`
function rather than a table policy. `care_card_by_token(p_token text)` takes
the token as an argument and returns the card only when
`care_public_enabled()` is true; there is deliberately **no anon select policy
on `care_shares`**.

This is a correction, and it matters. A row-level policy of the form
`using (care_public_enabled() and is_live and revoked_at is null)` reads like
"anyone may fetch a card by token", but it does not mean that. RLS evaluates a
predicate per row and cannot see the caller's `?token=eq.…` filter — that
filter is the *client's* choice, and the client can simply omit it. Such a
policy would have let anyone holding the publishable key enumerate every live
card: names, portraits, attachment scores, "Right now" notes and owner UUIDs.
The token would have stopped being a capability the moment sharing was
switched on. Passing the token as a function argument makes possession of it
the only way to name a row.

To go live, still one statement:

```sql
create or replace function public.care_public_enabled()
returns boolean language sql immutable as $$ select true $$;
```

**Birth data never travels.** `care_shares` stores a rendered snapshot of the
card face, not a foreign key into `care_profiles`. A public reader is
structurally unable to reach birth time or coordinates, which together are
close to identifying. This is not a filter that could be forgotten; it is a
missing edge in the schema.

---

## 3. Computation validation

This was the de-risking step. Astrology is straightforward; the design date and
gate wheel are the research-heavy piece.

### Astrology — verified to the arcminute

Obama, 1961-08-04 19:24 Honolulu (Astro-Databank AA rated):

| | Computed | Published |
|---|---|---|
| Sun | Leo 12°32'51" | Leo 12°32' |
| Moon | Gemini 3°21'09" | Gemini 3°21' |
| Ascendant | Aquarius 18°03'26" | Aquarius 18°03' |

The Midheaven was additionally checked against an independent RAMC computation
(`atan2(tan(LST), cos(ε))`) and agrees to 0.002°.

### Human design — verified three ways

**Wheel anchor.** Gate 41 begins at 2°00' Aquarius (302.0°), 64 gates in
zodiacal order at 5.625° each. Cross-checks: 0° Aries falls in gate 25 line 2,
consistent with published wheels putting gate 25 at 28°15' Pisces to 3°52'30"
Aries; and 302.0° returns gate 41 line 1 by construction.

**Reference chart.** Obama computes **6/2 Projector, Emotional authority** —
matching the published chart on type, profile *and* authority simultaneously.

**Population distribution**, 320 random births:

| Type | Computed | Published |
|---|---|---|
| Generator | 40.0% | ~37% |
| Manifesting Generator | 28.1% | ~33% |
| Projector | 16.3% | ~20% |
| Manifestor | 8.4% | ~9% |
| Reflector | 0.9% | ~1% |

Authority: Emotional 51.6% (published ~50), Sacral 30.0% (~30).

**Structural invariants**, asserted: the wheel is 64 unique gates; centre
membership covers all 64 exactly once; there are 36 unique channels.

**Design date** is solved by Newton iteration on local solar velocity rather
than assumed at 88 days — the true offset ranged 86.6 to 92.0 days across the
sample, because the Sun's speed varies between perihelion and aphelion.
Newton converges in four or five steps against roughly sixty for bisection,
which matters at ~9ms per ephemeris evaluation. A full chart is ~180ms.

### Two library footguns, both handled in `chart.js`

- `Origin` takes a **zero-indexed month**. January is 0.
- `Origin` **rejects fractional minutes** — this silently broke about 6% of
  charts during validation until seconds were passed separately.

### One packaging bug, handled in `vite.config.js`

`circular-natal-horoscope-js` declares `"module": "src/index.js"`, but its
published tarball ships only `dist/`. Node and esbuild use `main` and are fine;
Vite prefers `module` for browser builds and fails to resolve. A `resolve.alias`
pins it to the file that actually exists. Licence is Unlicense (public domain).

---

## 4. Rights roster — one change from the brief

**OEJTS is parked, not cleared.** The brief's §5 lists it as public domain. It
is not. Its own PDF and development page state:

> "The items of the Open Extended Jungian Type Scales 1.2 are licenced under a
> Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International
> License."

CC BY-NC-SA carries a non-commercial clause and a ShareAlike clause that would
force any derivative to adopt the same licence. Under the project-wide rights
rule, that is a park. The MBTI-shaped output therefore has no cleared
instrument behind it; the *construct* is not parked, only the instrument, so an
original four-letter item set remains the path back in.

**IPIP-50 is confirmed clean**, explicitly including commercial use:

> "Because the IPIP has been placed in the public domain, permission has already
> been automatically granted for any person to use IPIP items, scales, and
> inventories for any purpose, commercial or non-commercial."
> — https://ipip.ori.org/newPermission.htm

**ECR-RS is freely distributed but not public domain.** Fraley's measures page
carries no licence, no free-use grant and no copyright notice on the
instruments. Lower risk than OEJTS, but the brief's "public domain" overstates
it, and the roster now says so accurately.

### Attachment is shown as dimensions, not a category

Fraley et al. (2015), *J Pers Soc Psychol* 109(2), 354–368:

> "we no longer think it is defensible to use categorical measures in adult
> attachment research or to use continuous measures to assign people to
> categories."

So the card carries two continuous dimensions read against published means
(Study 1, N = 2,399: anxiety 4.47 ± 1.62, avoidance 3.75 ± 1.19) rather than
stamping "Anxious-Preoccupied" on anyone. This is both what the instrument's
author asks for and what the product's honesty posture requires — and it still
produces the concrete partner-facing guidance the card exists to carry.

---

## 5. Bundle

The engine is loaded by dynamic `import()`, so the ephemeris and its
moment-timezone dependency land in a separate ~812 kB chunk reachable only
through that one edge. Verified in a production build: the main bundle is
unchanged in size, and the public card route renders from the stored snapshot
without pulling any of it.

---

## 6. What is deliberately not built

- **Cycle-aware "Right now"** — postponed per the brief. The section exists and
  is dated and editable, which is the surface it will attach to.
- **Partner notifications**, printable/merch output, standalone packaging.
- **The licensing audit** to un-park tier-2 instruments.
- **A four-letter type instrument** to replace the parked OEJTS.

---

## 7. Open decisions still open

Product name · care-symbol tone calibration (currently five symbols chosen per
person from a library of twelve) · whether "Right now" is visible by default on
a shared card (currently a per-share `show_right_now` flag, defaulting on) ·
whether the licensing audit happens before or after v1 ships.

---

## 8. Corrections made in review

The first drop was reviewed against the merged tree. Everything below was found
and fixed; each has a regression test that fails against the original code.

### Security

- **Public read went through a table policy that could not scope by token.**
  Replaced with the `care_card_by_token` security-definer function. See §2 —
  this was the most serious defect in the drop, and the original file's comment
  claiming the policy was "already correct" was actively misleading.
- **`show_right_now` was applied at render time only**, so the note still sat
  in the stored snapshot JSON for anyone reading the raw response. The flag now
  omits the section from the snapshot itself, and the RPC strips it server-side
  as well.

### Data loss

- **A failed profile read installed the empty state, and the debounced save
  then wrote it over the real row.** A transient 502, an expired JWT at page
  load, or an aborted fetch on a backgrounded tab would have wiped birth data,
  every response, and the paid synthesis, with no user interaction at all. A
  read error is now a hard stop: nothing is editable and the saver is never
  armed. `maybeSingle()` already distinguishes "no row yet" from a failure.
- **Whole-row last-write-wins across devices.** Adopted the conflict-safe
  pattern already proven in `MovieMagic.jsx`: the write only lands if the row
  still carries the `updated_at` we last saw, and on conflict the remote row is
  fetched and merged (responses unioned, newest "Right now" kept, empty local
  values never clobbering populated remote ones).
- **A pending save was discarded on unmount**, losing the last 700 ms of
  typing on navigate-away — including on a token refresh, which unmounts the
  workspace through the auth gate. Now flushed.
- **Duplicate share rows.** A double-click created a second live row, after
  which the loader's `.maybeSingle()` errored and the UI offered "create"
  forever while the orphans stayed live and unreachable. Added a partial unique
  index, and the loader now takes the newest rather than erroring.
- **Share create/refresh/revoke swallowed their errors**, so a revoke that
  silently failed looked successful. All three now report.

### Wrong output

- **Sign-boundary formatting.** `29.9999°` printed `Aries 30°00'` rather than
  `Taurus 0°00'`. Rounding now happens before the sign is derived.
- **Chinese zodiac on the Li Chun day.** The crossing instant was compared
  against midnight of the birth date, so *every* birth on that day got the
  previous animal. Now compared against the true birth instant.
- **Numerology destroyed master numbers.** Components were digit-summed before
  the master check could see them, so 1988-11-03 returned life path 4 instead
  of master 22 — directly contradicting the comment above it.
- **The Accra UTC anchor is not offset-free in every era.** `Africa/Accra` ran
  +00:20 each September–December from 1920 to 1942, putting pre-1943 charts
  twenty minutes out — enough to move a gate line. `horoscopeAtUTC` now
  measures the offset the library actually applied and corrects for it.
  Verified to zero difference against an independent wartime-London route.
- **`confidence` was computed everywhere and consulted nowhere.** One stray tap
  on item 1 of 50 produced a confident-looking extraversion of 0 and pushed
  "Line dry" onto the care strip. Symbol selection is now gated on confidence.
- **A deliberate "barely registers" vanished from the card**, rendering
  identically to a question never reached. Ranking now filters on answered.
- **Staleness was frozen into the share snapshot**, so a partner reading a
  six-month-old card would never see the one warning that section exists to
  give. Now derived at render.
- **A recompute left the old synthesis attached to the new chart.** Correcting
  a wrong birth time showed new placements above a portrait built from the old
  ones. The synthesis is now cleared on recompute.
- **A degraded synthesis response was rendered as the portrait.** When the
  model's JSON would not parse, the endpoint returned raw output with
  `degraded: true`, nothing read the flag, and literal JSON went onto the card
  and into the snapshot. Now rejected.
- **Optional items blocked completion**, so the open-question step's progress
  dot could never light.

### Robustness

- `buildCard` and `buildTraitVector` threw on a partially-populated `chart` or
  `human_design` — reachable from the `'{}'::jsonb` column default or from
  engine-version drift. Every accessor is now guarded per-section, and
  `CareCard` defaults each destructured section.

### Housekeeping

- **Migration renumbered three times: 180 → 181 → 184 → 187.** The NextSteps
  route layer landed `180_nextsteps_phases.sql` in the same window as the
  first drop, so Care Protocol moved to 181. By the next merge, 181 had been
  independently claimed a second time — by both `181_nextsteps_phases.sql`
  and a new `181_sparks.sql` — so it moved to 184, the first number genuinely
  free at the time. By the merge after that, an unrelated "pulse events"
  migration had independently landed at 184 too (itself renumbered from its
  own 180 collision, for the same reason), so Care Protocol moved once more,
  to 187 — the first number genuinely free once `185_sparks.sql` and
  `186_social_half_fixes.sql` were also accounted for. `180_care_protocol.sql`,
  `181_care_protocol.sql`, and `184_care_protocol.sql` are all left in place
  as tombstones (all-comment files pointing at the next hop) rather than
  deleted, matching the pattern already established by
  `180_nextsteps_phases.sql`: a drag-and-drop merge cannot remove files, so
  overwriting a superseded copy with a note is the only way to mark it. No
  object names collide in any of these, so running any already-applied copy
  alongside 187 is harmless; 187 is what should actually be run. This is the
  third time in four rounds that two independent workstreams have picked the
  same "first free number" without seeing each other's work — worth a
  standing convention (e.g. a shared next-number ledger, or reserving blocks
  per workstream) rather than relying on each drop re-scanning `sql/` by hand.

### Known and deliberately unchanged

The UI founder gate accepts `user_metadata.role`, which a signed-in user can
set on themselves. This is the existing house pattern, copied verbatim from
`MovieMagic.jsx` and `AdminConsole.jsx`, and the repo's own comments say it is
deliberate so the founder cannot be locked out. RLS and the synthesis endpoint
both require `app_metadata`, so **no data is readable or writable** through it
— the exposure is the page shell of an unreleased internal tool. Worth a
repo-wide decision rather than a unilateral change here.

---

## 9. Corrections made merging onto the v39 tree

The v39 snapshot carried unrelated new work — a "Sparks" feature, a Movie
Magic Deck rework, milestone/moment migrations — merged in parallel with, and
without ever having seen, this drop. Reviewed again after merging onto it;
one defect, one loose end, and one UX gap found.

- **`App.jsx` lost the Care Protocol route entirely.** The Sparks merge into
  `App.jsx` branched from a copy of the file that predated Care Protocol's
  integration, silently dropping both import lines
  (`CareProtocolPage`, `CareCardPublicPage`) and both `<Route>` registrations
  (`/care-protocol`, `/care/:token`). This is exactly the class of bug this
  repo's own `CLAUDE.md` already documents by name — a page built but never
  imported or routed, with the catch-all wildcard silently swallowing every
  click to it — and it would have made the entire tool unreachable with no
  error anywhere. Found by `grep -n "Care" src/App.jsx` returning nothing;
  fixed by re-adding both lines at their original insertion points, verified
  the new Sparks routes were untouched by diff.
- **`view_count` was read and displayed nowhere and incremented nowhere.**
  The column existed since the first schema draft and was carried into
  client state, but no code path ever wrote to it. `care_card_by_token` now
  bumps it atomically (`update ... returning`, so a concurrent reader can't
  observe the row between a select and an update and lose a count), and the
  Share Link panel now shows the running total.
- **`show_right_now` was fully enforced with no way to set it.** Both
  `publicCard()` and the RPC already honoured the flag correctly (see §8), and
  it defaulted `true` at share creation, but the founder had no control to
  ever flip it. Added a checkbox in the Share Link panel wired to a new
  `toggleRightNow` callback.

Re-verified against this exact tree after all of the above: the 25-assertion
regression suite (sign boundaries, Li Chun instant, master numbers, the Accra
anchor cross-check, symbol-strip confidence gating, deliberate-low-rating
survival, optional-item completion, staleness-at-render, and the full Obama
reference chart) all pass; the hostile-input probe (empty/partial/null jsonb
shapes into `buildCard`) is 5/5; the design audit shows zero new violations;
a production build succeeds with the ephemeris chunk byte-identical to every
prior round; and a rendered card screenshot shows no visual regression.

---

## 10. The front door moved

The brief asked for "a button under Movie Magic." That was built literally —
a `◍ Care Protocol` button inside the Movie Magic workspace's own topbar,
reachable only after opening Movie Magic itself. The actual ask, surfaced
once the founder went looking for it, was a button positioned under the
*Movie Magic* entry in the Profile panel — the same menu that already lists
Admin Console, Movie Magic, and Prism Lab as founder-only shortcuts. Two
different rooms both named "under Movie Magic."

Moved to match the second reading, which is also the more consistent one: it
puts Care Protocol alongside the other two hidden tools instead of nested one
level inside a third:

- Added a `CARE PROTOCOL →` button to
  `src/app/components/mission-control/ProfileMissionPanel.jsx`, immediately
  after Movie Magic and before Prism Lab, styled identically to both
  (founder-gated on the same `isFounder` check already used for the other
  two).
- Removed the button from `MovieMagic.jsx`'s topbar, along with the
  now-unused `useNavigate` import and `navigate` variable it existed for —
  `<Navigate>` (the redirect component, used for the auth gate) stays.
- Updated the stale "reached from Movie Magic" comments in `CareProtocol.jsx`
  and `App.jsx` to point at the Profile panel instead.

There is now exactly one door, and it is where the founder actually looks for
it. Enforcement is unchanged either way — RLS in `sql/187_care_protocol.sql`
never depended on which button led here.
