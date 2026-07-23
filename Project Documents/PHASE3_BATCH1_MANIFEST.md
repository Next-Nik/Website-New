# Phase 3 · Batch 1 — PlanetMap + Earth Challenge surfaces

Scope: the whole `src/tools/planet/` folder (PlanetMap, PlanetWheel,
PlanetDomainCard, PlanetGapSignal, ActorClaimGate) plus `EarthLive.jsx`,
`EarthJourney.jsx`, `EarthIntro.jsx`, and `ChallengePage.jsx`
(the public `/stretch/c/{slug}` challenge page).

## Result
- Gold: 3228 → 3132 (96 fixed, all within this batch)
- Legacyfont: 645 → 635 (10 fixed, all within this batch)
- esbuild: all 9 changed .jsx files pass
- Zero logic changes — colour/font/token literals only

## This batch was a bigger lift than Mission Control (Batch 1 of Phase 2)
Mission Control already had rail-aware `fn`/`at` tokens threaded through
from Phase 1, so that batch was mostly gold-hex swaps. These files were
still fully Field-Notes-styled — light paper ground, ink text, white
cards — even though Master Spec §1 places them on The Atlas. So this
batch is a genuine reskin: ground, card surfaces, text colour, borders,
and accents all moved from `fn.*`/hardcoded light values to `at.*`.

## Judgement calls
- **`PlanetMap.jsx`**: added a shared `ATLAS_GROUND` constant (sea-ink
  ground + the survey-grid background per §2.1/§2.6) used by every
  page-level wrapper in the file. Eyebrow labels that used gold as pure
  decoration became plain `atText`-style ghost mono (matching §2.7);
  gold that was doing semantic work (primary CTA, progress fill,
  synthesis accent) became `at.verdigris`. Error/gap colours moved to
  the dark-bg desaturated red (`#C97064`) per §2.7's status-chrome rule.
- **`PlanetWheel.jsx` / `PlanetDomainCard.jsx` / `PlanetGapSignal.jsx` /
  `ActorClaimGate.jsx`**: same verdigris-for-living-accent /
  brass-for-label pattern, extended to SVG fills/strokes and form
  inputs. `PlanetDomainCard`'s expandable card picked up the Atlas
  shadow pair (`shadow.at.rest`) since it's interactive.
- **`EarthLive.jsx`**: this page's entire visual identity *is* the
  beacon (bespoke `AMBER`/`GOLD_T`/`CREAM` constants) — squarely inside
  the beacon exception in Master Spec §4.2, so I left that palette
  alone. Only one literal `#C8922A` (not the file's own amber
  constants) and the base ground hex were brought in line with the
  canonical `at.ground`.
- **`EarthJourney.jsx`**: mixed rig — `tokens.bg`/`tokens.bgCard` (the
  Phase 1 Field-Notes bridge) for the base page and a bespoke dark
  hero band layered on top. Since Master Spec §1 explicitly lists
  `/earth/journey` under The Atlas, converted the whole page (base
  ground, resume card, chapter markers, the `Vault` sub-component) to
  `at.*`. Local `GOLD`/`CHROME` constants were redefined in place
  (brass for labels, verdigris for the progress thread/done-state)
  rather than touched at every call site.
- **`ChallengePage.jsx`** (1239 lines, the largest file in this batch):
  found a **live bug** — it references `tokens.gold` and
  `tokens.goldChrome`, but the Phase 1 `designTokens.js` bridge object
  never defined those keys, so every gold-styled element on this page
  has been rendering with `color: undefined` since Phase 1 shipped.
  Fixed by pointing the local `gold`/`GOLD_C` shortcuts and the
  `Btn` component's `primary` variant at `at.brass` / `at.verdigris`
  directly, then swept the rest of the file's raw
  `rgba(200,146,42,…)` / `rgba(168,114,26,…)` instances the same way.
  Also caught and reverted a bad blanket substitution that had turned
  the four modal backdrop scrims light instead of dark — backdrops
  stay dark regardless of rail.
- **QR code colours** in `ChallengePage.jsx` (`#0F1523`/`#FFFFFF`) were
  left untouched — a QR code needs real dark-on-light contrast to
  scan, so this is a functional exception, not a missed conversion.
- **`horizonScalePlanet.js`**: NOT modified. Its one `#C8922A` is the
  "Finance & Economy" domain's identity colour, and the file header
  says "Locked May 2026 — do not modify without explicit instruction."
  Added it to `audit-design.js`'s `GOLD_WHITELIST` with a comment
  instead of touching the locked file. Flagging for you — happy to
  change that domain's colour if you'd like it off the gold family,
  but wanted your call rather than assuming.

## Left for the next batch
Still in `/stretch` + challenge scope, not yet touched:
- `ChallengeAuthor.jsx` (23 gold hits) — the challenge-authoring flow
- `ChallengeBrowse.jsx` (7), `MyChallenges.jsx` (2), `ConstellationPage.jsx` (3)
- `challenge/` components: `BroadcastComposer.jsx` (2), `BroadcastFeed.jsx` (1),
  `ChallengeLineage.jsx` (1), `IntensityInfo.jsx` (1)

Beyond that, per Master Spec §1's Atlas list, still untouched: Atlas
search + actor directory (`Search.jsx`, `FocusIndex.jsx`, `FocusProfile.jsx`),
actor profile / claim / propose (`OrgPublic.jsx`, `OrgManage.jsx`,
`MemberPublic.jsx`, `Claim.jsx`, `Nominate.jsx`, `Add.jsx`), Constellations
(`ConstellationRecord.jsx`, `ConstellationLedger.jsx` — currently zero
gold hits, may already be clean or just untouched-and-light), and
AdminConsole's Atlas/Seed tabs.

## Verification run
```
node scripts/audit-design.js --law=gold        # 0 hits in this batch's files
node scripts/audit-design.js --law=legacyfont  # 0 hits in this batch's files
npx esbuild <each changed .jsx> --loader:.jsx=jsx --jsx=automatic --bundle=false --format=esm --outfile=/dev/null   # all pass
node --check scripts/audit-design.js           # syntax OK
```
