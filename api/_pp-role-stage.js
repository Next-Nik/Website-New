// ─── PURPOSE PIECE — ROLE STAGE HANDLER (v10) ────────────────────────────────
// The fourth stage. Archetype has been extracted in the Instinct stage.
// Now we go one level deeper — within that archetype, which sub-function
// is theirs specifically.
//
// Function: specify the archetype. Every archetype has distinct sub-functions
// that express the same core role differently. A Connector might weave people
// to people, or resources to needs, or disciplines to each other — same
// movement, different targets. Stage 4 identifies which.
//
// The Stage 4 question is ARCHETYPE-SPECIFIC. The API routes to a different
// question depending on what the instinct stage extracted. The person is
// not being introduced to a new framework — they're specifying the role
// they already have.
//
// Session fields added:
//   roleTranscript:  [ { questionIndex, question, answer } ]
//   roleIndex:       number
//   sub_function:    string  — canonical slug set at stage completion
//   sub_function_label: string  — human-readable label
//   mode:            'proximate' | 'transmissive' | 'both'  — derived
//   mode_reasoning:  string
//
// No probes in the role stage. These are direct questions with choice-based
// or short-answer responses. If the answer is too thin to extract a sub-function,
// the extractor falls back to "unspecified" and the Placement Card handles it.

const Anthropic = require('@anthropic-ai/sdk')
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ─── Archetype → Stage 4 question set ────────────────────────────────────────
// Each archetype gets ONE primary question about its sub-function, plus ONE
// contextualising question that asks the person to describe what they'd be
// doing at their best within their territory.
//
// The first question is a branch — four or five options framed as a real
// distinction, not a multiple-choice test. The person answers in natural
// language and the extractor reads which sub-function they meant.
//
// The second question is universal across archetypes: "when you imagine
// yourself contributing to this work at your best, what are you doing?"
// This surfaces the operational picture and confirms the sub-function against
// concrete detail.

const ROLE_QUESTIONS = {
  'Maker': {
    primary: {
      label: 'Your Medium',
      text: `Makers build what doesn't exist. But different Makers work in different mediums — and the medium shapes everything else.

What do you actually make? Products (things people use), content (writing, film, audio), tools (infrastructure, platforms, systems for others to use), or experiences (events, rituals, spaces people move through)?

You can name something that doesn't fit neatly — just tell me what you make or would be making.`
    },
    contextual: {
      label: 'At Your Best',
      text: `When you imagine yourself doing this work at your best — fully resourced, the conditions right — what does that actually look like? What are you doing, and what's getting made?`
    }
  },

  'Architect': {
    primary: {
      label: 'What Structure',
      text: `Architects design the conditions things are built inside. Different Architects design different kinds of structures.

Is yours institutional (organisational design, governance, how groups of people coordinate), technical (systems, platforms, infrastructure), cultural (norms, rituals, how a community holds itself), or field-level (frameworks that shape how a whole domain develops)?

Tell me in your own words — you don't have to pick cleanly from these four.`
    },
    contextual: {
      label: 'At Your Best',
      text: `When you imagine yourself designing at your best — fully resourced, the conditions right — what are you building the container for? What's the shape of the structure you'd be designing?`
    }
  },

  'Connector': {
    primary: {
      label: 'What You Connect',
      text: `Connectors weave. But different Connectors weave different things.

Are you connecting people to people (building community, belonging, networks), resources to needs (matching what exists with what's lacking), disciplines to disciplines (working across fields that don't usually talk), or eras to each other (bringing forgotten wisdom into current work, or present knowledge into future use)?

Tell me what you find yourself weaving — natural language is fine.`
    },
    contextual: {
      label: 'At Your Best',
      text: `When you imagine yourself weaving at your best — fully resourced, the conditions right — what's the connection you're making? Who or what is being brought together, and what opens up when it happens?`
    }
  },

  'Guardian': {
    primary: {
      label: 'What You Protect',
      text: `Guardians protect. But different Guardians protect different things.

Is yours quality (craft, standards, excellence), legitimacy (trust, institutional integrity, things that shouldn't be captured), sovereignty (boundaries, consent, autonomy), or legacy (what must not be lost, what was hard-won)?

Describe what you find yourself guarding in your own words.`
    },
    contextual: {
      label: 'At Your Best',
      text: `When you imagine yourself protecting at your best — fully resourced, the conditions right — what are you standing for? What's the thing you'd be holding the line on, and what would fail without you holding it?`
    }
  },

  'Steward': {
    primary: {
      label: 'What You Tend',
      text: `Stewards tend what exists. Different Stewards tend different things across time.

Is yours organisations (holding institutions through their long arcs), places (physical territory, land, spaces), practices (traditions, crafts, ways of doing things), or relationships (the long bonds between people, families, communities)?

Tell me in your own words.`
    },
    contextual: {
      label: 'At Your Best',
      text: `When you imagine yourself tending at your best — fully resourced, the conditions right — what's under your care? What are you keeping alive, and what would degrade or collapse without the tending?`
    }
  },

  'Explorer': {
    primary: {
      label: 'What Territory',
      text: `Explorers venture into the unknown and bring back what's needed. But different Explorers go into different kinds of territory.

Is yours frontier (genuinely uncharted — new practices, new domains nobody has mapped yet), edge (the outer boundary of existing knowledge, pushing it further), forgotten (recovering what's been lost, suppressed, or overlooked), or intersection (going between fields to find what only becomes visible from the crossing)?

Tell me where you find yourself venturing.`
    },
    contextual: {
      label: 'At Your Best',
      text: `When you imagine yourself exploring at your best — fully resourced, the conditions right — what are you going into, and what would you be bringing back?`
    }
  },

  'Sage': {
    primary: {
      label: 'How Wisdom Travels',
      text: `Sages hold wisdom. But different Sages let their wisdom travel differently.

Is yours advising (real-time, person to person, usually in the moment of decision), teaching (structured transmission — courses, curriculum, cohorts), writing (books, essays, long-form — reaching people you'll never meet), or presence (being consulted when needed — the elder in the room, wisdom held until asked)?

Tell me in your own words how your understanding reaches people.`
    },
    contextual: {
      label: 'At Your Best',
      text: `When you imagine yourself working at your best — fully resourced, the conditions right — what does your wisdom look like in motion? Who's receiving it, and what are they doing with it afterward?`
    }
  },

  'Mirror': {
    primary: {
      label: 'Your Medium of Reflection',
      text: `Mirrors reflect what's true. But different Mirrors work through different mediums.

Is yours image (visual art, photography, film, design), narrative (writing, story, journalism, memoir), witness (presence that names what's happening — documentary, testimony, being there when it matters), or satire (exaggeration that reveals the absurd, critique through form)?

Tell me in your own words through what medium your reflection travels.`
    },
    contextual: {
      label: 'At Your Best',
      text: `When you imagine yourself reflecting at your best — fully resourced, the conditions right — what are you making visible? What would people recognise in your work that they couldn't quite see before?`
    }
  },

  'Exemplar': {
    primary: {
      label: 'Where You Demonstrate',
      text: `Exemplars contribute by being the example. Different Exemplars demonstrate in different contexts.

Is yours public (visible to many — performers, athletes, leaders in public life), professional (within a field or craft — raising the standard for other practitioners), community (inside a specific community — shifting what's possible for those who see you), or personal (inside close relationships — the people closest to you seeing a different way to be)?

Describe in your own words where your demonstration happens.`
    },
    contextual: {
      label: 'At Your Best',
      text: `When you imagine yourself demonstrating at your best — fully resourced, the conditions right — what are people seeing that changes what they believe is possible? What does the demonstration actually look like?`
    }
  },
}

// ─── Canonical sub-function slugs ────────────────────────────────────────────
// These are the storage values. The extractor must return one of these.
// The taxonomy is locked — changes here break the NextUs matching engine.

const SUB_FUNCTION_SLUGS = {
  'Maker': [
    { slug: 'product',    label: 'Product Maker' },
    { slug: 'content',    label: 'Content Maker' },
    { slug: 'tool',       label: 'Tool Maker' },
    { slug: 'experience', label: 'Experience Maker' },
    { slug: 'unspecified', label: 'Maker' },
  ],
  'Architect': [
    { slug: 'institutional', label: 'Institutional Architect' },
    { slug: 'technical',     label: 'Systems Architect' },
    { slug: 'cultural',      label: 'Cultural Architect' },
    { slug: 'field',         label: 'Field Architect' },
    { slug: 'unspecified',   label: 'Architect' },
  ],
  'Connector': [
    { slug: 'community', label: 'Community Connector' },
    { slug: 'resource',  label: 'Resource Connector' },
    { slug: 'network',   label: 'Network Connector' },
    { slug: 'temporal',  label: 'Temporal Connector' },
    { slug: 'unspecified', label: 'Connector' },
  ],
  'Guardian': [
    { slug: 'quality',     label: 'Quality Guardian' },
    { slug: 'legitimacy',  label: 'Institutional Guardian' },
    { slug: 'sovereignty', label: 'Boundary Guardian' },
    { slug: 'legacy',      label: 'Legacy Guardian' },
    { slug: 'unspecified', label: 'Guardian' },
  ],
  'Steward': [
    { slug: 'institutional', label: 'Institutional Steward' },
    { slug: 'place',         label: 'Place Steward' },
    { slug: 'practice',      label: 'Practice Steward' },
    { slug: 'relationship',  label: 'Relationship Steward' },
    { slug: 'unspecified',   label: 'Steward' },
  ],
  'Explorer': [
    { slug: 'frontier',     label: 'Frontier Explorer' },
    { slug: 'edge',         label: 'Edge Explorer' },
    { slug: 'forgotten',    label: 'Hidden Explorer' },
    { slug: 'intersection', label: 'Synthesis Explorer' },
    { slug: 'unspecified',  label: 'Explorer' },
  ],
  'Sage': [
    { slug: 'advisor',   label: 'Advisor Sage' },
    { slug: 'teacher',   label: 'Teacher Sage' },
    { slug: 'writer',    label: 'Writer Sage' },
    { slug: 'presence',  label: 'Elder Sage' },
    { slug: 'unspecified', label: 'Sage' },
  ],
  'Mirror': [
    { slug: 'image',     label: 'Visual Mirror' },
    { slug: 'narrative', label: 'Narrative Mirror' },
    { slug: 'witness',   label: 'Witness Mirror' },
    { slug: 'satire',    label: 'Satirical Mirror' },
    { slug: 'unspecified', label: 'Mirror' },
  ],
  'Exemplar': [
    { slug: 'public',        label: 'Public Exemplar' },
    { slug: 'professional',  label: 'Professional Exemplar' },
    { slug: 'community',     label: 'Community Exemplar' },
    { slug: 'personal',      label: 'Personal Exemplar' },
    { slug: 'unspecified',   label: 'Exemplar' },
  ],
}

// ─── Mode mapping: archetype + sub-function → proximate | transmissive | both ─
// From the Living Architecture Section 6. Some archetypes are always proximate,
// some always transmissive. Architect and Explorer are either depending on
// sub-function. This mapping is the default — scale evidence can override.

const MODE_BY_ARCHETYPE = {
  'Maker':     'proximate',
  'Connector': 'proximate',
  'Guardian':  'proximate',
  'Steward':   'proximate',
  'Sage':      'transmissive',
  'Mirror':    'transmissive',
  'Exemplar':  'transmissive',
}

// Architect and Explorer depend on sub-function
const ARCHITECT_MODE = {
  'institutional': 'proximate',    // designing for a specific organisation
  'technical':     'both',          // can be proximate (this team's system) or transmissive (open-source framework)
  'cultural':      'both',
  'field':         'transmissive',  // field-level frameworks propagate across projects
  'unspecified':   'both',
}

const EXPLORER_MODE = {
  'frontier':     'both',           // field work is proximate, reports are transmissive
  'edge':         'both',
  'forgotten':    'transmissive',   // recovered knowledge usually travels through writing/teaching
  'intersection': 'transmissive',   // synthesis work is primarily written
  'unspecified':  'both',
}

function deriveMode(archetype, subFunction, scale) {
  let baseMode

  if (archetype === 'Architect')     baseMode = ARCHITECT_MODE[subFunction] || 'both'
  else if (archetype === 'Explorer') baseMode = EXPLORER_MODE[subFunction]  || 'both'
  else                                baseMode = MODE_BY_ARCHETYPE[archetype] || 'both'

  // Scale override: at civilisational scale, even proximate archetypes tend
  // toward transmissive because the work has to travel to matter at that scale
  if (scale === 'civilisational' && baseMode === 'proximate') {
    return 'both'
  }

  return baseMode
}

// ─── Scale reading from full session evidence ────────────────────────────────
// Scale is not asked directly. It's read from the pattern across all stages:
// the wish (is it local or global in scope?), the pull (what scale of failure
// did they name?), the instinct answers (what size of context did their
// moments happen in?), and the role answers (what size of work did they
// describe at-their-best?).
//
// Runs at stage completion as a Claude call. Non-blocking.

async function extractScale(session) {
  const wishText = session.wish_positive || session.wish || ''
  const domain   = session.domain
  const archetype = session.archetype

  const pullText = (session.pullTranscript || [])
    .map(e => `${e.label}: ${e.answer}`)
    .join('\n')

  const instinctText = (session.instinctTranscript || [])
    .map(e => `${e.label}: ${e.answer}`)
    .join('\n')

  const roleText = (session.roleTranscript || [])
    .map(e => `${e.label}: ${e.answer}`)
    .join('\n')

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 400,
    messages: [{
      role: 'user',
      content: `Read this Purpose Piece session and identify the coherence bandwidth (scale) at which this person's work most naturally operates.

Scale is coherence bandwidth — where felt responsibility lives — NOT where examples happen to be drawn from, and NOT current external recognition.

THE SCALES:
- home: immediate household, closest relationships
- neighbourhood: local community, direct face-to-face networks
- city: urban systems, institutional engagement
- province: regional systems, multi-community, policy
- country: national systems, cross-community
- continent: multi-national, transboundary
- global: international, planetary systems
- civilisational: species-level, 100+ year timelines, the frame humanity operates inside

CRITICAL READING RULES:
1. Weight the SCOPE of the wish and the scope of "at your best" most heavily. Someone describing planetary systems is operating at global/civilisational scale, even if their current work is local.
2. Don't confuse delivery context with felt responsibility. A person who does intimate one-on-one work might be operating at Individual delivery / Global felt responsibility.
3. Don't soften. If the evidence points to civilisational, say civilisational. External recognition is irrelevant.
4. If evidence genuinely spans two scales, report the larger felt-responsibility scale as primary and note the tension.

CONTEXT:
Domain: ${domain}
Archetype: ${archetype}
Wish: ${wishText}

Pull answers:
${pullText}

Instinct answers:
${instinctText}

Role answers:
${roleText}

Return JSON only:
{
  "scale": "home | neighbourhood | city | province | country | continent | global | civilisational",
  "confidence": "strong | blended | thin",
  "tension": "string describing any tension between felt-responsibility scale and current-delivery scale, or null",
  "reasoning": "2 sentences citing specific evidence"
}`
    }]
  })

  return extractJSON(response.content[0].text)
}

// ─── Sub-function extraction ─────────────────────────────────────────────────
// Reads the person's answers to the two role stage questions and returns
// the canonical sub-function slug for their archetype.

async function extractSubFunction(session) {
  const archetype = session.archetype
  const subFunctionOptions = SUB_FUNCTION_SLUGS[archetype]
  if (!subFunctionOptions) {
    throw new Error(`No sub-function taxonomy for archetype: ${archetype}`)
  }

  const roleAnswers = (session.roleTranscript || [])
    .map(e => `${e.label}: ${e.answer}`)
    .join('\n\n')

  // Also include the wish, domain, and instinct cost signal — these help
  // disambiguate when the role answers alone aren't decisive
  const context = `Domain: ${session.domain}
Wish: ${session.wish_positive || session.wish || ''}
Cost signal: ${session.cost_signal || ''}
Movement style: ${session.movement_style || ''}`

  const optionsList = subFunctionOptions
    .filter(o => o.slug !== 'unspecified')
    .map(o => `- ${o.slug}: ${o.label}`)
    .join('\n')

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    messages: [{
      role: 'user',
      content: `This person has been identified as a ${archetype} — the project role they're built to fill. Within that role, which specific sub-function is theirs?

The sub-function options for ${archetype}:
${optionsList}

Their answers to the role stage:
${roleAnswers}

Additional context:
${context}

Rules:
- Return ONE of the slugs above, or "unspecified" if the answers don't clearly fit any single sub-function.
- Read the contextual question (what they'd be doing at their best) as the strongest signal — that reveals the operational shape of the role.
- If the answers blend two sub-functions, return the dominant one but note the blend in reasoning.
- If the answers are thin or evasive, return "unspecified" rather than forcing a fit.

Return JSON only:
{
  "sub_function": "slug from the list above, or unspecified",
  "confidence": "strong | blended | thin",
  "secondary": "secondary slug if blended, else null",
  "reasoning": "2 sentences citing specific evidence"
}`
    }]
  })

  return extractJSON(response.content[0].text)
}

// ─── Helper functions ────────────────────────────────────────────────────────

function getRoleIndex(session) {
  return session.roleIndex ?? 0
}

function setRoleIndex(session, v) {
  session.roleIndex = v
}

function getRoleQuestions(archetype) {
  const qs = ROLE_QUESTIONS[archetype]
  if (!qs) return null
  return [qs.primary, qs.contextual]
}

// ─── Opening message for the role stage ──────────────────────────────────────

function getRoleOpening(archetype) {
  return `I'm seeing the instinct clearly now. The role you'd play is starting to be legible.

But there are different flavours of this role — different versions of what you'd actually be doing within it. Two questions to narrow in.`
}

// ─── Main role stage handler ─────────────────────────────────────────────────

async function handleRoleStage(session, latestInput, res, northStarCtx) {
  const archetype = session.archetype
  if (!archetype) {
    return res.status(500).json({
      error: 'Missing archetype for role stage. Instinct stage must complete first.'
    })
  }

  const questions = getRoleQuestions(archetype)
  if (!questions) {
    return res.status(500).json({
      error: `No role questions defined for archetype: ${archetype}`
    })
  }

  session.roleTranscript = session.roleTranscript || []
  const total = questions.length

  // ── Opening call — show opening + first question ────────────────────────
  if (!latestInput && session.roleTranscript.length === 0) {
    setRoleIndex(session, 0)
    const opening = getRoleOpening(archetype)
    const firstQ  = questions[0]
    session.currentQuestion = firstQ.text

    return res.status(200).json({
      message:       opening,
      questionLabel: `Role · 1 of ${total} · ${firstQ.label}`,
      firstQuestion: firstQ.text,
      session,
      stage:         'role',
      questionIndex: 0,
      inputMode:     'none',
      autoAdvance:   true,
      advanceDelay:  2500,
    })
  }

  const qi = getRoleIndex(session)
  const currentQ = questions[qi]

  // Store answer — no probes in the role stage, accept what's given
  session.roleTranscript.push({
    questionIndex: qi,
    question:      currentQ.text,
    label:         currentQ.label,
    answer:        latestInput || '',
  })

  const nextQI = qi + 1
  setRoleIndex(session, nextQI)

  // More questions?
  if (nextQI < total) {
    const nextQ = questions[nextQI]
    session.currentQuestion = nextQ.text
    // NB: message must carry the next question text (matching the pull-stage
    // pattern). Without this the frontend sees an advance response with no
    // message field and appends nothing — silent hang between questions.
    return res.status(200).json({
      message:       nextQ.text,
      questionLabel: `Role · ${nextQI + 1} of ${total} · ${nextQ.label}`,
      session,
      stage:         'role',
      questionIndex: nextQI,
      inputMode:     'text',
    })
  }

  // Stage complete
  return await completeRoleStage(session, res)
}

// ─── Completion — extract sub-function, scale, mode; advance to synthesis ──

async function completeRoleStage(session, res) {
  // Run sub-function and scale extraction in parallel
  let subFunctionResult, scaleResult
  try {
    [subFunctionResult, scaleResult] = await Promise.all([
      extractSubFunction(session),
      extractScale(session),
    ])
  } catch (e) {
    console.error('Role stage extraction failed:', e)
    return res.status(500).json({
      error: 'Could not read the role specifics. Please refresh and try again.'
    })
  }

  // Sub-function
  session.sub_function        = subFunctionResult.sub_function
  session.sub_function_confidence = subFunctionResult.confidence
  session.sub_function_secondary  = subFunctionResult.secondary
  session.sub_function_reasoning  = subFunctionResult.reasoning

  // Resolve human-readable label
  const subFunctionDef = SUB_FUNCTION_SLUGS[session.archetype]?.find(s => s.slug === subFunctionResult.sub_function)
  session.sub_function_label = subFunctionDef?.label || session.archetype

  // Scale
  session.scale             = scaleResult.scale
  session.scale_confidence  = scaleResult.confidence
  session.scale_tension     = scaleResult.tension
  session.scale_reasoning   = scaleResult.reasoning

  // Derived mode
  session.mode = deriveMode(session.archetype, session.sub_function, session.scale)
  session.mode_reasoning = `${session.archetype} sub-function ${session.sub_function} at ${session.scale} scale → ${session.mode}`

  // Node-candidate flag (for future cohort/node matching)
  // Stewards and Connectors at local/regional scales, and Sages/Architects
  // at larger scales, are the most likely node-team candidates.
  session.node_candidate = isNodeCandidate(session)

  // Advance to synthesis (thinking stage)
  session.stage = 'thinking'

  const transition = `That's all I need. Reading everything together now.

This takes a moment — pulling the wish, the pull, the instinct, and the role into a single picture.`

  return res.status(200).json({
    message:       transition,
    session,
    stage:         'thinking',
    inputMode:     'none',
    autoAdvance:   true,
    advanceDelay:  2000,
    stageComplete: 'role',
    _extraction:   {
      sub_function:      session.sub_function,
      sub_function_label: session.sub_function_label,
      scale:             session.scale,
      mode:              session.mode,
      node_candidate:    session.node_candidate,
    },
  })
}

// ─── Node candidate detection ────────────────────────────────────────────────
// Flags session as a potential candidate for future node-team roles.
// Heuristic, non-binding — just for future platform-side querying.

function isNodeCandidate(session) {
  const { archetype, sub_function, scale } = session

  // Stewards at city/province/country scales — natural node Stewards
  if (archetype === 'Steward' && ['city', 'province', 'country', 'continent'].includes(scale)) {
    return true
  }

  // Connectors at city/country/continental scales — natural node weavers
  if (archetype === 'Connector' && ['city', 'province', 'country', 'continent', 'global'].includes(scale)) {
    return true
  }

  // Architects designing field-level or cultural structures — natural node designers
  if (archetype === 'Architect' && ['field', 'cultural'].includes(sub_function)) {
    return true
  }

  // Sages at continental/global/civilisational scales — natural node wisdom-holders
  if (archetype === 'Sage' && ['continent', 'global', 'civilisational'].includes(scale)) {
    return true
  }

  return false
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
  ROLE_QUESTIONS,
  SUB_FUNCTION_SLUGS,
  handleRoleStage,
  extractSubFunction,
  extractScale,
  deriveMode,
  isNodeCandidate,
  getRoleOpening,
  getRoleQuestions,
}
