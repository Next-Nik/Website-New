// ─── ROLE STAGE LOCAL LOGIC (TESTABLE SLICE) ─────────────────────────────────

const SUB_FUNCTION_SLUGS = {
  'Maker':     [{slug:'product'},{slug:'content'},{slug:'tool'},{slug:'experience'},{slug:'unspecified'}],
  'Architect': [{slug:'institutional'},{slug:'technical'},{slug:'cultural'},{slug:'field'},{slug:'unspecified'}],
  'Connector': [{slug:'community'},{slug:'resource'},{slug:'network'},{slug:'temporal'},{slug:'unspecified'}],
  'Guardian':  [{slug:'quality'},{slug:'legitimacy'},{slug:'sovereignty'},{slug:'legacy'},{slug:'unspecified'}],
  'Steward':   [{slug:'institutional'},{slug:'place'},{slug:'practice'},{slug:'relationship'},{slug:'unspecified'}],
  'Explorer':  [{slug:'frontier'},{slug:'edge'},{slug:'forgotten'},{slug:'intersection'},{slug:'unspecified'}],
  'Sage':      [{slug:'advisor'},{slug:'teacher'},{slug:'writer'},{slug:'presence'},{slug:'unspecified'}],
  'Mirror':    [{slug:'image'},{slug:'narrative'},{slug:'witness'},{slug:'satire'},{slug:'unspecified'}],
  'Exemplar':  [{slug:'public'},{slug:'professional'},{slug:'community'},{slug:'personal'},{slug:'unspecified'}],
}

const MODE_BY_ARCHETYPE = {
  'Maker':     'proximate',
  'Connector': 'proximate',
  'Guardian':  'proximate',
  'Steward':   'proximate',
  'Sage':      'transmissive',
  'Mirror':    'transmissive',
  'Exemplar':  'transmissive',
}

const ARCHITECT_MODE = {
  'institutional': 'proximate',
  'technical':     'both',
  'cultural':      'both',
  'field':         'transmissive',
  'unspecified':   'both',
}

const EXPLORER_MODE = {
  'frontier':     'both',
  'edge':         'both',
  'forgotten':    'transmissive',
  'intersection': 'transmissive',
  'unspecified':  'both',
}

function deriveMode(archetype, subFunction, scale) {
  let baseMode

  if (archetype === 'Architect')     baseMode = ARCHITECT_MODE[subFunction] || 'both'
  else if (archetype === 'Explorer') baseMode = EXPLORER_MODE[subFunction]  || 'both'
  else                                baseMode = MODE_BY_ARCHETYPE[archetype] || 'both'

  if (scale === 'civilisational' && baseMode === 'proximate') {
    return 'both'
  }

  return baseMode
}

function isNodeCandidate(session) {
  const { archetype, sub_function, scale } = session

  if (archetype === 'Steward' && ['city', 'province', 'country', 'continent'].includes(scale)) {
    return true
  }
  if (archetype === 'Connector' && ['city', 'province', 'country', 'continent', 'global'].includes(scale)) {
    return true
  }
  if (archetype === 'Architect' && ['field', 'cultural'].includes(sub_function)) {
    return true
  }
  if (archetype === 'Sage' && ['continent', 'global', 'civilisational'].includes(scale)) {
    return true
  }
  return false
}

module.exports = {
  SUB_FUNCTION_SLUGS,
  deriveMode,
  isNodeCandidate,
  MODE_BY_ARCHETYPE,
}
