// ─── DEBRIEF CHAT API ─────────────────────────────────────────────────────────
// North Star guides a post-tool debrief conversation.
// Shared across Target Sprint, The Map, Purpose Piece (full debrief),
// and Horizon Practice (light debrief).
//
// Horizon State uses this API too, but only after a period review fires
// (weekly / monthly / quarterly / annually). The review text is passed as
// toolContext.reviewText so North Star can reference it.
//
// Full debrief — six questions, one at a time:
//   1. What went right?
//   2. What didn't go to plan?
//   3. Where were you in alignment?
//   4. Where were you out of alignment?
//   5. What can you learn from this?
//   6. What can you do better next time?
//
// Light debrief (Horizon Practice, Horizon State) — three questions:
//   1. What went right?
//   2. What can I learn from this?
//   3. One thing to do better next time?
//
// On completion North Star writes a synthesised note to north_star_notes
// so the insight travels forward into every other tool.

const Anthropic = require('@anthropic-ai/sdk')
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const { getNorthStarContext, formatNorthStarContext, writeNorthStarNote } = require('./_north-star')

const NORTH_STAR_IDENTITY = `You are North Star — the AI companion present throughout the Horizon Suite ecosystem. You are consistent across every tool: The Map, Horizon State, North Star, Purpose Piece, Target Sprint, and Horizon Practice. When context about this person exists from other tools, you reference it naturally. You never introduce yourself as "an AI assistant" or "Claude." You are North Star.`

const FULL_QUESTIONS = [
  'What went right?',
  'What didn\'t go to plan?',
  'Where were you in alignment?',
  'Where were you out of alignment?',
  'What can you learn from this?',
  'What can you do better next time?',
]

const LIGHT_QUESTIONS = [
  'What went right?',
  'What can you learn from this?',
  'One thing to do better next time?',
]

// ─── Tool context formatters ──────────────────────────────────────────────────

function formatToolContext(tool, ctx) {
  if (!ctx) return ''
  const lines = []

  if (tool === 'target-sprint') {
    lines.push('COMPLETED SPRINT CONTEXT:')
    if (ctx.endDateLabel) lines.push(`Sprint period: ${ctx.endDateLabel}`)
    if (ctx.domains?.length) {
      ctx.domains.forEach(d => {
        lines.push(`\n${d.label.toUpperCase()}`)
        if (d.targetGoal)  lines.push(`  Goal: ${d.targetGoal}`)
        if (d.horizonText) lines.push(`  Horizon: ${d.horizonText}`)
        const milestonesDone = Object.values(d.milestoneChecked || {}).filter(Boolean).length
        const tasksDone      = Object.values(d.taskChecked || {}).filter(Boolean).length
        const milestonesTotal = (d.milestones || []).length
        const tasksTotal      = (d.tasks || []).length
        lines.push(`  Milestones completed: ${milestonesDone}/${milestonesTotal}`)
        lines.push(`  Tasks completed: ${tasksDone}/${tasksTotal}`)
        if (d.goalChecked) lines.push(`  Goal achieved: YES`)
      })
    }
  }

  if (tool === 'map') {
    lines.push('COMPLETED MAP CONTEXT:')
    if (ctx.overallScore !== undefined) lines.push(`Overall score: ${ctx.overallScore}/10`)
    if (ctx.domains) {
      Object.entries(ctx.domains).forEach(([id, d]) => {
        if (!d) return
        const label = { path: 'Path', spark: 'Spark', body: 'Body', finances: 'Finances', connection: 'Connection', inner_game: 'Inner Game', signal: 'Signal' }[id] || id
        const score = d.currentScore ?? d.score
        if (score !== undefined) lines.push(`  ${label}: ${score}/10 → ${d.horizonScore ?? '?'}`)
        if (d.horizonGoal) lines.push(`    Goal: ${d.horizonGoal}`)
      })
    }
    if (ctx.synthesis) {
      lines.push(`\nNorth Star synthesis:\n${ctx.synthesis}`)
    }
  }

  if (tool === 'purpose-piece') {
    lines.push('COMPLETED PURPOSE PIECE CONTEXT:')
    if (ctx.archetype)  lines.push(`Archetype: ${ctx.archetype}`)
    if (ctx.domain)     lines.push(`Domain: ${ctx.domain}`)
    if (ctx.scale)      lines.push(`Scale: ${ctx.scale}`)
    if (ctx.purposeStatement) lines.push(`Purpose statement: ${ctx.purposeStatement}`)
  }

  if (tool === 'horizon-practice') {
    lines.push('SESSION CONTEXT:')
    if (ctx.date)        lines.push(`Date: ${ctx.date}`)
    if (ctx.horizonSelf) lines.push(`Horizon self: ${ctx.horizonSelf}`)
    if (ctx.thoughts)    lines.push(`Today's thoughts: ${ctx.thoughts}`)
    if (ctx.emotions)    lines.push(`Emotions: ${ctx.emotions}`)
    if (ctx.actions)     lines.push(`Actions: ${ctx.actions}`)
    if (ctx.reflection)  lines.push(`Reflection: ${ctx.reflection}`)
  }

  if (tool === 'horizon-state') {
    lines.push('PERIOD REVIEW CONTEXT:')
    if (ctx.periodType)  lines.push(`Period: ${ctx.periodLabel || ctx.periodType}`)
    if (ctx.reviewText)  lines.push(`North Star reflection:\n${ctx.reviewText}`)
    if (ctx.avgDelta !== undefined) lines.push(`Average flame shift: ${ctx.avgDelta > 0 ? '+' : ''}${ctx.avgDelta}`)
    if (ctx.sessionCount !== undefined) lines.push(`Sessions in period: ${ctx.sessionCount}`)
  }

  return lines.join('\n')
}

// ─── System prompt ────────────────────────────────────────────────────────────

function buildSystem(tool, toolContext, mode, northStarCtx) {
  const isLight     = mode === 'light'
  const questions   = isLight ? LIGHT_QUESTIONS : FULL_QUESTIONS
  const questionCount = questions.length
  const toolCtxStr  = formatToolContext(tool, toolContext)
  const northStarStr = northStarCtx ? `\n${formatNorthStarContext(northStarCtx)}\n` : ''

  const TOOL_LABELS = {
    'target-sprint':   'Target Sprint',
    'map':             'The Map',
    'purpose-piece':   'Purpose Piece',
    'horizon-practice':'Horizon Practice',
    'horizon-state':   'Horizon State',
  }
  const toolLabel = TOOL_LABELS[tool] || tool

  return `${NORTH_STAR_IDENTITY}
${northStarStr}
You are conducting a debrief conversation with this person after they completed ${toolLabel}.

${toolCtxStr ? toolCtxStr + '\n' : ''}
YOUR ROLE IN THIS CONVERSATION:
Guide a ${isLight ? 'brief' : 'full'} debrief — ${questionCount} questions, one at a time. You are not filling in a form. You are having a real conversation. Each question is a door, not a checkbox.

THE ${questionCount} QUESTIONS (ask in this order, one per exchange):
${questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

HOW TO WORK:
- Open with a single warm, grounded sentence that names what they just completed. Then ask question 1.
- After each response, acknowledge what they said in one sentence — briefly, specifically, without inflating it. Then ask the next question.
- Do not ask follow-up questions. Move through the sequence.
- When all ${questionCount} questions are answered, write a closing synthesis: 2–3 sentences that distil the whole debrief into something they can carry forward. Then return a JSON block in this exact format on its own line:
  {"complete": true, "note": "<single sentence summary of the key insight from this debrief>"}
- The note must be one clear sentence — this is what North Star carries into every future tool conversation.

VOICE:
Direct. Present. No management-speak. No cheerleading. The kind of honest companion who reflects clearly and moves on. Under 120 words per response except the closing synthesis.

What you never do:
- Generic affirmations
- Repeating the question back to them
- Asking two things at once
- More than one question per exchange`
}

// ─── Main handler ─────────────────────────────────────────────────────────────

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { tool, toolContext, messages, userId, mode = 'full' } = req.body

  if (!tool || !messages) return res.status(400).json({ error: 'Missing required fields' })

  const northStarCtx = userId ? await getNorthStarContext(userId) : null
  const system = buildSystem(tool, toolContext || {}, mode, northStarCtx)

  const isStart = messages.length === 1 && messages[0]?.content === 'START'
  const apiMessages = isStart
    ? [{ role: 'user', content: 'I\'ve just finished. Ready to debrief.' }]
    : messages

  try {
    const response = await anthropic.messages.create({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 500,
      system,
      messages:   apiMessages,
    })

    const text = response.content[0]?.text || ''

    // Detect completion — look for the JSON signal
    let complete = false
    let note     = null
    const jsonMatch = text.match(/\{"complete"\s*:\s*true[^}]*"note"\s*:\s*"([^"]+)"[^}]*\}/)
    if (jsonMatch) {
      complete = true
      note     = jsonMatch[1]
      // Write to North Star
      if (userId && note) {
        await writeNorthStarNote(userId, tool, `Debrief insight: ${note}`)
      }
    }

    // Strip the JSON line from the message sent to the client
    const cleanText = text.replace(/\n?\{"complete"\s*:\s*true[^}]*\}\n?/, '').trim()

    return res.status(200).json({ message: cleanText, complete, note })
  } catch (err) {
    console.error('Debrief chat error:', err)
    return res.status(500).json({ error: 'Debrief unavailable. Please try again.' })
  }
}
