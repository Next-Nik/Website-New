// src/app/util/purposePiece.js
//
// Single source of truth for reading archetype / domain / scale out of a
// purpose_piece_results row. The table has gone through multiple writer
// eras and any given user's row may carry the values at a different path:
//
//   v10+    top-level archetype/domain/scale string columns
//   v9-ish  profile column (jsonb) with archetype/domain/scale fields
//   pre-v9  session.tentative.{archetype.archetype, domain.domain, scale.scale}
//           or session.p4Profile.{archetype, domain, scale}
//           or session.{archetype, domain, scale} directly
//
// Anywhere in the codebase that reads PP results should go through this
// helper. The MissionControl page's formatPlacement() inlines the same
// logic; if you change one, change the other (or refactor MC to use this).
//
// TODO (next session): refactor MissionControl.jsx's formatPlacement and
// civPlacementKey to call resolvePurposePiece() instead of duplicating
// the path-walking. Out of scope for the focus-anchor fix.
//
// Returns { archetype, domain, scale } with null for any field that
// couldn't be resolved. Pass the full PP row in.

export function resolvePurposePiece(pp) {
  if (!pp) return { archetype: null, domain: null, scale: null }
  const archetype =
    pp.archetype ||
    pp.profile?.archetype ||
    pp.session?.archetype ||
    pp.session?.tentative?.archetype?.archetype ||
    pp.session?.p4Profile?.archetype ||
    null
  const domain =
    pp.civ_domain ||
    pp.domain ||
    pp.profile?.domain ||
    pp.session?.domain ||
    pp.session?.tentative?.domain?.domain ||
    pp.session?.p4Profile?.domain ||
    null
  const scale =
    pp.scale ||
    pp.profile?.scale ||
    pp.session?.scale ||
    pp.session?.tentative?.scale?.scale ||
    pp.session?.p4Profile?.scale ||
    null
  return { archetype, domain, scale }
}

// True iff the user has completed Purpose Piece. Completion is signalled
// in multiple ways across writer eras:
//   - newer rows: status === 'complete' or a populated completed_at
//   - older rows: neither flag was ever written, but the row carries
//     resolvable archetype + domain + scale values
// If all three resolve, we treat the PP as functionally complete for
// display purposes regardless of the status flag.
export function isPurposePieceComplete(pp) {
  if (!pp) return false
  if (pp.status === 'complete' || pp.completed_at) return true
  const { archetype, domain, scale } = resolvePurposePiece(pp)
  return !!(archetype && domain && scale)
}
