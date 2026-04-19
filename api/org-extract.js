// api/org-extract.js
// ── NextUs Org & Practitioner Placement Extraction ────────────────────────
//
// POST /api/org-extract
//
// Accepts { input } where input is one of:
//   - A URL (starts with http)
//   - Raw HTML source (starts with <!doctype or <html)
//   - Plain text description
//
// Auto-detects input mode. No user selection required.
//
// Returns a structured placement assessment:
//   name, type, track, domain_id, subdomain_id, scale, scale_notes,
//   location_name, website, description, impact_summary,
//   hal_signals    — HAL conditions demonstrated (array of names)
//   sfp_patterns   — SFP patterns active (array of names)
//   alignment_score — 0–9 integer (draft, requires human review)
//   placement_tier  — pattern_instance | contested | qualified | exemplar
//   score_reasoning — plain language explanation of score
//   dual_placement  — boolean: should this appear on both tracks?
//   dual_note       — explanation if dual_placement is true
//   contact_email   — extracted if visible
//   confidence      — 0–100 integer
//   confidence_note — what was clear vs inferred
//
// Alignment score thresholds (locked):
//   0–4  → pattern_instance  (named on map as SFP example, not actor entry)
//   5–6  → contested         (visible if filtered, not in default directory)
//   7–8  → qualified         (full placement, default map)
//   9    → exemplar          (NextUs Seal candidacy)
//   10   → conferred by field (never assigned by platform)
// ──────────────────────────────────────────────────────────────────────────

const Anthropic = require('@anthropic-ai/sdk')
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ── Input mode detection ──────────────────────────────────────────────────

function detectMode(input) {
  const trimmed = input.trim()
  if (/^https?:\/\//i.test(trimmed)) return 'url'
  if (/^<!doctype|^<html/i.test(trimmed)) return 'html'
  return 'text'
}

// ── System prompt ─────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are the NextUs placement assessment engine.

NextUs is a platform with two tracks:
- NextUs Planet: civilisational coordination. Seven domains — Human Being, Society, Nature, Technology, Finance & Economy, Legacy, Vision. Organisations, projects, and movements working toward Horizon Goals at civilisational scale.
- NextUs Self: personal development. Practitioners, coaches, facilitators, therapists, retreat operators, and programmes helping individuals across seven personal domains — Path, Spark, Body, Finances, Connection, Inner Game, Signal.

Your job is to read an organisation or practitioner's source material and produce a structured placement assessment.

──────────────────────────────────────────────────────────────────────────────
THE ALIGNMENT SCORE (0–9)
──────────────────────────────────────────────────────────────────────────────

The score reflects how genuinely the actor is moving toward Horizon Goals — or how much harm they are doing. The score is not about credentials, size, or visibility. It is about honest structural assessment.

Score anchors:
0 — Actively, knowingly causing harm at scale. Architecture designed to extract value while externalising maximum cost.
1 — Systematic harm as the primary operating model. Harm is structural to how value is generated.
2 — Significant net negative trajectory. Operating inside multiple critical structural failure patterns with no meaningful movement toward any Horizon Goal.
3–4 — Active harm in specific dimensions alongside neutral or positive work elsewhere. The harm is real and named.
5 — The Line. Below = more harm than good. SFP patterns and HAL conditions roughly balance.
6 — Net positive but contested. Direction toward but structural failure patterns meaningfully active.
7 — Floor for full placement. Clear alignment. HAL conditions demonstrably operative. Active SFPs are structural rather than predatory.
8 — Strong alignment. Demonstrable movement toward Horizon Goal. Structural honesty about gaps.
9 — Exemplar. Field-setting. Others in this domain point to this actor as the standard.
(10 is conferred by the field over time — never assigned by the platform)

Placement tiers:
- 0–4: pattern_instance — named on map as Structural Failure Pattern example. Not an actor entry.
- 5–6: contested — visible if filtered, not in default actor directory.
- 7–8: qualified — full actor placement. Appears on the default map.
- 9: exemplar — elevated placement. NextUs Seal candidacy.

──────────────────────────────────────────────────────────────────────────────
HAL CONDITIONS (Horizon Alignment Library)
──────────────────────────────────────────────────────────────────────────────

These are structural conditions that, when present, indicate genuine alignment.
Look for evidence of these in the source material:

Accurate Signal Read, Active Maintenance, Adaptable Identity, Adaptive Capacity, Adversarial Integration, Adversity Integration, Aesthetic Cultivation, Anti-Fragile Positioning, Asymmetric Opportunity Recognition, Authored Narrative, Awe Access, Belief Calibration, Coherence Across Domains, Committed Exploration, Compound Orientation, Conflict Source Diagnosis, Costly Signal Discipline, Creative Third Alternative, Declarative Commitment, Default Future Visibility, Deliberate Simplicity, Dymaxion Leverage, Ecological Navigation, Economic Signal Literacy, Efficiency Toward Sufficiency, Elevated Perspective, Embodied Intelligence, Emotional Granularity, Environmental Competence, Equanimity Leadership, Eustress Cycling, Evidence-Based Self-Assessment, Fresh Listening, Genuine Contact, Genuine Play, Governing Clarity, Growth Edge Operation, Horizon Orientation, Independent Verification, Influence Focus, Inhabited Integrity, Integrated Competence, Interest Visibility, Intrinsic Engagement Loop, Legible Destination, Liminal Pause, Load Intelligence, Meaning Anchoring, Mentalisation Capacity, Minimum Viable Stability, Mission Coherence, Mutual Need, Nervous System Alignment, Open Signal Architecture, Optionality Preservation, Order of Operations, Past Completion, Perceived Agency, Peripheral Vision, Potential Calibration, Pre-Articulate Vision, Productive Friction, Proportional Commitment, Recursive Learning, Relational Architecture, Resonant Engagement, Shared Horizon, Situated Perspective, Sleep Architecture Integrity, Solution Space Entry, Strategic Self-Disruption, Structural Honesty, Structural Integrity, System Signal Reading, Systemic Attribution, Tension Awareness, Threshold Identification, Threshold Passage Willingness, Transpersonal Commitment, Unconditional Ground, Unified Financial Lens, Value Restoration Practice, Value–Spend Alignment, Vision Embodiment

──────────────────────────────────────────────────────────────────────────────
STRUCTURAL FAILURE PATTERNS
──────────────────────────────────────────────────────────────────────────────

These are mechanisms by which systems fail to move toward their stated goals.
Look for evidence of these in the source material:

Metric Substitution, Novelty Normalisation, Optimism Displacement, Survivorship Distortion, Epistemic Retreat, Abstraction Capture, Premature Closure, Narrative Inertia, Information Cascades, Social Proof Cascade, Legibility Inversion, Scale Illusion, Governance Capture, Complexity Capture, Sunk Cost Lock-In, Incentive–Outcome Divergence, Lifecycle Externalisation, Partial Solution Entrenchment, Solution Replication Lock, Isomorphic Mimicry, Harm Laundering, Accountability Diffusion, Feedback Loop Severing, Competitive Debasement, Threshold Forestalling, Short-Termism Ratchet, Value Erosion by Attrition, Defensive Equilibrium, Adversarial Co-evolution, Consensus Gravity, Coordination Void, Proxy War Displacement, Expert Capture, Trust Erosion Spiral, Knowledge Silo Formation, Narrative Monopoly, Representation Mismatch, Legitimacy Without Efficacy, Capability–Deployment Lag, Mission Drift by Funding Gravity, The Prevention Paradox, Activity–Trajectory Mismatch, Access Stratification, Horizon Collapse, Motivation Consumption, Speed–Depth Trade-off Collapse, Invisible Infrastructure Decay, Monoculture Fragility, Extraction–Regeneration Imbalance, Crisis Dependency, Positive Feedback Overshoot, Identity Rigidity, Boundary Rigidity, Specialisation Blindness, Drift Anhedonia, Missionary Postponement, Legacy Capture, Path Plurality, Borrowed Aliveness, Scarcity Inheritance, Virtue Exemption, Performance Connection, Avoidance Architecture, Passion Perfectionism, Functional Bypass, Proximity Substitution, Echo Architecture, Relational Martyrdom, Capability–Worth Conflation

──────────────────────────────────────────────────────────────────────────────
TRACK DETECTION
──────────────────────────────────────────────────────────────────────────────

Planet track: organisations, projects, movements working at civilisational scale on Human Being, Society, Nature, Technology, Finance & Economy, Legacy, or Vision.

Self track: individual practitioners, coaches, therapists, facilitators, retreat operators, programmes, methodologies serving personal development across Path, Spark, Body, Finances, Connection, Inner Game, or Signal.

Dual placement: an actor may belong on both tracks. A men's retreat operator is Self track AND contributes to Human Being on Planet. Flag dual_placement: true and explain in dual_note.

Scale for Planet track: local | municipal | regional | national | international | global
Scale for Self track: local | regional | global (reach of their work, not physical presence)

Primary scale = coherence bandwidth of the work, not distribution reach. A podcast reaching millions is still local if the core work is one-to-one. Note reach in scale_notes.

──────────────────────────────────────────────────────────────────────────────
DOMAINS
──────────────────────────────────────────────────────────────────────────────

Planet domains (domain_id values):
human-being, society, nature, technology, finance-economy, legacy, vision

Self domains (domain_id values for Self track):
path, spark, body, finances, connection, inner-game, signal

──────────────────────────────────────────────────────────────────────────────
OUTPUT FORMAT
──────────────────────────────────────────────────────────────────────────────

Respond ONLY with valid JSON. No markdown. No preamble.

{
  "name": "string",
  "type": "organisation | project | practitioner | programme | resource",
  "track": "planet | self | both",
  "domain_id": "string (primary domain)",
  "subdomain_id": "string or null",
  "scale": "string",
  "scale_notes": "string or null — reach/delivery distinctions",
  "location_name": "string or null",
  "website": "string or null",
  "description": "string — 2-3 sentences, their work in their own language mapped to the NextUs frame",
  "impact_summary": "string or null — specific evidence of impact if present",
  "hal_signals": ["array of HAL condition names demonstrated"],
  "sfp_patterns": ["array of SFP pattern names active"],
  "alignment_score": integer 0-9,
  "placement_tier": "pattern_instance | contested | qualified | exemplar",
  "score_reasoning": "string — plain language, 2-3 sentences explaining the score. Names specific HAL conditions and SFP patterns that drove the assessment.",
  "dual_placement": boolean,
  "dual_note": "string or null",
  "contact_email": "string or null",
  "confidence": integer 0-100,
  "confidence_note": "string — what was clear vs what was inferred"
}`

// ── HTML stripping ────────────────────────────────────────────────────────

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 8000)
}

// ── JSON parsing with recovery ────────────────────────────────────────────

function safeJson(text) {
  const attempts = [
    () => JSON.parse(text),
    () => JSON.parse(text.replace(/```json|```/g, '').trim()),
    () => { const m = text.match(/\{[\s\S]*\}/); return m ? JSON.parse(m[0]) : null },
    () => JSON.parse(text.replace(/,(\s*[}\]])/g, '$1').replace(/([{,]\s*)(\w+):/g, '$1"$2":')),
  ]
  for (const attempt of attempts) {
    try { const r = attempt(); if (r) return r } catch {}
  }
  return null
}

// ── Main handler ──────────────────────────────────────────────────────────

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

  // For URLs: use web_search tool to fetch content
  // For HTML: strip tags, extract text
  // For text: use as-is
  if (mode === 'html') {
    content = `[HTML source provided]\n\n${stripHtml(input)}`
  } else if (mode === 'url') {
    content = `[URL provided: ${input.trim()}]\n\nPlease read this URL and extract information about the organisation or practitioner.`
  } else {
    content = `[Description provided]\n\n${input.trim()}`
  }

  const tools = mode === 'url' ? [{ type: 'web_search_20250305', name: 'web_search' }] : undefined

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      tools,
      messages: [{ role: 'user', content }],
    })

    // Collect all text blocks from response
    const rawText = response.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('')

    const parsed = safeJson(rawText)

    if (!parsed) {
      return res.status(200).json({
        error: 'parse_failed',
        raw: rawText.slice(0, 500),
        message: 'Could not parse assessment. Try a different input or paste more detail.'
      })
    }

    // Enforce placement tier consistency with score
    const score = parsed.alignment_score ?? 0
    let tier = parsed.placement_tier
    if (score <= 4)      tier = 'pattern_instance'
    else if (score <= 6) tier = 'contested'
    else if (score <= 8) tier = 'qualified'
    else                 tier = 'exemplar'
    parsed.placement_tier = tier

    return res.status(200).json({ result: parsed, mode })

  } catch (err) {
    console.error('org-extract error:', err)
    return res.status(500).json({ error: 'extraction_failed', message: err.message })
  }
}
