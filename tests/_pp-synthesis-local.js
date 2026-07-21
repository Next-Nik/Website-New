// ─── SYNTHESIS LOCAL LOGIC (TESTABLE SLICE) ──────────────────────────────────

const DOMAIN_HORIZON_GOALS = {
  'HUMAN BEING':       'Humans possess the physical, psychological, and developmental capacity to live well and act wisely in complexity.',
  'SOCIETY':           'Human societies are just, inclusive, stable, and capable of collective problem-solving.',
  'NATURE':            'Human activity is net-positive for planetary health.',
  'TECHNOLOGY':        'Technology amplifies human and planetary flourishing without undermining agency, equity, or ecological stability.',
  'FINANCE & ECONOMY': 'Economic systems distribute value in ways that are fair, regenerative, and aligned with long-term wellbeing.',
  'LEGACY':            'Humanity acts as a responsible steward across generations.',
  'VISION':            'Humanity maintains a shared capacity to imagine and choose better futures.',
}

const SCALE_LABELS = {
  'home':           'home',
  'neighbourhood':  'neighbourhood',
  'city':           'city',
  'province':       'regional',
  'country':        'national',
  'continent':      'continental',
  'global':         'global',
  'civilisational': 'civilisational',
}

function buildCivilisationalStatement(session) {
  const subFunctionLabel = session.sub_function_label || session.archetype
  const domain     = session.domain
  const scaleLabel = SCALE_LABELS[session.scale] || session.scale
  const horizonGoal = DOMAIN_HORIZON_GOALS[domain] || ''

  return `I am a ${subFunctionLabel} in ${domain} at the ${scaleLabel} scale, working toward a world in which ${horizonGoal.replace(/\.$/, '')}.`
}

module.exports = {
  DOMAIN_HORIZON_GOALS,
  SCALE_LABELS,
  buildCivilisationalStatement,
}
