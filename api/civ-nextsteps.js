// api/civ-nextsteps.js
//
// Generates 4 concrete next steps for a civilisational domain.
// Steps are grounded in:
//   1. The domain's current planetary score and the gap to the horizon (10)
//   2. The user's Purpose Piece archetype — what they're built to do
//   3. North Star cross-tool context — what they've already committed to
//
// The civ side has no UPDATE path — scores come from real-world data,
// not self-reporting. These steps are about personal contribution to
// a civilisational domain, not about updating a score.
//
// POST body:
//   userId       string    — Supabase auth user id (for North Star context)
//   domain       string    — civ domain key (human, society, nature, tech, finance, legacy, vision)
//   domainName   string    — display name
//   currentScore number    — live planetary score 0..10
//   archetype    string    — Purpose Piece archetype label (may be empty)
//   archetypeDomain string — the civ domain their archetype is placed in (may be empty)
//
// Response:
//   { steps: Step[] }
//   Step: { id, text, type: 'action'|'practice'|'contribution' }

const Anthropic = require('@anthropic-ai/sdk')
const { getNorthStarContext, formatNorthStarContext } = require('./_north-star')

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const CIV_DOMAIN_FRAMES = {
  human:    'the development of human beings — consciousness, capacity, and human flourishing at scale',
  society:  'the structures of society — governance, institutions, culture, and how we organise together',
  nature:   'the natural world — ecosystems, biodiversity, climate, and humanity\'s relationship with Earth',
  tech:     'technology — what we build, how it shapes us, and whether it serves human and planetary flourishing',
  finance:  'the economy — how resources flow, who has agency, and whether finance serves life',
  legacy:   'what we leave behind — knowledge, culture, built environment, and the inheritance we pass forward',
  vision:   'the long horizon — humanity\'s sense of direction, meaning, and what we\'re collectively building toward',
}

const STEP_TYPE_LABELS = {
  action:       'DO',
  practice:     'PRACTISE',
  contribution: 'CONTRIBUTE',
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method-not-allowed' })

  const {
    userId,
    domain,
    domainName,
    currentScore,
    archetype,
    archetypeDomain,
  } = req.body || {}

  if (!domain) return res.status(400).json({ error: 'invalid-domain' })

  let nsBlock = ''
  if (userId) {
    try {
      const ctx = await getNorthStarContext(userId)
      if (ctx) nsBlock = formatNorthStarContext(ctx)
    } catch (_) {}
  }

  const gap = currentScore != null ? (10 - Number(currentScore)).toFixed(1) : null
  const isHomeArchetype = archetypeDomain && archetypeDomain === domain

  const systemPrompt = `You are North Star — the voice present across every NextUs tool. You are generating civilisational next steps inside Mission Control. These are not life-coaching suggestions. They are concrete invitations for a person to contribute to a specific domain of civilisational progress.

${nsBlock || ''}

THE CIVILISATIONAL DOMAIN:
Domain: ${domainName}
Frame: ${CIV_DOMAIN_FRAMES[domain] || domain}
Current planetary score: ${currentScore != null ? currentScore + ' / 10' : 'not yet scored'}
Gap to civilisational horizon: ${gap ? gap + ' points' : 'unknown'}

THE PERSON'S PURPOSE PIECE:
${archetype
  ? `Archetype: ${archetype}${isHomeArchetype ? ` — this is their home domain. They are built for this territory.` : ` — placed in a different domain, but contributing here.`}`
  : 'Purpose Piece not yet completed — generate general steps applicable to anyone.'}

YOUR TASK:
Generate exactly 4 next steps for how this person can contribute to ${domainName} at the civilisational scale.

STEP TYPES — use a mix of all three:
  action       — something concrete to do or try this week
  practice     — a regular discipline that builds their contribution over time
  contribution — a direct act that moves the needle on this domain (give, build, join, fund, create)

THE CIVIC FRAME:
These steps are not about personal development. They are about showing up for the world.
- They can be small (reading, shifting a habit, having a conversation)
- They can be large (funding, building, advocating, creating)
- They should span a range — not all require money or expertise
- Where the archetype is known, at least one step should be specific to how THAT type of person can contribute best
- Steps should feel like genuine leverage points, not generic "be the change" platitudes

GUARDRAILS:
1. No performative activism. No "raise awareness." Steps must be concrete.
2. No shame. No urgency theatre. The world needs people acting from clarity, not guilt.
3. No step should require more than what a committed individual can do alone.
4. If this is their home archetype domain, acknowledge that explicitly in one step — they have an uncommon role to play here.
5. Short — one to two sentences per step. Specific enough to start tomorrow.

RESPONSE FORMAT — respond with ONLY valid JSON, no preamble, no markdown fences:
{
  "steps": [
    { "id": "1", "type": "action", "text": "..." },
    { "id": "2", "type": "contribution", "text": "..." },
    { "id": "3", "type": "practice", "text": "..." },
    { "id": "4", "type": "contribution", "text": "..." }
  ]
}`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: 'user', content: `Generate next steps for ${domainName}.` }],
    })

    const raw = response.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('')
      .trim()
      .replace(/^```json\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim()

    let parsed
    try { parsed = JSON.parse(raw) }
    catch (_) { return res.status(500).json({ error: 'parse-error' }) }

    return res.status(200).json({
      steps: Array.isArray(parsed?.steps) ? parsed.steps : [],
    })
  } catch (err) {
    console.error('[civ-nextsteps] error:', err?.message || err)
    return res.status(500).json({ error: 'upstream-error' })
  }
}
