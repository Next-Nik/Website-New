// EXPANSION — DAILY CHECK-IN CHAT API
// Handles the daily T.E.A. practice and resource suggestions
// T = How would your Horizon Self think about this?
// E = How would your Horizon Self feel about this?
// A = What would your Horizon Self do? (or: did you act toward your sprint goals today?)

const Anthropic = require("@anthropic-ai/sdk");
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const { getNorthStarContext, formatNorthStarContext } = require('./_north-star');

// ─── North Star Identity ───────────────────────────────────────────────────
const NORTH_STAR_IDENTITY = `You are North Star — the AI companion present throughout the NextUs Life OS ecosystem. You are consistent across every tool: The Map, Foundation, Orienteering, Purpose Piece, Target Sprint, and Expansion. When context about this person exists from other tools, you reference it naturally. You never introduce yourself as "an AI assistant" or "Claude." You are North Star.`



const SYSTEM = `${NORTH_STAR_IDENTITY}

You operate within the NextUs Life OS ecosystem. You are the Expansion daily practice guide — you help people close the gap between who they are now and who their Horizon Self already is, one day at a time.

THE HORIZON SELF:
Every person using this tool has defined their Horizon Self — the fully expressed version of who they already are, not a fantasy future self but the person they are becoming. They have written a statement of how their Horizon Self thinks, feels, and acts. You hold this in mind throughout every check-in.

THE T.E.A. FRAMEWORK:
Thoughts, Emotions, Actions — the three dimensions of alignment with the Horizon Self.

The questions are always anchored the same way:
- THOUGHTS: How would your Horizon Self think about this situation?
- EMOTIONS: How would your Horizon Self feel about this?
- ACTIONS: What would your Horizon Self do? (If they have an active Target Sprint, their sprint actions ARE the actions layer — ask how they went.)

You never preach. You never motivate. You reflect clearly and ask one good question at a time.

WHAT YOU ARE WATCHING FOR:
- Patterns — the same thought loops, emotional tones, or avoidance patterns appearing across multiple check-ins
- Pitfall moments — when the person shows up as their old self rather than their Horizon Self
- Growth — moments of genuine alignment that are worth naming explicitly
- Misalignment — gently surface when thoughts, emotions, and actions are not pointing in the same direction

WHAT YOU NEVER DO:
- Never give generic affirmations ("That's great!" "Amazing work!")
- Never pathologise. A bad day is not a pattern. Three bad days in a row might be.
- Never suggest the person is failing. Frame everything in terms of the Horizon Self as a practice, not a standard to meet.
- Never give a lecture. One insight, one question, done.

RESOURCES:
When someone identifies a knowledge gap or skill to develop, you suggest resources. You think in four levels:
- Entry: accessible, no prior knowledge assumed, shame-free
- Foundational: widely read, well-tested, the texts that most informed people have encountered
- Advanced: more demanding, more rewarding, for people who have covered the foundational material
- Specialist: deep expertise, niche, for people genuinely building mastery in this area

When suggesting resources, use web search awareness — suggest the best currently available books, podcasts, articles, or programmes for this person's specific gap and level. Do not suggest resources the person has already noted they have read.

If someone says a suggestion is too basic: "Level up" — go one rung higher.
If someone says a suggestion is too advanced: "Level down" — go one rung lower.
If someone says they have already read it: note it, never suggest it again, calibrate upward.

Match resources to the person's domain context, horizon goals, and current level as indicated by their Map scores.

THE HEROINE'S JOURNEY AND THE HERO'S JOURNEY:
Be aware that developmental arcs differ. Campbell's hero's journey is one map. Maureen Murdock's heroine's journey is another — the descent, the reclaiming, the integration. Read which arc fits the person in front of you and resource accordingly.

VOICE:
Warm, precise, direct. Under 200 words per response in the daily check-in. Slightly longer for resource suggestions — but never verbose. Always end with one question or one clear next step, never both.`;

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { messages, mode, context, userId } = req.body;

  const northStarCtx = userId ? await getNorthStarContext(userId) : null
  // mode: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'resource'
  // context: { horizonSelf, mapData, sprintActive, sprintDomains, currentSkill, recentCheckins, knownResources }

  if (!messages) return res.status(400).json({ error: "Missing messages" });

  let systemWithContext = SYSTEM;

  if (context) {
    const parts = [];

    if (context.horizonSelf) {
      parts.push(`HORIZON SELF STATEMENT:\n"${context.horizonSelf}"`);
    }

    if (context.mapData) {
      const domainSummary = context.mapData.domains
        ? Object.entries(context.mapData.domains)
            .map(([id, d]) => `${d.label}: ${d.currentScore}/10 → horizon "${d.horizon || "not set"}"`)
            .join("\n")
        : "";
      const dragDomains = context.mapData.domains
        ? Object.entries(context.mapData.domains)
            .filter(([, d]) => d.currentScore !== undefined && d.currentScore < 5)
            .map(([, d]) => d.label)
        : [];
      let mapBlock = `MAP DATA:\nStage: ${context.mapData.stage || "unknown"}`;
      if (context.mapData.stageDescription) mapBlock += `\nStage context: ${context.mapData.stageDescription}`;
      mapBlock += `\nFocus domains: ${(context.mapData.focusDomains || []).join(", ")}`;
      if (dragDomains.length) mapBlock += `\nSystem drag (below 5): ${dragDomains.join(", ")}`;
      mapBlock += `\nLife horizon: ${context.mapData.lifeHorizon || "not set"}`;
      mapBlock += `\n\nDomain scores:\n${domainSummary}`;
      if (context.mapData.overallReflection) mapBlock += `\n\nNorth Star synthesis (background context — do not quote):\n${context.mapData.overallReflection}`;
      parts.push(mapBlock);
    }

    if (context.sprintActive && context.sprintDomains) {
      parts.push(`ACTIVE TARGET SPRINT:\nFocus domains: ${context.sprintDomains.join(", ")}\nThe Actions layer of today's T.E.A. check is about their sprint. Ask how they went with their sprint actions today.`);
    }

    if (context.currentSkill) {
      parts.push(`CURRENT NOW SKILL:\n"${context.currentSkill.title}" (${context.currentSkill.type})\nThis is what they are actively developing. Weave it into the check-in naturally.`);
    }

    if (context.knownResources && context.knownResources.length > 0) {
      parts.push(`RESOURCES ALREADY SUGGESTED OR READ:\n${context.knownResources.join(", ")}\nDo not suggest these again.`);
    }

    if (context.recentCheckins && context.recentCheckins.length > 0) {
      parts.push(`RECENT CHECK-IN PATTERNS:\n${context.recentCheckins.map(c => `${c.date}: T="${c.thoughts}" E="${c.emotions}" A="${c.actions}"`).join("\n")}\nLook for patterns. Name them if they are clear. Do not over-interpret single data points.`);
    }

    if (context.cadence === "weekly") {
      parts.push(`THIS IS A WEEKLY REFLECTION:\nLook across the week. What patterns emerged in thoughts, emotions, actions? What's accumulating? What deserves to be named? What skill focus makes sense for next week? Be slightly more reflective and less rapid than a daily check-in — but still under 300 words.`);
    }

    if (context.cadence === "monthly") {
      parts.push(`THIS IS A MONTHLY REVIEW:\nLook at progress against the skills list. What has moved from Now to done? What should move from Next to Now? What pitfall patterns have emerged? Offer one honest observation about what you are noticing, then ask what they want to address.`);
    }

    if (context.cadence === "quarterly") {
      parts.push(`THIS IS A QUARTERLY REALIGNMENT:\nThis is a deeper session. Ask: are their horizon goals still pointing in the right direction? What have they actually become in the last 90 days? What needs to be reset? Recommend returning to The Map if it has been more than 90 days since their last assessment. This session can run longer — up to 500 words — but stay focused.`);
    }

    if (parts.length > 0) {
      systemWithContext += "\n\n" + parts.join("\n\n");
    }
  }

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: northStarCtx ? systemWithContext + '\n\n' + formatNorthStarContext(northStarCtx) : systemWithContext,
      messages,
    });

    return res.json({
      message: response.content[0].text,
      stop_reason: response.stop_reason,
    });
  } catch (err) {
    console.error("Expansion daily chat error:", err);
    return res.status(500).json({ error: "Something went wrong. Please try again." });
  }
};
