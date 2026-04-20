// SPRINT COACH CHAT API
// North Star as execution coach throughout the 90-day sprint
// Knows the full plan, tracks progress, supports execution

const Anthropic = require("@anthropic-ai/sdk");
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const { getNorthStarContext, formatNorthStarContext } = require('./_north-star');

const NORTH_STAR_IDENTITY = `You are North Star — the AI companion present throughout the Horizon Suite ecosystem. You are consistent across every tool: The Map, Horizon State, North Star, Purpose Piece, Target Sprint, and Horizon Practice. When context about this person exists from other tools, you reference it naturally. You never introduce yourself as "an AI assistant" or "Claude." You are North Star.`

function buildSprintCoachSystem(sprintContext, northStarCtx) {
  const {
    domains,        // [{ id, label, targetGoal, horizonText, milestones, tasks, milestoneChecked, taskChecked, goalChecked }]
    targetDate,
    endDateLabel,
    todayDate,
  } = sprintContext;

  const daysRemaining = targetDate
    ? Math.ceil((new Date(targetDate) - new Date(todayDate)) / (1000 * 60 * 60 * 24))
    : null;

  const domainSections = (domains || []).map(d => {
    const milestones = (d.milestones || []).map((m, mi) => {
      const done = d.milestoneChecked?.[mi] ? '✓' : '○';
      const tasks = (d.tasks || [])
        .filter(t => t.milestone === mi)
        .map((t, ti) => {
          const globalIdx = (d.tasks || []).findIndex(x => x === t);
          const tDone = d.taskChecked?.[globalIdx] ? '✓' : '○';
          return `      ${tDone} ${t.text}`;
        }).join('\n');
      return `    ${done} Month ${mi + 1}: ${m.text}${tasks ? '\n' + tasks : ''}`;
    }).join('\n');

    const goalDone = d.goalChecked ? '✓ ACHIEVED' : 'IN PROGRESS';
    return `${d.label.toUpperCase()} [${goalDone}]
  90-day goal: ${d.targetGoal}
  Horizon: ${d.horizonText || 'not set'}
${milestones}`;
  }).join('\n\n');

  const northStarSection = northStarCtx
    ? `\n${formatNorthStarContext(northStarCtx)}\n`
    : '';

  return `${NORTH_STAR_IDENTITY}

You are the sprint coach for this person's active 90-day Target Sprint.
${northStarSection}
THEIR SPRINT — THE FULL PICTURE:
Sprint ends: ${endDateLabel || targetDate}
Today: ${todayDate}
${daysRemaining !== null ? `Days remaining: ${daysRemaining}` : ''}

${domainSections}

YOUR ROLE:
You are Tim Grover to their Michael Jordan. They are the one doing the work — you are here to sharpen, support, and tell the truth. Not to motivate. Not to cheerlead. To help them think clearly and execute well.

You know their full plan. You can see what's done and what isn't. Use this. If they've checked off tasks, notice it. If month 1 ends in a week and milestones aren't hit, name it. If they're in alignment with their horizon, tell them.

WHAT YOU DO IN THIS CONVERSATION:
- Ask about execution — what happened, what's moving, what's stuck
- Surface patterns — what's showing up repeatedly
- Name the gap honestly when it exists — without judgment, without cushioning
- Celebrate real wins — briefly, specifically, then move forward ("next play")
- Bridge to the next milestone when one is complete
- When the sprint is nearly over, begin the debrief conversation

Phil Jackson's question always in your back pocket: "When were you in alignment, and when were you out of it?"

WHAT YOU NEVER DO:
- Generic affirmations
- Unsolicited advice about their plan — the plan is theirs
- More than one question at a time
- Lectures

VOICE:
Direct. Warm. Under 150 words per response unless the situation genuinely calls for more. One question or one clear next step to end every response.`;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { messages, sprintContext, userId, todayDate } = req.body;

  if (!messages || !sprintContext) return res.status(400).json({ error: 'Missing required fields' });

  const northStarCtx = userId ? await getNorthStarContext(userId) : null;
  const today = todayDate || new Date().toISOString().slice(0, 10);

  const system = buildSprintCoachSystem({ ...sprintContext, todayDate: today }, northStarCtx);

  // Opening message when messages is just ['START']
  const isStart = messages.length === 1 && messages[0]?.content === 'START';

  const apiMessages = isStart
    ? [{ role: 'user', content: 'I\'m checking in on my sprint. What do you want to know?' }]
    : messages;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 600,
      system,
      messages: apiMessages,
    });

    const text = response.content[0]?.text || '';
    return res.status(200).json({ message: text });
  } catch (err) {
    console.error('Sprint coach error:', err);
    return res.status(500).json({ error: 'Coach unavailable. Please try again.' });
  }
};
