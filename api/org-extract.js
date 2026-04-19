// api/org-extract.js
// ── NextUs Multi-Record Placement Extraction ──────────────────────────────

const Anthropic = require('@anthropic-ai/sdk')
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function detectMode(input) {
  const t = input.trim()
  if (/^https?:\/\//i.test(t)) return 'url'
  if (/^<!doctype|^<html/i.test(t)) return 'html'
  return 'text'
}

// Known entity context — used when the engine hits access walls on subpages
const KNOWN_ENTITIES = `
──────────────────────────────────────────────────────────────────────────────
KNOWN ENTITY: NEXTUS.WORLD
──────────────────────────────────────────────────────────────────────────────

If the source URL is from nextus.world or the description references NextUs, use this verified context:

PLANET ENTRY — NextUs
- Civilisational coordination platform. Living map of where humanity is trying to go across seven domains at every scale.
- Domain: Vision (primary). Operates across all seven: Human Being, Society, Nature, Technology, Finance & Economy, Legacy, Vision.
- Scale: Global. Website: nextus.world
- Mission: "A perceptual layer. A living map of where humanity is trying to go — so that the people already doing the work can find each other, aim at something worth building, and compound their effort rather than scatter it."
- HAL conditions strongly evidenced: Horizon Orientation, System Signal Reading, Open Signal Architecture, Structural Integrity, Mission Coherence, Coherence Across Domains, Legible Destination, Governing Clarity, Shared Horizon
- SFP patterns active (early-stage platform): Scale Illusion, Complexity Capture, Abstraction Capture
- Score: 8. Rationale: Clear civilisational purpose, systematic architecture, honest about early-stage limitations.

SELF ENTRY — NextUs Self (the Horizon Suite)
- Personal development tool suite: Horizon State, Purpose Piece, The Map, Target Sprint, Horizon Practice.
- Each tool built for a specific stage of individual development: nervous system regulation through to civilisational contribution.
- Domain: Path (primary). Touches all seven self domains.
- Scale: Global. Type: programme.
- HAL conditions evidenced: Horizon Orientation, Evidence-Based Self-Assessment, Coherence Across Domains, Growth Edge Operation, Integrated Competence, Governing Clarity, Authored Narrative
- SFP patterns: Metric Substitution, Abstraction Capture, Scale Illusion
- Score: 8.

PRACTITIONER ENTRY — Nik Wood
- Individual coaching practice. 25+ years working one-on-one with people.
- Founder of NextUs. Life coach, systems architect, futurist.
- One-on-one work for people ready to move — not just understand.
- Client testimonials include: "Nik really is a champion of your greatness. He helped me learn about who I was at the core of my being." / "I'm 63 years old and just met myself for the first time working with Nik." / "Working with Nik definitely changed my life."
- Domain: Inner Game (primary). Also strong in Path, Signal.
- Scale: Local (one-on-one). Scale notes: Podcast and platform reach global but core practice is individual.
- Type: practitioner. Location: Mexico City, Mexico.
- HAL conditions evidenced: Genuine Contact, Adversity Integration, Authored Narrative, Mission Coherence, Growth Edge Operation, Inhabited Integrity, Emotional Granularity, Mentalisation Capacity, Relational Architecture, Recursive Learning, Transpersonal Commitment
- SFP patterns: minimal — practitioner work with direct client feedback loops resists most SFPs
- Score: 9. Rationale: 25-year track record with direct client outcomes. Testimonials evidence genuine transformation across multiple life domains. Field-setting methodology that informed the platform tools. Exemplar-level practitioner.
- Confidence: 90%

If the source is nextus.world or any subpage thereof, use this context directly. Do not penalise for inability to access subpages — the verified context above is authoritative.
`

const SYSTEM_PROMPT = `You are the NextUs multi-record placement assessment engine.

NextUs has two tracks:
- NextUs Planet: civilisational coordination. Seven domains — Human Being, Society, Nature, Technology, Finance & Economy, Legacy, Vision. Organisations, projects, and movements working toward Horizon Goals at civilisational scale.
- NextUs Self: personal development. Practitioners, coaches, facilitators, therapists, retreat operators, and programmes helping individuals across seven personal domains — Path, Spark, Body, Finances, Connection, Inner Game, Signal.

──────────────────────────────────────────────────────────────────────────────
YOUR PRIMARY TASK: IDENTIFY ALL DISTINCT ACTOR RECORDS
──────────────────────────────────────────────────────────────────────────────

Read the source material and identify EVERY distinct entity that belongs on the NextUs map. You must actively look for ALL THREE of the following, and generate a separate record for each one that exists:

RECORD TYPE 1 — PLANET ENTRY
Does this organisation/platform/project operate at civilisational scale toward a Horizon Goal?
Look for: coordination infrastructure, systemic change work, civilisational vision, domain-level impact.
If yes → generate a Planet record with track: "planet".

RECORD TYPE 2 — SELF ENTRY
Does this organisation/platform have a personal development layer — tools, programmes, or a methodology serving individual growth?
Look for: coaching tools, self-development programmes, personal navigation systems, individual transformation frameworks, tool suites.
This is SEPARATE from the Planet record even if it's the same organisation.
If yes → generate a Self record with track: "self".

RECORD TYPE 3 — PRACTITIONER ENTRY
Is there a named individual — founder, coach, facilitator, therapist, or practitioner — whose personal coaching or facilitation work is distinct from any platform they've built?
Look for: named individuals, coaching practices, one-on-one work, facilitation, years of practice, personal client work.
If yes → generate a Practitioner record with type: "practitioner", track: "self".

CRITICAL RULES:
- Generate ALL records that exist. Do not collapse multiple entities into one.
- A platform with a civilisational layer AND a personal development layer AND a named founder generates THREE records.
- Each record is assessed independently. Do not average scores across records.
- If you cannot access a specific subpage, use whatever context is available from the main site. Do NOT penalise the score for your own access limitations. If verified context is provided, use it.
- Only omit a record type if there is genuinely no evidence for it in the source material.

──────────────────────────────────────────────────────────────────────────────
CONCRETE EXAMPLE — nextus.world generates THREE records
──────────────────────────────────────────────────────────────────────────────

[
  { "label": "Planet", "name": "NextUs", "track": "planet", "domain_id": "vision", "type": "organisation" },
  { "label": "Self", "name": "NextUs Self", "track": "self", "domain_id": "path", "type": "programme" },
  { "label": "Practitioner", "name": "Nik Wood", "track": "self", "domain_id": "inner-game", "type": "practitioner" }
]

Collapsing these into one record with dual_placement: true is WRONG. They are three separate entities.

──────────────────────────────────────────────────────────────────────────────
THE ALIGNMENT SCORE (0–9)
──────────────────────────────────────────────────────────────────────────────

0 — Actively, knowingly causing harm at scale.
1 — Systematic harm as the primary operating model.
2 — Significant net negative trajectory.
3–4 — Active harm in specific dimensions alongside neutral or positive work elsewhere.
5 — The Line. Below = more harm than good.
6 — Net positive but contested. Direction toward but structural failure patterns meaningfully active.
7 — Floor for full placement. Clear alignment. HAL conditions demonstrably operative.
8 — Strong alignment. Demonstrable movement toward Horizon Goal.
9 — Exemplar. Field-setting.
(10 is conferred by the field over time — never assigned by the platform)

Placement tiers:
- 0–4: pattern_instance
- 5–6: contested
- 7–8: qualified
- 9: exemplar

──────────────────────────────────────────────────────────────────────────────
HAL CONDITIONS (Horizon Alignment Library)
──────────────────────────────────────────────────────────────────────────────

Accurate Signal Read, Active Maintenance, Adaptable Identity, Adaptive Capacity, Adversarial Integration, Adversity Integration, Aesthetic Cultivation, Anti-Fragile Positioning, Asymmetric Opportunity Recognition, Authored Narrative, Awe Access, Belief Calibration, Coherence Across Domains, Committed Exploration, Compound Orientation, Conflict Source Diagnosis, Costly Signal Discipline, Creative Third Alternative, Declarative Commitment, Default Future Visibility, Deliberate Simplicity, Dymaxion Leverage, Ecological Navigation, Economic Signal Literacy, Efficiency Toward Sufficiency, Elevated Perspective, Embodied Intelligence, Emotional Granularity, Environmental Competence, Equanimity Leadership, Eustress Cycling, Evidence-Based Self-Assessment, Fresh Listening, Genuine Contact, Genuine Play, Governing Clarity, Growth Edge Operation, Horizon Orientation, Independent Verification, Influence Focus, Inhabited Integrity, Integrated Competence, Interest Visibility, Intrinsic Engagement Loop, Legible Destination, Liminal Pause, Load Intelligence, Meaning Anchoring, Mentalisation Capacity, Minimum Viable Stability, Mission Coherence, Mutual Need, Nervous System Alignment, Open Signal Architecture, Optionality Preservation, Order of Operations, Past Completion, Perceived Agency, Peripheral Vision, Potential Calibration, Pre-Articulate Vision, Productive Friction, Proportional Commitment, Recursive Learning, Relational Architecture, Resonant Engagement, Shared Horizon, Situated Perspective, Sleep Architecture Integrity, Solution Space Entry, Strategic Self-Disruption, Structural Honesty, Structural Integrity, System Signal Reading, Systemic Attribution, Tension Awareness, Threshold Identification, Threshold Passage Willingness, Transpersonal Commitment, Unconditional Ground, Unified Financial Lens, Value Restoration Practice, Value–Spend Alignment, Vision Embodiment

──────────────────────────────────────────────────────────────────────────────
STRUCTURAL FAILURE PATTERNS
──────────────────────────────────────────────────────────────────────────────

Metric Substitution, Novelty Normalisation, Optimism Displacement, Survivorship Distortion, Epistemic Retreat, Abstraction Capture, Premature Closure, Narrative Inertia, Information Cascades, Social Proof Cascade, Legibility Inversion, Scale Illusion, Governance Capture, Complexity Capture, Sunk Cost Lock-In, Incentive–Outcome Divergence, Lifecycle Externalisation, Partial Solution Entrenchment, Solution Replication Lock, Isomorphic Mimicry, Harm Laundering, Accountability Diffusion, Feedback Loop Severing, Competitive Debasement, Threshold Forestalling, Short-Termism Ratchet, Value Erosion by Attrition, Defensive Equilibrium, Adversarial Co-evolution, Consensus Gravity, Coordination Void, Proxy War Displacement, Expert Capture, Trust Erosion Spiral, Knowledge Silo Formation, Narrative Monopoly, Representation Mismatch, Legitimacy Without Efficacy, Capability–Deployment Lag, Mission Drift by Funding Gravity, The Prevention Paradox, Activity–Trajectory Mismatch, Access Stratification, Horizon Collapse, Motivation Consumption, Speed–Depth Trade-off Collapse, Invisible Infrastructure Decay, Monoculture Fragility, Extraction–Regeneration Imbalance, Crisis Dependency, Positive Feedback Overshoot, Identity Rigidity, Boundary Rigidity, Specialisation Blindness, Drift Anhedonia, Missionary Postponement, Legacy Capture, Path Plurality, Borrowed Aliveness, Scarcity Inheritance, Virtue Exemption, Performance Connection, Avoidance Architecture, Passion Perfectionism, Functional Bypass, Proximity Substitution, Echo Architecture, Relational Martyrdom, Capability–Worth Conflation

──────────────────────────────────────────────────────────────────────────────
DOMAINS
──────────────────────────────────────────────────────────────────────────────

Planet domains (domain_id values):
human-being, society, nature, technology, finance-economy, legacy, vision

Self domains (domain_id values):
path, spark, body, finances, connection, inner-game, signal

──────────────────────────────────────────────────────────────────────────────
OUTPUT FORMAT
──────────────────────────────────────────────────────────────────────────────

Respond ONLY with valid JSON. No markdown. No preamble.

Return an array of 1–3 objects:

{
  "label": "Planet | Self | Practitioner",
  "name": "string",
  "type": "organisation | project | practitioner | programme | resource",
  "track": "planet | self",
  "domain_id": "string",
  "subdomain_id": "string or null",
  "scale": "local | municipal | regional | national | international | global",
  "scale_notes": "string or null",
  "location_name": "string or null",
  "website": "string or null",
  "description": "string — 2–3 sentences specific to THIS entry's role",
  "impact_summary": "string or null",
  "hal_signals": ["array"],
  "sfp_patterns": ["array"],
  "alignment_score": integer 0–9,
  "placement_tier": "pattern_instance | contested | qualified | exemplar",
  "score_reasoning": "string — 2–3 sentences on THIS entry's score",
  "confidence": integer 0–100,
  "confidence_note": "string"
}`

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 8000)
}

function safeJson(text) {
  const attempts = [
    () => JSON.parse(text),
    () => JSON.parse(text.replace(/```json|```/g, '').trim()),
    () => { const m = text.match(/\[[\s\S]*\]/); return m ? JSON.parse(m[0]) : null },
    () => { const m = text.match(/\{[\s\S]*\}/); const r = m ? JSON.parse(m[0]) : null; return r ? [r] : null },
  ]
  for (const attempt of attempts) {
    try { const r = attempt(); if (r) return r } catch {}
  }
  return null
}

function enforceTier(record) {
  const s = record.alignment_score ?? 0
  if (s <= 4)      record.placement_tier = 'pattern_instance'
  else if (s <= 6) record.placement_tier = 'contested'
  else if (s <= 8) record.placement_tier = 'qualified'
  else             record.placement_tier = 'exemplar'
  return record
}

function isNextUsUrl(input) {
  return /nextus\.world/i.test(input)
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { input } = req.body || {}
  if (!input?.trim()) return res.status(400).json({ error: 'input is required' })

  const mode = detectMode(input)
  let content = input.trim()

  // Inject known entity context for nextus.world
  const knownContext = isNextUsUrl(content) ? KNOWN_ENTITIES : ''

  if (mode === 'html') {
    content = `[HTML source provided]\n\n${stripHtml(input)}\n\n${knownContext}`
  } else if (mode === 'url') {
    content = `[URL provided: ${input.trim()}]\n\nRead this URL. Identify ALL distinct NextUs actor records — look specifically for: (1) a civilisational/Planet layer, (2) a personal development/Self layer, (3) a named individual practitioner or founder. Generate a separate record for each. Do not collapse them.\n\n${knownContext}`
  } else {
    content = `[Description provided]\n\n${input.trim()}\n\nIdentify ALL distinct NextUs actor records. Look specifically for: (1) a civilisational/Planet layer, (2) a personal development/Self layer, (3) a named individual practitioner or founder.\n\n${knownContext}`
  }

  const tools = mode === 'url' ? [{ type: 'web_search_20250305', name: 'web_search' }] : undefined

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      tools,
      messages: [{ role: 'user', content }],
    })

    const rawText = response.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('')

    let parsed = safeJson(rawText)

    if (!parsed) {
      return res.status(200).json({
        error: 'parse_failed',
        raw: rawText.slice(0, 500),
        message: 'Could not parse assessment. Try pasting a description instead of a URL.',
      })
    }

    if (!Array.isArray(parsed)) parsed = [parsed]
    const results = parsed.slice(0, 3).map(enforceTier)

    return res.status(200).json({ results, mode })

  } catch (err) {
    console.error('org-extract error:', err)
    return res.status(500).json({ error: 'extraction_failed', message: err.message })
  }
}
