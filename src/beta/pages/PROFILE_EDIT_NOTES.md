# Module 3 — Profile Edit: Notes

The page renders at `/beta/profile/edit`. This file holds the wiring decisions and references the live schema.

This is the **fixed** version of Module 3, post-consolidated-migration. The `_beta` overlay pattern was abandoned; this surface writes directly to the canonical `contributor_profiles` table.

---

## Wiring this in

Add to `src/App.jsx`:

```jsx
import BetaProfileEdit from './beta/pages/BetaProfileEdit'

// inside <Routes>
<Route path="/beta/profile/edit" element={<BetaProfileEdit />} />
```

That's it. No SQL to run; the consolidated migration already landed every column this surface needs.

---

## Schema this surface uses

All tables already exist after the consolidated migration ran.

### `contributor_profiles` (one row per user, PK is `id`)

| Column | Used for |
| --- | --- |
| `id` | Primary key. FK to `auth.users.id`. Read/written via `.eq('id', userId)`. |
| `display_name` | "Display name" field. Auto-saves on blur. |
| `headline` | "Headline" field. Auto-saves on blur. |
| `what_i_stand_for` | First "I am" statement. Auto-saves on blur. |
| `count_on_me_for` | Second "I am" statement. Auto-saves on blur. |
| `dont_count_on_me_for` | Third "I am" statement. Auto-saves on blur. |
| `engaged_civ_domains` | Multi-select. Saves on Save click. |
| `engaged_self_domains` | Multi-select. Saves on Save click. |
| `engaged_principles` | Multi-select. Saves on Save click. Drives the alignment editor. |
| `location_focus_id` | Reserved for future Focus picker. Not yet wired. |

**Note on the FK column:** the existing `contributor_profiles` table uses `id` as both primary key and the FK to `auth.users.id`. The user's auth uuid is the row identifier, not a separate `user_id` column. Every query and update against this table uses `.eq('id', userId)`.

### `artefact_visibility`

One row per (user, artefact_type, artefact_id). Default state when no row exists is `private`.

Mapping from UI control to row:

| UI control | `artefact_type` | `artefact_id` |
| --- | --- | --- |
| "What I stand for" toggle | `ia_statement` | `what_i_stand_for` |
| "Count on me for" toggle | `ia_statement` | `count_on_me_for` |
| "Don't count on me for" toggle | `ia_statement` | `dont_count_on_me_for` |
| Public placement bundle toggle | `focus_claim` | `placement_bundle` |
| Each active sprint | `sprint` | `<sprint id>` |
| Each completed sprint | `sprint_completion` | `<sprint id>` |

The wheels do not write rows. Both the Self wheel and the Civilisational wheel are the user's own navigation — neither is published.

The migration's enum still includes `wheel_self` and `wheel_civ` for future use (saved snapshots, comparison views). This surface does not use them.

### `principle_taggings`

For per-principle weight (`primary` / `secondary` / `tertiary`). Written by the alignment editor via `tagPrinciple` from Module 1.5. Rows use `target_type='contributor'`, `target_id=<userId as text>`.

### `contributor_principle_notes`

For per-principle short note. Primary key is `(user_id, principle_slug)`. Created by the consolidated migration. The alignment editor writes here on save.

### `target_sprint_sessions`

Read-only from this surface. Active sprints filter on `status = 'active'`; completed sprints filter on `completed_at IS NOT NULL`, ordered by `completed_at` desc, top six. Module 3's `SprintsVisibilitySection` does this defensively (probes for column names) but the live schema confirms `status` and `completed_at` exist as expected.

---

## Auto-save vs save buttons

- **Auto-save on blur:** display name, headline, the three "I am" statements.
- **Explicit save buttons:** the three multi-selects (civ domains, Self domains, principles), the principle alignment editor.
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
- It does not gate principle taggings or visibility through the Horizon Floor admission check. Profile editing is between the user and their own profile; the admission check fires on contributions out into the platform (actors, practices, bilateral artefacts, nominations).

---

## Beta gating

This surface is reachable at `/beta/profile/edit`. Beta gating happens at the route level via the existing `AccessGate` / `AuthGate` components in `src/components/`. Beta users are the ones with `users.beta_group` set non-null and a `('beta', 'full')` row in `access`.

When wrapping the route in `App.jsx`, use whatever gate component the rest of the `/beta/*` routes use. This component does not enforce its own gate.

---

## "I am..." statements — flagged

The brief described "visibility toggles for each 'I am' statement." This module treats the three free-text columns on `contributor_profiles` (`what_i_stand_for`, `count_on_me_for`, `dont_count_on_me_for`) as the toggleable statements.

The canonical per-domain "I am..." statements (the ones generated by the Horizon Goal process inside The Map) live on `horizon_profile.ia_statement` per Self domain row. They are not edited from this surface — they are generated by The Map. A future module may surface them here with their own visibility toggles. The wiring already supports it: both sets share the `ia_statement` namespace cleanly via different `artefact_id` keys (column name for the contributor-profile statements; domain slug for the per-domain ones). No collision.
