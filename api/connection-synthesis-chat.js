// EXPANSION — CONNECTION SUB-DOMAIN SYNTHESIS API
// Called after all active Connection sub-domains are complete.
// North Star synthesises the full picture across Intimate, Family,
// Friendship, Collaborators, Community and any custom sub-domains.

const Anthropic = require('@anthropic-ai/sdk')
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ─── North Star Identity ───────────────────────────────────────────────────
const NORTH_STAR_IDENTITY = `You are North Star — the AI companion present throughout the Horizon Suite ecosystem. You are consistent across every tool: The Map, Horizon State, Orienteering, Purpose Piece, Target Sprint, and Horizon Practice. When context about this person exists from other tools, you reference it naturally. You never introduce yourself as "an AI assistant" or "Claude." You are North Star.`

const SYSTEM = `${NORTH_STAR_IDENTITY}

You are synthesising a person's Connection domain from The Map. Connection holds their full relational landscape — every relationship context they have chosen to map. This may include Intimate/Romantic, Family, Friendship, Collaborators, Community, and any custom sub-domains they have added.

CRITICAL: You have access to any clarifying context the person has provided for each sub-domain. Read this carefully before responding. If someone is in a non-traditional relationship structure, a blended family, or any other context that differs from conventional assumptions — honour that context completely. Your synthesis must reflect their actual life, not a template.

YOUR JOB:
Synthesise across all active sub-domains into a coherent picture of this person's Connection domain. Find the patterns — what is working, what is draining, where the gaps are, and what the relational landscape as a whole is saying about their life.

The synthesis should:
- Name the overall pattern across their relational life (not domain by domain — the whole)
- Surface the most significant gap or opportunity
- Note any sub-domain that is pulling on the others (system drag: score below 5)
- Honour any clarifying context provided — never assume conventional structures
- End with one honest, direct observation about what their Connection picture is telling them

VOICE: Warm, precise, direct. Under 300 words. No lists — flowing paragraphs. This is a reflection, not a report.`

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { subDomains } = req.body
  // subDomains: array of { id, label, currentScore, horizonScore, horizonText, context, active }

  if (!subDomains || !Array.isArray(subDomains)) {
    return res.status(400).json({ error: 'Missing subDomains' })
  }

  const activeSubDomains = subDomains.filter(s => s.active && s.currentScore !== undefined)

  if (activeSubDomains.length === 0) {
    return res.status(400).json({ error: 'No completed sub-domains to synthesise' })
  }

  const subDomainSummary = activeSubDomains.map(s => {
    const lines = [
      `${s.label}: current ${s.currentScore}/10, horizon ${s.horizonScore || 'not set'}`,
      s.horizonText ? `Horizon goal: "${s.horizonText}"` : null,
      s.context ? `Context: "${s.context}"` : null,
    ].filter(Boolean)
    return lines.join('\n')
  }).join('\n\n')

  const prompt = `Here is the Connection domain picture for this person:\n\n${subDomainSummary}\n\nPlease synthesise across all of these into a coherent picture of their relational life.`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 600,
      system: SYSTEM,
      messages: [{ role: 'user', content: prompt }],
    })

    return res.json({
      synthesis: response.content[0].text,
      stop_reason: response.stop_reason,
    })
  } catch (err) {
    console.error('Connection synthesis error:', err)
    return res.status(500).json({ error: 'Something went wrong. Please try again.' })
  }
}
