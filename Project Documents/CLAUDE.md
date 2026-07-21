# CLAUDE.md — NextUs

Working reference for any Claude session touching this repo. Encodes
design laws, architectural facts, naming conventions, and workflow
protocol. Read this before making design or structural claims about
the codebase.

---

## Purpose & context

NextUs (nextus.world) is a dual-scale platform: personal flourishing
and civilisational flourishing are the same problem at different
scales, held simultaneously in one architecture — the fractal. Two
interlocking layers: **Horizon Suite** (personal) and **Atlas +
Civilisational layer** (civ). Brand sentence: *"A life worth living.
A future worth building."*

---

## Design law: Field Notes & The Atlas

**Status: locked, current law. See `NextUs_Retheme_Master_Spec_v1.md`
for the full build specification and rationale.**

The site runs two visual rails that share one physics and invert
light.

### Rail boundary
- **Field Notes** (personal + shared chrome): Horizon Suite, Mission
  Control, onboarding, auth, nav, footer, homepage. Daylight is the
  front door — default here when ambiguous.
- **The Atlas** (civilisational): Atlas directory, actor pages,
  constellations, Actor Calls, PlanetMap, Earth Challenge surfaces.

### Palettes
Import from `src/lib/designTokens.js` — never hardcode hex.
- Field Notes: `fn.ground` #E9EDE4 (sage paper) · `fn.object` #F4F5EF
  (leaf) · `fn.ink` #26302A (graphite) · `fn.moss` #6E7F5C (living) ·
  `fn.clay` #B45A3C (attention)
- The Atlas: `at.ground` #10222B (sea ink) · `at.object` #16303B
  (chart panel) · `at.text` #EAF1ED · `at.verdigris` #58A08A (living
  systems) · `at.brass` #D9B24A (human coordination)

### Gold — heritage only, seriously toned down
Gold (`#C8922A` / `#A8721A`) survives ONLY in: the logo/wordmark
(image assets, untouched), beacon components (BeaconStrip, BeaconFire,
BeaconLantern, PublicBeacon — constellation stars/sparks), and ≤3
additional explicitly approved moments (tracked in
`scripts/audit-design.js` `GOLD_WHITELIST`, e.g. the FOUNDER chip).
Everywhere else gold is retired — no new usages without sign-off.
Enforced mechanically by the `gold` law in `scripts/audit-design.js`.

### Typography
- `display` → Fraunces — "the thing": titles, card headings, ≥18px
- `bodyFont` → Newsreader — reading text, meta, user voice
- `mono` → IBM Plex Mono — chrome: eyebrows, labels, status,
  coordinates
- Cormorant Garamond / Cormorant SC / Lora are RETIRED. Enforced by
  the `legacyfont` law in `scripts/audit-design.js`.
- Type hierarchy ratio (identical both rails): the-thing ≥20px
  Fraunces · about-the-thing 14–15px at meta opacity · utility 13px
  mono, letterspaced.

### Shadow pair (one physics, two media)
- Field Notes: paper casts shadow — warm, ink-based (`shadow.fn.rest`
  / `shadow.fn.lift`)
- The Atlas: objects lift with light + depth — black-based, plus a
  light top edge on interactive cards (`shadow.at.rest` /
  `shadow.at.lift`)
- Apply ONLY to interactive objects. Static panels stay flat with
  hairline rules.

### Signature elements (do not cross rails)
- Field Notes: the **top rule** on cards — 3px top border, moss =
  living thread, clay = asking for attention. Progress = segmented
  hand-ruled lines filling moss.
- The Atlas: the **survey grid** on the ground, **coordinate chrome**
  (mono, top-right of cards), progress as a plotted course
  (verdigris→brass gradient track).

### Status chrome (identical both rails)
`● synced` / `saving…` / `⚠ retrying` — 13px mono, ghost opacity,
consistent position. Dot colour: moss (FN) / verdigris (AT).

### Affordance discipline
Available actions = dashed ghost buttons. Solid/filled = only the one
thing the platform is pointing at right now. Danger = colour shift,
never a decorated button.

---

## Design laws (non-negotiable, carried forward)

- Font floor: 13px minimum (Mission Control chrome 10–12px is
  accepted backlog, not new violations)
- Opacity floor: 0.55 for text
- No `style=` props on SVG elements (Chrome 148 constraint — use
  presentation attributes or wrapper divs)
- No `100vh` — use `100dvh`
- No em-dashes in UI copy (use middot `·`)
- British spelling throughout
- Italic reserved exclusively for user-authored content (`userVoice`
  token only)
- Run `node scripts/audit-design.js` before every delivery — zero new
  violations required, including the `gold` and `legacyfont` laws in
  scopes already converted

---

## Platform architecture facts

- The fractal is structural: personal domain wheel and civ domain
  wheel share the same form — same scale, same grammar, same shell.
- Actor ownership on `nextus_actors` is `profile_owner` ONLY — no
  `owner_id` column exists on that table. `owner_id` exists on
  `actor_calls` only.
- Recurring route bug: a new page built but never imported into
  `App.jsx` + never given a `<Route>` — the catch-all wildcard then
  swallows every click. Any new page requires BOTH import AND Route
  registration in the same change.
- Client-side Supabase calls whose results are never checked are a
  systemic vulnerability class.

---

## Naming conventions

- Target Stretch (not Target Sprint)
- "Terran Ecosystem": going-forward display term for Nature-domain
  framing. Does NOT replace the `nature` machine slug.
- "Constellation" replaces "conglomerate"
- Horizon Suite tools canonical order: Foundation → Purpose Piece →
  The Map → Target Stretch → Horizon Practice

---

## Working protocol

- **Build, don't draft**: when asked for something concrete, build
  it.
- Read the repo (or confirm file state) before making any claims
  about the codebase.
- Deliver changed-files-only zips under `Website-New-main/` wrapper.
  Never full repo unless explicitly requested.
- Each zip is a superset of prior work, not an incremental patch.
- SQL migrations: sequential three-digit numbering in `sql/`; run
  manually in Supabase SQL editor. Verify the next available number
  before writing one.
- **Retheme work specifically**: ZERO logic changes. Any diff that
  touches logic/data/API/SQL alongside a style change gets rejected
  in review. Reskin only.

### Delivery verification checklist
1. `npx esbuild [file] --loader:.jsx=jsx --jsx=automatic --bundle=false --format=esm --outfile=/dev/null` for JSX
2. `node --check` for CJS API files
3. `node scripts/audit-design.js` — zero new violations
4. Confirm new pages have both import AND Route in `App.jsx`
5. Confirm migrations don't collide with existing numbers

---

## Tools & resources

- **Stack**: React/Vite, Supabase, Vercel, Anthropic API, Resend
- **Design tokens**: `src/lib/designTokens.js` (single source of
  truth, both rails) · `src/app/components/mission-control/tokens.js`
  (Mission Control bridge — Self stage maps to Field Notes, Civ stage
  maps to The Atlas)
- **Enforcement**: `scripts/audit-design.js` — laws: size, opacity,
  italic, svg, vh, gold, legacyfont
- **Reference artefact**: `nextus-design-iterations.html` — the
  approved Field Notes / Atlas visual targets
