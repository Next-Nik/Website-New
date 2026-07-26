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

---

## 11. Today's sky — the daily layer

Everything above this point is a snapshot: astrology, Human Design, Chinese
zodiac, and numerology are all properties of the birth moment and never
change; the five instruments are scored once and stay put until retaken.
Asked directly whether the card gives "a daily window into self, like a
horoscope but across multiple modalities" — the honest answer at the time was
no, not yet, and that gap was already named in the brief and parked (§6,
"Cycle-aware 'Right now'"). This closes it, for astrology and Human Design.

**What it computes**, in `src/lib/care/transits.js`:

- The transiting **Moon** (sign, phase, and its aspect to natal Sun/Moon/
  Rising) — the standard engine behind almost every daily-horoscope product,
  because it is the one body whose aspects to a natal chart genuinely turn
  over inside a day or two.
- The transiting **Sun** (sign, and its aspect to the same three natal
  points) — slower, but its Human Design gate/line changes on the same kind
  of timescale, and its aspects stay exact for roughly a day at a normal orb.
- **Retrograde flags** for Mercury, Venus, Mars, Jupiter, and Saturn — the
  single most-asked-about fact in mainstream astrology, and cheap to compute
  correctly (the library already flags it per body; the same mechanism
  natal placements already use).
- **Human Design gate of the day**: the transiting Sun's (and Earth's,
  its opposite point) gate and line, checked against the natal gate set for
  a completed channel — reusing `CHANNELS`/`CENTRE_OF_GATE` from `wheel.js`
  exactly as `computeHumanDesign` does for the birth chart itself. A hit
  either reinforces a centre the person already has defined, or temporarily
  opens one that is normally undefined for them.

**Deliberately out of scope**, and why: Mercury, Venus, Mars, Jupiter and
Saturn move too slowly for "today" to mean much about their *aspects*
specifically — a Saturn square can sit within orb for weeks — so the
aspect-interpretation table covers only Sun and Moon. Extending it to the
outer planets is a real next step, not an oversight; it needs a different
framing ("in effect for the next three weeks" rather than "today").

**Evidence tier: mythic**, same as natal astrology and Human Design — added
to `COMPUTED_SYSTEMS` in `instruments/index.js` as `daily_transits`, so it
shows up in the Roster tab's rights ledger like everything else. This module
computes the sky correctly; it does not make the sky predictive.

**Stability, deliberate.** "Today" is pinned to noon UTC of the calendar
date, not the instant the function happens to run — reloading the workspace
at 9am and again at 11pm the same day returns byte-identical output. A
section that changed every time you glanced at it inside one day would read
as broken rather than alive; it is supposed to change once per calendar day,
which is the whole point of "daily."

**Public sharing: deliberately not wired in, yet.** `card` snapshots handed
to `care_shares` are frozen at share-creation time (`publicCard()` in
`cardModel.js`). Baking in a value that goes stale within a day would
reintroduce, in a new place, exactly the frozen-staleness bug already found
and fixed once for "Right now" (§8). So this is called directly by the
founder's own workspace (`CareProtocol.jsx` computes it with `useMemo` and
passes it to `<CareCard>` as its own `todaysWeather` prop) and never enters
`buildCard()`'s output, `publicCard()`, or a stored snapshot at all —
`CareCardPublic.jsx` is untouched and never computes or passes it. A
cycle-aware public share — recomputing live on each view rather than freezing
at share time — is real future work, not an accident.

**Where it renders**: a new "TODAY'S SKY" section on the Card tab, directly
under the header (a live gloss on the same placements) and before "How I'm
wired." Tone is moss, not clay, even though — like "Right now" — it changes
daily: clay marks a section a *human* let go stale; this one recomputes
itself correctly every render, so there is nothing here for a human to have
forgotten.

**Tested**: 30 new checks (`aspectBetween` and `moonPhase` pure-math cases;
same-calendar-day stability and next-day divergence against a fixed birth
chart; the Sun and Moon longitudes cross-checked against an independent call
to the already-validated `horoscopeAtUTC`; every retrograde flag cross-checked
against the library's own `isRetrograde`; the Human Design gate-of-the-day
cross-checked against an independent `gateLine()` call; every reported
channel-hit checked against the invariant that it is a real channel, keyed to
an actual natal gate, off an actual transiting gate; and a synthetic
gate-41-vs-natal-gate-30 case exercising the channel-matching logic directly
against a hand-picked, known channel). All 30 pass, alongside the full
existing 25-test regression suite and 5-test hostile-input probe, which both
still pass unchanged. The ephemeris chunk grew from 800.72 kB to 806.28 kB in
this round's production build — expected and correct, since this is the
first round that deliberately changes the engine rather than merely carrying
it forward; previous rounds' "byte-identical" checks were verifying nothing
had changed by accident, not that nothing should ever change.

---

## 12. Birth-place search failed silently

Reported directly: typing a birth place and tapping "Compute chart" did
nothing. The root cause was in `IntakeTab` in `CareProtocol.jsx`, and it is a
sequencing trap rather than a broken computation:

`state.birth.lat`/`lon` are only ever set by `pickPlace()` — clicking a
result from the geocoding dropdown. The text box above it is bound to a
*separate* piece of local state (`placeQuery`), so typing a city and going
straight to "Compute chart" leaves `state.birth.lat` at `null` regardless of
what the box shows. `runComputation`'s `ready` gate correctly refuses to run
without coordinates, but the button was simply `disabled` — which fires no
click event at all — with nothing on screen explaining why. A second,
separate gap: the geocoding fetch's `catch` block swallowed every failure
(network error, CORS, a non-2xx response) into a silent empty result list,
identical in appearance to "that city doesn't exist."

Three fixes, all in `IntakeTab`:

- An always-visible hint under the search box while no coordinates are set
  yet: type a city, then tap Search and choose it from the list — typing
  alone does not set coordinates. Also suggests searching the bare city name
  rather than "City, Region, Country" for a better match against the
  geocoding API.
- The search now distinguishes and reports three states instead of one: a
  successful search, a search that ran and found nothing ("No matches for
  '…'. Try just the city name on its own."), and a search that could not run
  at all ("Could not reach the location search. Check your connection and
  try again.") — previously indistinguishable, both from each other and from
  never having searched.
- A message next to the "Compute chart" button whenever it is inactive,
  naming the actual missing piece — a birth date, or a selected city —
  instead of leaving a disabled button to explain itself through silence.

Nothing about the computation changed: once a city is actually selected,
Sun/Moon/Rising and everything else compute exactly as before (see §3 for the
validation record). This was purely a "the founder doesn't know why nothing
happened" gap, closed with feedback, not a change to what gets computed or
how. Verified: the file parses clean, builds clean, and the full 25 + 5 + 30
test suite (regression, hostile-input, transits) all still pass unchanged —
nothing here touches computation, so none of them were expected to move.

---

## 13. The save indicator was invisible while scrolled

Reported directly, live on a phone, partway through the intake questionnaire:
"there doesn't seem to be an enter or save button after the birth information
and so I don't know if any of this is being registered."

There was never supposed to be a save button — the whole design is a
debounced autosave (700ms after the last change, conflict-safe, flushed on
unmount — §8) precisely so nobody has to think about saving. And the
mechanism was working correctly the whole time: every state change already
flips a `syncStatus` flag through `syncing` → `synced` (or `error`), rendered
as `○ saving…` / `● synced` / `⚠ not saved` in the page's topbar. The actual
bug was narrower and purely visual: that topbar was a normal, non-sticky
block. The moment a founder scrolls a screen or two into a multi-step
questionnaire on a phone, it scrolls out of view — and from there, nothing
on screen says whether anything is happening at all. Not a missing feature;
a status indicator that existed but couldn't be seen when it mattered.

Fixed with one property: `position: sticky; top: 0` on the topbar in
`CareProtocol.jsx`, so `● synced` / `○ saving…` / `⚠ not saved` stays pinned
to the top of the viewport through the entire scroll, on every tab, not just
Step 1. No change to the save logic itself — the mechanism was already
correct; only its visibility was fixed.

Verified: the file parses and builds clean, and the full 25 + 5 + 30 test
suite (regression, hostile-input, transits) all still pass unchanged —
nothing here touches computation or persistence logic, only layout.

---

## 14. The save indicator still didn't read as reassurance

Follow-up report after §13 shipped: "I'm not seeing a new save button." No
new button was ever built — §13 made the *existing* status indicator sticky,
not new. Checked the actual deployed code first (diffed the newest zip
against what was delivered for §13): the sticky fix was present, byte for
byte. So the gap wasn't the code; it was that `● synced` in faint
`fn.ghost` — the same de-emphasized tone used for ambient metadata like
coordinates — doesn't read as an answer to "did this save" even once it's
visible and pinned in place. A status whose only job is reassurance was
styled identically to text that doesn't matter.

Fixed by giving it colour and a background chip, using the same moss =
settled / clay = attention convention the card itself already uses
elsewhere: `● Saved` now renders moss-green in a tinted pill,
`⚠ Not saved` renders clay/orange in its own tinted pill, and `○ Saving…`
stays neutral in between. Same three states, same logic, now visually
distinct from the rest of the topbar rather than blending into it.
Rendered all three states side by side in an isolated preview to confirm
the colours read correctly before shipping (see the delivered screenshot).

Verified: the file parses and builds clean, the full 25 + 5 + 30 test suite
still passes unchanged, and the design audit shows zero new violations —
this is a colour/style change only, using only already-defined design
tokens (`fn.moss`, `fn.mossTint`, `fn.mossEdge`, `fn.clay`, `fn.clayTint`,
`fn.clayEdge`, all already in use elsewhere in this file), nothing invented.

---

## 15. Autosave has no payoff — "Reflection"

(Called "Noticed" for a while — renamed throughout in §19. Section titles
and prose below use the current name; direct quotes from Nik's messages at
the time keep the word actually used, in quotes, as an honest record of
what was said.)

Direct feedback after §14 shipped, once the save indicator was actually
legible: "those things autosave... but there's no payoff. I want to
immediately have it see something in me and reflect it back... The autosave
feels like I'm being ignored. Like I'm talking to someone who doesn't turn
to look at me... for a care protocol, it's bad bedside manner."

§11–14 fixed a sequence of ways the *existing* save mechanism failed to be
seen. This is a different complaint: even seen and legible, a status dot
was never going to be presence. Filling in a genuinely vulnerable freetext
answer — a real disclosure — and watching it get filed away with nothing
more than `● Saved` is the correct behaviour for a database and the wrong
one for a tool whose entire premise is care. The gap isn't autosave working
badly; it's autosave being the *only* response to a disclosure.

**What "Reflection" is, and deliberately is not.** The product already has a
considered response to what someone has shared: synthesis (§ various,
`api/care-synthesis.js`) — a full cross-system portrait, generated once, on
request, from everything at once (chart, human design, every instrument,
both open-ended answers together). Reflection is not a smaller synthesis. It
fires the moment a founder finishes writing a single freetext answer —
before they've moved to the next question — and does exactly one thing:
shows, in one or two sentences, that what they just wrote landed with
someone. No analysis, no system names (astrology/HD/attachment), no scores,
no tiers, no advice. The turn of the head, not the diagnosis. Keeping the
two clearly separate matters for the same reason the evidence-tier framework
matters elsewhere in this build: blurring "I noticed what you said" into "I
have concluded something about you" would be dishonest about what a
few-hundred-millisecond model call can responsibly claim to know.

**Where it lives and how it's gated.** Three pieces:

- `api/care-reflection.js` (new, then renamed from `api/care-notice.js` in
  §19) — founder-only, same `resolveFounder` pattern
  as `care-synthesis.js` (bearer token verified server-side against
  `app_metadata.role`, which the client cannot edit). Takes the question
  prompt, the answer text, and the display name; returns one plain-text
  reflection, not JSON, not the full instrument context. The prompt
  explicitly forbids "Thank you for sharing," therapy-speak ("it sounds
  like...", "I hear that..."), and reaching for any system name — and
  requires the reflection cite something specific from what was actually
  written, the way a person listening would, not a form confirmation. A
  15-character floor on the server (belt-and-braces; the client already
  gates on the same number) means "fine" or "idk" gets silence, not a
  reading fabricated out of three words.
- `InstrumentRunner.jsx` — a new `ReflectionPanel`, rendered under a
  `longtext` field only when the instrument declares `kind: 'freetext'`
  (currently just `openNeeds.js` — the "in your words" instrument) and the
  runner was given an `onReflect` handler. Gated on the same generic
  `instrument.kind`/`item.type` properties the rest of this file already
  uses, per its own architectural rule that adding instrument fourteen
  should be a data task, not a dev task — nothing here hard-codes
  `open_wish` or any other instrument by name. Renders nothing for `idle` or
  `error` states, a quiet "reading this…" for `loading`, and a moss-tinted
  panel labelled "reflection" (originally "noticed" — see §19) with the
  reflection text for `done`. Deliberately
  *not* italic: the card's own design law (`CareCard.jsx`) reserves italic
  exclusively for the user's own authored words; this is the system
  speaking, and using italic here would blur the one line that law exists
  to hold.
- `CareProtocol.jsx` — the connective piece. `IntakeTab` holds a
  `reflections` state object keyed by item id and a `reflectOn` callback,
  wired to the `longtext` field's `onBlur`. `reflectOn` mirrors
  `runSynthesis`'s own auth pattern (`supabase.auth.getSession()` →
  bearer token → `fetch`), skips the call entirely under the 15-character
  floor, and — via a ref, not state, so it doesn't itself trigger a
  re-render — skips re-firing for text it already reflected on, so
  tabbing away and back without editing doesn't re-spend a model call for
  the same sentence. Failure is quiet by design: a missed reflection just
  renders nothing rather than surfacing an error over a missed nicety in
  the middle of someone disclosing something.

**What it is not.** Not persisted anywhere — it lives in component state
for the session and is gone on reload; the answer itself is still autosaved
exactly as before (§8), this only adds a transient acknowledgment on top.
Not wired into the card, synthesis, or any `care_shares` snapshot. Not a
second opinion-giving system alongside astrology/HD/attachment — it has no
access to any of them and is instructed not to reach for them.

Verified: `api/care-reflection.js`, `InstrumentRunner.jsx`, and
`CareProtocol.jsx` all parse clean; the full 25 + 5 + 30 test suite
(regression, hostile-input, transits) still passes unchanged, since nothing
here touches computation; the design audit shows zero new violations (two
pre-existing italic flags in `MarketingHome.jsx` are unrelated); the
production build completes clean. Because this involves an async call the
static card-render harness can't exercise, rendered the real
`InstrumentRunner` component standalone at all four reflection states
(idle/loading/done/error) in an isolated preview to confirm the panel reads
correctly and that italic really was avoided — see the delivered
screenshot.

---

## 16. "Reflection" didn't show up — the failure path was silent too

(Still called "Noticed" at the time — the file was `api/care-notice.js`;
kept as such below since that's what actually existed then. Renamed in
§19.)

Report after §15 shipped and was deployed live: "it doesn't seem to have
changed anything... the 'noticed' doesn't seem to have showed up." Confirmed
freshly deployed, tried on both freetext fields.

Re-verified the actual code three ways before looking anywhere else: diffed
the delivered files against the uploaded repo byte-for-byte (identical);
re-ran the full parse/test/audit/build pipeline (all clean); and — new this
round, going further than the §15 verification did — built a live harness
that types into the real `open_wish` field, fires a real blur event, and
drives the real `reflectOn` logic against a mocked `/api/care-notice` call.
All three passed. The client-side code is correct.

Which means the likeliest real explanation is the one place client-side
correctness can't reach: `reflectOn`'s `catch` block was written to fail
completely silently — a deliberate choice at the time (§15: "a missed
reflection is a missed nicety, not worth interrupting someone over"). That
reasoning holds for the person mid-disclosure. It does not hold for anyone
trying to tell *whether the feature is working at all* — a genuine backend
failure (a missing env var on the newly-added function, an auth mismatch,
a network hiccup) and "this was never built" now render identically:
nothing. That's the same failure this whole feature exists to fix, just
moved one layer down, into the error path instead of the success path.

Fixed by giving `error` a rendered state instead of `null`: a single quiet,
`fn.ghost`-toned line — "A reflection didn't load that time — your answer
is still saved." — no color, no icon, nothing urgent, just present instead
of silent. Also logged the actual error to the console
(`console.error('[care-notice] reflection failed:', ...)`), since a
production failure on a brand-new endpoint was otherwise invisible to
anyone without devtools open, which is what made this exact report
unresolvable from the description alone.

Two things worth naming that are *not* bugs, in case they're what actually
happened: the reflection only fires on the longer first question
(`open_wish`, `type: 'longtext'`) — the shorter one-liner right after it
(`open_line`, `type: 'text'`) never gets one, by design; and it only fires
on a live blur event, so merely reloading a page and looking at an answer
saved from before this feature existed does nothing — the field has to
actually be focused and un-focused (typing not required) in the current
session for `reflectOn` to run at all.

Verified: same pipeline as §15 (parse, 25 + 5 + 30 test suite, design
audit, production build, all clean and unchanged), plus a second live
harness run simulating a failing `/api/care-notice` call end to end —
confirms the calm error line now renders and the console captures the
underlying error — see the delivered screenshot. Next diagnostic step, if
this still doesn't show up live: check whether the grey "didn't load" line
appears at all. If it does, the client is reaching the endpoint and the
server is failing — a devtools network-tab look at `/api/care-notice`'s
response will show why. If nothing renders even now, the blur event itself
isn't reaching `reflectOn` in the live environment, which would point
somewhere neither this file nor its tests can see from here.

Still didn't show up on the next report, with a real, substantial answer
typed into the correct field (a live screenshot showed it: 205 characters,
no "noticed" panel, no grey line either). Chased a service-worker staleness
theory next (`sw.js`'s own comments mention it already caused a "mobile
white-screen bug" once before) and asked for an incognito test to rule it
out cleanly — blocked by Google sign-in not working in private tabs, a
known OAuth restriction unrelated to this app.

That's where the direct clarification landed: "I've been asking for a
manual save button." Every round before this — §13's sticky fix, §14's
colour, §15's "Reflection" (then still named "Noticed"), this round's
error-visibility fix and cache theory — was solving a real, verified
problem, just not the one being asked for. The repeated report was never
really "the autosave indicator is
hard to see" or "I want AI to acknowledge what I wrote." It was: *give me
something to press.* An ambient status chip, however legible, asks the
person to trust a background process; a button hands them the action
directly, with its own confirmation, on their own terms.

---

## 17. An actual manual save button

Direct request, plainly stated this time: a manual save button, not
another pass at making the autosave status more visible or more
responsive.

Added one, next to the existing ambient indicator in the sticky topbar —
not instead of the debounced autosave (§8/§11), which keeps running in the
background exactly as before, so nothing is lost if the button is never
pressed at all. The button is for the person who doesn't want to rely on
that: press it, and it flushes immediately, with its own confirmation on
the button itself rather than asking anyone to notice a chip elsewhere on
the page.

**Mechanics.** `persist()` (the existing debounced/conflict-safe write —
unchanged in every other respect) now returns `true`/`false` instead of
nothing, so the button can know whether its own attempt actually landed.
A new `saveNow()` cancels any pending debounce timer, calls `persist()`
immediately, and drives its own state machine on the button —
`Save → Saving… → ✓ Saved` (auto-reverts after ~2.2s) or `Save → Saving… →
Try again` (does *not* auto-revert — a real failure stays visible on the
button until either a retry succeeds or the next edit re-arms autosave).
This is deliberately separate from `syncStatus` (the ambient chip's own
state): the button's feedback is about the button being pressed, not a
running description of background sync, and conflating the two would mean
a stray background sync could silently flip the button's own label.

**Where it sits.** In the topbar's `brand` group, right after the ambient
chip — same sticky header, same visibility guarantee as §13. Gave `brand`
`flexWrap: 'wrap'` so on a narrow phone screen the button drops to its own
line under the title/chip rather than overflowing off the right edge;
confirmed at 360px CSS width (the size implied by the phone screenshots)
that nothing clips or scrolls horizontally.

**What didn't change.** The ambient chip stays, still colour-coded (§14),
still a true reflection of background sync state — it's useful on its own
for anyone who does trust a passive signal, and it's what shows the
autosave safety net is still working even if the button is never touched.
Nothing about the write path, the conflict-merge logic, or the 700ms debounce
changed; `persist()`'s new return values are additive, and its existing
caller (the autosave effect) never used a return value in the first place.

Verified: parses clean; the full 25 + 5 + 30 test suite passes unchanged
(nothing here touches computation); the design audit shows zero new
violations; the production build completes clean. Built a live harness
reproducing `saveNow()`'s exact state machine (copied, not reimplemented)
against mocked successful and failing `persist()` calls, driven by real
clicks — confirmed the full `Save → Saving… → ✓ Saved → (2.2s) → Save` and
`Save → Saving… → Try again` (stays) cycles land correctly, and confirmed
no horizontal overflow at a 360px phone width. See the delivered
screenshots.

The next report was "this isn't showing up on my phone or computer" —
plus a repo re-diffed against the delivered files, byte-for-byte identical,
same as every round before it. Chased a Vercel branch-mismatch theory
next, since correct code that's genuinely deployed and still doesn't
render is otherwise inexplicable — asked for the live URL to check the
served bundle directly rather than keep verifying the same zip a fourth
time. That got pushed back on fairly: the branch was already confirmed
correct on the reporting end, and the ask read as putting the problem back
on the person reporting it rather than pursuing it. Fair — re-centred on
proving the actual page, not just its source, by rendering the real
exported `CareProtocolPage` component standalone (mocked login, mocked
database, not a recreation of its JSX) and confirming the button appears
with zero errors. It did.

That resolved it without needing the URL: "no, saw nothing at all" turned
out to mean nothing had been noticed at the one place the button existed
— the topbar — because the actual, specific, mental model in mind the
whole time was different: fill in a block of questions, hit Save right
there at the bottom of that block, see it land, move to the next block.
Once described plainly, obvious in hindsight; not visible from a bug
report alone.

---

## 18. A save button at the bottom of every section

Direct correction: the manual save button (§17) landed in the one place
that was never actually being looked at — the founder was, reasonably,
checking the bottom of the section they'd just finished, not the top of
the page. "Each section should have the save button" was the actual
design the whole time.

**What changed.** Pulled the topbar's inline button + its local state out
into a standalone `SaveButton({ onSave })` component, and render an
instance at the bottom of every section in `IntakeTab` — Step 1 (birth
data), each core instrument panel (Steps 2–4), and the optional "Deepen"
panel — plus the original one in the topbar, which stays, since it's
reachable regardless of scroll position. Six buttons in total on a fully
answered form, all calling the same underlying save.

**Why one shared action but independent buttons.** There's one profile row
per founder, not one per section — "saving section 3" and "saving
everything" are the same write, exactly like autosave already treats it.
So every `SaveButton` instance calls the identical `triggerSave()` in the
parent (a thin wrapper: flush any pending debounce, call `persist()`,
report back true/false). But each instance keeps its own local
`Save → Saving… → ✓ Saved / Try again` state, deliberately not shared
global state — pressing Save under Step 2 shouldn't make Step 4's
untouched button flash "✓ Saved" too. Confirmed this in a live test: click
one section's button, and only that one transitions; the other five stay
on "Save" throughout, then the clicked one alone reverts after ~2.2s.

**Verification note.** The first pass at this test used a Playwright
locator that excluded button text containing "Saving" — which meant the
moment the clicked button actually started saving, it stopped matching its
own selector, and the locator's `nth()` silently reassigned to a different
button entirely. Looked exactly like the click doing nothing. Root-caused
by switching to a stable element handle instead of a re-querying locator.
Worth naming because it's the same class of mistake as several rounds in
this build's history: the thing under test was fine; the way it was being
observed wasn't holding still.

Verified: parses clean; the full 25 + 5 + 30 test suite passes unchanged;
design audit zero new violations; production build clean. Rendered the
real exported `CareProtocolPage` (not a recreation) with a mocked login
and a stateful in-memory mock of the `care_profiles` table (so the actual
conflict-detection branch in `persist()` is exercised honestly rather than
always looking like a conflict against a naive always-null mock) —
confirmed six Save buttons render, clicking one drives only that one
through the full state cycle, the other five stay untouched throughout,
and the clicked one alone reverts after 2.2s. See the delivered
screenshot.

---

## 19. "Noticed" renamed to "Reflection," throughout

Direct request: rename "Noticed" to "Reflection" everywhere. Treated as
literal and total — the visible label, the API endpoint and its file, the
JSON contract between them, and every comment that named the feature.

- `InstrumentRunner.jsx` — the visible eyebrow label under a landed
  reflection changes from "noticed" to "reflection." (The panel's own
  component name, `ReflectionPanel`, and the `reflections`/`onReflect`/
  `reflectOn` naming throughout `CareProtocol.jsx` were already
  "reflection"-based from the start — only the one user-facing word and
  the surrounding prose needed to change.)
- `api/care-notice.js` renamed to `api/care-reflection.js`. This changes
  the live route from `/api/care-notice` to `/api/care-reflection` —
  Vercel's file-based routing picks up the new path automatically, no
  `vercel.json` entry required (there wasn't one for the old path either).
  The old file was deleted outright rather than left behind, so there's no
  stale duplicate endpoint.
- The JSON contract changed to match: the endpoint now returns
  `{ reflection, generatedAt }` instead of `{ notice, generatedAt }`, and
  `CareProtocol.jsx`'s `reflectOn` reads `body.reflection` instead of
  `body.notice`. Client and server changed together — this is a private,
  founder-only endpoint with exactly one caller in this codebase, so there
  was no compatibility window to preserve.
- Console log prefixes updated from `[care-notice]` to `[care-reflection]`
  in both files, so a live error in devtools now points at the right
  filename.
- Comments referring to the feature by name, in `InstrumentRunner.jsx`,
  `CareProtocol.jsx`, and this document, updated to "reflection." Where
  this document quotes an actual message sent at the time, the quote keeps
  the word actually used ("noticed") rather than being rewritten — an
  honest record of what was said shouldn't quietly change after the fact.

Verified: both renamed/edited files parse clean; the full 25 + 5 + 30 test
suite passes unchanged (nothing here touches computation); design audit
shows zero new violations. Grepped the whole tree afterward for
`care-notice`, `body.notice`, and the bare word "noticed" as a UI label to
confirm nothing was missed — the only remaining hits are historical quotes
in this document and unrelated ordinary-English uses of "notice"/"noticed"
(a generic `S.notice` alert-box style, "went unnoticed," etc.), which are
correctly left alone.

---

## 20. The topbar Save button, removed

Direct correction: "get rid of the save buttons at the top." §18 had put a
Save button in both places — the topbar and the bottom of every section —
reasoning that the topbar copy stayed useful since it's reachable
regardless of scroll position. In practice it was just a second, unused
button competing for attention with the one that actually gets pressed.

Removed the `<SaveButton>` from the topbar entirely. The ambient autosave
readout (`● Saved` / `○ Saving…` / `⚠ Not saved`, §14) stays in the topbar
unchanged — that wasn't part of this request, and it's still the passive
signal for the debounced autosave running underneath everything. The five
section-level Save buttons from §18 (Step 1, each core instrument panel,
the Deepen panel) are untouched — they were never in question, only the
redundant sixth one at the top.

Verified: parses clean; the full 25 + 5 + 30 test suite passes unchanged;
design audit zero new violations; production build clean. Rendered the
real `CareProtocolPage` again (mocked login, stateful mock database) and
confirmed exactly five "Save" buttons remain — all at the bottom of their
sections — and the topbar contains only the ambient status text, no
button. See the delivered screenshot.

---

## 21. Section reflections — every Save gets a reading

The clarification that reframed the whole reflection feature: "These are
assessment tools. I want to feel assessed and seen and I'm not getting
that. Every section is a fresh opportunity for something, an insight or
SOMETHING but so far... nothing."

The beats were stated plainly back in §18's round — "I answer the
questions, I hit save, there's some sort of reflection. Those are the
beats" — and §15 wired the reflection to one text box instead of to the
beats. The correction: every section is a disclosure. Rating "being
defended" a 5 and "shared adventure" a 2 says as much about a person as a
paragraph of prose; an assessment tool that files those numbers with only
a save confirmation leaves the person unassessed. So now, every section's
Save — once the save has actually landed — produces a reflection grounded
in that section's actual answers and scores, rendered directly under the
button that was pressed.

**How it works.**

- `SaveButton` gained an optional `onSaved` callback, fired only after a
  save that really landed (fire-and-forget: a slow or failed reflection
  can never make a successful save look unsaved). Each section's button
  passes a payload builder for its own contents.
- Two generic serializers in `CareProtocol.jsx` turn a section into
  readable grounding: `describeAnswers` (likert → "Spoken reassurance:
  4/5" with the scale's anchor labels, choice → the chosen option's label,
  freetext → the person's own words, the forced final pick included) and
  `describeScores` (each instrument's own `score()` output — including
  ECR-RS z-scores against population norms and the care-receiving
  "keeper" flag). Generic over item TYPE, never over instrument identity —
  the same "instrument fourteen is a data task" rule the runner lives by.
- The birth-data section reflects too, from the computed chart (big3,
  Human Design shorthand/authority/definition, Chinese year, life path) —
  no chart yet, no reflection, but Save still works.
- The Deepen panel reflects on whichever optional instruments actually
  have answers, combined.
- `api/care-reflection.js` now takes two modes: the existing freetext blur
  payload (`{prompt, text}`, unchanged, 1–2 sentences) and a section
  payload (`{section: {name, evidence, answers, scores}}`, 2–4 sentences,
  max_tokens 320). The section prompt requires anchoring on specifics —
  highest/lowest, the keeper, tensions — and adapts to the evidence tier:
  measured instruments may speak plainly to what scores indicate
  (translated into something human, never "you scored 73/100"); mapped and
  mythic sections speak in their own tradition's voice without dressing it
  up as scientific fact. Hard rule either way: stay inside THIS section.
  Reading across systems is the synthesis's job, and blurring that line
  would blur the evidence-tier honesty the build stands on.
- Re-pressing Save with unchanged answers doesn't re-spend a model call
  (fingerprint dedupe per section). Saving an unanswered section saves
  normally and just doesn't reflect. Failure renders the same calm
  "didn't load — your answers are still saved" line as the freetext path.

**What didn't change.** The freetext blur reflection stays (it's the
instant turn-of-the-head while writing; the section reflection is the
considered read on Save). The synthesis stays the only place systems are
read together. Nothing is persisted — reflections live in component state
and are gone on reload; the answers themselves are saved exactly as
before.

Verified: both files parse clean; the full 25 + 5 + 30 test suite passes
unchanged; design audit zero new violations; production build clean. Live
harness on the real `CareProtocolPage`: answered all of Step 2 with a
deliberate pattern plus the forced pick, pressed Save, and confirmed the
request carried the real instrument name, every rating, the forced pick,
computed scores, and the evidence tier; the panel rendered through
loading → done under the pressed button; re-saving unchanged answers made
no second call; saving an untouched section saved fine with no call. See
the delivered screenshot.

---

## 22. Depth — the full chart, the full bodygraph, the full day

Two requests in one round: confirm the daily read (§11's Today's Sky) is
actually working — it is; v47 carries it byte-identical, all 30 transit
tests pass against that exact tree, and it renders live for the current
date — and expand the astrology and human design capabilities. Scope chosen
explicitly: full natal chart, richer daily read, element/modality balance,
full bodygraph detail, richer HD daily — all of it in a new founder-only
Depth tab, with the shareable card staying lean.

**New engine module, `src/lib/care/depth.js`** — derived entirely from the
already-validated engines (chart.js, humanDesign.js, transits.js), never
computed in parallel to them:

- `GATE_NAMES` (64) and `CHANNEL_NAMES` (36) — standard keynote names,
  verified complete against the wheel's own gate/channel tables.
- `TYPE_KEYNOTES` — signature and not-self theme for all five types.
- `incarnationCross()` / `crossAngle()` — the four cross gates
  (personality Sun/Earth over design Sun/Earth) with names, plus the angle
  derived from profile (7 right-angle, 4/1 juxtaposition, 4 left-angle).
  Deliberately NOT the traditional proper cross names — those vary by
  school, and inventing them would be fabrication, not computation.
- `natalAspects()` — every classical aspect among the ten bodies plus
  ascendant and midheaven, using the SAME aspectBetween and orbs as the
  daily transit engine, so an aspect means one thing everywhere.
- `computeDepthDaily()` — the richer daily read: the whole transiting sky
  formatted, transiting personal planets (Sun→Mars only — a Pluto transit
  is a months-long story and calling it "today" would be dishonest)
  aspected against all natal planets + ascendant, all thirteen transiting
  HD activations and every temporary channel they form with natal gates
  (channels already fully natal are excluded — nothing about them is
  temporary), and upcoming events: next new and full moon
  (bracket-and-bisect on Sun–Moon elongation) and when current
  retrogrades end (coarse scan + bisect, honestly capped).

**`chart.js`, additive only:** placements now carry `house` (the library's
own Placidus assignment) and the chart carries the 12 `houses` cusps.
Validated against Obama's published chart: Sun 6th, Moon 4th, cusp 1 ≡
ascendant, cusp 10 ≡ midheaven, and every body's assignment re-verified by
manual cusp containment. Charts saved before this field existed simply
lack it — the Depth tab recomputes a display copy from birth data rather
than nagging, and the stored row updates on the next real recompute.

**The Depth tab** (`DepthTab` in CareProtocol.jsx): five panels, all
labelled mythic — the full chart with houses and angles, element/modality
balance bars, natal aspects tightest-first (moss = harmonious, clay =
tense), the bodygraph in full (both activation columns with every gate
named, channels with names, the incarnation cross, strategy / signature /
not-self / authority guidance), and Today in Depth (the sky, aspects to
the natal chart, HD weather with temporary channels in plain sentences,
and Coming Up). The daily read computes after first paint behind a
"reading the sky…" line, since the events search walks the ephemeris
forward. Not on the card, not in any share snapshot.

Verified: new 36-test depth suite (houses vs published chart + manual
containment, aspect re-verification through aspectBetween, name-table
completeness against the wheel, cross structure and angle mapping, daily
invariants, and the events cross-checked against raw ephemeris state —
elongation really is ~0°/180° on the found dates, retro flags really flip
on the found day); the original 25 + 5 + 30 suite passes unchanged —
including the full regression suite over the modified chart.js; design
audit zero new violations (one false positive from naming a Date variable
`at`, which the audit tracks as a token object — renamed the variable);
production build clean; and the real page rendered live with the real
engine seeded from the founder's own birth data — every panel present,
houses rendered, gate names rendered, six temporary channels found for the
test date, and the next full moon (2026-07-29) confirmed against the
ephemeris.

---

## 23. The translation, and the care context — the intake starts playing out

Two-part feedback on the Depth tab, both quoted because they define the
feature: "it gives me almost the equivalent of code... I want all of this
in case I want to explore more but mainly I want it translated to me by
you. or more accurately by the version of you linked to this tool." And,
deeper: "I also wanted to be informed by how I'm telling it I need to be
cared for... if none of it plays out in the rest of the tool then it's
just like being ignored by someone that I want love from."

**The translation.** A new panel at the top of the Depth tab — "THE READ ·
IN PLAIN LANGUAGE" — with one button: "Translate this for me." It sends
the whole depth readout (placements with houses, balance, tightest
aspects, the bodygraph, the cross, today's transits and events) to a new
`depth` mode on `api/care-reflection.js`, which returns 3–5 short
paragraphs: leading with what is genuinely distinctive in THIS chart,
translating every term on contact, speaking the systems' own vocabulary
confidently without dressing it as science, ending lightly on today. The
tables all stay, unchanged, below it — kept for exploring, exactly as
asked.

**The care context.** The deeper fix. A new `buildCareContext()` assembles,
from the founder's own answers: their top-ranked care modes and the one
they'd keep above all others (rankedCareModes), what barely registers,
their measured attachment position in plain language (attachmentReading),
and their own written words (open_wish, open_line). That context now rides
along on EVERY call to `api/care-reflection.js` — freetext reflections,
section reflections, and the depth translation — where the prompts
instruct: let this shape HOW you speak (tone, pacing, emphasis), never as
content to recite back or show off that you know. Someone whose keeper is
"undivided attention" gets a voice that doesn't rush; someone who ranked
"spoken reassurance" high gets told things plainly rather than implied.
The intake now plays out in the rest of the tool — which is the difference
between being assessed by something and being filed by it.

Boundaries that held: care context shapes manner, not content — section
reflections still may not draw content from other sections, and the
synthesis remains the only cross-system reading. Nothing new is persisted;
the context is assembled fresh from saved answers at call time. The
context block is capped server-side (2400 chars) so it can never crowd out
the actual subject of a call.

Verified: both files parse clean; all 96 tests (25 + 5 + 30 + 36) pass
unchanged — no engine files were touched this round; design audit zero new
violations; production build clean. Live harness on the real page, seeded
with the founder's real birth data and a fully answered intake: the
translate button drives loading → rendered paragraphs → "Read it again";
the depth request verified to carry the chart summary (with houses), the
bodygraph, today, AND the care context containing the keeper, the measured
attachment bands, and the founder's own words; a section Save verified to
now carry the same context. See the delivered screenshot.
