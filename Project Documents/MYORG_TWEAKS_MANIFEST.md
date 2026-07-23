# My Org tweaks · 20 July 2026 (v2 — overwrite with tiers)

Both live app-tree files only (src/pages/MissionControl.jsx is unrouted legacy — not touched).

## Files
- src/app/pages/MissionControl.jsx — MY ORG tile moved to the TOP of the Our Planet rail.
- src/app/components/mission-control/MyOrgMissionPanel.jsx —
  1. "Your spine" → "Your org tree".
  2. Update-from-URL, tiered overwrite:
     - Reads a URL via existing /api/org-extract, shows a plan before writing.
     - HARD LOCK — never written, structurally unreachable (not in the write arrays): owner-voice (mission, working-on-now, offers, five showcase fields), identity/ownership (profile_owner, claimed, slug, id), relationships/provenance, and everything earned by action — galleries, moments, sparks, tended thing, field-guide ties.
     - WARN — replaced only on explicit confirm, with a per-field "Keep my …" checkbox to protect anything hand-written: description, tagline, what-you-offer (impact_summary), domain, scale, location.
     - SILENT — updated without asking: website, logo (image_url).
     - Empty fields are filled; only already-set fields that would change trigger the warning. Button reads "Overwrite and update" when any replace is live, "Update" otherwise.

## Manual steps
None. No schema, no bucket. Uses org-extract (already live).

## Verify
esbuild passes both files. No token files touched. Write targets are exactly the 8 evidence columns above — grep-confirmed nothing else is writable through this control.
