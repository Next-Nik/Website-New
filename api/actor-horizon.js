// api/actor-horizon.js
// ─────────────────────────────────────────────────────────────────────────────
// The civilisational fractal of the self stack — actor (org) side.
//
// Walks an actor's owner through the same loop a person runs on the self side,
// one scale up:
//
//   apex Horizon Goal (shown)           ── the shared domain north star
//        → best-in-world rendering       ── render: a constructed picture of excellence
//        → org Horizon Goal              ── draft_goal: toward-framed, the actor's wish
//        → current / desired placement   ── save: the civ Map reading (WALLED)
//        → Target Stretch                ── start_stretch: a 3-month bite of the gap
//
// Governance (see migration 129 header): operational read is baseline; the two
// learnable gates (rendering, goal) are owner-consented and off by default; the
// placement scores are walled (private, never aggregated); nothing here is ever
// public in v1. Operational reading is NEVER silently upgraded to learning.
//
// Actions (req.body.action):
//   get           — owner reads their actor's private civ horizon profile rows
//   render        — AI renders the best-in-world picture for a domain (owner)
//   draft_goal    — AI offers 3 toward-framed org Horizon Goal drafts (owner)
//   save          — upsert the civ horizon profile row (owner)
//   plan_stretch  — AI plans the 90-day org Target Stretch from the gap (owner)
//   start_stretch — persist the org Target Stretch (full five-rung shape) (owner)
//   get_stretch   — read the actor's org Target Stretch(es) (owner)
// ─────────────────────────────────────────────────────────────────────────────

export const config = { maxDuration: 30 }

const { createClient } = require('@supabase/supabase-js')
const { computeClock } = require('./_stretch-clock')
const Anthropic        = require('@anthropic-ai/sdk')

const supabase  = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const MODEL = 'claude-sonnet-4-6'

// The seven civilisational Horizon Goals (kept in sync with horizon_goal_objects
// and api/horizon-align.js).
const HORIZON_GOALS = {
  'human-being':     'Every human held in dignity, met with care, supported in becoming most fully themselves.',
  'society':         'A structure that gives everyone space to function and the possibility to thrive.',
  'nature':          'The living planet is thriving, and humanity lives as a regenerative participant in it — not separate from, not above, but of.',
  'technology':      'Technology in service of life — human and planetary — designed to restore as it operates, accessible to those it affects, and honest about what it costs.',
  'finance-economy': 'An economy in which everyone has enough to act on what matters, contribution is freely chosen rather than coerced, and the living systems that make all exchange possible are counted, sustained, and restored.',
  'legacy':          'A civilisation that knows what it carries, tends what it transmits, repairs what it broke, and plants with love for people it will never meet.',
  'vision':          'Creating forward — as far as we can see — in service of the brightest future for all.',
}

const DOMAIN_LABELS = {
  'human-being':     'Human Being',
  'society':         'Society',
  'nature':          'Nature',
  'technology':      'Technology',
  'finance-economy': 'Finance & Economy',
  'legacy':          'Legacy',
  'vision':          'Vision',
}

// Ownership: nextus_actors has only profile_owner (no owner_id column on this
// table — owner_id is an actor_calls column, not an actor column).
async function ownsActor(actorId, userId) {
  if (!actorId || !userId) return false
  const { data } = await supabase.from('nextus_actors')
    .select('profile_owner').eq('id', actorId).maybeSingle()
  return data?.profile_owner === userId
}

// Resolve which goal object id anchors a domain (the apex this rung ladders to).
async function apexGoalIdForDomain(domain) {
  const { data } = await supabase.from('horizon_goal_objects')
    .select('id').eq('domain', domain).maybeSingle()
  return data?.id || null
}

// Pull whatever context we have about the actor to ground the AI.
async function actorContext(actorId) {
  const { data } = await supabase.from('nextus_actors')
    .select('name, description, mission_statement, type, primary_horizon_goal_id')
    .eq('id', actorId).maybeSingle()
  return data || {}
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { action, userId, ...body } = req.body || {}

  // Everything here is owner-gated. There is no public action on this surface —
  // the civ horizon profile is the developmental rail, private by definition.
  if (!userId) return res.status(401).json({ error: 'Auth required' })

  const { actor_id } = body
  if (!actor_id) return res.status(400).json({ error: 'actor_id required' })
  if (!(await ownsActor(actor_id, userId))) {
    return res.status(403).json({ error: 'Not your actor' })
  }

  // ── get ─────────────────────────────────────────────────────────────────────
  // The owner reads their actor's private civ Map / Horizon Goal rows.
  if (action === 'get') {
    const { data, error } = await supabase.from('actor_horizon_profile')
      .select('*').eq('actor_id', actor_id).order('updated_at', { ascending: false })
    if (error) return res.status(500).json({ error: error.message })
    return res.json({ rows: data || [] })
  }

  // ── render ───────────────────────────────────────────────────────────────────
  // Render the best-in-world picture for a domain. A constructed, abstract
  // description of excellence — NEVER a comparison to, or naming of, real actors.
  if (action === 'render') {
    const { domain } = body
    const apex = HORIZON_GOALS[domain]
    if (!apex) return res.status(400).json({ error: `Unknown domain: ${domain}` })
    const ctx   = await actorContext(actor_id)
    const label = DOMAIN_LABELS[domain] || domain

    const prompt = `You are the NextUs civilisational-orientation assistant. You help an organisation picture what EXCELLENCE looks like in a domain, so they have a concrete reference to measure themselves against.

DOMAIN: ${label}
APEX HORIZON GOAL (the shared north star — too abstract to stand next to directly): "${apex}"

THE ORGANISATION: ${ctx.name || 'this organisation'}${ctx.type ? ` (${ctx.type})` : ''}
WHAT THEY DO: "${[ctx.mission_statement, ctx.description].filter(Boolean).join(' — ') || 'not yet described'}"

TASK: Describe what a best-in-world organisation moving toward this Horizon Goal would look like, in this domain. Render the apex goal into something concrete and observable — practices, posture, the marks of excellence — so the organisation can place itself against it.

HARD RULES:
- This is a CONSTRUCTED, ABSTRACT picture of "best." NEVER name, reference, or compare to any real organisation. No "like [org]", no examples of real actors. The picture is a description of excellence, not a ranking of who is best.
- Toward-framed. Describe the destination, not the problems being fought.
- Grounded and observable, not aspirational vapour. What would you actually SEE in such an organisation?
- 110–160 words. One tight paragraph. No preamble, no headings, no lists.

Write the paragraph now.`

    try {
      const r = await anthropic.messages.create({
        model: MODEL, max_tokens: 400, messages: [{ role: 'user', content: prompt }],
      })
      const rendering = (r.content?.[0]?.text || '').trim()
      return res.json({ rendering })
    } catch (e) {
      return res.status(500).json({ error: 'Render failed', detail: String(e?.message || e) })
    }
  }

  // ── draft_goal ────────────────────────────────────────────────────────────────
  // Offer three toward-framed org Horizon Goal drafts. The owner edits and picks.
  // The org's ACTUAL wish in this domain — not the generic ideal, not the apex
  // restated. Present tense, first person plural (the organisation speaking).
  if (action === 'draft_goal') {
    const { domain, best_in_world, note } = body
    const apex = HORIZON_GOALS[domain]
    if (!apex) return res.status(400).json({ error: `Unknown domain: ${domain}` })
    const ctx   = await actorContext(actor_id)
    const label = DOMAIN_LABELS[domain] || domain

    const prompt = `You are the NextUs horizon-alignment assistant. You help an organisation articulate THEIR Horizon Goal in a domain — where THEY want to be. Not the problem they fight, not the generic ideal, not the apex restated: their actual wish.

DOMAIN: ${label}
APEX HORIZON GOAL (the shared north star): "${apex}"
BEST-IN-WORLD PICTURE (their working reference): "${best_in_world || '(not yet rendered)'}"

THE ORGANISATION: ${ctx.name || 'this organisation'}${ctx.type ? ` (${ctx.type})` : ''}
WHAT THEY DO: "${[ctx.mission_statement, ctx.description].filter(Boolean).join(' — ') || 'not yet described'}"
${note ? `THEY ADDED: "${note}"` : ''}

TASK: Offer THREE distinct draft Horizon Goals this organisation could claim as their standing destination in this domain.

RULES:
- Present tense, first person plural ("We..."). The organisation speaking as if already there.
- Toward-framed — a destination, never a complaint or a deficit.
- Specific to THIS organisation's work and scale, not a paraphrase of the apex. A small local org and a global body should not get interchangeable goals.
- Each 1–2 sentences. Concrete enough to measure against.
- NEVER name or compare to real organisations.

Return ONLY a JSON array of exactly three strings. No preamble, no markdown, no backticks. Example shape: ["...", "...", "..."]`

    try {
      const r = await anthropic.messages.create({
        model: MODEL, max_tokens: 500, messages: [{ role: 'user', content: prompt }],
      })
      const raw = (r.content?.[0]?.text || '').replace(/```json|```/g, '').trim()
      let drafts
      try { drafts = JSON.parse(raw) } catch { drafts = null }
      if (!Array.isArray(drafts)) {
        // Fallback: split on newlines if the model didn't return clean JSON.
        drafts = raw.split('\n').map(s => s.replace(/^[-*\d.\s"]+|"+$/g, '').trim()).filter(Boolean).slice(0, 3)
      }
      return res.json({ drafts: drafts.slice(0, 3) })
    } catch (e) {
      return res.status(500).json({ error: 'Draft failed', detail: String(e?.message || e) })
    }
  }

  // ── save ──────────────────────────────────────────────────────────────────────
  // Upsert the civ horizon profile row (one per actor per domain). Carries the
  // rendering, the org Horizon Goal, the walled placement scores, and the two
  // consent flags. Operational fields are stored regardless; the learnable gates
  // default to false and only the owner can open them.
  if (action === 'save') {
    const {
      domain, best_in_world, org_horizon_goal,
      current_score, desired_score,
      learnable_rendering = false, learnable_goal = false,
    } = body
    if (!HORIZON_GOALS[domain]) return res.status(400).json({ error: `Unknown domain: ${domain}` })

    const apex_goal_id = await apexGoalIdForDomain(domain)
    const clampScore = v => {
      if (v === null || v === undefined || v === '') return null
      const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.max(0, Math.min(10, n)) : null
    }

    const row = {
      actor_id, domain, apex_goal_id,
      best_in_world:    best_in_world?.trim() || null,
      org_horizon_goal: org_horizon_goal?.trim() || null,
      current_score:    clampScore(current_score),
      desired_score:    clampScore(desired_score),
      learnable_rendering: !!learnable_rendering,
      learnable_goal:      !!learnable_goal,
      authored_by:      userId,
      updated_at:       new Date().toISOString(),
    }

    const { data, error } = await supabase.from('actor_horizon_profile')
      .upsert(row, { onConflict: 'actor_id,domain' })
      .select('*').single()
    if (error) return res.status(500).json({ error: error.message })
    return res.json({ row: data })
  }

  // ── start_stretch ─────────────────────────────────────────────────────────────
  // Create a civ Target Stretch on behalf of the actor — a three-month bite out
  // of the gap between current and desired, toward the org Horizon Goal. Mirrors
  // the rich five-rung domain_data shape (the same structure a self Target
  // Stretch carries), org-framed and actor-keyed.

  // ── plan_stretch ──────────────────────────────────────────────────────────────
  // Generate the org Target Stretch plan: a 90-day targetGoal, three monthly
  // milestones, and tasks — the bounded bite out of the gap between current and
  // desired, toward the org Horizon Goal. Mirrors the OUTPUT CONTRACT of the
  // self-side target_goal mode (targetGoal, milestones[{text,why}],
  // tasks[{milestone,text}]) but is ORG-FRAMED: an organisation moving toward
  // its Horizon Goal, never a person doing identity ("Horizon Self") work.
  // The owner reviews and edits before start_stretch persists it.
  if (action === 'plan_stretch') {
    const { domain } = body
    if (!HORIZON_GOALS[domain]) return res.status(400).json({ error: `Unknown domain: ${domain}` })

    // Ground in the intake we already stored. Operational read — the platform
    // using the actor's own data to do the job they came for. Not learning.
    const { data: hp } = await supabase.from('actor_horizon_profile')
      .select('best_in_world, org_horizon_goal, current_score, desired_score')
      .eq('actor_id', actor_id).eq('domain', domain).maybeSingle()

    const ctx        = await actorContext(actor_id)
    const label      = DOMAIN_LABELS[domain] || domain
    const horizonText = hp?.org_horizon_goal || HORIZON_GOALS[domain]
    const clk         = computeClock(body.clock_type || 'rolling', body.duration_days || 90)

    const prompt = `You are the NextUs civilisational Target Stretch assistant. You help an ORGANISATION plan one focused 90-day push toward its Horizon Goal in a domain.

A Target Stretch is a bounded bite out of the gap between where the organisation is now and where it wants to be — NOT the whole journey, and NOT a vague improvement plan. Ninety days of focused effort, ending ${clk.endDateLabel}.

DOMAIN: ${label}
THE ORGANISATION: ${ctx.name || 'this organisation'}${ctx.type ? ` (${ctx.type})` : ''}
WHAT THEY DO: "${[ctx.mission_statement, ctx.description].filter(Boolean).join(' — ') || 'not described'}"
THEIR HORIZON GOAL (where they want to be): "${horizonText}"
${hp?.best_in_world ? `BEST-IN-WORLD REFERENCE: "${hp.best_in_world}"` : ''}
${hp?.current_score != null ? `WHERE THEY ARE NOW (0–10 against best-in-world): ${hp.current_score}` : ''}
${hp?.desired_score != null ? `WHERE THEY WANT TO BE in 90 days (0–10): ${hp.desired_score}` : ''}

RULES:
- ORG-FRAMED. What this organisation builds, ships, or establishes — never personal identity or "operating as your Horizon Self." An org is not a person.
- Toward-framed. The destination, not the problem fought.
- A real stretch, honestly sized to 90 days. Concrete enough to know whether it happened.
- NEVER name or compare to real organisations.
- Milestone dates fall between today and ${clk.targetDate}.

Return ONLY JSON, no preamble, no markdown, no backticks:
{
  "targetGoal": "the 90-day goal — specific, honest, a real stretch",
  "milestones": [
    { "text": "Month 1 — what must be true by [date]", "why": "why this month matters" },
    { "text": "Month 2 — what must be true by [date]", "why": "..." },
    { "text": "Month 3 — what must be true by [date]", "why": "..." }
  ],
  "tasks": [
    { "milestone": 0, "text": "concrete action for milestone 1" },
    { "milestone": 1, "text": "concrete action for milestone 2" },
    { "milestone": 2, "text": "concrete action for milestone 3" }
  ]
}`

    try {
      const r = await anthropic.messages.create({
        model: MODEL, max_tokens: 1200, messages: [{ role: 'user', content: prompt }],
      })
      const raw = (r.content?.[0]?.text || '').replace(/```json|```/g, '').trim()
      let plan
      try { plan = JSON.parse(raw) } catch { plan = null }
      if (!plan || typeof plan !== 'object') {
        return res.status(502).json({ error: 'Plan generation returned an unreadable response. Try again.' })
      }
      return res.json({
        plan: {
          targetGoal:  plan.targetGoal || '',
          milestones:  Array.isArray(plan.milestones) ? plan.milestones.slice(0, 3) : [],
          tasks:       Array.isArray(plan.tasks) ? plan.tasks : [],
          horizonText,
        },
        clock: clk,
      })
    } catch (e) {
      return res.status(500).json({ error: 'Plan failed', detail: String(e?.message || e) })
    }
  }

  // ── start_stretch ─────────────────────────────────────────────────────────────
  // Persist the org Target Stretch as a civ target_sprint_sessions row, actor_id
  // set, scale='civ', carrying the FULL five-rung domain_data (the fractal of the
  // self Stretch). The acting human is user_id (the owner); the org is actor_id.
  //
  // INTEGRATION NOTE: personal-side loaders of target_sprint_sessions filter
  // actor_id IS NULL, so this org row never surfaces in the owner's personal
  // Mission Control / Target Stretch / feed. It belongs to the org surface.
  if (action === 'start_stretch') {
    const {
      domain, targetGoal, horizonText,
      milestones = [], tasks = [],
      currentStateSummary = '',
      current_score = null, desired_score = null,
      clock_type = 'rolling', duration_days = 90,
    } = body
    if (!HORIZON_GOALS[domain]) return res.status(400).json({ error: `Unknown domain: ${domain}` })
    if (!targetGoal?.trim())    return res.status(400).json({ error: 'targetGoal required' })

    const clk = computeClock(clock_type, duration_days)
    const now = new Date().toISOString()

    // The full structured Stretch — same shape a self Stretch carries, plus an
    // explicit marker so the org surface (and any future consumer) knows this is
    // an org Target Stretch and not a personal Planet Sprint.
    const domainData = {
      __org_stretch__:    true,
      serves:             domain,
      horizonText:        horizonText?.trim() || HORIZON_GOALS[domain],
      currentStateSummary: currentStateSummary?.trim() || '',
      targetGoal:         targetGoal.trim(),
      milestones:         (milestones || []).map((m, i) => ({ text: m.text || String(m), why: m.why || '', order: i })),
      milestoneChecked:   {},
      tasks:              (tasks || []).map(t => ({ milestone: t.milestone ?? 0, text: t.text || String(t) })),
      taskChecked:        {},
      currentScore:       current_score,
      horizonScore:       10,
      targetScore:        desired_score,
    }

    const sessionPayload = {
      user_id: userId, actor_id, scale: 'civ', domains: [],
      status: 'active',
      quarter_type: clk.quarterType, target_date: clk.targetDate, end_date_label: clk.endDateLabel,
      domain_data: domainData,
      created_at: now, updated_at: now,
    }

    const { data: session, error } = await supabase.from('target_sprint_sessions')
      .insert(sessionPayload).select('id').single()
    if (error) return res.status(500).json({ error: error.message })
    return res.json({ session_id: session?.id || null })
  }

  // ── get_stretch ───────────────────────────────────────────────────────────────
  // Read the actor's active org Target Stretch(es). Owner-gated (the handler
  // already verified ownsActor above).
  if (action === 'get_stretch') {
    const { data, error } = await supabase.from('target_sprint_sessions')
      .select('id, domain_data, status, target_date, end_date_label, created_at, updated_at')
      .eq('actor_id', actor_id).eq('scale', 'civ')
      .in('status', ['active', 'started', 'complete'])
      .order('updated_at', { ascending: false })
    if (error) return res.status(500).json({ error: error.message })
    return res.json({ stretches: data || [] })
  }

  return res.status(400).json({ error: `Unknown action: ${action}` })
}
