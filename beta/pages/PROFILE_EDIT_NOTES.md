# Module 3 — Profile Edit: Notes

The page renders at `/beta/profile/edit`. This file holds the wiring decisions that aren't obvious from reading the code, plus the open items that the next module touches.

---

## Wiring this in

Add to `src/App.jsx`:

```jsx
import BetaProfileEdit from './beta/pages/BetaProfileEdit'

// inside <Routes>
<Route path="/beta/profile/edit" element={<BetaProfileEdit />} />
```

Add to `src/constants/routes.js` if route constants are used in the nav:

```js
betaProfileEdit: '/beta/profile/edit',
```

The "View public profile" button opens `/beta/profile/<userId>` in a new tab. That route is the public profile module's job, not this one. Until that module ships, the button opens a 404 — that is fine. The contract is held here.

---

## Visibility model

Every visibility toggle reads and writes `artefact_visibility`. Default state when no row exists is `private`. The hook only writes a row on user action.

Mapping from UI → `artefact_visibility` columns:

| UI control | `artefact_type` | `artefact_id` |
| --- | --- | --- |
| "What I stand for" toggle | `ia_statement` | `what_i_stand_for` |
| "Count on me for" toggle | `ia_statement` | `count_on_me_for` |
| "Don't count on me for" toggle | `ia_statement` | `dont_count_on_me_for` |
| Public placement bundle toggle | `focus_claim` | `placement_bundle` |
| Each active sprint | `sprint` | `<sprint_id>` |
| Each completed sprint | `sprint_completion` | `<sprint_id>` |

The wheels do not write rows. Both the Self wheel and the Civilisational wheel are the user's own navigation — neither is public.

The Module 1 enum still includes `wheel_self` and `wheel_civ`. Those values are not used by this surface and may be removed or repurposed in a future schema revision. Flagged.

---

## Principle alignment

The editor reads engaged principles from `contributor_profiles_beta.engaged_principles`. The user toggles principles on the multi-select section above; the editor card list updates from that selection.

Per-principle weights are written as `principle_taggings` rows with `target_type='contributor'` and `target_id=<userId>`, via `tagPrinciple` from Module 1.5. Removing a principle from the multi-select also removes its tagging row on the next save.

Per-principle notes are written to `contributor_principle_notes`. **This table does not exist yet.** The component handles its absence gracefully — weight saves succeed, note saves are skipped with a console warning. When the next module (or a small Module 1 follow-on) adds the table, notes start persisting automatically.

Suggested shape:

```sql
create table contributor_principle_notes (
  user_id        uuid not null references auth.users(id) on delete cascade,
  principle_slug text not null references platform_principles(slug),
  note           text,
  updated_at     timestamptz not null default now(),
  primary key (user_id, principle_slug)
);
```

---

## "I am" statements — flagged

The brief described "visibility toggles for each 'I am' statement." Module 1 gives three free-text fields on `contributor_profiles_beta`: `what_i_stand_for`, `count_on_me_for`, `dont_count_on_me_for`. This module treats those three as the toggleable statements.

Nik flagged in this session that the canonical "I am..." statements are something else (the per-domain statements written inside The Map / Dashboard). Those statements live on `horizon_profile.ia_statement` per Self domain row and are not edited from this surface.

Both sets of statements share the `artefact_type='ia_statement'` namespace and never collide on `artefact_id`:
- The three contributor-profile statements use the column name as `artefact_id`.
- The seven per-domain statements would use the domain slug as `artefact_id`.

If a future module decides to publish the per-domain statements, they will plug into the same `artefact_visibility` shape with no collision. If the canonical "I am..." statements need their own enum value, that is a Module 1 schema revision — flag for that thread.

---

## Sprints — defensive read

`SprintsVisibilitySection` reads from `target_sprint_sessions`. The exact column names for "completed at" and "title" vary across the existing schema (different versions of the sprint tool used different fields). The component tries a small set of candidate column names and falls back to a generic display label if none resolves.

If the table is missing entirely, the section renders the honest empty state ("Sprint history is not available yet on this account") rather than failing the page.

---

## Auto-save vs save buttons

- **Auto-save on blur:** all free-text fields (display name, headline, the three statements, the per-principle note textarea inside the alignment editor — though the alignment editor's notes are saved as part of the "Save alignment" button rather than per-textarea blur, since they batch with the weights).
- **Explicit save buttons:** the three multi-selects (civ domains, Self domains, principles) and the principle alignment editor.
- **Optimistic, instant:** all visibility toggles.

The footer message names this contract for the user in one line: *"Free-text fields save when you click away. Selections save when you press Save. Visibility changes are instant."*

---

## Mobile

The page uses `max-width: 760px` and `padding: 0 20px` on the container. Sections use `display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr))` for two-column rows that collapse to one column under ~520px. Inline action rows use `flex-wrap: wrap`. No fixed widths anywhere.

---

## What this module does not do

- It does not build the wheel components themselves. The toggle frame is here; the wheels render in their own module and slot in via the `selfSlot` / `civSlot` props on `WheelsToggleSection`.
- It does not build the public profile page at `/beta/profile/<userId>`. That is a separate surface.
- It does not build the curator review UI for any flagged content. Module 1.5 owns the queue table; the surface to work it lives elsewhere.
- It does not gate principle taggings or visibility through the Horizon Floor admission check. Profile editing is between the user and their own profile; admission check fires on contributions out into the platform (actors, practices, bilateral artefacts, nominations).
