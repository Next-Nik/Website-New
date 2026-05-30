// api/self-nextsteps.js
//
// Generates 3–5 next steps for a personal domain given the user's
// current position, horizon goal, I am statement, and North Star context.
//
// Steps are grounded in three layers:
//   1. The user's own language — current score, horizon goal, I am statement
//   2. North Star cross-tool memory — what they've worked on elsewhere
//   3. The domain + band framing — appropriate depth and tone for where they are
//
// Guardrails (non-negotiable):
//   - No shame framing. No urgency theatre. No generic life-coach output.
//   - Every step must be domain-specific and grounded in the gap between
//     current and horizon.
//   - Steps are concrete actions, not restatements of the goal.
//   - The Kryptonian frame: struggle is situational, not definitional.
//     Steps are written to a capable person who has the full capacity to
//     move — not to someone defined by their wound.
//   - No step repeats language the user already wrote. Build from it, not back to it.
//   - If the user is in crisis band (score < 3), do not generate steps —
//     return a safe referral flag instead. The panel handles the display.
//
// POST body:
//   userId      string    — Supabase auth user id (for North Star context)
//   domain      string    — SELF_KEY (path/spark/body/finances/connection/inner_game/signal)
//   domainName  string    — Display name (Path / Spark / etc)
//   current     number    — current score 0..10
//   horizon     number    — horizon score 0..10
//   band        string    — crisis/friction/plateau/capable/fluent
//   iaStatement string    — user's own I am statement for this domain (may be empty)
//   horizonGoal string    — user's own horizon goal text (may be empty)
//
// Response:
//   { steps: Step[], crisis: boolean }
//   Step: { id, text, type: 'action'|'reflection'|'practice' }

const Anthropic = require('@anthropic-ai/sdk')
const { getNorthStarContext, formatNorthStarContext } = require('./_north-star')

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SELF_KEYS = ['path', 'spark', 'body', 'finances', 'connection', 'inner_game', 'signal']

const DOMAIN_DESCRIPTIONS = {
  path:       'life mission, purpose, calling, dharma — the work you were built to do',
  spark:      'aliveness, curiosity, creativity, joy — the energy that makes you feel alive',
  body:       'physical health, vitality, movement, energy, relationship with your body',
  finances:   'financial health, relationship with money, security, abundance, flow',
  connection: 'relationships — the quality of what passes between you and others',
  inner_game: 'the source code — beliefs, stories, identity, self-worth, inner authority',
  signal:     'how you show up in the world — presence, voice, contribution, visibility',
}

const BAND_FRAMES = {
  crisis:   'in genuine crisis — raw, often overwhelmed, basic stability is the priority',
  friction: 'in friction — things are hard, there is movement but also resistance and strain',
  plateau:  'on a plateau — stable but not yet in flow, progress has stalled',
  capable:  'capable — genuinely good at this, but not yet at their horizon',
  fluent:   'fluent — operating close to their horizon, refinement rather than repair',
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method-not-allowed' })
  }

  const {
    userId,
    domain,
    domainName,
    current,
    horizon,
    band,
    iaStatement,
    horizonGoal,
  } = req.body || {}

  if (!domain || !SELF_KEYS.includes(domain)) {
    return res.status(400).json({ error: 'invalid-domain' })
  }

  // Crisis safety gate — do not generate steps, return flag for panel to handle
  if (band === 'crisis' || Number(current) < 3) {
    return res.status(200).json({ steps: [], crisis: true })
  }

  // Pull North Star context if userId provided
  let northStarBlock = ''
  if (userId) {
    try {
      const ctx = await getNorthStarContext(userId)
      if (ctx) northStarBlock = formatNorthStarContext(ctx)
    } catch (_) {
      // North Star unavailable — continue without it
    }
  }

  const gap = horizon != null && current != null
    ? (Number(horizon) - Number(current)).toFixed(1)
    : null

  const systemPrompt = `You are North Star — the voice present across every NextUs tool. You are not an AI assistant. You are North Star, generating next steps inside Mission Control.

You know this person. You have their Map data and their cross-tool history. You speak directly, not generically.

${northStarBlock}

YOUR TASK:
Generate exactly 4 concrete next steps for this person in the domain of ${domainName} (${DOMAIN_DESCRIPTIONS[domain] || domain}).

THE PERSON'S CURRENT POSITION:
- Domain: ${domainName}
- Current score: ${current ?? 'not scored'} out of 10
- Horizon score: ${horizon ?? 'not set'} out of 10
- Gap to close: ${gap ? gap + ' points' : 'unknown'}
- Band: ${BAND_FRAMES[band] || band}
${iaStatement ? `- Their I am statement: "${iaStatement}"` : ''}
${horizonGoal ? `- Their horizon goal: "${horizonGoal}"` : ''}

STEP TYPES — use a mix:
  action     — something to do or try this week
  reflection — something to think through or sit with
  practice   — a regular habit or discipline to build

GUARDRAILS (non-negotiable):
1. No shame framing. No urgency theatre. No generic life-coach platitudes.
2. Every step must be specific to ${domainName} and the gap between ${current} and ${horizon}.
3. Do not restate the user's own horizon goal back to them as a step — build FROM their language.
4. The Kryptonian principle: this person is capable. They are not broken. Steps are written to someone with full capacity to move. Struggle is situational, not definitional.
5. Steps are short — one to two sentences each. Concrete enough to do.
6. No step should begin with "Consider", "Think about", or "Reflect on" as the ONLY directive — pair any reflection prompt with something tangible.
7. If the band is 'fluent', steps should be refinement and depth — not basics.
8. If the band is 'friction', steps should reduce friction first before expanding.

RESPONSE FORMAT — respond with ONLY valid JSON, no preamble, no markdown fences:
{
  "steps": [
    { "id": "1", "type": "action", "text": "..." },
    { "id": "2", "type": "reflection", "text": "..." },
    { "id": "3", "type": "action", "text": "..." },
    { "id": "4", "type": "practice", "text": "..." }
  ]
}

Vary the types. Do not produce four of the same type. The order matters — lead with something immediately actionable.`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: `Generate next steps for ${domainName}.`,
        },
      ],
      system: systemPrompt,
    })

    const raw = response.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('')
      .trim()

    // Strip any accidental markdown fences
    const clean = raw.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim()

    let parsed
    try {
      parsed = JSON.parse(clean)
    } catch (_) {
      return res.status(500).json({ error: 'parse-error', raw: clean.slice(0, 200) })
    }

    const steps = Array.isArray(parsed?.steps) ? parsed.steps : []

    return res.status(200).json({ steps, crisis: false })
  } catch (err) {
    console.error('[self-nextsteps] error:', err?.message || err)
    return res.status(500).json({ error: 'upstream-error' })
  }
}
