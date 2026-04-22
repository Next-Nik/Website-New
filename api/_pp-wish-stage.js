// ─── PURPOSE PIECE — WISH STAGE HANDLER (v10) ────────────────────────────────
// The new entry point to the tool. An open conversation, not a scripted loop.
//
// Function: find what the person wishes the world had more of, extract the
// domain from their language, and pass a confirmed domain to the Pull stage.
//
// The person never sees the seven-domain taxonomy. The tool reads the domain
// from their wish and moves into Pull inside that territory without ceremony.
//
// Session shape additions:
//   wishTranscript:   [ { role: 'assistant'|'user', content: string } ]
//   wish:             string  — the original wish, verbatim
//   wish_positive:    string  — the positive framing (what it makes available)
//   wishPhase:        'opening' | 'conversion' | 'deepening' | 'clarifying' | 'focusing' | 'complete'
//   domain:           string  — canonical domain name (set on phase: complete)
//   domain_id:        string  — slug
//   domain_confidence: 'strong' | 'blended' | 'thin'
//   domain_secondary: string | null

const Anthropic = require('@anthropic-ai/sdk')
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ─── Canonical domain taxonomy ───────────────────────────────────────────────
// These are the only values the extractor may return. Changes here must be
// coordinated with the NextUs platform domain slugs.

const DOMAINS = {
  'HUMAN BEING':       { id: 'human-being',      horizonGoal: 'Humans possess the physical, psychological, and developmental capacity to live well and act wisely in complexity.' },
  'SOCIETY':           { id: 'society',          horizonGoal: 'Human societies are just, inclusive, stable, and capable of collective problem-solving.' },
  'NATURE':            { id: 'nature',           horizonGoal: 'Human activity is net-positive for planetary health.' },
  'TECHNOLOGY':        { id: 'technology',       horizonGoal: 'Technology amplifies human and planetary flourishing without undermining agency, equity, or ecological stability.' },
  'FINANCE & ECONOMY': { id: 'finance-economy',  horizonGoal: 'Economic systems distribute value in ways that are fair, regenerative, and aligned with long-term wellbeing.' },
  'LEGACY':            { id: 'legacy',           horizonGoal: 'Humanity acts as a responsible steward across generations.' },
  'VISION':            { id: 'vision',           horizonGoal: 'Humanity maintains a shared capacity to imagine and choose better futures.' },
}

// Adjacent domain pairs where ambiguity is common. Each pair has a clarifying
// question framed as a real distinction, not a taxonomy choice.
const ADJACENT_CLARIFIERS = {
  'VISION|SOCIETY':           'Is the gap more about imagination — we can\'t even picture a genuinely good future? Or more about coordination — we can picture it but can\'t seem to get organised around it?',
  'SOCIETY|VISION':           'Is the gap more about imagination — we can\'t even picture a genuinely good future? Or more about coordination — we can picture it but can\'t seem to get organised around it?',
  'HUMAN BEING|SOCIETY':      'Is this more about what happens inside people — how they think, feel, regulate, develop? Or more about the structures we live inside — institutions, culture, the collective systems?',
  'SOCIETY|HUMAN BEING':      'Is this more about what happens inside people — how they think, feel, regulate, develop? Or more about the structures we live inside — institutions, culture, the collective systems?',
  'NATURE|TECHNOLOGY':        'Is this more about the living systems themselves — ecology, biodiversity, the natural world? Or more about the tools humans use and how they interact with those systems?',
  'TECHNOLOGY|NATURE':        'Is this more about the living systems themselves — ecology, biodiversity, the natural world? Or more about the tools humans use and how they interact with those systems?',
  'FINANCE & ECONOMY|SOCIETY': 'Is this more about how value and resources flow — what gets funded, what gets rewarded, incentive structures? Or more about the social and political structures themselves — governance, institutions, belonging?',
  'SOCIETY|FINANCE & ECONOMY': 'Is this more about how value and resources flow — what gets funded, what gets rewarded, incentive structures? Or more about the social and political structures themselves — governance, institutions, belonging?',
  'LEGACY|VISION':            'Is this more about what we preserve and carry forward — intergenerational wisdom, what must not be lost? Or more about what we\'re imagining and creating — the futures we\'re trying to conceive?',
  'VISION|LEGACY':            'Is this more about what we preserve and carry forward — intergenerational wisdom, what must not be lost? Or more about what we\'re imagining and creating — the futures we\'re trying to conceive?',
  'TECHNOLOGY|VISION':        'Is this more about the tools themselves — what they can do, how they\'re designed, who controls them? Or more about the collective imagination — what kind of future we\'re using them to build?',
  'VISION|TECHNOLOGY':        'Is this more about the tools themselves — what they can do, how they\'re designed, who controls them? Or more about the collective imagination — what kind of future we\'re using them to build?',
}

// ─── The opening ─────────────────────────────────────────────────────────────
// Shown when the wish stage begins. Conversational, not structured.

const WISH_OPENING = `What do you wish the world had more of?

If it's easier to come at it from the other direction — what would you most want the world to be free from?

There's no wrong answer here. We're not asking what you're currently doing. We're asking what you would be working toward if you were fully resourced and genuinely free to do the work that most lights you up in the world.`

// ─── Heuristics ──────────────────────────────────────────────────────────────
// Quick classification of what kind of wish the person has offered. Runs
// locally before any Claude call to keep the conversation responsive.

// Signals that a wish is framed negatively — i.e., the person is asking for
// something to be removed/ended rather than for something to exist.
//
// We look for *wish-to-remove* patterns, not just negative-valence vocabulary.
// A sentence like "I feel like suffering comes from disconnection" uses
// negative words but the wish underneath is positive (for connection).
const NEGATIVE_WISH_PATTERNS = [
  // Wish + removal verb
  /\b(wish|want|need|hope|pray).{0,20}(stop|end|eradicate|eliminate|get rid of|abolish|destroy)\b/i,
  /\b(wish|want|need).{0,20}\b(less|no more)\b/i,
  /\b(didn't|doesn't|wouldn't|shouldn't)\s+(have|need|exist|feel)\b/i,
  // Freedom-from framing
  /\bfree (from|of)\b/i,
  /\bwithout .{0,30}\b(violence|suffering|destruction|war|poverty|hunger|corruption|fear|anxiety)\b/i,
  /\bworld without\b/i,
  /\bno more\b/i,
  // Direct negations as primary wish
  /\b(stop|end|eradicate|eliminate)\s+(the|these|this|all)\b/i,
]

// Signals that the wish is personal rather than world-level
const PERSONAL_SIGNALS = [
  /\bmy kids?\b/i, /\bmy child(ren)?\b/i, /\bmy family\b/i, /\bmy partner\b/i,
  /\bmy community\b/i, /\bmy town\b/i, /\bmy neighbourhood\b/i, /\bmy neighborhood\b/i,
  /\bmy friends?\b/i, /\bmy parents?\b/i, /\bmy (mom|mum|dad)\b/i,
]

// Signals that the wish is scattered — naming multiple concerns at once
function isScattered(text) {
  const lower = text.toLowerCase()
  const commaCount = (lower.match(/,/g) || []).length
  const andCount   = (lower.match(/\band\b/gi) || []).length
  return (commaCount + andCount) >= 3
}

function isNegative(text) {
  return NEGATIVE_WISH_PATTERNS.some(re => re.test(text))
}

function isPersonal(text) {
  return PERSONAL_SIGNALS.some(re => re.test(text))
}

function wordCount(text) {
  return text.trim().split(/\s+/).filter(Boolean).length
}

function isThinWish(text) {
  if (wordCount(text) < 4) return true
  const lower = text.toLowerCase().trim()
  if (['idk', 'i don\'t know', 'not sure', 'no idea', 'dunno'].includes(lower)) return true
  return false
}

// ─── Claude-backed domain extractor ──────────────────────────────────────────
// Runs once at the end of the wish stage. Reads the full transcript and
// extracts the canonical domain, confidence, and any secondary domain.
//
// The extractor is conservative: if the wish genuinely sits between two
// domains it returns 'blended' with a secondary rather than forcing a choice.

async function extractDomainFromWish(session) {
  const transcript = (session.wishTranscript || [])
    .map(t => `${t.role === 'assistant' ? 'North Star' : 'Person'}: ${t.content}`)
    .join('\n\n')

  const systemPrompt = `You are reading a short conversation about what a person wishes the world had more of. Your job is to identify which of seven NextUs domains their wish lives in.

THE SEVEN DOMAINS:

HUMAN BEING — Personal development, consciousness, inner work, psychological and physical health, human capacity, nervous system regulation, meaning and identity. The domain of what happens inside people.

SOCIETY — Governance, culture, community, social structures, institutions, justice, belonging, collective problem-solving. The domain of the structures humans live inside together.

NATURE — Environment, ecology, planetary health, biodiversity, climate, regeneration, living systems. The domain of the more-than-human world and our relationship with it.

TECHNOLOGY — Tools, infrastructure, innovation, AI, data, digital systems, the designed environment. The domain of the tools humans build and how they reshape what's possible.

FINANCE & ECONOMY — Resources, exchange, wealth, value creation and distribution, incentive structures, labour, economic inclusion. The domain of how value flows through the system.

LEGACY — Long-term thinking, intergenerational wisdom, preservation, deep time, cultural continuity, existential risk, planetary stewardship. The domain of what we carry forward and protect for those who come after.

VISION — Future imagination, possibility, coordination direction, narrative and story, collective imagination, values and worldviews. The domain of where we're collectively trying to go.

READING INSTRUCTIONS:

1. Read for where the care actually lives, not for surface vocabulary. Someone who says "I want people to be kinder" is likely pointing at HUMAN BEING (inner capacity) or SOCIETY (collective norms) depending on whether the cause is internal or structural.

2. Personal wishes (for their family, their community) still have a domain — read what the wish implies about the world, not the personal frame.

3. If the wish clearly names the structural problem (economic system, governance, climate, coordination) use that as strong signal.

4. Distinguish carefully between adjacent domains:
   - VISION vs SOCIETY: Vision is about imagination and direction. Society is about coordination, institutions, justice.
   - HUMAN BEING vs SOCIETY: Human Being is what's inside people. Society is the structures they live inside.
   - NATURE vs TECHNOLOGY: Nature is the living systems. Technology is the tools humans build.
   - FINANCE & ECONOMY vs SOCIETY: Finance is how value flows. Society is the institutions and culture.
   - LEGACY vs VISION: Legacy is what we preserve. Vision is what we imagine.

5. Use confidence levels honestly:
   - "strong" — wish clearly points to one domain
   - "blended" — wish legitimately sits across two domains; return primary and secondary
   - "thin" — wish is too vague or scattered to read confidently; return best guess

6. NEVER return a domain not in the list above. The seven are canonical.

Return JSON only:
{
  "domain": "canonical domain name exactly as listed above, uppercase",
  "domain_id": "slug: human-being | society | nature | technology | finance-economy | legacy | vision",
  "confidence": "strong | blended | thin",
  "secondary": "canonical domain name if blended, else null",
  "secondary_id": "slug if blended, else null",
  "reasoning": "2 sentences — what in the transcript pointed to this domain"
}`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    system: systemPrompt,
    messages: [{
      role: 'user',
      content: `TRANSCRIPT:\n\n${transcript}\n\nExtract the domain.`
    }]
  })

  return extractJSON(response.content[0].text)
}

// ─── Claude-backed wish conversation ─────────────────────────────────────────
// Handles the actual dialogue. Given the transcript so far and the phase,
// produces the next North Star response.

async function generateWishResponse(session, phase) {
  const transcript = (session.wishTranscript || [])
    .map(t => `${t.role === 'assistant' ? 'North Star' : 'Person'}: ${t.content}`)
    .join('\n\n')

  const phaseGuidance = {
    conversion: `The person's wish came in framed negatively — they named something they want removed from the world. Acknowledge what they offered briefly and warmly. Then convert to the positive without making them feel their original framing was wrong. Use this shape: "If that were gone — if [the thing] no longer existed — what does that make possible? What world opens up?"

Keep it to 2-3 sentences. Warm, real, not clinical. Don't lecture.`,

    deepening: `The person has offered a wish. You want to pull them in further without interrogating them. Do NOT ask "why does this matter most to you" — that can land as judgement at a vulnerable moment.

Instead, invite them to say more using this shape or a variation: "Could you say more? What does that mean to you specifically, and what does that make available to the world in a way that doesn't yet exist?"

Keep it to 2-3 sentences. The question is pure invitation. It asks what becomes possible, not why they care.`,

    focusing: `The person has named multiple concerns at once — a scattered wish. You need them to choose the one most theirs. Use this shape: "All of those matter. If you could only change one — the thing that, if it changed, would matter most to you personally — which would it be? Not the most important globally. The one that's most yours."

Keep it warm. The distinction between "most important" and "most yours" is the whole point. Don't over-explain it.`,

    personal_to_structural: `The person's wish is personal — for their family, their children, their close community. Honour the personal root before lifting it to the domain-legible scale. Use this shape or a variation: "That's a wish for the people closest to you. If I follow it outward — if the same thing were true not just for them but for a generation — what would the world have had to become?"

Keep it warm. Don't make them feel their personal wish was too small.`,

    clarifying: `The person's wish sits between two adjacent domains and you need one clarifying question to distinguish. You will be given the specific question to ask. Present it naturally — don't read it as a script. Add at most one sentence of context before asking.`,
  }

  const systemPrompt = `You are North Star — the AI companion present across the NextUs ecosystem. You are warm, curious, and take people seriously. You do not lecture or perform. You ask real questions and actually want to know the answer.

You are in the wish stage of Purpose Piece — the opening conversation where you find what the person wishes the world had more of. This becomes the domain their contribution lives in.

The person will not see the seven-domain taxonomy. You extract it from their language without announcing it.

Current phase: ${phase}

Phase guidance:
${phaseGuidance[phase] || 'Continue the conversation. Acknowledge what they just offered, then ask one follow-up that deepens the wish.'}

GENERAL RULES:
- Keep responses to 2-4 sentences. This is a conversation, not a monologue.
- Don't use therapy-speak. Don't say "I hear you." Don't validate reflexively.
- Don't ask multiple questions in one turn. One question per response.
- Don't name the domain. Don't name the seven domains. The person never sees the taxonomy.
- Match their register. If they're plain-spoken, be plain-spoken. If they're reaching, meet them reaching.`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 300,
    system: systemPrompt,
    messages: [{
      role: 'user',
      content: `TRANSCRIPT SO FAR:\n\n${transcript}\n\nGenerate North Star's next response.`
    }]
  })

  return response.content[0].text.trim()
}

// ─── Phase detection ─────────────────────────────────────────────────────────
// Given the latest user input and the transcript, decide what phase the wish
// stage is in. This drives which prompt variant is used for the next response.
//
// Priority order (first match wins):
//   1. thin → thin_probe
//   2. scattered → focusing          (scattered wishes need focus before anything else)
//   3. personal → personal_to_structural  (personal root matters more than negative framing)
//   4. negative → conversion         (only if not personal or scattered)
//   5. default → deepening

function detectPhase(session, latestInput, exchangeCount) {
  if (isThinWish(latestInput)) return 'thin_probe'

  if (exchangeCount === 1) {
    if (isScattered(latestInput))  return 'focusing'
    if (isPersonal(latestInput))   return 'personal_to_structural'
    if (isNegative(latestInput))   return 'conversion'
    return 'deepening'
  }

  if (exchangeCount === 2) {
    return 'deepening'
  }

  return 'extract'
}

// ─── Main wish stage handler ─────────────────────────────────────────────────

async function handleWishStage(session, latestInput, res, northStarCtx) {
  // Initialise wish transcript on first call
  session.wishTranscript = session.wishTranscript || []
  session.wishPhase = session.wishPhase || 'opening'

  // ── Opening call — no user input yet, just show the opening ────────────
  if (!latestInput && session.wishTranscript.length === 0) {
    session.wishTranscript.push({ role: 'assistant', content: WISH_OPENING })
    session.wishPhase = 'opening'
    return res.status(200).json({
      message:   WISH_OPENING,
      session,
      stage:     'wish',
      inputMode: 'text',
      phase:     'opening',
    })
  }

  // ── Record the person's input ──────────────────────────────────────────
  if (latestInput) {
    session.wishTranscript.push({ role: 'user', content: latestInput })

    // Store the original wish on first substantive answer
    if (!session.wish && !isThinWish(latestInput)) {
      session.wish = latestInput
    }
  }

  // Count user exchanges so far
  const userExchanges = session.wishTranscript.filter(t => t.role === 'user').length

  // ── Phase detection ────────────────────────────────────────────────────
  const phase = detectPhase(session, latestInput, userExchanges)
  session.wishPhase = phase

  // ── Thin probe — one light nudge if the answer was pure deflection ─────
  if (phase === 'thin_probe') {
    const probe = 'Take your time. It doesn\'t have to be a big answer or a complete one. What\'s one thing — anything — that you wish were different?'
    session.wishTranscript.push({ role: 'assistant', content: probe })
    return res.status(200).json({
      message:   probe,
      session,
      stage:     'wish',
      inputMode: 'text',
      phase:     'thin_probe',
    })
  }

  // ── Extraction — we have enough to read the domain ────────────────────
  if (phase === 'extract') {
    let extraction
    try {
      extraction = await extractDomainFromWish(session)
    } catch (e) {
      console.error('Domain extraction failed:', e)
      return res.status(500).json({
        error: 'Could not read the domain from your wish. Please refresh and try again.'
      })
    }

    // Store wish_positive — the most recent user message is the positive framing
    // (after any negative-to-positive conversion has run)
    const lastUser = [...session.wishTranscript].reverse().find(t => t.role === 'user')
    session.wish_positive = lastUser?.content || session.wish

    // If blended confidence between two adjacent domains, ask a clarifier
    if (extraction.confidence === 'blended' && extraction.secondary) {
      const pairKey = `${extraction.domain}|${extraction.secondary}`
      const clarifier = ADJACENT_CLARIFIERS[pairKey]

      if (clarifier) {
        // Stash the extraction so we can resolve it after the clarifier answer
        session.pendingExtraction = extraction
        session.wishPhase = 'clarifying'
        session.wishTranscript.push({ role: 'assistant', content: clarifier })
        return res.status(200).json({
          message:   clarifier,
          session,
          stage:     'wish',
          inputMode: 'text',
          phase:     'clarifying',
        })
      }
    }

    // Confidence strong enough — lock the domain and advance
    return completeWishStage(session, extraction, res)
  }

  // ── Clarifying answer — resolve the pending extraction ────────────────
  if (session.wishPhase === 'clarifying' && session.pendingExtraction) {
    const pending = session.pendingExtraction
    const lower = (latestInput || '').toLowerCase()

    // Simple resolution: check which of the two domain concepts the person
    // leaned toward based on keywords in their response
    const primaryHints = resolveClarifier(pending.domain, lower)
    const secondaryHints = resolveClarifier(pending.secondary, lower)

    let resolved
    if (primaryHints > secondaryHints) {
      resolved = { ...pending, confidence: 'strong', secondary: null, secondary_id: null }
    } else if (secondaryHints > primaryHints) {
      resolved = {
        domain: pending.secondary,
        domain_id: pending.secondary_id,
        confidence: 'strong',
        secondary: pending.domain,
        secondary_id: pending.domain_id,
        reasoning: `After clarifying question, person indicated ${pending.secondary} is closer to what they meant.`,
      }
    } else {
      // Genuinely both — keep as blended but with primary from the clarifier context
      resolved = pending
    }

    delete session.pendingExtraction
    return completeWishStage(session, resolved, res)
  }

  // ── Normal conversation turn — generate the next response ─────────────
  let reply
  try {
    reply = await generateWishResponse(session, phase)
  } catch (e) {
    console.error('Wish response generation failed:', e)
    reply = 'Tell me more.'
  }

  session.wishTranscript.push({ role: 'assistant', content: reply })

  return res.status(200).json({
    message:   reply,
    session,
    stage:     'wish',
    inputMode: 'text',
    phase,
  })
}

// ─── Clarifier resolution ────────────────────────────────────────────────────
// Given the user's answer to a VISION|SOCIETY style clarifier, count keyword
// hits that point toward each candidate domain.

function resolveClarifier(domainName, lowerText) {
  const KEYWORDS = {
    'VISION':            ['imagine', 'imagination', 'picture', 'conceive', 'future', 'dream', 'envision', 'narrative', 'story'],
    'SOCIETY':           ['coordinate', 'coordination', 'organise', 'organize', 'institution', 'governance', 'together', 'collective', 'structure', 'culture', 'community'],
    'HUMAN BEING':       ['inside', 'inner', 'feel', 'mind', 'psychology', 'regulate', 'develop', 'capacity', 'consciousness', 'meaning'],
    'NATURE':            ['ecology', 'ecosystem', 'living', 'biodiversity', 'climate', 'environment', 'planet', 'natural world', 'wild'],
    'TECHNOLOGY':        ['tool', 'technology', 'ai', 'data', 'digital', 'infrastructure', 'software', 'machine'],
    'FINANCE & ECONOMY': ['value', 'money', 'economic', 'finance', 'funded', 'reward', 'incentive', 'wealth', 'resources', 'labour', 'labor'],
    'LEGACY':            ['preserve', 'carry forward', 'lose', 'lost', 'generation', 'legacy', 'tradition', 'wisdom', 'stewardship', 'intergenerational'],
  }

  const keywords = KEYWORDS[domainName] || []
  return keywords.filter(kw => lowerText.includes(kw)).length
}

// ─── Completion — advance to Pull stage ──────────────────────────────────────

function completeWishStage(session, extraction, res) {
  session.domain             = extraction.domain
  session.domain_id          = extraction.domain_id
  session.domain_confidence  = extraction.confidence
  session.domain_secondary   = extraction.secondary
  session.domain_reasoning   = extraction.reasoning
  session.horizonGoal        = DOMAINS[extraction.domain]?.horizonGoal
  session.stage              = 'pull'
  session.wishPhase          = 'complete'

  // A brief transition acknowledging the territory has been found — no
  // announcement of the domain name, just a register shift into Pull.
  const transition = `Okay. I think I see where your care lives.

That territory matters — and it asks something specific of the people built for it. Let me go a little deeper into what draws you specifically within it.`

  return res.status(200).json({
    message:       transition,
    session,
    stage:         'pull',
    inputMode:     'none',
    autoAdvance:   true,
    advanceDelay:  2500,
    stageComplete: 'wish',
    // Debug/telemetry — not shown to user but useful for testing
    _extraction:   {
      domain:     extraction.domain,
      domain_id:  extraction.domain_id,
      confidence: extraction.confidence,
      secondary:  extraction.secondary,
    },
  })
}

// ─── Shared utility ──────────────────────────────────────────────────────────

function extractJSON(text) {
  let clean = text.trim()
    .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
  try { return JSON.parse(clean) } catch {}
  const start = clean.indexOf('{')
  const end   = clean.lastIndexOf('}')
  if (start !== -1 && end !== -1) {
    try { return JSON.parse(clean.slice(start, end + 1)) } catch {}
  }
  throw new Error('Could not extract JSON: ' + text.slice(0, 200))
}

module.exports = {
  WISH_OPENING,
  DOMAINS,
  handleWishStage,
  extractDomainFromWish,
  generateWishResponse,
  detectPhase,
  // Exported for testing
  isNegative,
  isPersonal,
  isScattered,
  isThinWish,
  wordCount,
}
