// api/org-extract.js
// ── NextUs Multi-Record Placement Extraction ──────────────────────────────
//
// POST /api/org-extract
//
// Accepts { input } — URL, raw HTML, or plain text description.
//
// Returns { results: [...], mode } where results is an array of 1–3
// placement proposals. Each proposal is a complete actor record.
//
// The engine detects up to three distinct entities from a single source:
//   1. Planet track entry (civilisational platform/org/project)
//   2. Self track entry (personal development platform/programme)
//   3. Practitioner entry (named individual founder/coach/facilitator)
//
// Each is scored independently against its own track criteria.
// ──────────────────────────────────────────────────────────────────────────

const Anthropic = require('@anthropic-ai/sdk')
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function detectMode(input) {
  const t = input.trim()
  if (/^https?:\/\//i.test(t)) return 'url'
  if (/^<!doctype|^<html/i.test(t)) return 'html'
  return 'text'
}

const SYSTEM_PROMPT = `You are the NextUs multi-record placement assessment engine.

NextUs has two tracks:
- NextUs Planet: civilisational coordination. Seven domains — Human Being, Society, Nature, Technology, Finance & Economy, Legacy, Vision. Organisations, projects, and movements working toward Horizon Goals at civilisational scale.
- NextUs Self: personal development. Practitioners, coaches, facilitators, therapists, retreat operators, and programmes helping individuals across seven personal domains — Path, Spark, Body, Finances, Connection, Inner Game, Signal.

Your job is to read source material about an organisation, platform, or individual and identify ALL distinct actor entries that should appear on the NextUs map — up to three separate records:

1. PLANET entry — if the organisation/project operates at civilisational scale toward a Horizon Goal
2. SELF entry — if there is a personal development platform, programme, or tool suite serving individual growth
3. PRACTITIONER entry — if there is a named founder, coach, facilitator, or practitioner whose individual work is distinct from the platform

Each is a separate actor with its own independent alignment assessment. Do not average scores across entries. Do not conflate the platform with the practitioner. Assess each on what IT does in ITS frame.

Only generate entries that genuinely exist in the source material. If there is no named practitioner, do not generate a practitioner entry. If the work is purely individual coaching with no platform layer, only generate a practitioner entry.

──────────────────────────────────────────────────────────────────────────────
THE ALIGNMENT SCORE (0–9)
──────────────────────────────────────────────────────────────────────────────

Score anchors:
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

Respond ONLY with valid JSON. No markdown. No preamble. No explanation outside the JSON.

Return an array of 1–3 objects. Each object:

{
  "label": "Planet | Self | Practitioner",
  "name": "string — actor name for this specific entry",
  "type": "organisation | project | practitioner | programme | resource",
  "track": "planet | self",
  "domain_id": "string (primary domain for this entry's track)",
  "subdomain_id": "string or null",
  "scale": "local | municipal | regional | national | international | global",
  "scale_notes": "string or null",
  "location_name": "string or null",
  "website": "string or null",
  "description": "string — 2–3 sentences specific to THIS entry's role",
  "impact_summary": "string or null",
  "hal_signals": ["array of HAL condition names relevant to THIS entry"],
  "sfp_patterns": ["array of SFP patterns relevant to THIS entry"],
  "alignment_score": integer 0–9,
  "placement_tier": "pattern_instance | contested | qualified | exemplar",
  "score_reasoning": "string — 2–3 sentences explaining THIS entry's score specifically",
  "confidence": integer 0–100,
  "confidence_note": "string"
}

Example output for a platform with a named founder:
[
  { "label": "Planet", "name": "Acme Foundation", "track": "planet", "domain_id": "society", ... },
  { "label": "Self", "name": "Acme Self", "track": "self", "domain_id": "path", ... },
  { "label": "Practitioner", "name": "Jane Smith", "type": "practitioner", "track": "self", "domain_id": "inner-game", ... }
]`

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

  if (mode === 'html') {
    content = `[HTML source provided]\n\n${stripHtml(input)}`
  } else if (mode === 'url') {
    content = `[URL provided: ${input.trim()}]\n\nRead this URL and identify all distinct NextUs actor entries — Planet platform, Self platform, and named practitioner if present.`
  } else {
    content = `[Description provided]\n\n${input.trim()}`
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

    // Ensure array, cap at 3, enforce tiers
    if (!Array.isArray(parsed)) parsed = [parsed]
    const results = parsed.slice(0, 3).map(enforceTier)

    return res.status(200).json({ results, mode })

  } catch (err) {
    console.error('org-extract error:', err)
    return res.status(500).json({ error: 'extraction_failed', message: err.message })
  }
}
