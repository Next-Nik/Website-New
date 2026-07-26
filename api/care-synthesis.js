// api/care-synthesis.js
//
// Cross-system synthesis for the Care Protocol — layer 3 of the engine, and
// the part that does what no single quiz can.
//
// It receives the whole normalised trait vector and looks for two things:
//
//   CONVERGENCES — independent systems pointing at the same need. ECR anxiety,
//   a spoken-reassurance ranking and a Cancer moon all landing on reassurance
//   is the thing that makes output feel uncannily accurate, because three
//   unrelated instruments agreeing is genuinely informative even when two of
//   them are mythic.
//
//   TENSIONS — where the systems contradict each other, named honestly. High
//   measured extraversion against a 2-line hermit profile, and what that looks
//   like in practice. Naming tensions is what keeps this from reading like a
//   horoscope, and it is the single biggest trust lever the product has.
//
// FOUNDER-ONLY. The Care Protocol ships hidden, so this endpoint refuses
// anyone who is not the founder. resolveUser verifies the bearer token
// server-side; a client-asserted identity is never trusted.

export const config = { maxDuration: 60 }

const Anthropic = require('@anthropic-ai/sdk')
const { createClient } = require('@supabase/supabase-js')

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const admin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
)

// Verify the caller and confirm the founder role from app_metadata, which is
// server-set and cannot be edited by the client.
async function resolveFounder(req) {
  try {
    const header = req.headers.authorization || req.headers.Authorization || ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : null
    if (!token) return null
    const { data, error } = await admin.auth.getUser(token)
    if (error || !data?.user) return null
    if (data.user.app_metadata?.role !== 'founder') return null
    return data.user
  } catch (_) {
    return null
  }
}

const TIER_RULES = `EVIDENCE TIERS — these govern how you are allowed to speak.

  measured  A validated instrument with research behind it (IPIP Big Five,
            ECR-RS attachment). You may state these as findings.
  mapped    Structured self-report. Useful vocabulary, not a validated scale.
            State these as what the person said about themselves.
  mythic    No evidence base at all (astrology, human design, Chinese zodiac,
            numerology, dosha). You may use these ONLY as language and
            metaphor, never as evidence or cause. Never write "because you are
            a Projector" or "your Cancer moon makes you". Write "the human
            design read calls this X, which is a useful name for it" or fold
            it in as vocabulary the person already recognises.

The product's entire differentiator is that it tells people which of its
inputs are science. Do not blur the tiers to make the reading sound stronger.`

function buildPrompt(payload) {
  const { vector, displayName, openWish, openLine, humanDesign, big3 } = payload

  const byTier = { measured: [], mapped: [], mythic: [] }
  for (const item of vector || []) {
    const tier = byTier[item.evidence_tier] ? item.evidence_tier : 'mythic'
    const name = item.label && item.label !== item.dimension ? item.label : item.dimension
    byTier[tier].push(`  ${name}: ${item.value}/100 (confidence ${item.confidence})`)
  }

  return `You are writing the synthesis layer of a Care Protocol — a card that tells the people in someone's life how to care for them, and serves as a self-care reference for the person themselves.

The card is not a horoscope and not a diagnosis. It is a set of instructions a partner can act on.

${TIER_RULES}

── THE PERSON ──
Name: ${displayName || 'unnamed'}
${big3 ? `Placements: ${big3.sun.sign} sun, ${big3.moon.sign} moon, ${big3.rising.sign} rising` : ''}
${humanDesign ? `Human design: ${humanDesign.profile} ${humanDesign.type}, ${humanDesign.authority} authority, ${humanDesign.definition} definition. Defined centres: ${(humanDesign.definedCentres || []).join(', ') || 'none'}. Open centres: ${(humanDesign.openCentres || []).join(', ') || 'none'}.` : ''}

── MEASURED ──
${byTier.measured.join('\n') || '  (nothing measured yet)'}

── MAPPED ──
${byTier.mapped.join('\n') || '  (nothing mapped yet)'}

── MYTHIC ──
${byTier.mythic.join('\n') || '  (nothing computed yet)'}

── IN THEIR OWN WORDS ──
What they wish people knew: ${openWish || '(not answered)'}
${openLine ? `The line they chose for the card: ${openLine}` : ''}

── YOUR TASK ──

Return ONLY valid JSON, no markdown fence, in exactly this shape:

{
  "wired": "...",
  "convergences": [ { "need": "...", "reading": "..." } ],
  "tensions": [ { "tension": "...", "inPractice": "..." } ],
  "suggestedLine": "..."
}

"wired" — 60 to 90 words. A plain-language portrait of how this person is put
together. Observation, not jargon. No system names, no scores, no astrology
vocabulary. Write it so a partner reading it thinks "yes, that is them" without
needing to know what any of the inputs were. Second person, addressed to the
person themselves.

"convergences" — 2 or 3 entries. Each is a place where INDEPENDENT systems
point at the same need. "need" is 2 to 5 words naming it. "reading" is one or
two sentences, and must name which systems agreed, with their tiers made
obvious in the phrasing. A convergence that draws on three mythic sources and
nothing measured is weaker than one backed by a measured instrument — say so
rather than hiding it.

"tensions" — 1 or 2 entries. Places where the systems genuinely disagree.
"tension" names the contradiction in a short phrase. "inPractice" describes,
concretely, what that contradiction looks like in this person's actual life
and what it means for someone caring for them. Do not resolve the tension into
a tidy both-and. Leave it standing. If nothing genuinely contradicts, return an
empty array rather than inventing one.

"suggestedLine" — one sentence, maximum 20 words, drawn from what they wrote in
their own words above, offered as the line the card could carry in their voice.
If they already supplied a line, return that line unchanged. If they wrote
nothing, return an empty string.

TONE — warm, direct, unsentimental. British spelling. No em-dashes; use a
middot with spaces instead. Never use the phrase "love language". Do not
flatter. Do not tell them they are special. The register is a garment care tag:
practical, slightly wry, and sincere underneath.`
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const user = await resolveFounder(req)
  if (!user) return res.status(403).json({ error: 'Not available' })

  try {
    const { vector, displayName, openWish, openLine, humanDesign, big3 } = req.body || {}
    if (!Array.isArray(vector) || vector.length === 0) {
      return res.status(400).json({ error: 'Missing trait vector' })
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1600,
      messages: [
        {
          role: 'user',
          content: buildPrompt({ vector, displayName, openWish, openLine, humanDesign, big3 }),
        },
      ],
    })

    const raw = (response.content[0]?.text || '').replace(/```json|```/g, '').trim()

    let parsed
    try {
      parsed = JSON.parse(raw)
    } catch (_) {
      // A malformed model response should degrade to a usable card rather than
      // an error state. The prose is the valuable part; the structure is not
      // worth failing the whole request over.
      return res.json({
        wired: raw.slice(0, 900),
        convergences: [],
        tensions: [],
        suggestedLine: openLine || '',
        degraded: true,
        generatedAt: new Date().toISOString(),
      })
    }

    return res.json({
      wired: typeof parsed.wired === 'string' ? parsed.wired : '',
      convergences: Array.isArray(parsed.convergences) ? parsed.convergences.slice(0, 4) : [],
      tensions: Array.isArray(parsed.tensions) ? parsed.tensions.slice(0, 3) : [],
      suggestedLine: typeof parsed.suggestedLine === 'string' ? parsed.suggestedLine : (openLine || ''),
      generatedAt: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[care-synthesis] Error:', err)
    return res.status(500).json({ error: 'Synthesis failed' })
  }
}
