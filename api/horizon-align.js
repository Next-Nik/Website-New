// api/horizon-align.js
// C2 — Horizon-alignment step in the claim flow.
//
// When an actor claims their profile, this endpoint offers an AI-generated
// toward-framed rewrite of their mission statement (or description) in the
// vocabulary of the domain's Horizon Goal.
//
// The grammar rule: "away-from" cannot navigate. We never make the owner
// wrong for arriving with frustration or deficit framing — we complete their
// sentence into a destination.
//
// Owner consent is always required. The AI offers; the owner decides.

const Anthropic = require('@anthropic-ai/sdk')
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const HORIZON_GOALS = {
  'human-being':     'Every human held in dignity, met with care, supported in becoming most fully themselves.',
  'society':         'A structure that gives everyone space to function and the possibility to thrive.',
  'nature':          'The living planet is thriving, and humanity lives as a regenerative participant in it — not separate from, not above, but of.',
  'technology':      'Technology in service of life — human and planetary — designed to restore as it operates, accessible to those it affects, and honest about what it costs.',
  'finance-economy': 'An economy in which everyone has enough to act on what matters, contribution is freely chosen rather than coerced, and the living systems that make all exchange possible are counted, sustained, and restored.',
  'legacy':          'A civilisation that knows what it carries, tends what it transmits, repairs what it broke, and plants with love for people it will never meet.',
  'vision':          'Creating forward — as far as we can see — in service of the brightest future for all.',
}

const DOMAIN_LABELS = {
  'human-being':     'Human Being',
  'society':         'Society',
  'nature':          'Nature',
  'technology':      'Technology',
  'finance-economy': 'Finance & Economy',
  'legacy':          'Legacy',
  'vision':          'Vision',
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { actorName, actorDescription, actorMission, domain, userNote } = req.body || {}

  if (!domain) return res.status(400).json({ error: 'domain required' })

  const horizonGoal  = HORIZON_GOALS[domain]
  const domainLabel  = DOMAIN_LABELS[domain] || domain

  if (!horizonGoal) return res.status(400).json({ error: `Unknown domain: ${domain}` })

  const sourceText = [actorMission, actorDescription, userNote].filter(Boolean).join('\n')
  if (!sourceText.trim()) return res.status(400).json({ error: 'No source text to reframe' })

  const prompt = `You are the NextUs horizon-alignment assistant. You help actors on the platform articulate the DESTINATION their work points toward — not the problem they fight.

DOMAIN: ${domainLabel}
HORIZON GOAL: "${horizonGoal}"

THE ACTOR: ${actorName || 'this organisation'}
SOURCE TEXT (their description, mission, or what they said about their work):
"${sourceText}"

YOUR JOB:
Write ONE concise sentence (max 30 words) that names the world this actor's work is building toward — in the vocabulary of the Horizon Goal above. This is not a summary of their work. It is the destination their work navigates toward.

GRAMMAR RULES (non-negotiable):
- Present tense: "builds", "creates", "moves toward", "contributes to"
- Never use "fights", "combats", "prevents", "stops", "ends", "against", "without", "no more"
- Never use deficit language: not "lack of", not "absence of", not "failure to"
- If their source text is away-from framing (fighting pollution, ending homelessness), complete it into its destination (living ecosystems, everyone housed and rooted)
- The actor's specific work and approach should be recognisable in the sentence
- Do not lecture them about their framing — just offer the destination version

CRITICAL: Respond with JSON only, no markdown:
{
  "toward_statement": "the one sentence",
  "reasoning": "one short sentence explaining what destination you drew out of their work — shown to the owner to help them understand the reframe"
}`

  try {
    const response = await anthropic.messages.create({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 300,
      messages:   [{ role: 'user', content: prompt }],
    })

    const text  = response.content[0]?.text || ''
    const clean = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)

    return res.json({
      toward_statement: parsed.toward_statement || '',
      reasoning:        parsed.reasoning        || '',
      domain,
      horizonGoal,
    })
  } catch (err) {
    console.error('[horizon-align] Error:', err)
    return res.status(500).json({ error: 'Could not generate reframe. Please write your own.' })
  }
}
