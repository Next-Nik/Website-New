// ─── PULL STAGE LOCAL LOGIC (TESTABLE SLICE) ─────────────────────────────────
// No external dependencies. Used for testing thin-answer detection and the
// structure of the pull question set across all seven domains.

const PULL_QUESTIONS = {
  'HUMAN BEING': [
    { label: 'The Specific Failure' },
    { label: 'The Disproportionate Anger' },
    { label: 'The One Thing' }
  ],
  'SOCIETY': [
    { label: 'The Specific Failure' },
    { label: 'The Disproportionate Anger' },
    { label: 'The One Thing' }
  ],
  'NATURE': [
    { label: 'The Specific Failure' },
    { label: 'The Disproportionate Anger' },
    { label: 'The One Thing' }
  ],
  'TECHNOLOGY': [
    { label: 'The Specific Failure' },
    { label: 'The Disproportionate Anger' },
    { label: 'The One Thing' }
  ],
  'FINANCE & ECONOMY': [
    { label: 'The Specific Failure' },
    { label: 'The Disproportionate Anger' },
    { label: 'The One Thing' }
  ],
  'LEGACY': [
    { label: 'The Specific Failure' },
    { label: 'The Disproportionate Anger' },
    { label: 'The One Thing' }
  ],
  'VISION': [
    { label: 'The Specific Failure' },
    { label: 'The Disproportionate Anger' },
    { label: 'The One Thing' }
  ],
}

const GENERIC_DEFLECTORS = [
  'i don\'t know', 'not sure', 'no idea', 'hard to say', 'everything',
  'a lot of things', 'lots of things', 'many things', 'too many',
  'i guess', 'dunno', 'whatever', 'anything',
]

function isPullAnswerThin(answer) {
  const text = answer.trim()
  const lower = text.toLowerCase()
  const words = text.split(/\s+/).filter(Boolean)

  if (words.length < 3) return true

  const deflectorMatches = GENERIC_DEFLECTORS.filter(d => lower.includes(d)).length
  if (deflectorMatches >= 1 && words.length < 8) return true

  if (words.length < 6 && deflectorMatches >= 1) return true

  return false
}

module.exports = { PULL_QUESTIONS, isPullAnswerThin }
