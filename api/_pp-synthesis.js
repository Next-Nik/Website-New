// ─── PURPOSE PIECE — SYNTHESIS STAGE (v10) ───────────────────────────────────
// The final synthesis. Runs after the role stage completes.
//
// Produces three outputs in parallel:
//   Phase 3 — The Mirror: instinct-only reflection, no labels, earned recognition
//   Phase 4 — The Profile Card: archetype named as consequence, domain, sub-function, scale
//   Phase 5 — The Placement Card: domain context, readiness fork, next move into ecosystem
//
// The consent rule from v9 is preserved: mirror is offered, not delivered.
// Profile renders first. Mirror text is stored but not auto-shown. North Star
// signals readiness. User clicks to receive the mirror.
//
// The Placement Card is the new piece. It answers "what do I do next" with
// three paths: join, start, transmit. The default path is suggested based on
// archetype mode and scale, but the person chooses.
//
// Session fields added:
//   mirror_text:             string
//   profile:                 object (full Phase 4 JSON)
//   placement:               object (full Phase 5 JSON)
//   civilisational_statement: string
//   horizon_goal:            string (for their domain)

const Anthropic = require('@anthropic-ai/sdk')
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ─── Domain Horizon Goals ───────────────────────────────────────────────────
// Used in the civilisational statement. Canonical — must not diverge from
// the NextUs Platform Living Architecture.

const DOMAIN_HORIZON_GOALS = {
  'HUMAN BEING':       'Humans possess the physical, psychological, and developmental capacity to live well and act wisely in complexity.',
  'SOCIETY':           'Human societies are just, inclusive, stable, and capable of collective problem-solving.',
  'NATURE':            'Human activity is net-positive for planetary health.',
  'TECHNOLOGY':        'Technology amplifies human and planetary flourishing without undermining agency, equity, or ecological stability.',
  'FINANCE & ECONOMY': 'Economic systems distribute value in ways that are fair, regenerative, and aligned with long-term wellbeing.',
  'LEGACY':            'Humanity acts as a responsible steward across generations.',
  'VISION':            'Humanity maintains a shared capacity to imagine and choose better futures.',
}

// Scale labels for the civilisational statement
const SCALE_LABELS = {
  'home':           'home',
  'neighbourhood':  'neighbourhood',
  'city':           'city',
  'province':       'regional',
  'country':        'national',
  'continent':      'continental',
  'global':         'global',
  'civilisational': 'civilisational',
}

// ─── Phase 3 — The Mirror ───────────────────────────────────────────────────
// Instinct-only reflection. Four sections, flowing prose. No labels. No
// archetype name. The mirror earns the recognition before any framing.
//
// Emotional endpoint: "How did it know that."

const MIRROR_SYSTEM_PROMPT = `You are North Star writing the Initial Reflection in Purpose Piece. This is the mirror the person receives after completing all four stages.

Your job: reflect the instinct back to them. Before any label. Before any archetype name. Before any framing. Just the pattern you've observed, named precisely, anchored in what they actually said.

STRUCTURE — four flowing-prose sections, no headers in the output:

Section 1 — Your Signal
The repeated instinct across all their answers. Enters through a specific moment they named. Shape: "When X happens, you Y." Or: "The thing that keeps showing up in how you move is..." Use their specific language where you can. 3-5 sentences.

Section 2 — Your Engine
The emotional logic underneath. What drives the signal. What need, what conviction, what unwillingness. Shape: "What drives this is..." or "Underneath that pattern is..." 3-4 sentences.

Section 3 — Your Calling
The throughline. What all of it — the wish, the pull, the instinct, the role — is ultimately pointed at. Shape: "You are here to..." or "What all of this serves is..." 2-3 sentences. Make this land. This is the centre of the mirror.

Section 4 — The Cost
The price of the instinct. Named precisely, not softened. The thing they carry that others don't. Anchor in what they said about cost and shadow. 3-4 sentences.

OUTPUT FORMAT:
- Flowing prose. One paragraph per section. Each section separated by a blank line.
- No headers. No bullets. No labels. No archetype name anywhere.
- Direct address. "You" throughout.
- Sentences earned by specific evidence. If it could have been written about anyone, rewrite it.
- Plain language. No systems theory, no therapy speak, no performance.
- Match the person's register. If they were plainspoken, be plainspoken. If they reached, meet them reaching.

THE TEST:
Would this person read it and think "how did it know that"? If yes, you've done the work. If it reads like a generic personality description, you haven't.

NEVER:
- Name the archetype.
- Use the words "archetype", "domain", "scale", "purpose piece", "NextUs".
- Congratulate or celebrate.
- Soften the cost.
- Use "perhaps" or "it seems" or any hedging language. The mirror is specific because it earned specificity through evidence.

Return the four sections as flowing prose, separated by blank lines. No JSON, no structure, no labels. Just the reflection.`

async function generateMirror(session) {
  const wishText    = session.wish_positive || session.wish || ''
  const domain      = session.domain
  const archetype   = session.archetype
  const subFunction = session.sub_function_label || archetype
  const costSignal  = session.cost_signal || ''
  const movementStyle = session.movement_style || ''

  const pullText = (session.pullTranscript || [])
    .map(e => `${e.label}: ${e.answer}${e.probes?.length ? ' → ' + e.probes.map(p => p.response).join(' / ') : ''}`)
    .join('\n')

  const instinctText = (session.instinctTranscript || [])
    .map(e => `${e.label}: ${e.answer}${e.probes?.length ? ' → ' + e.probes.map(p => p.response).join(' / ') : ''}${e.thin ? ' [thin]' : ''}`)
    .join('\n\n')

  const roleText = (session.roleTranscript || [])
    .map(e => `${e.label}: ${e.answer}`)
    .join('\n\n')

  const payload = `FULL SESSION DATA (use for evidence, do not narrate):

Wish: ${wishText}
Domain: ${domain}
Archetype (internal — do NOT mention in output): ${archetype} / ${subFunction}
Cost signal from instinct extraction: ${costSignal}
Movement style: ${movementStyle}

Pull answers:
${pullText}

Instinct answers:
${instinctText}

Role answers:
${roleText}

Generate the four-section mirror.`

  const response = await anthropic.messages.create({
    model:      'claude-sonnet-4-20250514',
    max_tokens: 1500,
    system:     MIRROR_SYSTEM_PROMPT,
    messages:   [{ role: 'user', content: payload }]
  })

  return response.content[0].text.trim()
}

// ─── Phase 4 — The Profile Card ─────────────────────────────────────────────
// Archetype named as consequence. Domain derived from the wish. Sub-function
// from role stage. Scale from evidence. Plus responsibility, civilisational
// statement, and actions.

const PROFILE_SYSTEM_PROMPT = `You are writing the Purpose Piece profile card — the second output the person sees. The mirror has already named the pattern without labels. This is where the framing happens.

CORE REFRAME (v10.1): Archetypes are PROJECT ROLES. Not personality types. They are the functional roles a working project needs filled. You are naming which project-role this person is built to fill, inside a specific domain, at a specific sub-function level, at a specific scale.

STRUCTURE — return JSON with these fields:

{
  "signal_restatement": "1 paragraph, 1-3 sentences. Compression of the mirror's throughline. Opens with instinct, not archetype name. Makes the transition to framing feel earned.",

  "archetype_frame": "1 paragraph. Names the archetype as consequence: 'The project role most aligned with this movement is [Archetype].' Behavioural description — what this role does on a team, what it contributes. Anchored in a specific moment from their answers.",

  "subfunction_frame": "1 paragraph. Within [Archetype], names the specific sub-function ([sub_function_label]). Describes what makes this flavour of the role distinct. Anchors in the person's role-stage answers.",

  "domain_frame": "1 paragraph. 'The territory where this role most wants to operate is [Domain].' Justifies with direct reference to what they said in the wish and pull stages. Names the Horizon Goal for the domain — this is what the work is in service of.",

  "scale_frame": "1 paragraph. 'The scale where this work is most coherent is [Scale].' Scale is coherence bandwidth — where felt responsibility lives, not where examples are drawn from. If tension exists between felt-responsibility scale and current-delivery scale, name both without softening. Never flatten a large scale because it hasn't been externally validated yet.",

  "responsibility": "2-4 sentences. What this asks of them. Not a warning — a weight. Include one line grounding in capacity: this exists in them because something in them is built for it.",

  "civilisational_statement": "Exact format: 'I am a [Sub-function label] in [Domain] at the [Scale] scale, working toward [Horizon Goal].' Use 'an' instead of 'a' when the Sub-function label begins with a vowel sound (Advisor, Architect, Explorer, Activist, etc.). Use the exact Horizon Goal text provided. This is orientation, not aspiration.",

  "actions": {
    "light":  "30-60 minutes this week. Something they could start today. Specific to their context, not generic archetype advice.",
    "medium": "Ongoing, builds over time. Weekly or biweekly cadence. Specific.",
    "deep":   "Weeks to months. What their instinct is genuinely built for. Structural."
  }
}

THE RULES:
- Speak directly. "You" not "this type."
- Never say "You are a [Archetype]." Always say "The project role most aligned with this movement is [Archetype]."
- Never use systems theory language.
- Never smooth over tension. Name it precisely.
- Never motivate or celebrate. Responsibility carries weight.
- Every section anchored in something specific the person said.
- Actions must be specific to this person's context and territory, not generic archetype actions.

THE TEST:
Could any sentence in the frame sections appear in a generic archetype profile written about anyone? If yes, add the person's specific words and specific moments until it couldn't.

OUTPUT: Return JSON only, no other text.`

async function generateProfile(session) {
  const domain      = session.domain
  const archetype   = session.archetype
  const subFunction = session.sub_function || 'unspecified'
  const subFunctionLabel = session.sub_function_label || archetype
  const scale       = session.scale || 'unspecified'
  const scaleLabel  = SCALE_LABELS[scale] || scale
  const horizonGoal = DOMAIN_HORIZON_GOALS[domain] || ''

  const wishText = session.wish_positive || session.wish || ''
  const archetypeReasoning = session.archetype_reasoning || ''
  const subFunctionReasoning = session.sub_function_reasoning || ''
  const scaleReasoning = session.scale_reasoning || ''
  const scaleTension = session.scale_tension || 'none'

  const pullText = (session.pullTranscript || [])
    .map(e => `${e.label}: ${e.answer}`)
    .join('\n')

  const instinctText = (session.instinctTranscript || [])
    .map(e => `${e.label}: ${e.answer}`)
    .join('\n')

  const roleText = (session.roleTranscript || [])
    .map(e => `${e.label}: ${e.answer}`)
    .join('\n')

  const payload = `CONFIRMED COORDINATES:
Archetype: ${archetype}
Archetype reasoning: ${archetypeReasoning}
Sub-function: ${subFunctionLabel} (slug: ${subFunction})
Sub-function reasoning: ${subFunctionReasoning}
Domain: ${domain}
Domain Horizon Goal (use exact text in civilisational_statement): ${horizonGoal}
Scale: ${scaleLabel} (slug: ${scale})
Scale reasoning: ${scaleReasoning}
Scale tension: ${scaleTension}

WISH: ${wishText}

PULL ANSWERS:
${pullText}

INSTINCT ANSWERS:
${instinctText}

ROLE ANSWERS:
${roleText}

Generate the profile card JSON.`

  const response = await anthropic.messages.create({
    model:      'claude-sonnet-4-20250514',
    max_tokens: 2000,
    system:     PROFILE_SYSTEM_PROMPT,
    messages:   [{ role: 'user', content: payload }]
  })

  return extractJSON(response.content[0].text)
}

// ─── Phase 5 — The Placement Card ───────────────────────────────────────────
// The new piece. Makes the tool operational for NextUs.
//
// Unlike the Mirror and Profile, the Placement Card is PART-DYNAMIC.
// The person sees their domain's Horizon Goal, the suggested readiness path
// based on their archetype mode, and a place to choose their own path.
// Their choice then determines what's surfaced — actors, registration,
// transmission guidance.
//
// For this generator, we produce the static parts: territory description,
// mode explanation, suggested path, and path-specific next-move content.
// The interactive element (the readiness fork buttons) is rendered by the
// frontend using these values.

const PLACEMENT_SYSTEM_PROMPT = `You are writing the Placement Card for Purpose Piece — the third and final output. The mirror named the instinct. The profile framed the role. The placement card makes it operational.

Your job: translate this person's archetype + sub-function + domain + scale + mode into a specific set of next moves within the NextUs ecosystem. This is the operational output.

STRUCTURE — return JSON with these fields:

{
  "territory_description": "2-3 sentences describing the person's territory — not abstractly, but as the specific work happening in their domain. Uses the Horizon Goal as the destination. Example: 'Your work sits inside the territory of [Domain]. The destination is: [Horizon Goal]. What you're pointed at specifically is [the specific failure or possibility they named most strongly].' Ground this in what they actually said.",

  "mode_frame": "1 paragraph. Names whether their contribution is proximate, transmissive, or both — and what that means in plain language. Proximate = your contribution requires direct presence; you need to be on a team doing the work. Transmissive = your contribution travels through your work — writing, teaching, demonstrating — and serves projects whose teams you may never meet. Both = some of each. Use simple, non-technical language. This is important because it shapes what the readiness fork means for them.",

  "suggested_readiness": "one of: 'join' | 'start' | 'transmit'. The suggested path based on archetype mode and scale. Rules: if mode is proximate, suggest 'join' as default (with 'start' as alternative for Architects and Makers who sound like founders). If mode is transmissive, suggest 'transmit'. If mode is 'both', suggest based on scale — local-to-regional leans toward 'join' or 'start', global-to-civilisational leans toward 'transmit'.",

  "readiness_reasoning": "1-2 sentences explaining why this path is suggested based on their coordinates. Doesn't lecture. Just tells them the logic.",

  "join_frame": "1 paragraph. If they choose 'join': how to find existing work in their domain. What to look for. What questions to ask when they find an actor. Specific to their sub-function — a Resource Connector joining work looks different from a Community Connector joining work.",

  "start_frame": "1 paragraph. If they choose 'start': what starting something in their domain asks of them. Named gaps they could fill (use the Horizon Goal as the north star). Realistic about what starting means — the weight, the runway, the coordination load. No cheerleading.",

  "transmit_frame": "1 paragraph. If they choose 'transmit': how their work can travel through the ecosystem. Writing, teaching, speaking, creating. Specific to their sub-function — a Writer Sage transmits differently from a Narrative Mirror. Includes the practical reality: transmission requires producing work that can actually travel.",

  "resource_guidance": "1 paragraph. How to use resources (books, essays, podcasts, papers) — either to deepen their own thinking about their territory, or to find the people already doing this work before the NextUs map has them. Not a list of resources — the platform will surface those separately. This is about how to use them.",

  "node_invitation": "string or null. If the session is flagged node_candidate=true, a specific 1-2 sentence invitation acknowledging that their shape fits something more than individual contribution — something the ecosystem will eventually need. Framed as directional, not a current ask. Example: 'Your shape — a Steward in Nature at national scale — is exactly the kind of capacity the Biodiversity subdomain will eventually need to hold its work together. That's not a current ask. But keep it in mind.' If not a node candidate, return null."
}

THE RULES:
- Speak directly to the person.
- Don't pretend the map is complete. If the platform has no actors in their domain yet, acknowledge it.
- The suggested_readiness is a suggestion, not a directive. Make that clear.
- Don't cheerlead about starting something. The weight is real.
- Transmit is not the consolation prize for people who can't find existing work. Frame it as a legitimate contribution mode.
- Node invitations are rare — only if node_candidate is true.

OUTPUT: Return JSON only, no other text.`

async function generatePlacement(session) {
  const domain      = session.domain
  const archetype   = session.archetype
  const subFunction = session.sub_function_label || archetype
  const scale       = session.scale || 'unspecified'
  const scaleLabel  = SCALE_LABELS[scale] || scale
  const mode        = session.mode || 'both'
  const horizonGoal = DOMAIN_HORIZON_GOALS[domain] || ''
  const subdomain   = session.subdomain_signal?.name || null
  const nodeCandidate = session.node_candidate || false

  const wishText = session.wish_positive || session.wish || ''

  // Pull the strongest signals from pull answers for territory specificity
  const pullSignal = (session.pullTranscript || [])
    .map(e => `${e.label}: ${e.answer}`)
    .join('\n')

  const payload = `SESSION COORDINATES:
Domain: ${domain}
Horizon Goal: ${horizonGoal}
${subdomain ? `Subdomain signal: ${subdomain}` : 'No specific subdomain signal.'}
Archetype: ${archetype}
Sub-function: ${subFunction}
Scale: ${scaleLabel}
Mode: ${mode}
Node candidate: ${nodeCandidate}

Wish: ${wishText}

What they named in pull stage (the specific territory):
${pullSignal}

Generate the Placement Card JSON.`

  const response = await anthropic.messages.create({
    model:      'claude-sonnet-4-20250514',
    max_tokens: 2500,
    system:     PLACEMENT_SYSTEM_PROMPT,
    messages:   [{ role: 'user', content: payload }]
  })

  return extractJSON(response.content[0].text)
}

// ─── Build the civilisational statement ─────────────────────────────────────
// Deterministic — not LLM-generated. Format is locked.

function buildCivilisationalStatement(session) {
  const subFunctionLabel = session.sub_function_label || session.archetype
  const domain     = session.domain
  const scaleLabel = SCALE_LABELS[session.scale] || session.scale
  const horizonGoal = DOMAIN_HORIZON_GOALS[domain] || ''
  // Pick the right article — "an" before vowel-sound labels (Advisor,
  // Architect, Explorer, Activist…). Not bulletproof for silent-h / "u" as
  // "you"-sound edge cases, but covers every archetype and sub-function in
  // the v10 taxonomy correctly.
  const article = /^[aeiou]/i.test(subFunctionLabel) ? 'an' : 'a'

  return `I am ${article} ${subFunctionLabel} in ${domain} at the ${scaleLabel} scale, working toward a world in which ${horizonGoal.replace(/\.$/, '')}.`
}

// ─── Main synthesis handler ─────────────────────────────────────────────────
// Runs all three generators in parallel. Returns everything at once so the
// frontend can render profile first, stash the mirror for consent-gated
// delivery, and render the Placement Card after the mirror is received.

async function runSynthesis(session, res) {
  // Guard — session must have all required coordinates
  const missing = []
  if (!session.domain)       missing.push('domain')
  if (!session.archetype)    missing.push('archetype')
  if (!session.sub_function) missing.push('sub_function')
  if (!session.scale)        missing.push('scale')

  if (missing.length > 0) {
    return res.status(400).json({
      error: `Cannot run synthesis — missing coordinates: ${missing.join(', ')}`
    })
  }

  // Run all three generators in parallel
  let mirror, profile, placement
  try {
    [mirror, profile, placement] = await Promise.all([
      generateMirror(session),
      generateProfile(session),
      generatePlacement(session),
    ])
  } catch (e) {
    console.error('Synthesis failed:', e)
    return res.status(500).json({
      error: 'Synthesis failed. Please refresh and try again.',
      details: e.message,
    })
  }

  // Build the civilisational statement deterministically
  const civilisationalStatement = buildCivilisationalStatement(session)

  // Store on the session
  session.mirror_text              = mirror
  session.profile                  = profile
  session.placement                = placement
  session.civilisational_statement = civilisationalStatement
  session.horizon_goal             = DOMAIN_HORIZON_GOALS[session.domain]
  session.stage                    = 'complete'
  session.status                   = 'complete'

  // Return everything. Frontend handles the consent-gated delivery:
  // profile renders first, mirror is stashed, user clicks to receive it,
  // then the Placement Card renders.
  return res.status(200).json({
    stage:    'complete',
    complete: true,
    inputMode: 'none',

    // Profile card — renders first
    profile,
    civilisational_statement: civilisationalStatement,
    horizon_goal:             session.horizon_goal,

    // Mirror — stored, user opts in to receive it
    mirror_text: mirror,
    isMirror:    true,

    // Placement Card — renders after mirror consent or as third output
    placement,

    // Full session for storage
    session,

    // Internal extraction summary (for debugging/analytics, not shown)
    _coordinates: {
      domain:       session.domain,
      subdomain:    session.subdomain_signal?.name || null,
      archetype:    session.archetype,
      sub_function: session.sub_function,
      sub_function_label: session.sub_function_label,
      scale:        session.scale,
      mode:         session.mode,
      node_candidate: session.node_candidate,
      readiness_suggestion: placement.suggested_readiness,
    },
  })
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
  DOMAIN_HORIZON_GOALS,
  SCALE_LABELS,
  runSynthesis,
  generateMirror,
  generateProfile,
  generatePlacement,
  buildCivilisationalStatement,
}
