// ─── PURPOSE PIECE — INSTINCT STAGE HANDLER (v10) ────────────────────────────
// The third stage. Domain is confirmed. Pull has surfaced what the person
// can't look away from within that territory. Now we look at HOW they move —
// the behavioural evidence for their project role (archetype).
//
// Function: find the archetype through behavioural evidence, now read inside
// the domain and pull context. The same five behavioural questions as v9,
// but the extraction reads them with full territory context.
//
// Key change from v9: the archetype is framed as a PROJECT ROLE, not a
// personality type. The extraction prompt treats the nine archetypes as
// the functional roles a working project needs filled. This is the v10.1
// reframe — archetype as the job someone would do on a team, not the
// description of who they are.
//
// Session fields added:
//   instinctTranscript: [ { questionIndex, question, answer, probes, thin } ]
//   instinctIndex:      number
//   instinctProbeCount: number
//   archetype:          string  — set at stage completion
//   archetype_confidence: strong | blended | thin
//   archetype_secondary: string | null
//   archetype_reasoning: string
//   cost_signal:        string
//   movement_style:     string

const Anthropic = require('@anthropic-ai/sdk')
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ─── The five behavioural questions ──────────────────────────────────────────
// Same as v9. Behavioural, anchored in concrete moments. The register is
// different from the wish (reaching) and pull (attentional) stages — this
// one asks what the person actually DID.

const INSTINCT_QUESTIONS = [
  {
    label: 'The Moment',
    text: `Think of a moment — recent or not — when something around you was off and something in you responded. It doesn't have to be a big story.

What happened, and what did you do?`
  },
  {
    label: 'The Frustration',
    text: `What keeps going wrong in the world that bothers you more than it probably should — even when it's got nothing to do with you?

What is it, and what does it look like when you see it?`
  },
  {
    label: 'The Pressure',
    text: `Tell me about a moment when you had to make a real call — incomplete information, something actually at stake, no clean answer.

What did you do?`
  },
  {
    label: 'The Cost',
    text: `This one's worth sitting with. The way you move through the world — the instinct that's most yours — what does it cost you?

Not what's generally hard. What does this particular thing ask of you that others don't seem to pay?`
  },
  {
    label: 'The Shadow',
    text: `When has the thing you're best at made things worse? A moment where your instinct went further than the situation needed — or where the way you naturally operate created the friction instead of resolving it.`
  }
]

// ─── Probe scripts — up to two probes per question ──────────────────────────
// Behavioural questions need grounding. If an answer is abstract or lacks
// situational specificity, we probe for the concrete moment. Up to two probes,
// then a final "I want to make sure I'm reading this clearly" fallback handled
// at the signal-check level.

const INSTINCT_PROBES = [
  // The Moment
  [
    'Give me one specific moment from that. Where were you, and what did you actually do first?',
    'Even a small action counts. What was the very first thing you did — or chose not to do?'
  ],
  // The Frustration
  [
    'Can you name a specific instance where you saw this? Even a recent small example.',
    'What does it look like in practice — what actually happens that shouldn\'t be happening?'
  ],
  // The Pressure
  [
    'What were the actual stakes — what could have gone wrong? And what did you do in the first 24 hours?',
    'Walk me through one specific decision. What information did you have, and what did you do with it?'
  ],
  // The Cost
  [
    'Think of a specific situation where your way of operating made something harder for you. What happened?',
    'What do people around you not seem to pay — what\'s the thing you carry that others put down more easily?'
  ],
  // The Shadow
  [
    'Can you give me a specific moment where this happened? What did it cost you, and what did you do about it?',
    'What was the situation, and at what point did you realise your instinct had become the problem?'
  ]
]

// ─── Confusion reframes — offered if the person says they don't understand ──
// Simpler, more direct versions of each question for when the original phrasing
// didn't land. Signals: "what do you mean", "confused", "I don't get it".

const CONFUSION_REFRAMES = [
  // The Moment
  'Let me make it simpler. Tell me about any time something went wrong near you — even something small — and you did something about it. What was it, what did you do?',
  // The Frustration
  'Simpler version: what\'s a thing that just bugs you every time you see it, even though it\'s not your problem? And where do you actually see it?',
  // The Pressure
  'Simpler: a time you had to decide something real without knowing enough. What did you decide?',
  // The Cost
  'The thing you do naturally that others seem to do less — what does doing it take out of you? What\'s the price of being the person who does that?',
  // The Shadow
  'A time when being good at your thing made the situation worse, not better. One moment where the instinct overshot or landed wrong.'
]

// ─── Thin detection ─────────────────────────────────────────────────────────
// Archetype questions need behavioural specificity. Without a time anchor,
// action verb, or setting reference, the answer is too abstract to read.

const GENERIC_DEFLECTORS = [
  'i don\'t know', 'not sure', 'no idea', 'hard to say',
  'i guess', 'dunno', 'whatever',
  'lots of things', 'many things', 'all the time', 'always',
  'depends', 'it depends'
]

const TIME_ANCHORS = [
  'last year', 'last month', 'last week', 'yesterday',
  'in 2024', 'in 2023', 'in 2025', 'in 2026',
  'a few weeks', 'a few months', 'this year',
  'this week', 'today', 'ago', 'when i', 'after i', 'before i',
  'one time', 'once', 'a couple years', 'recently'
]

const ACTION_VERBS = [
  'called', 'asked', 'built', 'avoided', 'stepped', 'said', 'told',
  'decided', 'chose', 'left', 'stayed', 'went', 'made', 'helped',
  'stopped', 'started', 'reached out', 'spoke', 'wrote', 'created',
  'organized', 'organised', 'refused', 'accepted', 'pushed', 'pulled',
  'watched', 'confronted', 'raised', 'flagged', 'brought up', 'fought',
  'redesigned', 'rebuilt', 'rewrote', 'redid', 'solved', 'fixed'
]

const SETTING_PATTERN = /\b(work|office|home|family|friend|community|meeting|team|partner|colleague|school|hospital|city|neighbourhood|neighborhood|organisation|organization|project|client|boss|board)\b/i

function isInstinctAnswerThin(answer, questionIndex) {
  const lower = answer.toLowerCase().trim()
  const words = answer.trim().split(/\s+/).filter(Boolean)

  // Cost (Q3) and Shadow (Q4) questions can be shorter — they're more
  // reflective and less anchored in external moments
  const minWords = (questionIndex >= 3) ? 15 : 20
  if (words.length < minWords) return true

  const deflectorCount = GENERIC_DEFLECTORS.filter(d => lower.includes(d)).length
  if (deflectorCount >= 2) return true

  // Behavioural questions (Q0-Q2: Moment, Frustration, Pressure) need
  // situational grounding
  if (questionIndex <= 2) {
    const hasTime    = TIME_ANCHORS.some(t => lower.includes(t))
    const hasAction  = ACTION_VERBS.some(v => lower.includes(v))
    const hasSetting = SETTING_PATTERN.test(lower)
    if (!hasTime && !hasAction && !hasSetting) return true
  }

  return false
}

// ─── Confusion detection ────────────────────────────────────────────────────

function isConfused(text) {
  const lower = (text || '').toLowerCase().trim()
  const patterns = [
    /what do you mean/, /i don'?t (understand|get|follow)/,
    /can you (rephrase|explain|clarify)/, /^confused\b/,
    /^what\?/, /huh\?/, /not sure what.*asking/, /\?\s*$/,
  ]
  // If the answer is very short and has a question mark or confusion signal
  if (lower.length < 40 && patterns.some(re => re.test(lower))) return true
  return false
}

// ─── Claude-backed signal check ─────────────────────────────────────────────
// Called after two probes if the answer is still flagged thin locally.
// Last-resort check before marking the question as thin and moving on.

async function checkInstinctSignal(questionLabel, combinedAnswer) {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 200,
    messages: [{
      role: 'user',
      content: `This is a behavioural question for an archetype assessment. The question asks about something the person actually did or experienced — a concrete moment, an action taken, a real situation.

Question: ${questionLabel}
Answer: "${combinedAnswer}"

Mark as signal if the answer describes a real situation, an action taken (or deliberately not taken), or a specific experienced moment — even if it's abstract in its framing.
Mark as thin if the answer is entirely hypothetical, entirely abstract with no grounding, or pure deflection.

Return JSON only:
{"has_signal": true|false, "one_probe_question": "single scripted follow-up if still needed, else null"}`
    }]
  })
  return extractJSON(response.content[0].text)
}

// ─── Opening message for the instinct stage ────────────────────────────────

function getInstinctOpening() {
  return `Five questions. Different register entirely.

That last set was about what pulls your attention. This one is about what you actually do when something's off — the instinct that shows up in how you move, even when you weren't trying, even when you were half-buried.

Anchor your answers in real moments. The real you keeps showing up regardless.`
}

// ─── Helper functions ─────────────────────────────────────────────────────

function getInstinctIndex(session) {
  return session.instinctIndex ?? 0
}

function getInstinctProbeCount(session) {
  return session.instinctProbeCount ?? 0
}

function setInstinctIndex(session, v) {
  session.instinctIndex = v
}

function setInstinctProbeCount(session, v) {
  session.instinctProbeCount = v
}

// ─── Main instinct stage handler ────────────────────────────────────────────

async function handleInstinctStage(session, latestInput, res, northStarCtx) {
  session.instinctTranscript = session.instinctTranscript || []
  const total = INSTINCT_QUESTIONS.length

  // ── Opening call — show opening + first question, auto-advance ──────────
  if (!latestInput && session.instinctTranscript.length === 0) {
    setInstinctIndex(session, 0)
    setInstinctProbeCount(session, 0)

    const opening = getInstinctOpening()
    const firstQ  = INSTINCT_QUESTIONS[0]
    session.currentQuestion = firstQ.text

    return res.status(200).json({
      message:       opening,
      questionLabel: `Instinct · 1 of ${total} · ${firstQ.label}`,
      firstQuestion: firstQ.text,
      session,
      stage:         'instinct',
      questionIndex: 0,
      inputMode:     'none',
      autoAdvance:   true,
      advanceDelay:  2500,
    })
  }

  const qi = getInstinctIndex(session)
  const pc = getInstinctProbeCount(session)
  const currentQ = INSTINCT_QUESTIONS[qi]

  // Find or create transcript entry for current question
  let entry = session.instinctTranscript.find(e => e.questionIndex === qi)
  if (!entry) {
    entry = {
      questionIndex: qi,
      question:      currentQ.text,
      label:         currentQ.label,
      answer:        '',
      probes:        [],
      thin:          false,
    }
    session.instinctTranscript.push(entry)
  }

  // ── First answer to this question ───────────────────────────────────────
  if (pc === 0 && !entry.answer) {
    // Confusion check — offer a reframed question instead of a probe
    if (isConfused(latestInput)) {
      const reframe = CONFUSION_REFRAMES[qi]
      session.currentQuestion = reframe
      return res.status(200).json({
        message:   reframe,
        session,
        stage:     'instinct',
        inputMode: 'text',
        isReframe: true,
        questionLabel: `Instinct · ${qi + 1} of ${total} · ${currentQ.label}`,
      })
    }

    entry.answer = latestInput
    const thin = isInstinctAnswerThin(latestInput, qi)

    if (!thin) {
      return await advanceInstinctStage(session, res)
    }

    // First probe
    setInstinctProbeCount(session, 1)
    const probeText = INSTINCT_PROBES[qi][0]
    session.currentQuestion = probeText
    return res.status(200).json({
      message:   probeText,
      session,
      stage:     'instinct',
      inputMode: 'text',
      isProbe:   true,
      questionLabel: `Instinct · ${qi + 1} of ${total} · ${currentQ.label}`,
    })
  }

  // ── Responding to a probe ───────────────────────────────────────────────
  const probeIndex = Math.min(pc - 1, INSTINCT_PROBES[qi].length - 1)
  entry.probes.push({
    probe:    INSTINCT_PROBES[qi][probeIndex],
    response: latestInput,
  })
  const combined = `${entry.answer} ${entry.probes.map(p => p.response).join(' ')}`.trim()
  const stillThin = isInstinctAnswerThin(combined, qi)

  if (!stillThin) {
    return await advanceInstinctStage(session, res)
  }

  // Still thin after this probe
  if (pc < 2) {
    // Second probe
    setInstinctProbeCount(session, 2)
    const probe2 = INSTINCT_PROBES[qi][1] || INSTINCT_PROBES[qi][0]
    session.currentQuestion = probe2
    return res.status(200).json({
      message:   probe2,
      session,
      stage:     'instinct',
      inputMode: 'text',
      isProbe:   true,
      questionLabel: `Instinct · ${qi + 1} of ${total} · ${currentQ.label}`,
    })
  }

  // Two probes in and still thin — Claude signal check before giving up
  try {
    const check = await checkInstinctSignal(currentQ.label, combined)
    entry.thin = !check.has_signal

    if (!check.has_signal && pc === 2) {
      // One final gentle probe
      setInstinctProbeCount(session, 3)
      const finalProbe = check.one_probe_question ||
        'I want to make sure I\'m reading this clearly. Can you give me one specific example — a real moment, even a small one?'
      session.currentQuestion = finalProbe
      return res.status(200).json({
        message:   finalProbe,
        session,
        stage:     'instinct',
        inputMode: 'text',
        isProbe:   true,
        questionLabel: `Instinct · ${qi + 1} of ${total} · ${currentQ.label}`,
      })
    }
  } catch (e) {
    console.error('Instinct signal check failed:', e)
  }

  // Accept what we have and advance
  entry.thin = true
  return await advanceInstinctStage(session, res, 'Let\'s keep moving. I\'ll work with what\'s here.')
}

// ─── Advance to next question or complete the stage ────────────────────────

async function advanceInstinctStage(session, res, prefixMessage = null) {
  const qi = getInstinctIndex(session)
  const nextQI = qi + 1
  const total = INSTINCT_QUESTIONS.length

  setInstinctProbeCount(session, 0)
  setInstinctIndex(session, nextQI)

  if (nextQI < total) {
    const nextQ = INSTINCT_QUESTIONS[nextQI]
    session.currentQuestion = nextQ.text
    // NB: message must carry the next question text (matching the pull-stage
    // pattern). If prefixMessage is set, prepend it. Without this, the frontend
    // sees an advance response with no message field and appends nothing —
    // silent hang between questions.
    const message = prefixMessage
      ? `${prefixMessage}\n\n${nextQ.text}`
      : nextQ.text
    return res.status(200).json({
      message,
      questionLabel: `Instinct · ${nextQI + 1} of ${total} · ${nextQ.label}`,
      session,
      stage:         'instinct',
      questionIndex: nextQI,
      inputMode:     'text',
    })
  }

  // Stage complete — extract archetype and hand off to role stage
  return await completeInstinctStage(session, res)
}

// ─── Completion — extract archetype and advance to role stage ──────────────

async function completeInstinctStage(session, res) {
  let extraction
  try {
    extraction = await extractArchetype(session)
  } catch (e) {
    console.error('Archetype extraction failed:', e)
    return res.status(500).json({
      error: 'Could not read the archetype from your answers. Please refresh and try again.'
    })
  }

  session.archetype            = extraction.archetype
  session.archetype_confidence = extraction.confidence
  session.archetype_secondary  = extraction.secondary
  session.archetype_reasoning  = extraction.reasoning
  session.cost_signal          = extraction.cost_signal
  session.movement_style       = extraction.movement_style
  session.stage                = 'role'

  const transition = `I'm seeing how you move.

Last stage — two questions. The archetype that's emerging has specific flavours, and I want to narrow into which one is yours.`

  return res.status(200).json({
    message:       transition,
    session,
    stage:         'role',
    inputMode:     'none',
    autoAdvance:   true,
    advanceDelay:  2500,
    stageComplete: 'instinct',
    _extraction:   {
      archetype:  extraction.archetype,
      confidence: extraction.confidence,
      secondary:  extraction.secondary,
    },
  })
}

// ─── Archetype extraction ──────────────────────────────────────────────────
// The v10.1 reframe: archetypes are PROJECT ROLES. The extractor reads the
// behavioural evidence and identifies which necessary-role-on-a-project the
// person is built to fill.
//
// Context passed in: domain, wish, pull answers, instinct answers.
// This gives the extractor the full territory context, which matters —
// an Architect answering The Moment in Nature tells a different story than
// an Architect answering in Vision. Same archetype, different expression.

async function extractArchetype(session) {
  const domain  = session.domain
  const wish    = session.wish_positive || session.wish || ''
  const subdomain = session.subdomain_signal?.name || null

  const pullText = (session.pullTranscript || [])
    .map(e => `${e.label}: ${e.answer}${e.probes?.length ? ' → ' + e.probes.map(p => p.response).join(' / ') : ''}`)
    .join('\n')

  const instinctText = (session.instinctTranscript || [])
    .map((e, i) => `Q${i + 1} — ${e.label}\n${INSTINCT_QUESTIONS[i].text}\nAnswer: ${e.answer}${e.probes?.length ? ' → ' + e.probes.map(p => p.response).join(' / ') : ''}${e.thin ? ' [thin]' : ''}`)
    .join('\n\n---\n\n')

  const systemPrompt = `You are reading a Purpose Piece assessment to identify which PROJECT ROLE (archetype) this person is built to fill.

THE CORE REFRAME: Archetypes are not personality types. They are the functional roles a working project needs filled in order to exist and succeed. Every project — regardless of domain, scale, or form — needs these roles performed, either by people directly embedded or by contributions that travel from outside.

THE NINE PROJECT ROLES:

STEWARD — Tends what exists over time. Maintains, sustains, protects continuity. Patient with operational work. Sees what needs tending before crisis. The role a project needs to stay alive through the quiet periods.

MAKER — Builds what doesn't exist. Takes concept to artefact. Comfortable with iteration. Values function over perfection. Energised by shipping. The role a project needs to actually produce the thing.

ARCHITECT — Designs the structural conditions that determine what can be built at all. Doesn't build the thing — designs the container the thing lives inside. Energised by making the system sound, not shipping output. Frustrated when the same problems keep recurring because nobody fixed the conditions producing them. The role a project needs to have a working structure.

CONNECTOR — Weaves relationships, bridges people, creates belonging and networks. Sees who needs who before anyone else does. Facilitates without dominating. Values emergence over control. The role a project needs to reach the people and resources it depends on.

GUARDIAN — Protects what matters, holds standards, recognises threats early. Fierce protecting, gentle tending. The role a project needs to push back when the work drifts or standards slip.

EXPLORER — Ventures into unknown territory, brings back what's needed. Comfortable with uncertainty. Curious without needing immediate answers. The role a project needs to find what it doesn't yet know it needs.

SAGE — Holds wisdom, offers perspective that clarifies. Sees signals across time. Values understanding over action. Holds complexity without needing to simplify. The role a project needs to see across time and offer perspective when the group is stuck in the immediate.

MIRROR — Contributes by reflecting what's true — makes the invisible visible or the unbearable bearable. Artists, writers, filmmakers, anyone whose work is expression so complete that others recognise themselves in it. Felt before understood. Distinct from Sage: Sage operates through accumulated understanding offered conceptually; Mirror operates through expression. The role a project needs to make what it's doing legible and recognisable.

EXEMPLAR — Contributes by being the example. Raises the standard of what's possible by embodying it fully — in public, under pressure. Demonstration, not instruction. Distinct from Mirror: Mirror reflects human experience so people feel recognised; Exemplar expands what people believe humans can do. The role a project needs to make the case through being rather than arguing.

CRITICAL DISTINCTIONS:

Maker vs Architect: Maker's story of effectiveness is "I built X." The story is about the thing made. Architect's story of effectiveness is "I designed the process/structure for X." The story is about the container. Maker frustrated when they can't ship. Architect frustrated when the structure is wrong — when the same problems keep recurring because nobody fixed the conditions.

Mirror vs Exemplar: Mirror makes people feel recognised ("that's me, that's my experience"). Exemplar makes people believe something new is possible ("if they can do it, the thing I thought was impossible isn't"). Mirror is reflection. Exemplar is demonstration.

Sage vs Mirror: Sage offers conceptual understanding that clarifies. Mirror offers expression that makes the invisible felt. Sage is read. Mirror is experienced.

Steward vs Guardian: Steward tends over time (continuity, maintenance, development). Guardian protects in the moment (standards, threats, drift). Both hold what matters but through different functions.

READING INSTRUCTIONS:

1. Read for the ROLE the person would naturally fill on a project, not for their personality. The question is always: if this person joined a team, what piece of the work would they naturally do?

2. Use the full context — wish, domain, subdomain, pull answers — to calibrate the behavioural evidence. The same answer to "The Moment" can point to different archetypes depending on the territory. Someone who "stepped in and redesigned the governance structure when the organisation kept having the same conflicts" is an Architect in Society. Someone who "made the thing everyone said couldn't exist" is a Maker, regardless of domain.

3. Weight The Cost (Q4) heavily. The cost of the instinct is often the clearest signal because it reveals what the person carries that others don't. A Steward's cost is different from a Maker's cost. A Sage's cost is different from a Connector's cost.

4. Weight The Shadow (Q5) heavily. The distortion of the instinct reveals which instinct it is. A Connector's shadow is different from a Guardian's shadow.

5. If evidence is genuinely split between two archetypes, return 'blended' with a clear secondary. Do not force a single choice. Blended readings are sometimes more accurate than clean ones.

6. If answers were thin or the person was evasive, the direction of avoidance is itself signal. What they couldn't name is often as revealing as what they did.

Return JSON only:
{
  "archetype": "one of: Steward, Maker, Architect, Connector, Guardian, Explorer, Sage, Mirror, Exemplar",
  "confidence": "strong | blended | thin",
  "secondary": "second archetype if blended, else null",
  "reasoning": "2-3 sentences citing specific moments from their answers",
  "cost_signal": "1-2 sentences — what their instinct costs them, in their own vocabulary",
  "movement_style": "1 sentence — how they move, using specific language from their answers"
}`

  const userPayload = `CONTEXT:
Domain: ${domain}${subdomain ? `\nSubdomain signal: ${subdomain}` : ''}
Wish: ${wish}

Pull answers (what they named within the territory):
${pullText}

INSTINCT ANSWERS:

${instinctText}

Extract the archetype (project role) this person is built to fill.`

  const response = await anthropic.messages.create({
    model:      'claude-sonnet-4-20250514',
    max_tokens: 1000,
    system:     systemPrompt,
    messages:   [{ role: 'user', content: userPayload }]
  })

  return extractJSON(response.content[0].text)
}

// ─── Shared utility ─────────────────────────────────────────────────────────

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
  INSTINCT_QUESTIONS,
  INSTINCT_PROBES,
  CONFUSION_REFRAMES,
  handleInstinctStage,
  extractArchetype,
  getInstinctOpening,
  // Exported for testing
  isInstinctAnswerThin,
  isConfused,
}
