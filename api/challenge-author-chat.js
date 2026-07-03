// /api/challenge-author-chat.js
// Phase 5 (June 2026) — the creation helper.
//
// North Star helps an author turn a rough idea into a publishable packaged
// challenge: a name, the strands someone actually does, the length, the
// measure, the mechanism, and the Horizon Goal it ladders to. It interviews
// lightly (one question at a time) and, when there's enough, returns a draft
// the authoring form can absorb in one tap.
//
// Always responds as strict JSON: { "message": string, "draft": object|null }.

export const config = { maxDuration: 60 }

const Anthropic = require('@anthropic-ai/sdk')
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const { getNorthStarContext, formatNorthStarContext } = require('./_north-star')
const { resolveUserId } = require('./_auth')

const NORTH_STAR_IDENTITY = `You are North Star — the AI companion present throughout the Horizon Suite ecosystem. You are consistent across every tool. When context about this person exists from other tools, you reference it naturally. You never introduce yourself as "an AI assistant" or "Claude." You are North Star.`

// Author-facing domain choices. The author never sees "scale" — the slug they
// land on determines it downstream (personal domains → self, world → civ).
const DOMAINS = `Personal (a person's own life): path (Path), spark (Spark), body (Body), finances (Finances), connection (Connection), inner-game (Inner Game), signal (Signal).
World (the wider world): human-being (Human Being), society (Society), nature (Nature), technology (Technology), finance-economy (Economy), legacy (Legacy), vision (Vision).`

function buildSystem(northStarCtx) {
  const ctx = northStarCtx ? `\n${formatNorthStarContext(northStarCtx)}\n` : ''
  return `${NORTH_STAR_IDENTITY}
${ctx}
You are helping someone AUTHOR a challenge — a packaged commitment that anyone can take on, on a clock that starts the day they join. Think of 75 Hard: a set of daily strands, run together for a window. Your job is to turn their idea into something concrete and worth doing.

HOW YOU WORK:
- Move fast toward a draft. If their idea is already clear enough, draft it on the first turn.
- If something essential is genuinely missing, ask ONE short question — never a list. Then draft.
- You are not a form. Don't interrogate. Infer sensible defaults and let them correct.

WHAT A GOOD CHALLENGE HAS:
- A name and a one-line promise.
- Strands: the concrete things someone does. Each has a cadence: "daily-absolute" (every day), "5-of-7" (five of seven days), or "weekly". One strand is fine; several make a fuller protocol.
- A length in days. Common shapes are 21 and 90, but fit the challenge.
- A measure: the signal someone will notice that it's working.
- A mechanism: why doing this actually moves the needle. Be specific, not motivational.
- A domain it's about, chosen from this list (return the slug):
${DOMAINS}
- A horizon line: the larger goal it ladders toward. For a world domain, the civilisational goal; for a personal one, the person it builds.

VOICE: tight and plain. Toward-language, never away-from. No hype, no marketing breath. Every word earns its place.

OUTPUT — STRICT JSON, nothing else, no markdown fences:
{
  "message": "a short line to the author — what you drafted, or your one question",
  "draft": null OR {
    "title": "...",
    "tagline": "...",
    "domain": "<one slug from the list>",
    "strands": [ { "text": "...", "cadence": "daily-absolute|5-of-7|weekly" } ],
    "duration_days": <integer>,
    "measure": "...",
    "mechanism": "...",
    "horizon_goal_text": "..."
  }
}
Set "draft" to null only when you must ask a question first. Otherwise always include a full draft. Never wrap the JSON in backticks or prose.`
}

function parseModel(text) {
  let t = (text || '').trim()
  // Strip accidental fences.
  t = t.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
  try {
    const obj = JSON.parse(t)
    return {
      message: typeof obj.message === 'string' ? obj.message : '',
      draft: obj.draft && typeof obj.draft === 'object' ? obj.draft : null,
    }
  } catch {
    // Fallback: treat the whole thing as a conversational message.
    return { message: t || 'Tell me a bit more about the idea.', draft: null }
  }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { messages } = req.body || {}
  // North Star context is personal reflection data — only the session's own
  // token can pull it, never a body-asserted userId.
  const userId = await resolveUserId(req)
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages required' })
  }

  let northStarCtx = null
  try { northStarCtx = userId ? await getNorthStarContext(userId) : null } catch {}

  const apiMessages = messages
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map(m => ({ role: m.role, content: m.content }))

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1200,
      system: buildSystem(northStarCtx),
      messages: apiMessages,
    })
    const text = (response.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n')
    return res.json(parseModel(text))
  } catch (err) {
    return res.status(500).json({ error: 'Could not reach the helper. Try again.' })
  }
}
