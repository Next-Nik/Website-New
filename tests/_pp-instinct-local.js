// ─── INSTINCT STAGE LOCAL LOGIC (TESTABLE SLICE) ─────────────────────────────

const GENERIC_DEFLECTORS = [
  'i don\'t know', 'not sure', 'no idea', 'hard to say',
  'i guess', 'dunno', 'whatever',
  'lots of things', 'many things', 'all the time', 'always',
  'depends', 'it depends'
]

const TIME_ANCHORS = [
  'last year', 'last month', 'last week', 'yesterday',
  'in 2024', 'in 2023', 'in 2025', 'in 2026',
  'a few weeks', 'a few months', 'this year',
  'this week', 'today', 'ago', 'when i', 'after i', 'before i',
  'one time', 'once', 'a couple years', 'recently'
]

const ACTION_VERBS = [
  'called', 'asked', 'built', 'avoided', 'stepped', 'said', 'told',
  'decided', 'chose', 'left', 'stayed', 'went', 'made', 'helped',
  'stopped', 'started', 'reached out', 'spoke', 'wrote', 'created',
  'organized', 'organised', 'refused', 'accepted', 'pushed', 'pulled',
  'watched', 'confronted', 'raised', 'flagged', 'brought up', 'fought',
  'redesigned', 'rebuilt', 'rewrote', 'redid', 'solved', 'fixed'
]

const SETTING_PATTERN = /\b(work|office|home|family|friend|community|meeting|team|partner|colleague|school|hospital|city|neighbourhood|neighborhood|organisation|organization|project|client|boss|board)\b/i

function isInstinctAnswerThin(answer, questionIndex) {
  const lower = answer.toLowerCase().trim()
  const words = answer.trim().split(/\s+/).filter(Boolean)

  const minWords = (questionIndex >= 3) ? 15 : 20
  if (words.length < minWords) return true

  const deflectorCount = GENERIC_DEFLECTORS.filter(d => lower.includes(d)).length
  if (deflectorCount >= 2) return true

  if (questionIndex <= 2) {
    const hasTime    = TIME_ANCHORS.some(t => lower.includes(t))
    const hasAction  = ACTION_VERBS.some(v => lower.includes(v))
    const hasSetting = SETTING_PATTERN.test(lower)
    if (!hasTime && !hasAction && !hasSetting) return true
  }

  return false
}

function isConfused(text) {
  const lower = (text || '').toLowerCase().trim()
  const patterns = [
    /what do you mean/, /i don'?t (understand|get|follow)/,
    /can you (rephrase|explain|clarify)/, /^confused\b/,
    /^what\?/, /huh\?/, /not sure what.*asking/, /\?\s*$/,
  ]
  if (lower.length < 40 && patterns.some(re => re.test(lower))) return true
  return false
}

module.exports = { isInstinctAnswerThin, isConfused }
