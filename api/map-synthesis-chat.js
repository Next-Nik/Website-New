// api/map-synthesis-chat.js
// Dedicated synthesis endpoint for The Map.
// Accepts { domainData, userId } — domainData uses Map.jsx field names:
//   currentScore, realityFinal, horizonText, avatarFinal
// Returns { mapData, synthesis }

const Anthropic = require('@anthropic-ai/sdk')
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const { getNorthStarContext, formatNorthStarContext } = require('./_north-star')

const NORTH_STAR_IDENTITY = `You are North Star — the AI companion present throughout the Horizon Suite ecosystem. You are consistent across every tool: The Map, Horizon State, Orienteering, Purpose Piece, Target Sprint, and Horizon Practice. When context about this person exists from other tools, you reference it naturally. You never introduce yourself as "an AI assistant" or "Claude." You are North Star.`

const DOMAIN_LABELS = {
  path:       'Path',
  spark:      'Spark',
  body:       'Body',
  finances:   'Finances',
  connection: 'Connection',
  inner_game: 'Inner Game',
  signal:     'Signal',
}

const DOMAIN_QUESTIONS = {
  path:       'Am I walking my path — or just walking?',
  spark:      'When did I last feel genuinely alive — and what\'s been costing me that?',
  body:       'Am I honouring this instrument — or running it into the ground?',
  finances:   'Do I have the agency to act on what matters?',
  connection: 'Am I truly known by anyone — and am I truly knowing them?',
  inner_game: 'What story about myself is quietly running the room — and is that story still true?',
  signal:     'Is what I\'m broadcasting aligned with who I actually am?',
}

function buildSynthesisPrompt(domainData, northStarCtx) {
  const domainSummaries = Object.entries(domainData).map(([id, data]) => {
    const label    = DOMAIN_LABELS[id] || id
    const question = DOMAIN_QUESTIONS[id] || ''
    return `${label} — "${question}"
  Score: ${data.currentScore ?? 'not scored'}/10
  Avatar: ${data.avatarFinal || 'not captured'}
  Current reality: ${data.realityFinal || 'not captured'}
  Horizon Goal: ${data.horizonText || 'not captured'}`
  }).filter(Boolean).join('\n\n')

  const nsBlock = northStarCtx ? '\n\n' + formatNorthStarContext(northStarCtx) : ''

  return `${NORTH_STAR_IDENTITY}

You are delivering the final Horizon Suite map for this person.

Domain data:
${domainSummaries}${nsBlock}

Produce the final Horizon Suite map.

STAGE — identify from score patterns:
Stabilisation: Multiple domains 2-4, needs stabilisation before development work
Orientation: Mixed 3-6, needs honest self-location and life coherence
Alignment: Most domains 5-7, ready to look outward at contribution
Development: Most domains 6-8, compounding what's working
Transformation: Most domains 7+, hitting identity ceiling, ready for crossing

FOCUS DOMAINS — three most catalytic right now. CRITICAL TRIAGE RULE: any domain scoring below 5 is an active harm zone and must be included as a focus domain — this takes priority over catalytic potential. Below-5 domains are addressed before optimisation work elsewhere.

OVERALL REFLECTION — 3-4 paragraphs. This is the recognition moment. Write as someone who listened carefully to their whole life for the last hour. Not a report. Not a list. A genuine synthesis — their current reality, their Horizon Goals, what the patterns show, what's possible. Every sentence should only be possible because of what this specific person shared. The emotional endpoint is not "that's accurate" — it is "how did it know that."

Respond ONLY with valid JSON, no markdown:
{"stage":"<Stabilisation|Orientation|Alignment|Development|Transformation>","stage_description":"<2-3 sentences specific to them, not generic>","focus_domains":["<id>","<id>","<id>"],"focus_reasoning":"<why these three — below-5 domains named first if present, then catalytic logic>","overall_reflection":"<3-4 paragraphs>","next_step":"<one honest specific sentence>"}`
}

function buildHorizonPrompt(domainData) {
  const horizons = Object.entries(domainData).map(([id, data]) => {
    if (!data.horizonText || data.horizonText === 'See sub-domain horizons') return null
    const label = DOMAIN_LABELS[id] || id
    return `${label}: "${data.horizonText}"`
  }).filter(Boolean).join('\n')

  return `You have the seven domain Horizon Goals that someone expressed for their own life during a Horizon Suite assessment. Each is their honest answer to "if a genie granted your wish here, what would it be?"

Their domain horizons:
${horizons || '(not yet captured)'}

Write a single unified Life Horizon Goal that holds all of these together — the whole life, not a summary of parts. This is not a list. It is one paragraph, one to three sentences, written in the first person as if this person is speaking it. It should feel like something they could read and say "yes — that's actually it."

Rules:
- Written in first person ("I am..." or "My life is..." or "I live...")
- One paragraph, 1-3 sentences maximum
- Holds the emotional truth across all domains, not just the loudest ones
- Describes a state, not a plan — present tense, alive quality
- Plain language — no management speak, no spiritual clichés
- Should feel like it could only have been written for this specific person

Return ONLY the text of the Horizon Goal. No preamble, no explanation, no JSON.`
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { domainData, userId } = req.body

    if (!domainData) return res.status(400).json({ error: 'Missing domainData' })

    const northStarCtx = userId ? await getNorthStarContext(userId) : null

    const [synthResponse, horizonResponse] = await Promise.all([
      anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2500,
        messages: [{ role: 'user', content: buildSynthesisPrompt(domainData, northStarCtx) }],
      }),
      anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        messages: [{ role: 'user', content: buildHorizonPrompt(domainData) }],
      }),
    ])

    let synthData
    try {
      const raw = synthResponse.content[0].text.replace(/```json|```/g, '').trim()
      synthData = JSON.parse(raw)
    } catch {
      synthData = {
        stage: 'Orientation',
        stage_description: 'You\'re in the process of seeing your whole life clearly.',
        focus_domains: ['path', 'spark', 'inner_game'],
        focus_reasoning: 'These three domains show the most catalytic potential based on what you\'ve shared.',
        overall_reflection: 'You\'ve shared something real across all seven domains. The picture that emerges is of someone navigating meaningful gaps between current reality and a genuinely envisioned Horizon Life.',
        next_step: 'Start with your three focus domains and your Horizon Goal within each.',
      }
    }

    synthData.life_horizon_draft = horizonResponse.content[0].text.trim()

    return res.json({
      mapData: synthData,
      synthesis: synthData.overall_reflection || '',
    })

  } catch (err) {
    console.error('[map-synthesis-chat] Error:', err)
    return res.status(500).json({ error: 'Synthesis failed' })
  }
}
