// ─── PURPOSE PIECE — PULL STAGE HANDLER (v10) ────────────────────────────────
// The second stage. Domain has been identified in the Wish stage.
// Now we go deeper INSIDE that territory with attentional questions.
//
// Function: sharpen domain signal (especially if wish-stage confidence was
// thin or blended), begin surfacing archetype evidence, and detect scale
// of concern naturally from what the person names as the failure they
// can't tolerate.
//
// Three questions per pull stage, domain-aware. The tool asks ONE probe
// per thin answer before moving on — this stage is lighter on probing
// than the archetype stage because the questions themselves are open.
//
// Session fields added:
//   pullTranscript:   [ { questionIndex, question, answer, probes: [] } ]
//   pullQuestionIndex: number  — current question in the pull set
//   pullProbeCount:    number  — probes used on current question
//   subdomain_signal:  string | null  — optional subdomain hint from answers

const Anthropic = require('@anthropic-ai/sdk')
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ─── Domain-specific pull questions ──────────────────────────────────────────
// Each domain gets three questions. The first two are universal in shape —
// specific failure and disproportionate anger — but use language tuned to
// the domain. The third is the "one thing you'd fix" question, which is
// where the archetype begins to surface most clearly.
//
// Question text is written to feel like a real question, not a template
// substitution. Each set is hand-tuned for the domain's texture.

const PULL_QUESTIONS = {
  'HUMAN BEING': [
    {
      label: 'The Specific Failure',
      text: `Within that territory — the work of people knowing themselves, developing capacity, living well — what's the specific failure you find hardest to tolerate? What keeps breaking in people that shouldn't be breaking?`
    },
    {
      label: 'The Disproportionate Anger',
      text: `What's the part of this — the thing about how humans are currently failing to flourish — that makes you angrier than it seems to make other people? The thing that gets under your skin in a way it apparently doesn't get under everyone else's.`
    },
    {
      label: 'The One Thing',
      text: `If you could only change one thing about how humans develop, heal, or come to know themselves — one specific thing — what would it be?`
    }
  ],

  'SOCIETY': [
    {
      label: 'The Specific Failure',
      text: `Within that territory — the structures humans live inside together, the work of governance, belonging, collective functioning — what's the specific failure you find hardest to tolerate? What keeps breaking that shouldn't be breaking?`
    },
    {
      label: 'The Disproportionate Anger',
      text: `What's the part of this — the way our collective systems are currently failing — that makes you angrier than it seems to make other people?`
    },
    {
      label: 'The One Thing',
      text: `If you could only change one thing about how humans organise themselves together — one specific structural failure, one broken institution, one missing piece of collective infrastructure — what would it be?`
    }
  ],

  'NATURE': [
    {
      label: 'The Specific Failure',
      text: `Within that territory — the relationship between human activity and the living world — what's the specific failure you find hardest to tolerate? What keeps breaking that shouldn't be breaking?`
    },
    {
      label: 'The Disproportionate Anger',
      text: `What's the part of this — the way we're currently failing the living systems we depend on — that makes you angrier than it seems to make other people?`
    },
    {
      label: 'The One Thing',
      text: `If you could only change one thing about how humans live in relationship to the natural world — one specific practice, one specific failure, one specific restoration — what would it be?`
    }
  ],

  'TECHNOLOGY': [
    {
      label: 'The Specific Failure',
      text: `Within that territory — the tools humans build and how they reshape what's possible — what's the specific failure you find hardest to tolerate? What keeps going wrong in how we design, deploy, or govern technology?`
    },
    {
      label: 'The Disproportionate Anger',
      text: `What's the part of this — the way our tools are currently being built or used — that makes you angrier than it seems to make other people?`
    },
    {
      label: 'The One Thing',
      text: `If you could only change one thing about how humans build or use technology — one specific design choice, one specific governance gap, one specific direction — what would it be?`
    }
  ],

  'FINANCE & ECONOMY': [
    {
      label: 'The Specific Failure',
      text: `Within that territory — how value flows through the system, what gets rewarded, what gets funded — what's the specific failure you find hardest to tolerate? What keeps breaking that shouldn't be breaking?`
    },
    {
      label: 'The Disproportionate Anger',
      text: `What's the part of this — the way our economic systems are currently failing — that makes you angrier than it seems to make other people?`
    },
    {
      label: 'The One Thing',
      text: `If you could only change one thing about how humans structure exchange, resource flow, or value creation — one specific mechanism, one specific distortion, one specific piece of infrastructure — what would it be?`
    }
  ],

  'LEGACY': [
    {
      label: 'The Specific Failure',
      text: `Within that territory — what humans carry forward, preserve, and protect for those who come after — what's the specific failure you find hardest to tolerate? What's at risk of being lost that shouldn't be?`
    },
    {
      label: 'The Disproportionate Anger',
      text: `What's the part of this — the way we're currently failing the long arc, the generations ahead, what we owe to what came before — that makes you angrier than it seems to make other people?`
    },
    {
      label: 'The One Thing',
      text: `If you could only change one thing about how humans hold the long view — one specific piece of wisdom being lost, one specific risk being ignored, one specific practice being forgotten — what would it be?`
    }
  ],

  'VISION': [
    {
      label: 'The Specific Failure',
      text: `Within that territory — how humanity imagines, conceives, and chooses its collective futures — what's the specific failure you find hardest to tolerate? What's missing from our collective imagination that shouldn't be missing?`
    },
    {
      label: 'The Disproportionate Anger',
      text: `What's the part of this — the way our narratives, stories, or collective direction are currently failing — that makes you angrier than it seems to make other people?`
    },
    {
      label: 'The One Thing',
      text: `If you could only change one thing about how humans imagine and orient toward the future — one specific story, one specific absence of vision, one specific distortion — what would it be?`
    }
  ],
}

// ─── Probe scripts (one probe per question, not two) ─────────────────────────
// The pull stage is lighter on probing than the archetype stage. Questions
// are already open and attentional, so most answers will be substantive.
// When an answer is thin, one probe is enough to either produce more signal
// or confirm that the person doesn't have more to say here.

const PULL_PROBES = {
  'HUMAN BEING': [
    'Can you make that concrete — a specific example of where you see this failure happening?',
    'What specifically is it about that wrong that lands hardest for you?',
    'If that one thing changed — say more about what would actually be different.',
  ],
  'SOCIETY': [
    'Give me a specific example — a structure, an institution, a situation where this shows up.',
    'What is it about that particular failure that gets to you more than other things that are also broken?',
    'If that specific thing changed — walk me through what would be different.',
  ],
  'NATURE': [
    'Can you name a specific place or practice or pattern where you see this breaking?',
    'Why that particular wrong? What is it about it specifically?',
    'If that changed — what would actually be different in the living world?',
  ],
  'TECHNOLOGY': [
    'Give me a specific example — a particular technology, a specific deployment, a concrete pattern.',
    'What is it about that specific failure that lands harder for you than other technology problems?',
    'If that one thing shifted — what opens up?',
  ],
  'FINANCE & ECONOMY': [
    'Make it concrete — a specific mechanism, a specific pattern, a specific outcome.',
    'Why that particular failure? What gets to you about it specifically?',
    'If that one thing were different — what would actually flow differently?',
  ],
  'LEGACY': [
    'Can you name a specific thing that\'s being lost, ignored, or carried badly?',
    'Why that particular failure? What is it about it specifically?',
    'If that were held differently — what becomes possible for the people who come after?',
  ],
  'VISION': [
    'Give me a specific example — a missing narrative, a failure of imagination, an absent story.',
    'Why that particular absence? What is it about it specifically?',
    'If that vision existed, if that story could be told — what would it unlock?',
  ],
}

// ─── Universal thin-answer detection ─────────────────────────────────────────
// Pull answers can legitimately be short if the person is being precise.
// "I want universal healthcare" is a 4-word answer that carries real signal.
// So word count alone isn't the right test — we look for absence of substance,
// not absence of length.

const GENERIC_DEFLECTORS = [
  'i don\'t know', 'not sure', 'no idea', 'hard to say', 'everything',
  'a lot of things', 'lots of things', 'many things', 'too many',
  'i guess', 'dunno', 'whatever', 'anything',
]

function isPullAnswerThin(answer) {
  const text = answer.trim()
  const lower = text.toLowerCase()
  const words = text.split(/\s+/).filter(Boolean)

  // Single word or two-word non-answers
  if (words.length < 3) return true

  // Pure deflection patterns
  const deflectorMatches = GENERIC_DEFLECTORS.filter(d => lower.includes(d)).length
  if (deflectorMatches >= 1 && words.length < 8) return true

  // Very generic answers without specificity
  // e.g., "I don't know, lots of things" or "too many to name"
  if (words.length < 6 && deflectorMatches >= 1) return true

  return false
}

// ─── Claude-backed signal check ──────────────────────────────────────────────
// After one probe, if the answer is still thin-looking, do one more check
// with Claude to decide whether the signal is actually there just in unusual
// form, or whether to accept and move on with what we have.

async function checkPullSignal(domain, questionLabel, answer) {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 200,
    messages: [{
      role: 'user',
      content: `Evaluate whether this answer carries real signal for a Purpose Piece assessment.

Domain context: ${domain}
Question type: ${questionLabel} (asking about specific failures, disproportionate anger, or the one thing they'd change within the domain)
Answer: "${answer}"

A valid answer may be short, abstract, or philosophical — as long as it identifies something specific the person cares about within the domain. A thin answer is pure deflection, total vagueness, or complete non-engagement.

Return JSON only:
{"has_signal": true|false, "reasoning": "one sentence"}`
    }]
  })

  return extractJSON(response.content[0].text)
}

// ─── Opening message for the pull stage ──────────────────────────────────────
// Shown after the wish stage transition. This is the register shift from
// reaching-for-the-wish to looking-at-the-territory-with-precision.
//
// Domain-aware: the opening acknowledges what was found in the wish stage
// without announcing the domain name as a label.

function getPullOpening(domain) {
  const territoryLabels = {
    'HUMAN BEING':       'the work of people knowing themselves, developing capacity, living well',
    'SOCIETY':           'the structures humans live inside together — institutions, governance, belonging',
    'NATURE':            'the relationship between human activity and the living world',
    'TECHNOLOGY':        'the tools humans build and how they reshape what\'s possible',
    'FINANCE & ECONOMY': 'how value flows through the system — what gets rewarded, what gets funded',
    'LEGACY':            'what humans carry forward, preserve, and protect for those who come after',
    'VISION':            'how humanity imagines, conceives, and chooses its collective futures',
  }

  const territory = territoryLabels[domain] || 'that territory'

  return `Your care lives in ${territory}.

That territory asks specific things of the people built for it — and it's the people who can feel what's actually wrong inside it who end up doing the work that matters. Three questions to look at it more precisely.`
}

// ─── Helper: get session state ───────────────────────────────────────────────

function getPullIndex(session) {
  return session.pullQuestionIndex ?? 0
}

function getPullProbeCount(session) {
  return session.pullProbeCount ?? 0
}

function setPullIndex(session, v) {
  session.pullQuestionIndex = v
}

function setPullProbeCount(session, v) {
  session.pullProbeCount = v
}

// ─── Main pull stage handler ─────────────────────────────────────────────────

async function handlePullStage(session, latestInput, res, northStarCtx) {
  const domain = session.domain
  if (!domain || !PULL_QUESTIONS[domain]) {
    return res.status(500).json({
      error: `Missing or invalid domain for pull stage: ${domain}`
    })
  }

  session.pullTranscript = session.pullTranscript || []
  const questions = PULL_QUESTIONS[domain]
  const probes    = PULL_PROBES[domain]
  const total     = questions.length

  // ── Opening call — no user input, show stage opening + first question ──
  if (!latestInput && session.pullTranscript.length === 0) {
    setPullIndex(session, 0)
    setPullProbeCount(session, 0)

    const opening = getPullOpening(domain)
    const firstQ  = questions[0]
    session.currentQuestion = firstQ.text

    return res.status(200).json({
      message:       opening,
      questionLabel: `Pull · 1 of ${total} · ${firstQ.label}`,
      firstQuestion: firstQ.text,
      session,
      stage:         'pull',
      questionIndex: 0,
      inputMode:     'none',
      autoAdvance:   true,
      advanceDelay:  2500,
    })
  }

  // ── Process the user's answer ──────────────────────────────────────────
  const qi = getPullIndex(session)
  const pc = getPullProbeCount(session)
  const currentQ = questions[qi]

  // Find or create the transcript entry for the current question
  let entry = session.pullTranscript.find(e => e.questionIndex === qi)
  if (!entry) {
    entry = {
      questionIndex: qi,
      question:      currentQ.text,
      label:         currentQ.label,
      answer:        '',
      probes:        [],
      thin:          false,
    }
    session.pullTranscript.push(entry)
  }

  // ── First answer to this question ──────────────────────────────────────
  if (pc === 0 && !entry.answer) {
    entry.answer = latestInput
    const thin = isPullAnswerThin(latestInput)

    if (!thin) {
      // Good signal — advance
      return await advancePullStage(session, res)
    }

    // Thin — one probe
    setPullProbeCount(session, 1)
    const probeText = probes[qi] || 'Can you say more?'
    session.currentQuestion = probeText
    return res.status(200).json({
      message:   probeText,
      session,
      stage:     'pull',
      inputMode: 'text',
      isProbe:   true,
      questionLabel: `Pull · ${qi + 1} of ${total} · ${currentQ.label}`,
    })
  }

  // ── Responding to a probe ──────────────────────────────────────────────
  entry.probes.push({ probe: probes[qi], response: latestInput })
  const combined = `${entry.answer} ${latestInput}`.trim()
  const stillThin = isPullAnswerThin(combined)

  if (!stillThin) {
    // Probe produced signal — advance
    return await advancePullStage(session, res)
  }

  // Still thin after local check — one Claude-backed signal check
  // If Claude says there's signal we might have missed, accept and move on
  // If Claude confirms thin, mark it and move on anyway (pull stage doesn't
  // block on thin — it's about depth, not completeness)
  try {
    const check = await checkPullSignal(domain, currentQ.label, combined)
    entry.thin = !check.has_signal
  } catch (e) {
    console.error('Pull signal check failed:', e)
    entry.thin = true
  }

  return await advancePullStage(session, res)
}

// ─── Advance to next question or complete the stage ──────────────────────────

async function advancePullStage(session, res) {
  const domain = session.domain
  const questions = PULL_QUESTIONS[domain]
  const total = questions.length

  const qi = getPullIndex(session)
  const nextQI = qi + 1

  setPullProbeCount(session, 0)
  setPullIndex(session, nextQI)

  // ── More questions in the stage ─────────────────────────────────────────
  if (nextQI < total) {
    const nextQ = questions[nextQI]
    session.currentQuestion = nextQ.text

    return res.status(200).json({
      message:       nextQ.text,
      questionLabel: `Pull · ${nextQI + 1} of ${total} · ${nextQ.label}`,
      session,
      stage:         'pull',
      questionIndex: nextQI,
      inputMode:     'text',
    })
  }

  // ── Pull stage complete — advance to instinct ──────────────────────────
  return await completePullStage(session, res)
}

// ─── Completion — hand off to instinct stage ─────────────────────────────────

async function completePullStage(session, res) {
  session.stage = 'instinct'

  // Optionally: run a light subdomain detection here using Claude.
  // This is useful for the Placement Card later — we can surface the
  // subdomain the person's care most clearly lives in.
  //
  // Not blocking — if it fails, we continue without a subdomain hint.
  try {
    session.subdomain_signal = await detectSubdomain(session)
  } catch (e) {
    console.error('Subdomain detection failed (non-fatal):', e)
    session.subdomain_signal = null
  }

  // Transition message — acknowledges the territory is now sharper,
  // signals the register shift to behavioural questions.
  const transition = `Good. I'm starting to see the shape of what's yours specifically within this territory.

Next, we shift register. That was about what pulls you. The next set is about how you actually move — what you do when something needs doing. Five behavioural questions.`

  return res.status(200).json({
    message:       transition,
    session,
    stage:         'instinct',
    inputMode:     'none',
    autoAdvance:   true,
    advanceDelay:  2500,
    stageComplete: 'pull',
  })
}

// ─── Subdomain detection (non-blocking) ──────────────────────────────────────
// Light Claude call to see if the pull answers point to a specific subdomain
// within the larger domain. This feeds the Placement Card later but doesn't
// gate stage progression.

async function detectSubdomain(session) {
  const domain = session.domain
  const pullAnswers = (session.pullTranscript || [])
    .map(e => `${e.label}: ${e.answer}${e.probes?.length ? ' / probe: ' + e.probes.map(p => p.response).join(' ') : ''}`)
    .join('\n')

  const wishText = session.wish_positive || session.wish || ''

  const SUBDOMAIN_LISTS = {
    'HUMAN BEING':       ['Physical Health & Vitality', 'Mental & Emotional Health', 'Nervous System Regulation', 'Learning & Cognitive Capacity', 'Creativity & Expression', 'Meaning, Purpose & Identity', 'Resilience & Adaptability'],
    'SOCIETY':           ['Social Justice & Inclusion', 'Governance & Institutions', 'Education Systems', 'Media & Information Integrity', 'Global Collaboration', 'Community & Belonging', 'Conflict Resolution & Peacebuilding'],
    'NATURE':            ['Climate Action & Adaptation', 'Biodiversity & Ecosystem Restoration', 'Water Systems', 'Food & Agriculture', 'Oceans & Marine Life', 'Pollution & Waste', 'Land Use & Regeneration'],
    'TECHNOLOGY':        ['Ethical Technology Design', 'AI & Automation', 'Data, Privacy & Surveillance', 'Infrastructure & Energy Systems', 'Biotechnology & Health Tech', 'Digital Commons', 'Ethics & Regulation'],
    'FINANCE & ECONOMY': ['Economic Inclusion', 'Regenerative & Circular Economy', 'Social Impact & Equity', 'Work, Labor & Livelihood', 'Wealth Distribution', 'Alternative Value Systems', 'Incentives & Externalities'],
    'LEGACY':            ['Intergenerational Wisdom', 'Cultural Preservation', 'Long-Term Thinking', 'Education for the Future', 'Institutional Memory', 'Existential Risk Reduction', 'Planetary Stewardship'],
    'VISION':            ['Vision & Thought Leadership', 'Indigenous Wisdom', 'Narrative & Storytelling', 'Futures & Foresight', 'Myth, Meaning & Culture', 'Collective Imagination', 'Values & Worldviews'],
  }

  const subdomains = SUBDOMAIN_LISTS[domain] || []
  if (subdomains.length === 0) return null

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 300,
    messages: [{
      role: 'user',
      content: `Within the NextUs domain "${domain}", which subdomain does this person's care most clearly live in?

WISH: ${wishText}

PULL ANSWERS:
${pullAnswers}

SUBDOMAINS FOR ${domain}:
${subdomains.map(s => `- ${s}`).join('\n')}

Rules:
- Return one subdomain from the list above, exactly as written.
- Only return a subdomain if the signal is clear. If the person's answers span multiple subdomains or don't point clearly to one, return null.
- Do not invent subdomains not in the list.

Return JSON only:
{"subdomain": "exact subdomain name or null", "confidence": "strong | moderate | weak", "reasoning": "one sentence"}`
    }]
  })

  const result = extractJSON(response.content[0].text)
  if (!result.subdomain || result.confidence === 'weak') return null
  return {
    name: result.subdomain,
    confidence: result.confidence,
    reasoning: result.reasoning,
  }
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
  PULL_QUESTIONS,
  PULL_PROBES,
  handlePullStage,
  getPullOpening,
  detectSubdomain,
  // Exported for testing
  isPullAnswerThin,
}
