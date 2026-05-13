# Module 1.5 — Principles & Horizon Floor: Usage

This document is the contract between Module 1.5 and every module that comes after it. If you are building a profile, mission control, organisation page, domain page, practice surface, or admin tab, and your work touches the four cross-domain platform-level principles or the Horizon Floor, you consume the primitives in this folder. You do not roll your own.

When this contract is held, the platform stays coherent. When modules reinvent these surfaces, the substrate fragments.

---

## What lives here

```
src/beta/components/
  PrincipleBadge.jsx
  PrincipleStrip.jsx
  PrincipleExplainer.jsx          (also exports PrincipleIndex)
  HorizonFloorCard.jsx
  HorizonFloorAdmissionCheck.jsx
  GradientPosition.jsx
src/beta/hooks/
  useTaggedPrinciples.js          (also exports tagPrinciple, untagPrinciple, fetchEntitiesEngagingPrinciple)
  useHorizonFloorStatus.js        (also exports flagForReview, setHorizonFloorStatus)
src/beta/constants/
  principles.js                   (canonical principle data — mirror of the platform_principles seed)
  horizonFloor.js                 (canonical Horizon Goal + explainer per domain)
```

**No SQL ships in this module.** Every table and seed Module 1.5 needs (`platform_principles`, `principle_taggings`, `horizon_floor_review_queue`, plus the four canonical principles seeded into `platform_principles`) was landed by `sql/beta/000_consolidated_beta_migration.sql`. The principles in `src/beta/constants/principles.js` mirror that seed exactly. When the definitions evolve, both files change in the same commit.

---

## The four canonical principles

| Slug | Label |
| --- | --- |
| `indigenous-relational` | Indigenous & Relational |
| `substrate-health` | Substrate Health |
| `not-knowing-stance` | The Not-Knowing Stance |
| `legacy-temporal-dimension` | Legacy as Temporal Dimension |

Definitions live in `src/beta/constants/principles.js` and the `platform_principles` table. Inline duplication of these strings anywhere else in the codebase is forbidden — import from constants.

---

## The seven domains (Horizon Floor)

Each domain has a canonical Horizon Goal (forward-only, affirmative) and an explainer paragraph (does the floor work — names the wound and what the platform refuses to host). Both live in `src/beta/constants/horizonFloor.js`.

Slugs: `human-being`, `society`, `nature`, `technology`, `finance-economy`, `legacy`, `vision`.

---

## When to use each primitive

### `PrincipleBadge`

Use this anywhere a single principle needs to be surfaced as a chip with a click-to-define affordance.

```jsx
import PrincipleBadge from 'src/beta/components/PrincipleBadge'

<PrincipleBadge slug="substrate-health" weight="primary" />
```

Weight is one of `primary`, `secondary`, `tertiary`. Weight is positional — it tells the reader how central the principle is to the entity carrying the badge. Definition is identical regardless of weight.

### `PrincipleStrip`

Use this on actor cards, practice cards, indicator rows, contributor profiles — anywhere an entity carries multiple principle taggings. Shows up to four; collapses the rest behind "+ N more."

Three input shapes accepted; pick the one that matches your data:

```jsx
// From useTaggedPrinciples — preferred for live data
<PrincipleStrip taggings={taggings} />

// Static convenience shape
<PrincipleStrip principles={[
  { slug: 'substrate-health', weight: 'primary' },
  { slug: 'indigenous-relational', weight: 'secondary' },
]} />

// Slug-only — all rendered as primary
<PrincipleStrip slugs={['substrate-health', 'not-knowing-stance']} />
```

Also exports `EntityPrincipleEmptyState` — use this when an entity has principle taggings but no other content to display:

```jsx
import { EntityPrincipleEmptyState } from 'src/beta/components/PrincipleStrip'

<EntityPrincipleEmptyState slugs={tagging.principle_slugs} />
```

Renders the canonical sentence: "This entity engages the [label] principle. Definition: [text]." No filler. If multiple slugs are passed, the canonically-first principle is used.

### `PrincipleExplainer`

Use this for the principle's own page (e.g. `/beta/principles/substrate-health`) or as a modal triggered from a "What is this?" affordance.

```jsx
import PrincipleExplainer from 'src/beta/components/PrincipleExplainer'

<PrincipleExplainer
  slug="substrate-health"
  mode="page"
  linkBuilder={({ targetType, targetId }) =>
    targetType === 'actor' ? `/nextus/actors/${targetId}` : null
  }
/>
```

`PrincipleExplainer` fetches the entities engaging a principle automatically. Pass `linkBuilder` if you want those entities to be clickable. Return `null` from `linkBuilder` to render entities as plain text.

The exported `PrincipleIndex` component renders all four principles as a vertical card stack — useful for `/beta/principles`.

### `HorizonFloorCard`

Use this on every domain page (full variant) and inside contribution flows (compact variant). Renders the Goal forward-only and the explainer paragraph that makes the floor visible.

```jsx
import HorizonFloorCard from 'src/beta/components/HorizonFloorCard'

// On a domain page
<HorizonFloorCard domainSlug="society" variant="full" />

// Inside a card or modal
<HorizonFloorCard domainSlug="society" variant="compact" />

// Goal-only (rare — full + explainer is the default for a reason)
<HorizonFloorCard domainSlug="society" showExplainer={false} />
```

### `HorizonFloorAdmissionCheck`

The admission flow primitive. Drop this into:

- the public nomination flow at `/beta/nominate`
- the admin Extract / Actors save flow inside `/beta/admin`
- the practice submission flow at `/beta/practices`
- bilateral artefact creation flows

Behaviour:

```jsx
import HorizonFloorAdmissionCheck from 'src/beta/components/HorizonFloorAdmissionCheck'

<HorizonFloorAdmissionCheck
  domainSlug={primaryDomain}
  contextLabel="this practice"
  onResolve={async ({ status, reason }) => {
    if (status === 'compatible') {
      await savePractice({ horizon_floor_status: 'compatible' })
    } else if (status === 'flagged_for_review') {
      const saved = await savePractice({ horizon_floor_status: 'flagged_for_review' })
      await flagForReview('practice', saved.id, reason)
    } else if (status === 'withdrawn') {
      // discard the in-flight submission
    }
    closeFlow()
  }}
  onCancel={() => closeFlow()}
/>
```

The component does not save the underlying submission. The parent flow does. The component records only the contributor's stated stance.

Explicitly incompatible content is **not blocked here**. That is a curator decision, made downstream. This surface only routes the submission to the right queue.

### `GradientPosition`

Use this anywhere the Invitation Architecture lens is being surfaced — Technology actors, Finance & Economy actors, Practices on the extractive-to-regenerative gradient.

```jsx
import GradientPosition from 'src/beta/components/GradientPosition'

<GradientPosition
  position={-0.4}                  // [-1, 1] — negative = extractive
  trajectory="improving"            // 'improving' | 'static' | 'worsening' | number
  label="Current practice gradient"
/>
```

This is a presentation primitive. Module 1.5 does not bind it to actors. The Technology / HyaPak module will read `gradient_position` and `gradient_trajectory` from `nextus_actors` (those columns landed in the consolidated migration) and pipe them in.

---

## Hooks

### `useTaggedPrinciples(targetType, targetId)`

```js
import { useTaggedPrinciples } from 'src/beta/hooks/useTaggedPrinciples'

const { taggings, loading, error, reload } = useTaggedPrinciples('actor', actorId)
```

Returns rows from `principle_taggings` enriched with the canonical principle definition, sorted in display order (primary first, then by canonical principle order). Pass `taggings` straight into `PrincipleStrip`.

Valid `targetType`: `actor`, `practice`, `indicator`, `domain_entry`, `contributor`.

### `tagPrinciple(targetType, targetId, principleSlug, weight)`

Server action. Idempotent on `(target_type, target_id, principle_slug)` — calling again with a new weight updates the existing row. The unique constraint that backs this lives on `principle_taggings`.

```js
import { tagPrinciple } from 'src/beta/hooks/useTaggedPrinciples'

await tagPrinciple('actor', actorId, 'substrate-health', 'primary')
```

Throws on invalid slug, invalid weight, or invalid target type. Validate inputs in the calling UI; do not catch and swallow.

### `untagPrinciple(targetType, targetId, principleSlug)`

Removes a single tagging. Used in admin reclassification UI.

### `fetchEntitiesEngagingPrinciple(principleSlug, options)`

Read-only. Returns rows from `principle_taggings` for one principle, grouped or filtered by the caller. Used internally by `PrincipleExplainer`. Available for any surface that needs a "see all entities engaging X" view.

### `useHorizonFloorStatus(actorId)`

```js
import { useHorizonFloorStatus } from 'src/beta/hooks/useHorizonFloorStatus'

const { status, loading, error, reload } = useHorizonFloorStatus(actorId)
// status: 'compatible' | 'flagged_for_review' | 'incompatible'
```

Reads `nextus_actors.horizon_floor_status`.

### `flagForReview(...)`

Two signatures. Both supported.

```js
// Module 1.5 brief signature — actors only
await flagForReview(actorId, reason)

// Richer form for non-actor flows
await flagForReview('practice', practiceId, reason)
await flagForReview('contribution', contributionId, reason)
await flagForReview('bilateral_artefact', artefactId, reason)
await flagForReview('nomination', nominationId, reason)
```

Both forms write to `horizon_floor_review_queue`. The actor form additionally sets `nextus_actors.horizon_floor_status` to `flagged_for_review`. Other target types are tracked solely through the queue table — their parent tables already carry their own `horizon_floor_status` column where applicable (`nextus_practices`, `nextus_bilateral_artefacts`).

### `setHorizonFloorStatus(actorId, status)`

Curator-side action. Validates against the locked status list (`compatible`, `flagged_for_review`, `incompatible`). Use from the curator review surface.

---

## Empty states

When an entity has no principle taggings, render nothing — `PrincipleStrip` returns null. Do not show "no principles tagged."

When a domain page renders `HorizonFloorCard` and the live actor list under it is empty, the explainer still does the work. Do not paper over the absence with filler — the not-knowing stance applies here too.

When `PrincipleExplainer` finds no entities engaging a principle, it says: "This principle is part of the platform's orienting commitments. No entities have been tagged against it yet. Definition above." No filler.

---

## Voice rules followed by these primitives

The following are non-negotiable inside any surface that uses these primitives. If you wrap them, do not break these:

- The Horizon Floor admission flow voice is grown-up, not preachy. The Horizon is the commitment. The user reads it and confirms. No "are you sure?" theatre.
- The principle definitions are canonical. Do not paraphrase. Do not summarise. Do not strip the question marks.
- No em dashes in personal-tone copy that you write around these primitives.
- No italic on system-generated text.
- British spelling.
- Only the locked design tokens. No new opacity values, no new background colours, no Inter, no system fonts.

---

## Conventions for downstream modules

1. **Read constants before writing UI.** If you need a principle's label or definition, import from `src/beta/constants/principles.js`. If you need a domain's Horizon Goal or explainer, import from `src/beta/constants/horizonFloor.js`.
2. **Tag at the moment of admission.** When a contributor submits an actor or practice, capture the principle taggings in the same flow that runs the Horizon Floor admission check. Surfaces that need to add taggings later still go through `tagPrinciple`.
3. **Render with `PrincipleStrip` on cards, `PrincipleBadge` only when you have one principle to show.** Avoid building bespoke badge layouts.
4. **Use `HorizonFloorCard` on every domain page.** Do not write your own Goal + Explainer block.
5. **Wire `HorizonFloorAdmissionCheck` into every public submission surface.** Compatible writes status `compatible`. Flagged routes through `flagForReview`. Withdrawn discards the submission.
6. **Validate principle slugs and weights at the boundary.** `isValidPrincipleSlug` and `isValidPrincipleWeight` are exported from constants; use them on form input before calling `tagPrinciple`.

---

## Database tables this module reads and writes

All tables exist after the consolidated migration. Reference for callers:

| Table | Role |
| --- | --- |
| `platform_principles` | Canonical principle catalog. Read-only for app code; seeded by the migration. |
| `principle_taggings` | Polymorphic taggings. Written by `tagPrinciple`. Read by `useTaggedPrinciples` and `fetchEntitiesEngagingPrinciple`. Unique on `(target_type, target_id, principle_slug)`. |
| `nextus_actors.horizon_floor_status` | One of `compatible`, `flagged_for_review`, `incompatible`. Written by `flagForReview('actor', ...)` and `setHorizonFloorStatus`. |
| `horizon_floor_review_queue` | Curator review queue. Polymorphic. Written by `flagForReview` for any target type. |

---

## What this module deliberately does not do

- It does not gate or block submissions on Horizon Floor compatibility. The contributor states their stance; curators decide.
- It does not bind `GradientPosition` to actor data. That belongs in the Technology / HyaPak module.
- It does not build the curator review surface itself. The queue table is here; the UI for working it is a separate module.
- It does not seed actor or practice data. Those are downstream.

The architecture surfaces uncertainty. Humans decide.
