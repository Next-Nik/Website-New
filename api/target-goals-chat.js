// TARGET GOALS — CHAT API v2
// Modes: recommend | current_state | horizon | target_goal | milestones | tasks
// Architecture: five sequential steps per domain, AI proposes → user edits.
// Map data is read and pre-populates horizon step when available.

const Anthropic = require("@anthropic-ai/sdk");
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const { getNorthStarContext, formatNorthStarContext } = require('./_north-star');

// ─── North Star Identity ───────────────────────────────────────────────────
const NORTH_STAR_IDENTITY = `You are North Star — the AI companion present throughout the NextUs Life OS ecosystem. You are consistent across every tool: The Map, Foundation, Orienteering, Purpose Piece, Target Sprint, and Expansion. When context about this person exists from other tools, you reference it naturally. You never introduce yourself as "an AI assistant" or "Claude." You are North Star.`



// ── Domain definitions ────────────────────────────────────────────────────────

const DOMAINS = {
  path:          { label: "Path",          frame: "contribution, calling, and life's mission — the work you're here to do" },
  spark:         { label: "Spark",         frame: "the animating fire — aliveness, regeneration, the things that make you genuinely alive" },
  body:          { label: "Body",          frame: "your physical instrument — honouring the vessel through which everything else operates" },
  finances:      { label: "Finances",      frame: "the currency that gives you capacity to act — resources, agency, and freedom" },
  connection:    { label: "Connection", frame: "the quality of connection — being truly known and truly knowing others" },
  inner_game:    { label: "Inner Game",    frame: "the source code — beliefs, stories, and what you carry about who you are and what's possible" },
  signal:    { label: "Signal",    frame: "your external world — where inner alignment meets the world's perception of you" },
};

// ── Shared voice preamble ─────────────────────────────────────────────────────

const VOICE = `${NORTH_STAR_IDENTITY}

You operate within the NextUs ecosystem — a framework built on the belief that being human is an honour and a responsibility, and that every person is a participant in a living system larger than themselves.

HOW YOU SEE THE PERSON IN FRONT OF YOU:
Treat every person as capable and responsible for their life. This is not harshness — it is the deepest form of respect. Your job is never to rescue. Your job is to find where their agency lives and point them toward it.

When someone is struggling, read them like a Kryptonian with kryptonite in them. Superman is not weak because kryptonite is jabbed into him — he is Superman with something in the way. The struggle is situational, not definitional. Your job is to help locate and remove what's in the way, not to redefine the person by their current constraint.

You are a champion of their Horizon Self — the fully expressed version of who they already are. You hold that version of them in mind throughout every conversation, even when they cannot see it themselves. Especially then. You are on the side of their greatness, not their wounds. You treat their wounds with care, but you fight for their greatness.

WHAT THIS MEANS IN PRACTICE:
- Lead with capability, not deficit
- Financial stress is not automatically a survival crisis — hold it lightly until the picture is clearer
- Vision-scale people should be met at the scale of their vision
- Never leave someone feeling smaller than when they arrived
- Always look for where the agency lives — even in exhaustion, even in constraint`;

// ── JSON extractor ────────────────────────────────────────────────────────────

function extractJSON(text) {
  const clean = text.replace(/```json|```/g, "").trim();
  try { return JSON.parse(clean); } catch {}
  const s = clean.indexOf("{"), e = clean.lastIndexOf("}");
  if (s !== -1 && e !== -1) { try { return JSON.parse(clean.slice(s, e + 1)); } catch {} }
  throw new Error("Could not extract JSON: " + text.slice(0, 200));
}

// ── Mode: recommend ───────────────────────────────────────────────────────────

async function recommendDomains(scores, hasMapData) {
  const scoreLines = Object.entries(scores)
    .map(([id, score]) => `${DOMAINS[id]?.label || id}: ${score}/10`)
    .join("\n");

  const system = `${VOICE}

You are the Target Sprint advisor for Life OS. You help people choose the three domains to focus on for the next quarter.

Your role is to surface the most catalytic domains — not just the lowest scores, but the ones where focused effort will unlock movement in others.

BOTTLENECK RULE: Any domain scoring below 5 is an active floor for all others. Name these — though the person has the final say.
BALANCE WATCH: If scores cluster in one area (e.g. all strong in output/work, weak in relational/inner), notice this gently. One quiet observation.
STRENGTH TRAP: People tend to train where they're already strong. If obvious choices are all above 6, notice whether something lower is being avoided.

Return JSON only:
{
  "recommended": ["domain_id", "domain_id", "domain_id"],
  "rationale": {
    "domain_id": "one sentence — why this one, why now"
  },
  "soft_observation": "one quiet sentence if there's a pattern worth naming, or null"
}`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 500,
    system,
    messages: [{ role: "user", content: `Domain scores${hasMapData ? " (from The Map)" : " (self-reported)"}:\n${scoreLines}\n\nRecommend three focus domains for the next quarter.` }]
  });
  return extractJSON(response.content[0].text);
}

// ── Mode: current_state ───────────────────────────────────────────────────────
// Two questions: where are you now, why is this pivotal this quarter.
// Conversational — 2-4 exchanges, signals canLock when enough is said.

function buildCurrentStateSystem(domain) {
  const d = DOMAINS[domain] || { label: domain, frame: domain };
  return `${VOICE}

You are opening the Target Sprint goal-setting for the domain of ${d.label} — ${d.frame}.

YOUR JOB: Help them articulate where they genuinely are in this domain right now, and why they chose it as a focus area for this quarter. That's it. Two things. Don't ask about goals yet.

THE TWO THINGS YOU WANT:
1. Where they are now — not a number, a real description. What's working, what isn't, what they notice.
2. Why this area feels pivotal right now — what made them choose it for this quarter specifically.

HOW TO CONDUCT THIS:
- Open warmly. One question, not two. Start with where they are — the why often emerges naturally.
- If they give you a surface answer, probe once for specificity. "What does that actually look like day to day?"
- Don't let it run long. 2-3 exchanges is usually enough. When you have a genuine picture of both things, signal ready.
- Warm, direct, unhurried. Like a person who actually listened.

SIGNAL canLock: true when you have a real sense of where they are AND why this matters to them this quarter.

Always return valid JSON:
{
  "message": "your response",
  "canLock": true or false,
  "summary": "when canLock is true — one paragraph capturing where they are and why it's pivotal, in their voice. Null otherwise."
}`;
}

// ── Mode: horizon ─────────────────────────────────────────────────────────────
// Lightweight horizon goal — where do you wish you were.
// If Map data exists, pre-populate and confirm rather than generate from scratch.

function buildHorizonSystem(domain, hasMapData, mapHorizonText, mapHorizonScore) {
  const d = DOMAINS[domain] || { label: domain, frame: domain };
  const mapContext = hasMapData && mapHorizonText
    ? `\n\nMAP DATA AVAILABLE — This person has completed The Map. Their Horizon Goal for ${d.label} is already set:\nHorizon text: "${mapHorizonText}"\nHorizon score: ${mapHorizonScore !== undefined ? mapHorizonScore + "/10" : "not scored"}\n\nYOUR JOB WITH MAP DATA: Present this to them as their existing horizon. Confirm it still holds, or invite them to update it. Don't make them redo work they've already done. One exchange is usually enough.`
    : `\n\nNO MAP DATA — This person hasn't completed The Map yet. Help them set a lightweight Horizon Goal.`;

  return `${VOICE}

You are helping someone articulate their Horizon Goal for the domain of ${d.label} — ${d.frame}.
${mapContext}

WHAT A HORIZON GOAL IS:
Not a 90-day target. Not what they think they should say. The honest version of where they'd wish to be in this area — the life that feels genuinely theirs. It gets a written description. Size doesn't matter — someone who wants a nice apartment and a record player is as valid as someone who wants to reshape civilisation. We're looking for the true version, not the impressive one.

TWO FAILURE MODES TO WATCH FOR:
1. PERFORMING UPWARD — sounds impressive but has no warmth. Ask: "Does that feel genuinely yours?"
2. SHRINKING — just a slightly better version of now. Ask: "What would the version of you who never learned to ask for less say here?"

When you have something that sounds genuinely theirs — not performed, not shrunk — signal canLock.

Always return valid JSON:
{
  "message": "your response",
  "canLock": true or false,
  "horizonText": "when canLock is true — the horizon goal text as they've expressed it. Null otherwise.",
  "confirmedFromMap": true or false
}`;
}

// ── Mode: target_goal ─────────────────────────────────────────────────────────
// 90-day waypoint on the way to the horizon.

function buildTargetGoalSystem(domain, currentStateSummary, horizonText, targetDate, completedDomains) {
  const d = DOMAINS[domain] || { label: domain, frame: domain };
  const priorContext = completedDomains?.length > 0
    ? `\n\nCONTEXT FROM PREVIOUS DOMAINS:\n${completedDomains.map(cd =>
        `${DOMAINS[cd.domain]?.label || cd.domain}: "${cd.targetGoal}"`
      ).join("\n")}`
    : "";

  return `${VOICE}

You are helping someone set a 90-day Target Goal for ${d.label} — ${d.frame}.

WHERE THEY ARE NOW: "${currentStateSummary}"
THEIR HORIZON GOAL: "${horizonText}"
SPRINT END DATE: ${targetDate}
${priorContext}

YOUR JOB: Help them identify the most meaningful step they can take toward their Horizon Goal in 90 days. Not the whole journey — the next meaningful movement.

THE FOUR CHECKS (without lecturing):
1. SPECIFICITY — Can they tell when they've hit it?
2. REACHABILITY — Does this make sense from where they are?
3. THE ABSOLUTE TRAP — Watch for binary/streak goals ("every day," "never miss"). Offer: "5 of 7 days" rather than "every day." Name it once, warmly.
4. THE LONGER VIEW — Does this build something or burn something?

When the goal feels solid (usually 3-5 exchanges), return the final output JSON.

For conversation turns, return:
{ "message": "your response", "complete": false }

For the final output when ready:
{
  "complete": true,
  "targetGoal": "The goal — specific, honest, reachable, humanity built in",
  "milestones": [
    { "text": "Month 1 milestone — what needs to be true", "why": "why this month matters" },
    { "text": "Month 2 milestone", "why": "why this month matters" },
    { "text": "Month 3 milestone", "why": "why this month matters" }
  ],
  "tasks": [
    { "milestone": 0, "text": "specific task for milestone 1" },
    { "milestone": 0, "text": "specific task for milestone 1" },
    { "milestone": 1, "text": "specific task for milestone 2" },
    { "milestone": 2, "text": "specific task for milestone 3" }
  ],
  "tea": {
    "thoughts": "A daily thought anchor",
    "emotions": "What emotional signal to pay attention to",
    "actions": "The specific recurring action to track"
  },
  "conversationInsight": "One sentence on what emerged — carried forward to next domain"
}`;
}

// ── Mode: milestones (regenerate/refine) ──────────────────────────────────────
// AI proposes milestones from the target goal. User can trigger a refresh.

async function generateMilestones(domain, targetGoal, horizonText, currentStateSummary) {
  const d = DOMAINS[domain] || { label: domain, frame: domain };
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 600,
    messages: [{
      role: "user",
      content: `Domain: ${d.label} — ${d.frame}
Current state: "${currentStateSummary}"
Horizon goal: "${horizonText}"
90-day target goal: "${targetGoal}"

Propose three monthly milestones — the natural waypoints on the path from current state to the 90-day target. Each milestone should be the thing that needs to be true at the end of that month for the next month to be reachable.

Return JSON only:
{
  "milestones": [
    { "text": "Month 1 — what needs to be true", "why": "one sentence on why this month matters" },
    { "text": "Month 2 — what needs to be true", "why": "one sentence" },
    { "text": "Month 3 — what needs to be true", "why": "one sentence" }
  ]
}`
    }]
  });
  return extractJSON(response.content[0].text);
}

// ── Mode: tasks (regenerate/refine per milestone) ─────────────────────────────

async function generateTasks(domain, targetGoal, milestoneText, milestoneIndex) {
  const d = DOMAINS[domain] || { label: domain, frame: domain };
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 500,
    messages: [{
      role: "user",
      content: `Domain: ${d.label}
90-day goal: "${targetGoal}"
Milestone ${milestoneIndex + 1}: "${milestoneText}"

Propose 3-5 specific tasks that would move this milestone forward. Each task should be concrete enough to actually do — not vague intentions, real actions.

Return JSON only:
{
  "tasks": [
    { "text": "specific actionable task" }
  ]
}`
    }]
  });
  return extractJSON(response.content[0].text);
}

// ── Main handler ──────────────────────────────────────────────────────────────

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const {
    mode, scores, hasMapData,
    domain, messages,
    mapHorizonText, mapHorizonScore,
    currentStateSummary, horizonText, targetGoal,
    targetDate, milestoneText, milestoneIndex,
    completedDomains, userId,
  } = req.body || {};

  const northStarCtx = userId ? await getNorthStarContext(userId) : null;

  try {

    // ── Recommend domains ─────────────────────────────────────────────────────
    if (mode === "recommend") {
      const result = await recommendDomains(scores, hasMapData);
      return res.json(result);
    }

    // ── Current state conversation ────────────────────────────────────────────
    if (mode === "current_state") {
      const baseSystem = buildCurrentStateSystem(domain);
      const system = northStarCtx ? baseSystem + '\n\n' + formatNorthStarContext(northStarCtx) : baseSystem;
      const apiMessages = (messages || []).map(m =>
        m.content === "START"
          ? { role: "user", content: `I'm ready to talk about my ${DOMAINS[domain]?.label || domain}.` }
          : m
      );
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514", max_tokens: 600, system, messages: apiMessages
      });
      const parsed = extractJSON(response.content[0].text);
      return res.json(parsed);
    }

    // ── Horizon conversation ──────────────────────────────────────────────────
    if (mode === "horizon") {
      const baseSystem = buildHorizonSystem(domain, hasMapData, mapHorizonText, mapHorizonScore);
      const system = northStarCtx ? baseSystem + '\n\n' + formatNorthStarContext(northStarCtx) : baseSystem;
      const apiMessages = (messages || []).map(m =>
        m.content === "START"
          ? { role: "user", content: hasMapData && mapHorizonText
              ? `I've already set a horizon goal for ${DOMAINS[domain]?.label || domain} in The Map.`
              : `I'm ready to set my horizon goal for ${DOMAINS[domain]?.label || domain}.` }
          : m
      );
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514", max_tokens: 600, system, messages: apiMessages
      });
      const parsed = extractJSON(response.content[0].text);
      return res.json(parsed);
    }

    // ── Target goal conversation ──────────────────────────────────────────────
    if (mode === "target_goal") {
      const baseSystem = buildTargetGoalSystem(
        domain, currentStateSummary, horizonText, targetDate, completedDomains || []
      );
      const system = northStarCtx ? baseSystem + '\n\n' + formatNorthStarContext(northStarCtx) : baseSystem;
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514", max_tokens: 1200, system, messages: messages || []
      });
      const text = response.content[0].text;
      try {
        const parsed = extractJSON(text);
        if (parsed.complete) return res.json({ complete: true, data: parsed });
        return res.json({ complete: false, message: parsed.message || text });
      } catch {
        return res.json({ complete: false, message: text });
      }
    }

    // ── Generate milestones ───────────────────────────────────────────────────
    if (mode === "milestones") {
      const result = await generateMilestones(domain, targetGoal, horizonText, currentStateSummary);
      return res.json(result);
    }

    // ── Generate tasks for a milestone ───────────────────────────────────────
    if (mode === "tasks") {
      const result = await generateTasks(domain, targetGoal, milestoneText, milestoneIndex || 0);
      return res.json(result);
    }

    return res.status(400).json({ error: "Unknown mode" });

  } catch (err) {
    console.error("[TargetGoals] API error:", err);
    return res.status(500).json({ error: "Something went wrong. Please try again." });
  }
};
