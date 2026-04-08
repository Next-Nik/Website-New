// api/foundation-review-chat.js
// Generates weekly / monthly / quarterly / annual AI reviews
// of Foundation sessions for a given user.

const Anthropic = require('@anthropic-ai/sdk')
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const { getNorthStarContext, formatNorthStarContext } = require('./_north-star')

// ─── North Star Identity ───────────────────────────────────────────────────
const NORTH_STAR_IDENTITY = `You are North Star — the AI companion present throughout the NextUs Life OS ecosystem. You are consistent across every tool: The Map, Foundation, Orienteering, Purpose Piece, Target Sprint, and Expansion. When context about this person exists from other tools, you reference it naturally. You never introduce yourself as "an AI assistant" or "Claude." You are North Star.`

const SYSTEM = `${NORTH_STAR_IDENTITY}

You are the Foundation reflection agent for Life OS.

WHAT FOUNDATION IS
A daily audio practice for nervous system regulation. Three phases: Baseline, Calibration, Embodying.
Each session captures a before and after flame reading on a 0–10 scale.
The flame measures internal aliveness, regulation, and ground.

THE FLAME SCALE
0–2: Barely present. System depleted or numb.
3–4: Low but alive. Something still burning.
5: The threshold. Present, holding.
6–7: Warming. Ground returning.
8–9: Lit. Stable and clear.
10: Fully alive. Radiant.

WHAT THE DATA SHOWS
Delta (after minus before) is the primary signal — it shows what the audio actually did.
Positive delta: the practice moved something.
Near-zero delta: holding steady, or the ground was already there.
Negative delta: honest signal that something came up during the session.
Pattern over time matters more than any single session.

YOUR VOICE
Warm, precise, unhurried. Witness, don't fix.
Speak to what the data actually shows.
Never catastrophise low readings. Never celebrate high ones.
Scores are information, not achievements.
Never: "you should", "you need to", "incredible", "I can see that"

RESPONSE LENGTH
Weekly: 80–140 words. End with one quiet observation.
Monthly: 150–220 words. End with one question.
Quarterly: 200–280 words. End with one orienting observation.
Annual: 260–360 words. End with one horizon question.`

function buildPrompt(period, sessions, previousReviews) {
  const sessionLines = sessions.map(s => {
    const delta = s.after_value - s.before_value
    const sign  = delta > 0 ? '+' : ''
    return `${s.completed_at?.slice(0,10) || 'unknown'} | before: ${s.before_value} → after: ${s.after_value} (${sign}${delta})${s.note ? ` — "${s.note}"` : ''}${s.before_note ? ` | walked in: "${s.before_note}"` : ''}`
  }).join('\n')

  const avgBefore = sessions.length
    ? (sessions.reduce((a, s) => a + (s.before_value || 0), 0) / sessions.length).toFixed(1)
    : 'n/a'
  const avgAfter = sessions.length
    ? (sessions.reduce((a, s) => a + (s.after_value || 0), 0) / sessions.length).toFixed(1)
    : 'n/a'
  const avgDelta = sessions.length
    ? (sessions.reduce((a, s) => a + ((s.after_value || 0) - (s.before_value || 0)), 0) / sessions.length).toFixed(1)
    : 'n/a'

  const prevLines = (previousReviews || []).slice(-2).map(r =>
    `${r.period_label} (${r.period_type}): "${r.review_text?.slice(0, 120)}..."`
  ).join('\n') || 'No previous reviews.'

  return `FOUNDATION ${period.type.toUpperCase()} REVIEW — ${period.label}
Sessions: ${sessions.length}
Average before: ${avgBefore} | Average after: ${avgAfter} | Average delta: ${avgDelta}

SESSION LOG:
${sessionLines || 'No sessions recorded.'}

PREVIOUS REVIEWS:
${prevLines}

Generate a ${period.type} reflection on this Foundation practice. Name what the data shows — consistency, delta patterns, any movement across the period. Hold it steady. End as instructed.`
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { period, sessions, previousReviews, userId } = req.body

    if (!period || !sessions) {
      return res.status(400).json({ error: 'Missing period or sessions' })
    }

    const northStarCtx = userId ? await getNorthStarContext(userId) : null
    const system = northStarCtx ? SYSTEM + '\n\n' + formatNorthStarContext(northStarCtx) : SYSTEM

    const prompt = buildPrompt(period, sessions, previousReviews)

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 600,
      system,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content?.[0]?.text || ''
    return res.status(200).json({ review: text })

  } catch (err) {
    console.error('[foundation-review-chat] Error:', err)
    return res.status(500).json({ error: 'Internal error' })
  }
}
