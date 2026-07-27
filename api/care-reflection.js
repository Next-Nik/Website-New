// api/care-reflection.js
//
// (renamed from api/care-notice.js — "reflection" throughout, not "notice"/
// "noticed", per direct request.)
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

// §23 — how the founder has said they need to be cared for, threaded into
// every voice this endpoint speaks with. The intake is not just data
// collection for a card: the tool itself is a relationship, and a tool that
// collects "here is how I need care" and then speaks to the person without
// ever letting it shape the speaking is doing the exact thing the intake
// exists to prevent — reported in nearly those words: "if none of it plays
// out in the rest of the tool then it's just like being ignored by someone
// that I want love from." The context arrives from the client, assembled
// from the person's own ratings, attachment read, and written words. It
// shapes HOW each response speaks — tone, emphasis, what to lead with —
// never as content to recite back at them.
function careContextBlock(careContext) {
  if (!careContext || typeof careContext !== 'string') return ''
  return `
How they have told this tool they need to be cared for. Let it shape HOW you speak — tone, pacing, what you emphasize — never as content to recite back or a way to show off that you know it:
${careContext.slice(0, 2400)}
`
}

// The freetext reflection — fires on blur of a single open-ended answer.
// One or two sentences, the turn of the head mid-writing.
function buildFreetextPrompt({ prompt, text, displayName, careContext }) {
  return `Someone is filling in a private intake form for a tool that reflects their own care needs back to them. They were just asked the question below, wrote the answer below it, and moved on to the next field. Your only job is to show them, in the space of one or two sentences, that what they wrote actually landed with someone — not to analyse it, not to advise them, not to summarise it back at them in other words.

Reference something SPECIFIC from what they actually wrote — a phrase, a word choice, the thing underneath the thing — the way a person who was genuinely listening would respond, not the way a form confirmation would.

Do not open with "Thank you for sharing" or any equivalent. Do not use therapy-speak ("it sounds like...", "I hear that...", "that must be..."). Do not diagnose, advise, or reach for any system name (astrology, human design, attachment, etc.) — this is not the synthesis, it is the moment before it. Second person, addressed to them directly. Warm, direct, brief: 1 to 2 sentences, 40 words or fewer, total.
${careContextBlock(careContext)}
${displayName ? `Their name, if useful: ${displayName}` : ''}

Question asked: ${prompt}
What they wrote: "${text}"

Return ONLY the 1-2 sentence reflection itself. No preamble, no quotation marks around it, no JSON, no labels.`
}

// The section reflection — fires when a whole section is saved. This is the
// beat the product was missing: answer a block of questions, press Save,
// and the tool shows it actually read what it was just given. Bigger than
// the freetext nicety (a pattern across answers, not a single phrase), still
// deliberately smaller than the synthesis (this section only — it must not
// reach across systems, that's the synthesis's job and blurring the two
// would blur the evidence-tier honesty the whole build stands on).
function buildSectionPrompt({ section, displayName, careContext }) {
  const measured = section.evidence === 'measured'
  return `Someone just filled in the "${section.name}" section of a private intake for a tool that reflects their care needs back to them, and pressed Save. These are assessment instruments — the person's stated wish for this tool is to feel genuinely assessed and seen, not filed. Your job: in 2 to 4 sentences, show them that a real pattern in THEIR answers was seen. Not a summary, not a receipt — the feeling of being read by someone paying close attention.

Ground rules:
- Anchor on something SPECIFIC: the highest and lowest things they rated, the one thing they said they'd keep, a tension or an unusually strong signal in the answers, their own written words if any are present. Generic warmth with no specifics is failure.
- ${measured
    ? 'This section is a measured instrument. Where computed scores are given (including any z-scores against population norms), you may say plainly what they indicate — but translate the numbers into something human. Never recite "you scored 73/100."'
    : `This section's evidence tier is "${section.evidence}" — interpretive, not measured. Speak in this section's own tradition and vocabulary, confidently but without dressing it up as scientific fact.`}
- Stay inside THIS section for CONTENT. Do not mention or draw on any other assessment, system, or section — that cross-reading is a different, deliberate feature, not this one. (The care-manner notes below are about how to speak, not content to draw on.)
- No advice, no diagnosis, no "it sounds like" / "I hear that" / "that must be", no opening with thanks. Second person, addressed to them directly. Warm, direct, unhurried. 2 to 4 sentences, 90 words or fewer.
${careContextBlock(careContext)}
${displayName ? `Their name, if useful: ${displayName}` : ''}

Section: ${section.name}
What they entered:
${section.answers}
${section.scores ? `\nComputed scores (for your grounding — do not recite mechanically):\n${section.scores}` : ''}

Return ONLY the reflection itself. No preamble, no quotation marks around it, no JSON, no labels.`
}

// §23 — the depth translation. The Depth page renders the complete natal
// chart and bodygraph as data — reported directly: "it gives me almost the
// equivalent of code... I want all of this in case I want to explore more
// but mainly I want it translated to me by you." This is that translation:
// the tool reading its own tables aloud, in plain warm language, to the one
// person the tables are about.
function buildDepthPrompt({ depth, displayName, careContext }) {
  return `You are the voice of a private care tool, speaking to its one founder. They have opened the "Depth" page — the complete technical readout of their natal astrology chart and human design bodygraph, plus today's sky. They asked for exactly this: keep the tables for exploring, but have YOU translate them, so understanding does not require studying tomes.

Write the translation. 3 to 5 short paragraphs, 260 words or fewer total:
- Lead with what is genuinely most distinctive in THIS chart and bodygraph — the strongest patterns, not a row-by-row tour. Skip anything unremarkable.
- Translate every term the moment you use it ("your Moon in Cancer in the first house — the emotional weather people meet first in you"). Never leave jargon standing alone; never lecture about what a term means in general.
- These are the systems' own vocabularies (astrology, human design) — speak them confidently in their own voice, without dressing them up as scientific fact and without hedging every sentence into mush.
- End with today, briefly: what the current sky is doing against their chart, and anything worth knowing that is coming up.
- Second person, addressed to them. Warm, unhurried, specific. No headers, no bullet lists, no numbers recited for their own sake.
${careContextBlock(careContext)}
${displayName ? `Their name, if useful: ${displayName}` : ''}

The data:
${depth.summary}

Return ONLY the translation itself. No preamble, no labels.`
}

// The practice reflection — fires when an URGE is logged on The Practice (its
// own standalone tool; src/pages/Practice.jsx). A logged sabotage-pull is one
// of the most vulnerable disclosures this endpoint receives, and it is
// exactly the moment the turn-of-the-head matters most. Different job from
// every other mode here: not "I saw what you wrote" (freetext), not "here is
// the pattern in your answers" (section), not a translation (depth) — this
// one holds a single recovery frame steady: the urge is withdrawal, a
// set-point defending itself; it is never a character verdict.
//
// context (optional): ~30-day TRENDS from the practice log, built by
// buildRecoveryContext() in src/lib/practice — never a raw diary. It shapes
// the reflection's bearing only; see contextBlock below for the same rule
// spelled out for the model.
function contextBlock(context) {
  if (!context || typeof context !== 'string' || !context.trim()) return ''
  return `
For your bearing only — how their recent weeks have actually been moving. Do NOT recite, summarise, or quote any of this back at them; it exists so your steadiness is informed rather than generic. If their own written words appear in it (their tape, their counter-lines), you may echo AT MOST a few words of those — theirs, never the statistics:
${context.trim().slice(0, 4000)}
`
}

function buildPracticePrompt({ entry, displayName, context }) {
  return `Someone in recovery just logged a sabotage urge in their own private daily practice log. The frame their recovery work is built on: the urge is a withdrawal symptom — a stress system defending the chaotic state it was calibrated to, registering something good or calm as danger — and never a character failure. Logging it at all is the practice working.

Your job, in 1 to 3 sentences: reflect the SPECIFIC thing they logged back so it lands as seen, inside that frame. The way a steady person who knows their history would respond — present, unimpressed by the urge, on their side.

Ground rules:
- Anchor on their specifics: the particular pull, what set it off, what they did. Generic recovery warmth with no specifics is failure.
- If they rode it out: the wave rose and passed and nothing had to burn — name that plainly, without cheerleading.
- If they made the move anyway: zero shame. It is data about the pattern, not a verdict about them. Do not call it a relapse or a failure.
- If they are still in it: steady, present, and concretely small — the only move worth suggesting is no big moves right now.
- Never use program jargon, step numbers, or the words "relapse", "clean", "sober", "addict". Never diagnose. No therapy-speak ("it sounds like...", "I hear that..."), no opening with thanks, no "proud of you", no exclamation marks.
- Second person, addressed to them directly. Calm, direct, brief: 1 to 3 sentences, 70 words or fewer.

${displayName ? `Their name, if useful: ${displayName}` : ''}
${contextBlock(context)}
What they logged:
${entry}

Return ONLY the reflection itself. No preamble, no quotation marks around it, no JSON, no labels.`
}

// The return reflection — fires when the evening return is saved. A
// day-inventory-shaped disclosure: where they were off, what they did well,
// anything to clear. Different rules from the urge prompt in two places: the
// "did well" line must actually land (the person's long habit is counting
// only the misses), and anything-to-clear gets the noticing affirmed but
// NEVER a prescribed conversation — what to do about it belongs to the
// people in their corner, not to this tool.
function buildReturnPrompt({ entry, displayName, context }) {
  return `Someone in recovery just filled in their private evening return — a short end-of-day review with up to three parts: where they were off today, what they did well, and whether there's anything to clear with someone. Your job, in 2 to 3 sentences: reflect the day they actually described back so it lands as seen, with the steadiness of someone who knows their history and is on their side.

Ground rules:
- Anchor on their specifics. Generic end-of-day warmth with no specifics is failure.
- If they named something they did well, make sure it genuinely lands — this person's long habit is counting only the misses. Do not gush; name it plainly as real.
- If they named being off somewhere: naming it IS the practice working. No verdict, no fix, no "tomorrow you can..."
- If they named something to clear with someone: affirm the noticing, and go no further. Never suggest how, when, or whether to have that conversation — that belongs to the people in their corner, not to you.
- Never use program jargon, step numbers, or the words "relapse", "clean", "sober", "addict". No therapy-speak ("it sounds like...", "I hear that..."), no opening with thanks, no "proud of you", no exclamation marks.
- Second person, addressed to them directly. Calm, direct, brief: 2 to 3 sentences, 80 words or fewer.

${displayName ? `Their name, if useful: ${displayName}` : ''}
${contextBlock(context)}
Their return:
${entry}

Return ONLY the reflection itself. No preamble, no quotation marks around it, no JSON, no labels.`
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const user = await resolveFounder(req)
  if (!user) return res.status(403).json({ error: 'Not available' })

  try {
    const { prompt, text, displayName, section, depth, careContext, practice } = req.body || {}

    let content
    let maxTokens = 200
    if (practice) {
      // Practice mode: an urge entry or an evening return from The Practice
      // (its own standalone tool). The kind picks the prompt; both share the
      // same floor. This mode has no careContext — The Practice does not
      // read Care Protocol's intake — but it has its own optional recovery
      // trends context, carried as practice.context.
      if (!practice.entry || typeof practice.entry !== 'string' || practice.entry.trim().length < 10) {
        return res.status(400).json({ error: 'Too little to reflect on' })
      }
      content = practice.kind === 'return'
        ? buildReturnPrompt({ entry: practice.entry.trim(), displayName, context: practice.context })
        : buildPracticePrompt({ entry: practice.entry.trim(), displayName, context: practice.context })
      maxTokens = 240
    } else if (depth) {
      // Depth mode: translate the full chart/bodygraph readout (§23).
      if (!depth.summary || typeof depth.summary !== 'string' || depth.summary.trim().length < 40) {
        return res.status(400).json({ error: 'Too little to translate' })
      }
      content = buildDepthPrompt({ depth, displayName, careContext })
      maxTokens = 800
    } else if (section) {
      // Section mode: a whole block of answers, sent on Save.
      if (!section.name || typeof section.name !== 'string') {
        return res.status(400).json({ error: 'Missing section name' })
      }
      if (!section.answers || typeof section.answers !== 'string' || section.answers.trim().length < 10) {
        return res.status(400).json({ error: 'Too little to reflect on' })
      }
      content = buildSectionPrompt({ section, displayName, careContext })
      maxTokens = 320
    } else {
      // Freetext mode: a single open-ended answer, sent on blur.
      // Too short to say anything true about — "fine" or "idk" deserves
      // silence, not a fabricated reading stretched over three words. The UI
      // already gates the call on length before firing; this is the
      // belt-and-braces server-side floor.
      if (!text || typeof text !== 'string' || text.trim().length < 15) {
        return res.status(400).json({ error: 'Too short to reflect on' })
      }
      if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({ error: 'Missing prompt' })
      }
      content = buildFreetextPrompt({ prompt, text: text.trim(), displayName, careContext })
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      // Depth translations run a few paragraphs; section reflections 2-4
      // sentences; practice ones 1-3; freetext ones 1-2.
      max_tokens: maxTokens,
      messages: [{ role: 'user', content }],
    })

    const reflection = (response.content[0]?.text || '').trim()
    if (!reflection) return res.status(502).json({ error: 'Empty reflection' })

    return res.json({ reflection, generatedAt: new Date().toISOString() })
  } catch (err) {
    console.error('[care-reflection] Error:', err)
    return res.status(500).json({ error: 'Reflection failed' })
  }
}
