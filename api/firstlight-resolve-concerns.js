// NEXTUS: FIRST LIGHT — Concern → Problem Chain Resolver
// api/firstlight-resolve-concerns.js
//
// Called fire-and-forget after First Light completes. Takes a user's
// freetext vision and concern statements (away-from language) and
// resolves them to problem_chain slugs from the controlled vocabulary.
// Writes the result back to contributor_profiles_beta.problem_chains
// so the person is matchable from day one.
//
// Non-blocking from the client's perspective — failures are silent.
// The user is already in the platform before this runs.

const Anthropic = require('@anthropic-ai/sdk')
const { createClient } = require('@supabase/supabase-js')

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const supabase  = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const SYSTEM = `You are matching a person's freetext concerns to a controlled problem-chain vocabulary.

A problem-chain represents an away-from concern people have about the world — e.g. "climate inaction", "wealth concentration", "loss of meaning". The person has written their own words about what they care about. Your job is to identify which chains genuinely match what they've expressed.

RULES:
1. Only tag chains that genuinely match. False positives are worse than misses.
2. Use slugs exactly as given. Do not invent new chains.
3. Most people will match 1–4 chains. More than 6 means you're over-matching.
4. The person's words may be vague — match the spirit, not just keywords.
5. "I want to live in a world where X" and "I care about Y" are both useful signals.

OUTPUT: JSON only, no prose:
{ "chains": ["slug-1", "slug-2", ...] }`

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { user_id, vision, concerns } = req.body || {}
  if (!user_id || (!vision && (!concerns || concerns.length === 0))) {
    return res.status(400).json({ error: 'user_id and at least one concern or vision required' })
  }

  // Load active vocabulary
  const { data: vocab } = await supabase
    .from('nextus_problem_chains')
    .select('slug, label, description')
    .eq('status', 'active')
    .order('slug')

  if (!vocab || vocab.length === 0) {
    return res.status(200).json({ ok: true, chains: [], note: 'No vocabulary available' })
  }

  const vocabText = vocab.map(v => `${v.slug}: ${v.label}${v.description ? ` — ${v.description}` : ''}`).join('\n')

  const userText = [
    vision ? `Vision: "${vision}"` : null,
    ...(concerns || []).map((c, i) => c ? `Concern ${i + 1}: "${c}"` : null),
  ].filter(Boolean).join('\n')

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 256,
      system: SYSTEM,
      messages: [{
        role: 'user',
        content: `VOCABULARY:\n${vocabText}\n\nPERSON'S STATEMENTS:\n${userText}\n\nWhich chains match?`,
      }],
    })

    const text = response.content?.[0]?.text || '{}'
    let chains = []
    try {
      const parsed = JSON.parse(text.replace(/```json|```/g, '').trim())
      chains = (parsed.chains || []).filter(s => vocab.some(v => v.slug === s))
    } catch (e) {
      console.error('First Light resolver parse error:', e, text)
    }

    if (chains.length > 0) {
      await supabase
        .from('contributor_profiles_beta')
        .update({ problem_chains: chains, updated_at: new Date().toISOString() })
        .eq('id', user_id)
    }

    return res.status(200).json({ ok: true, chains })
  } catch (e) {
    console.error('First Light resolver error:', e)
    return res.status(500).json({ error: 'Resolution failed' })
  }
}
