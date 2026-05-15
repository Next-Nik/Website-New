// api/planet-map-synthesis.js
// Generates synthesis statement for completed Planet Map assessment
// Called from PlanetMap.jsx on assessment submit
// Uses Claude claude-sonnet-4-20250514 via Anthropic API

import Anthropic from '@anthropic-ai/sdk'
import { PLANET_DOMAINS, PLANET_SCALE_BY_SCORE } from '../src/constants/horizonScalePlanet.js'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { scores, actorName, actorType } = req.body

  if (!scores || !actorName) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  // Build domain summary string for the prompt
  const domainSummary = PLANET_DOMAINS.map(d => {
    const s = scores[d.key]
    if (!s) return null
    const scaleEntry = PLANET_SCALE_BY_SCORE[s.score]
    return `${d.label}: ${s.score}/10 (${scaleEntry?.label ?? ''})${s.notes ? ` — "${s.notes}"` : ''}`
  }).filter(Boolean).join('\n')

  const averageScore = (
    PLANET_DOMAINS.reduce((sum, d) => sum + (scores[d.key]?.score ?? 0), 0) / PLANET_DOMAINS.length
  ).toFixed(1)

  const systemPrompt = `You are the synthesis voice for the NextUs Map: Planet — a civilisational assessment tool.

Your job is to write a single synthesis paragraph (4–6 sentences) for a completed assessment.

Voice: Clear, grounded, honest. No vague aspiration, no shame framing, no urgency theatre. The Wonka register — warm and conspiratorial, taking the work seriously while finding it genuinely interesting. British spelling.

The synthesis should:
- Name the overall picture honestly (neither inflate nor diminish)
- Identify the strongest domain and what it signals
- Identify the most significant gap or challenge — the honest thing on the page
- Close with what the pattern suggests about where effort matters most

Do not begin with "This assessment shows" or any generic opener. Do not use em dashes. Do not use bullet points.`

  const userPrompt = `Actor: ${actorName} (${actorType})
Average score: ${averageScore}/10

Domain scores:
${domainSummary}

Write the synthesis paragraph.`

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 400,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const synthesis = response.content[0]?.text?.trim() ?? null
    return res.status(200).json({ synthesis })
  } catch (err) {
    console.error('planet-map-synthesis: Anthropic API error', err)
    return res.status(500).json({ error: 'Synthesis generation failed', synthesis: null })
  }
}
