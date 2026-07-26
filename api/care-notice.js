// api/care-notice.js
//
// The immediate reflection. Autosave answers one question — "is my answer
// safe" — and answers it well, but it was never going to answer the other
// one: "did anyone actually notice what I just said." Reported directly,
// about the intake experience itself: filling in a vulnerable answer and
// watching it get silently filed away, with the only feedback being a status
// dot, is bad bedside manner for a tool whose entire purpose is care.
//
// This is deliberately NOT api/care-synthesis.js in miniature. Synthesis is
// the considered, cross-system portrait, generated once, on request, from
// everything at once. This fires the moment a founder finishes writing a
// single freetext answer — before they've moved to the next question — and
// says only: I saw that. One or two sentences, specific to what they wrote,
// nothing analytical, nothing systemic, no scores, no tiers. The turn of the
// head, not the diagnosis.
//
// FOUNDER-ONLY, same pattern as care-synthesis.js: resolveFounder verifies
// the bearer token server-side against app_metadata, which the client cannot
// edit.

export const config = { maxDuration: 20 }

const Anthropic = require('@anthropic-ai/sdk')
const { createClient } = require('@supabase/supabase-js')

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const admin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
)

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

function buildPrompt({ prompt, text, displayName }) {
  return `Someone is filling in a private intake form for a tool that reflects their own care needs back to them. They were just asked the question below, wrote the answer below it, and moved on to the next field. Your only job is to show them, in the space of one or two sentences, that what they wrote actually landed with someone — not to analyse it, not to advise them, not to summarise it back at them in other words.

Reference something SPECIFIC from what they actually wrote — a phrase, a word choice, the thing underneath the thing — the way a person who was genuinely listening would respond, not the way a form confirmation would.

Do not open with "Thank you for sharing" or any equivalent. Do not use therapy-speak ("it sounds like...", "I hear that...", "that must be..."). Do not diagnose, advise, or reach for any system name (astrology, human design, attachment, etc.) — this is not the synthesis, it is the moment before it. Second person, addressed to them directly. Warm, direct, brief: 1 to 2 sentences, 40 words or fewer, total.

${displayName ? `Their name, if useful: ${displayName}` : ''}

Question asked: ${prompt}
What they wrote: "${text}"

Return ONLY the 1-2 sentence reflection itself. No preamble, no quotation marks around it, no JSON, no labels.`
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const user = await resolveFounder(req)
  if (!user) return res.status(403).json({ error: 'Not available' })

  try {
    const { prompt, text, displayName } = req.body || {}
    // Too short to say anything true about — "fine" or "idk" deserves silence,
    // not a fabricated reading stretched over three words. The UI already
    // gates the call on length before firing; this is the belt-and-braces
    // server-side floor.
    if (!text || typeof text !== 'string' || text.trim().length < 15) {
      return res.status(400).json({ error: 'Too short to reflect on' })
    }
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Missing prompt' })
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 200,
      messages: [
        { role: 'user', content: buildPrompt({ prompt, text: text.trim(), displayName }) },
      ],
    })

    const notice = (response.content[0]?.text || '').trim()
    if (!notice) return res.status(502).json({ error: 'Empty reflection' })

    return res.json({ notice, generatedAt: new Date().toISOString() })
  } catch (err) {
    console.error('[care-notice] Error:', err)
    return res.status(500).json({ error: 'Reflection failed' })
  }
}
