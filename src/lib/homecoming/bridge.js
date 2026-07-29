// src/lib/homecoming/bridge.js
//
// The ecosystem bridge — pure mapping only. The PAGE fetches the personal layer
// (horizon_profile scores, the Map's life "I Am") through Supabase; this module
// turns those rows into what Homecoming's Placement needs, so the engine stays
// portable and imports nothing.
//
// The point: arrive knowing you. Your loudest low-scoring domain becomes the
// pre-selected pressure (and, through the Placement, the guardian to start on);
// your Map's life statement becomes the drafted "home you are coming to," in
// your own words rather than a template.
//
// PORTABLE: pure functions.

// Horizon domains → the Placement's pressure option ids.
const DOMAIN_PRESSURE = {
  finances: 'money',
  body: 'body',
  connection: 'people',
  inner_game: 'push',
}

const DOMAIN_LABEL = {
  path: 'Path', spark: 'Spark', body: 'Body', finances: 'Finances',
  connection: 'Connection', inner_game: 'Inner Game', signal: 'Signal',
}

// horizonRows: [{ domain, current_score, horizon_score, horizon_goal, ia_statement }]
//   scores are 0..10; the lowest current_score is the loudest pressure.
// mapRow: { life_ia_statement, horizon_goal_user, ... } | null
export function knownFromEcosystem(horizonRows, mapRow) {
  const rows = (horizonRows || []).filter(r => r && r.domain && typeof r.current_score === 'number')

  let pressureDomain = null
  if (rows.length) {
    pressureDomain = rows.reduce((lo, r) => (r.current_score < lo.current_score ? r : lo)).domain
  }
  const pressureAnswer = pressureDomain ? (DOMAIN_PRESSURE[pressureDomain] || 'all') : null

  const targetDraft = (mapRow && (mapRow.life_ia_statement || mapRow.horizon_goal_user)) || null

  const provenance = []
  if (rows.length) provenance.push('your Horizon scores')
  if (targetDraft) provenance.push('your Map')

  return {
    ok: rows.length > 0 || !!targetDraft,
    pressureDomain,
    pressureLabel: pressureDomain ? (DOMAIN_LABEL[pressureDomain] || pressureDomain) : null,
    pressureAnswer,
    targetDraft,
    provenance,
  }
}
