// api/self-recalibrate.js
//
// North Star recalibration conversation for a personal domain.
// Accessible via the UPDATE button in the domain panel on Mission Control.
//
// The conversation is intentionally minimal:
//   - North Star opens with "What has changed?"
//   - User describes what's shifted — life movement, new ambition, both
//   - North Star reads the response, determines whether this is a current
//     score update, a horizon update, or both, and proposes accordingly
//   - User confirms or adjusts
//   - On confirmation, scores write back to horizon_profile
//
// North Star never presumes which kind of update is needed. It reads
// what the person describes and names what it's proposing to change.
//
// The Kryptonian principle applies: this person is not broken. They are
// recalibrating. The tone is that of a trusted witness, not a therapist.
//
// POST body:
//   userId       string    — Supabase auth user id
//   domain       string    — SELF_KEY
//   domainName   string    — display name
//   current      number    — current score at time of conversation start
//   horizon      number    — horizon score at time of conversation start
//   iaStatement  string    — user's I am statement for this domain
//   horizonGoal  string    — user's horizon goal text
//   messages     Message[] — full conversation history { role, content }
//   confirm      object    — if present, write back and close
//     confirm.currentScore  number | null
//     confirm.horizonScore  number | null
//     confirm.horizonGoal   string | null
//
// Response (chat turn):
//   { message, proposal: Proposal | null }
//   Proposal: { currentScore, horizonScore, horizonGoal, summary }
//
// Response (confirm):
//   { written: true }

const Anthropic = require('@anthropic-ai/sdk')
const { getNorthStarContext, formatNorthStarContext, writeNorthStarNote, writeDomainScore } = require('./_north-star')

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SELF_KEYS = ['path', 'spark', 'body', 'finances', 'connection', 'inner_game', 'signal']

const TIER_STAGES = {
  10: 'World-Class', 9.5: 'Exemplar+', 9: 'Exemplar',
  8.5: 'Fluent+', 8: 'Fluent', 7.5: 'Capable+', 7: 'Capable',
  6.5: 'Functional+', 6: 'Functional', 5.5: 'Plateau+', 5: 'Threshold',
  4.5: 'Friction+', 4: 'Friction', 3.5: 'Strain+', 3: 'Strain',
  2.5: 'Crisis+', 2: 'Crisis', 1.5: 'Emergency+', 1: 'Emergency',
  0.5: 'Flickering', 0: 'Ground Zero',
}

const tierLabel = n => {
  if (n == null) return 'unset'
  const key = Math.round(Number(n) * 2) / 2
  return TIER_STAGES[key] ? `${n} — ${TIER_STAGES[key]}` : String(n)
}

const DOMAIN_CONTEXT = {
  path:       'purpose, calling, contribution — the work you were built to do',
  spark:      'aliveness, curiosity, creativity, joy — the internal engine',
  body:       'physical health, energy, vitality, relationship with your body',
  finances:   'financial health, relationship with money, security, freedom',
  connection: 'depth of relationships — what actually passes between you and others',
  inner_game: 'beliefs, identity, self-worth, the stories running beneath the surface',
  signal:     'presence, voice, how you show up in the world',
}

const buildSystem = (domain, domainName, current, horizon, iaStatement, horizonGoal, nsBlock) => `You are North Star — the voice present across every NextUs tool. You are not an AI assistant. You are North Star, running a recalibration conversation inside Mission Control.

${nsBlock || ''}

THE PERSON'S CURRENT DOMAIN STATE:
Domain: ${domainName} (${DOMAIN_CONTEXT[domain] || domain})
Current score (when they last mapped): ${tierLabel(current)}
Horizon score: ${tierLabel(horizon)}
${iaStatement ? `Their I am statement: "${iaStatement}"` : 'No I am statement written yet.'}
${horizonGoal ? `Their horizon goal: "${horizonGoal}"` : 'No horizon goal written yet.'}

YOUR ROLE IN THIS CONVERSATION:
The person tapped UPDATE. You opened with "What has changed?" They are responding now.

Read what they describe carefully:
- If they describe LIFE MOVEMENT (new experiences, changed circumstances, growth, regression) → this is primarily a current score update
- If they describe SHIFTED AMBITION or DIRECTION (their ceiling has moved, the goal feels wrong, they want something different) → this is primarily a horizon update
- If both are present → propose both

CONVERSATION SHAPE (3–4 exchanges maximum):
1. They describe what's changed
2. You reflect back what you heard, name what you think has moved (current / horizon / both), and propose a specific update with a one-sentence rationale grounded in THEIR words. Ask: "Does that feel right?"
3. They confirm or adjust
4. You finalise and signal ready to write

WHEN YOU ARE READY TO PROPOSE AN UPDATE:
Include a JSON block at the very end of your message (after your conversational text), formatted exactly like this — North Star's proposal:

<proposal>
{
  "currentScore": 6.5,
  "horizonScore": null,
  "horizonGoal": null,
  "summary": "One sentence — what you're updating and why, in plain language."
}
</proposal>

Rules for the proposal block:
- Use null for any field you are NOT proposing to change
- currentScore must be a number 0–10 in 0.5 increments, or null
- horizonScore must be a number 0–10 in 0.5 increments, or null  
- horizonGoal is the revised goal text as a string, or null
- summary is one plain sentence — no jargon, no therapy-voice
- Only include the proposal block when you are genuinely ready — not on the first response

GUARDRAILS:
- Never diagnose. Reflect what they said.
- Never override their final number — defer always
- One question per response maximum
- No therapy-voice. No "I hear you." No "That's really powerful."
- The Kryptonian principle: they are not broken. They are recalibrating.
- Short responses. This is a trusted witness, not a counsellor.
- If they describe crisis-level distress (not just a low score), stop proposing scores and offer 988.`

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method-not-allowed' })

  const {
    userId, domain, domainName,
    current, horizon, iaStatement, horizonGoal,
    messages = [],
    confirm,
  } = req.body || {}

  if (!domain || !SELF_KEYS.includes(domain)) {
    return res.status(400).json({ error: 'invalid-domain' })
  }

  // ── Confirm path — write back and close ──────────────────────
  if (confirm) {
    const fields = {}
    if (confirm.currentScore != null) fields.current_score = confirm.currentScore
    if (confirm.horizonScore != null) fields.horizon_score = confirm.horizonScore
    if (confirm.horizonGoal  != null) fields.horizon_goal  = confirm.horizonGoal

    if (Object.keys(fields).length > 0 && userId) {
      await writeDomainScore(userId, domain, fields, 'recalibration')

      // Write a North Star note so other tools know about the recalibration
      const parts = []
      if (confirm.currentScore != null) parts.push(`current score updated to ${confirm.currentScore}`)
      if (confirm.horizonScore != null) parts.push(`horizon score updated to ${confirm.horizonScore}`)
      if (confirm.horizonGoal  != null) parts.push(`horizon goal revised`)
      await writeNorthStarNote(
        userId,
        'map',
        `${domainName} recalibration (Mission Control): ${parts.join(', ')}. Previous current: ${current}.`
      )
    }

    return res.status(200).json({ written: true })
  }

  // ── Chat path ─────────────────────────────────────────────────
  let nsBlock = ''
  if (userId) {
    try {
      const ctx = await getNorthStarContext(userId)
      if (ctx) nsBlock = formatNorthStarContext(ctx)
    } catch (_) {}
  }

  const system = buildSystem(domain, domainName, current, horizon, iaStatement, horizonGoal, nsBlock)

  // First turn — inject North Star's opening line as an assistant message
  // so the conversation starts with "What has changed?" without an API round-trip
  const isFirst = !messages || messages.length === 0
  if (isFirst) {
    return res.status(200).json({
      message: 'What has changed?',
      proposal: null,
    })
  }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 600,
      system,
      messages,
    })

    const raw = response.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('')
      .trim()

    // Extract proposal block if present
    let proposal = null
    const proposalMatch = raw.match(/<proposal>([\s\S]*?)<\/proposal>/)
    if (proposalMatch) {
      try {
        proposal = JSON.parse(proposalMatch[1].trim())
      } catch (_) {}
    }

    // Strip the proposal block from the displayed message
    const message = raw.replace(/<proposal>[\s\S]*?<\/proposal>/, '').trim()

    return res.status(200).json({ message, proposal })
  } catch (err) {
    console.error('[self-recalibrate] error:', err?.message || err)
    return res.status(500).json({ error: 'upstream-error' })
  }
}
