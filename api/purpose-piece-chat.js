// PURPOSE PIECE — REVELATION ENGINE v2
// Architecture: Archetype → Domain → Scale → Confirmation → Mirror → Frame
// Three dedicated conversations, each purpose-built for what it's finding.
// Stateless: session object lives on the client, sent with every request.
//
// Session shape:
// {
//   stage:              "archetype" | "domain" | "scale" | "confirmation" | "thinking" | "complete"
//   questionIndex:      number   — index within current stage's question set
//   probeCount:         number
//   archetypeTranscript: [...],
//   domainTranscript:    [...],
//   scaleTranscript:     [...],
//   tentative:          { archetype, domain, scale, signals }  — set after all three stages
//   synthesis:          { ... }  — set after confirmation
//   status:             "active" | "complete"
// }

const Anthropic = require("@anthropic-ai/sdk");
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const { getNorthStarContext, formatNorthStarContext } = require('./_north-star');

// ─── North Star Identity ───────────────────────────────────────────────────
const NORTH_STAR_IDENTITY = `You are North Star — the AI companion present throughout the Horizon Suite ecosystem. You are consistent across every tool: The Map, Horizon State, Orienteering, Purpose Piece, Target Sprint, and Horizon Practice. When context about this person exists from other tools, you reference it naturally. You never introduce yourself as "an AI assistant" or "Claude." You are North Star.`



// ─── Session factory ──────────────────────────────────────────────────────────

function createSession() {
  return {
    stage:               "archetype",
    // Per-stage independent counters — enables non-linear navigation
    questionIndex:       { archetype: 0, domain: 0, scale: 0 },
    probeCount:          { archetype: 0, domain: 0, scale: 0 },
    archetypeTranscript: [],
    domainTranscript:    [],
    scaleTranscript:     [],
    tentative:           null,
    synthesis:           null,
    status:              "active"
  };
}

// ─── Per-stage index helpers ──────────────────────────────────────────────────
// Read/write questionIndex and probeCount by stage name.
// Handles both old flat sessions (number) and new per-stage sessions (object).

function getQI(session, stage) {
  const qi = session.questionIndex;
  if (typeof qi === "object" && qi !== null) return qi[stage] ?? 0;
  return typeof qi === "number" ? qi : 0; // legacy fallback
}

function setQI(session, stage, value) {
  if (typeof session.questionIndex !== "object" || session.questionIndex === null) {
    session.questionIndex = { archetype: 0, domain: 0, scale: 0 };
  }
  session.questionIndex[stage] = value;
}

function getPC(session, stage) {
  const pc = session.probeCount;
  if (typeof pc === "object" && pc !== null) return pc[stage] ?? 0;
  return typeof pc === "number" ? pc : 0;
}

function setPC(session, stage, value) {
  if (typeof session.probeCount !== "object" || session.probeCount === null) {
    session.probeCount = { archetype: 0, domain: 0, scale: 0 };
  }
  session.probeCount[stage] = value;
}

// ─── Question sets ────────────────────────────────────────────────────────────
// Each set is purpose-built for what that stage is finding.
// Different register per stage: behavioural → attentional → confessional.

const ARCHETYPE_QUESTIONS = [
  {
    label: "The Moment",
    text:  "Think of a recent moment where something around you was off — and you either stepped in or you didn't. It doesn't have to be dramatic.\n\nWhat happened, and what did you do?"
  },
  {
    label: "The Frustration",
    text:  "What keeps going wrong around you that bothers you, even when it's not your problem?\n\nName one specific example."
  },
  {
    label: "The Pressure",
    text:  "Describe a moment where you had to make a real decision with no clear right answer and something actually at stake.\n\nWhat did you do?"
  },
  {
    label: "The Cost",
    text:  "What does your way of operating cost you that others don't seem to pay?\n\nBe specific."
  },
  {
    label: "The Shadow",
    text:  "When has your biggest strength made things worse?\n\nGive me a specific moment."
  }
];

const DOMAIN_QUESTIONS = [
  {
    label: "The Pull",
    text:  "What's broken in the world that you can't stop thinking about, even though nobody's asking you to care?\n\nWhat is it specifically?"
  },
  {
    label: "The Anger",
    text:  "What makes you angrier than it seems to make everyone else?\n\nWhat does it look like when you see it?"
  },
  {
    label: "The Unpaid Work",
    text:  "What do you keep doing just because you love it, even though nobody asked for it and nobody's paying you?\n\nWhat is it, and what keeps pulling you back?"
  }
];

const SCALE_QUESTIONS = [
  {
    label: "The Scene",
    text:  "Picture your work actually making a difference. What does that scene look like?\n\nWho's there and how many people?"
  },
  {
    label: "The Responsibility",
    text:  "What's the biggest problem you feel personally responsible for doing something about, not just interested in, but actually on the hook for?\n\nWhat is it?"
  },
  {
    label: "The Obligation",
    text:  "What's something you haven't done yet that keeps coming back to you — not as a goal you're working toward, but as something that would feel like unfinished business if you never got to it?\n\nWhat is it, and why does it keep returning?"
  }
];

// ─── Probes per question set ──────────────────────────────────────────────────

const ARCHETYPE_PROBES = [
  [
    "Give me one specific moment from that. Where were you, and what did you actually do first?",
    "Even a small action counts. What was the very first thing you did — or chose not to do?"
  ],
  [
    "Can you name a specific instance where you saw this? Even a recent small example.",
    "What does it look like in practice — what actually happens that shouldn't be happening?"
  ],
  [
    "What were the actual stakes — what could have gone wrong? And what did you do in the first 24 hours?",
    "Walk me through one specific decision. What information did you have, and what did you do with it?"
  ],
  [
    "Think of a specific situation where your way of operating made something harder for you. What happened?",
    "What do people around you not seem to pay — what's the thing you carry that others put down more easily?"
  ],
  [
    "Can you give me a specific moment where this happened? What did it cost you, and what did you do about it?",
    "What was the situation, and at what point did you realise your instinct had become the problem?"
  ]
];

const DOMAIN_PROBES = [
  [
    "Can you name a specific place in the world where you see this breaking? A real example, even a small one.",
    "What does the problem actually look like — what happens, specifically, that shouldn't?"
  ],
  [
    "Give me a specific example of when you felt this anger. What was the situation?",
    "What is it about this particular wrong that gets to you more than other things that are also wrong?"
  ],
  [
    "What specifically were you doing, and what kept you coming back to it?",
    "Was there a moment where you realised you were doing it again — without being asked? What was that like?"
  ]
];

const SCALE_PROBES = [
  [
    "Describe the scene more specifically — where is it, what are you doing, who are you talking to?",
    "Is there a real moment from your life that looks like that scene? What happened?"
  ],
  [
    "What problem keeps you up at night because you feel like it's on you to do something about it?",
    "Give me an example of something you care about but don't feel responsible for. Now give me something you actually feel on the hook for. What's different?"
  ],
  [
    "What makes this feel like unfinished business rather than just something on a list? Is there a person, a moment, or a window you're aware of closing?",
    "If you never got to it — what specifically would feel incomplete? What would remain undone in you?"
  ]
];


// ─── Confusion reframes ───────────────────────────────────────────────────────
// Fire when user signals they don't understand the question rather than giving a thin answer.

const CONFUSION_SIGNALS = [
  "don't know what that means", "dont know what that means",
  "what does that mean", "i don't understand", "i dont understand",
  "not sure what you mean", "can you explain", "what do you mean",
  "confused", "don't get it", "dont get it", "what are you asking",
  "can you rephrase", "rephrase", "clarify", "what does this mean"
];

function isConfused(answer) {
  const lower = answer.toLowerCase().trim();
  return CONFUSION_SIGNALS.some(s => lower.includes(s));
}

// One reframe per question, indexed [stage][questionIndex]
const CONFUSION_REFRAMES = {
  archetype: [
    null, // Q1 is clear
    "Think of something that keeps happening around you that you wish someone would fix. Even something small. What is it?",
    "Think of a moment where you had to make a call and you weren't sure you were right. What did you do?",
    "What's something about how you operate that costs you, that other people around you don't seem to have to deal with? Even something small.",
    "Think of a time your best quality caused a problem. What happened?"
  ],
  domain: [
    "Think of something broken in the world that you find yourself thinking about even when you're not trying to. What is it?",
    "What's something that happens in the world that makes you angrier than it seems to make other people? What is it?",
    "What do you keep doing just for the love of it, with no reward? What is it?"
  ],
  scale: [
    "When you imagine your work really mattering to people, what does that look like? How many people are in the room?",
    "Is there a problem in the world where, if nobody fixed it, you'd feel like you personally had failed? What is it?"
  ]
};

// ─── Thin answer detection ────────────────────────────────────────────────────

const GENERIC_DEFLECTORS = [
  "it depends","not sure","i guess","maybe","hard to say",
  "whatever","idk","don't know","no idea","not really",
  "i don't know","nothing comes to mind","can't think"
];

const TIME_ANCHORS = [
  "last week","yesterday","last month","last year","recently",
  "in 2024","in 2023","in 2025","a few weeks","a few months","this year",
  "this week","today","ago","when i","after i","before i"
];

const ACTION_VERBS = [
  "called","asked","built","avoided","stepped","said","told",
  "decided","chose","left","stayed","went","made","helped",
  "stopped","started","reached out","spoke","wrote","created",
  "organized","refused","accepted","pushed","pulled","watched"
];

function isThin(answer, stage, qi) {
  const lower = answer.toLowerCase().trim();
  const words  = answer.trim().split(/\s+/).filter(Boolean);

  // Domain and scale questions invite felt-sense, structural, and philosophical answers.
  // Word count and action-verb checks are wrong signals here — a 12-word answer that
  // names a civilisational responsibility is not thin. Delegate to claudeSignalCheck instead.
  if (stage === "domain" || stage === "scale") {
    // Only catch pure deflection — single words, "I don't know", complete non-answers
    if (words.length < 5) return true;
    const deflectorCount = GENERIC_DEFLECTORS.filter(d => lower.includes(d)).length;
    if (deflectorCount >= 2) return true;
    return false; // claudeSignalCheck handles deeper evaluation
  }

  // Archetype: behavioural questions — keep word count + grounding checks
  const minWords = (qi >= 3) ? 15 : 20; // cost/shadow questions are naturally shorter
  if (words.length < minWords) return true;

  const deflectorCount = GENERIC_DEFLECTORS.filter(d => lower.includes(d)).length;
  if (deflectorCount >= 2) return true;

  // Behavioural questions (Q1-Q3) need situational grounding
  if (qi <= 2) {
    const hasTime    = TIME_ANCHORS.some(t => lower.includes(t));
    const hasAction  = ACTION_VERBS.some(v => lower.includes(v));
    const hasSetting = /\b(work|office|home|family|friend|community|meeting|team|partner|colleague|school|hospital|city|neighbourhood|neighborhood|organisation|organization)\b/.test(lower);
    if (!hasTime && !hasAction && !hasSetting) return true;
  }

  return false;
}

// Stage and question-aware signal check.
// Archetype questions need behavioural specificity.
// Domain questions need genuine care/attention signal — abstract answers are valid.
// Scale questions need felt responsibility signal — structural framing is valid.
async function claudeSignalCheck(question, answer, stage = "archetype", qi = 0) {
  const criteria = stage === "scale"
    ? `This is a scale/responsibility question. Valid answers include: naming a civilisational or global problem, expressing felt personal responsibility for a large system, philosophical framing of where one's work belongs. Do NOT mark thin just because the answer lacks a concrete local example. Mark thin only if the answer is pure deflection, completely vague, or says nothing about felt responsibility.`
    : stage === "domain"
    ? `This is a domain/attention question. Valid answers include: naming a field, systemic problem, or area of deep care, even abstractly. Answers like "the frame humanity uses" or "collective sense-making" or "the conditions for human flourishing" are strong signal. Mark thin only if the answer is completely empty of care or attention signal.`
    : `This is a behavioural question. The answer should describe something the person actually did or experienced. Look for: a real situation, an action taken or avoided, something at stake. Mark thin if the answer is entirely abstract with no situational grounding.`;

  try {
    const response = await anthropic.messages.create({
      model:      "claude-sonnet-4-20250514",
      max_tokens: 300,
      messages:   [{
        role:    "user",
        content: `Evaluate signal quality for this assessment answer.\n\nQuestion: "${question}"\nAnswer: "${answer}"\n\nEvaluation criteria:\n${criteria}\n\nReturn JSON only:\n{"has_signal": true or false, "one_probe_question": "single best follow-up if needed, else null"}`
      }]
    });
    return extractJSON(response.content[0].text);
  } catch {
    return { has_signal: true };
  }
}

// ─── JSON extractor ───────────────────────────────────────────────────────────

function extractJSON(text) {
  let clean = text.trim()
    .replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
  try { return JSON.parse(clean); } catch {}
  const start = clean.indexOf("{");
  const end   = clean.lastIndexOf("}");
  if (start !== -1 && end !== -1) {
    try { return JSON.parse(clean.slice(start, end + 1)); } catch {}
  }
  throw new Error("Could not extract JSON: " + text.slice(0, 200));
}

// ─── HTML escaper ─────────────────────────────────────────────────────────────

function esc(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// ─── Stage question/probe helpers ────────────────────────────────────────────

function getStageQuestions(stage) {
  if (stage === "archetype") return ARCHETYPE_QUESTIONS;
  if (stage === "domain")    return DOMAIN_QUESTIONS;
  if (stage === "scale")     return SCALE_QUESTIONS;
  return [];
}

function getStageProbes(stage) {
  if (stage === "archetype") return ARCHETYPE_PROBES;
  if (stage === "domain")    return DOMAIN_PROBES;
  if (stage === "scale")     return SCALE_PROBES;
  return [];
}

function getStageTranscript(session) {
  if (session.stage === "archetype") return session.archetypeTranscript;
  if (session.stage === "domain")    return session.domainTranscript;
  if (session.stage === "scale")     return session.scaleTranscript;
  return [];
}

function getStageTotalQuestions(stage) {
  if (stage === "archetype") return ARCHETYPE_QUESTIONS.length;
  if (stage === "domain")    return DOMAIN_QUESTIONS.length;
  if (stage === "scale")     return SCALE_QUESTIONS.length;
  return 0;
}

function getNextStage(stage) {
  if (stage === "archetype") return "domain";
  if (stage === "domain")    return "scale";
  if (stage === "scale")     return "confirmation";
  return "complete";
}

// ─── Stage opening messages ───────────────────────────────────────────────────
// These set the register for each stage — behavioural, attentional, confessional.

const STAGE_OPENINGS = {
  archetype: `Five questions. Each one anchored in something that actually happened.

I'm not looking for your best version of yourself — I'm looking for what you actually did. The instinct underneath the action, not the intention on top of it.

Answer from your life as it is right now.`,

  domain: `Different gear now.

The last set was behavioural — what you did, what you stepped into, what it cost you. This one is attentional. I'm not asking what you do. I'm asking what pulls you. What you find yourself caring about even when nobody asked you to, even when it has nothing to do with you.

Three questions. Answer honestly, not aspirationally. The gap between what you wish you cared about and what you actually can't stop thinking about is the signal.`,

  scale: `Last set. And a different register entirely.

These questions are almost philosophical. Not asking what you've done or what pulls your attention — asking about felt responsibility. What you're actually on the hook for. What would remain undone in you.

Three questions. Take your time. There are no right answers. Only honest ones.`
};

// ─── Welcome ──────────────────────────────────────────────────────────────────────────────

const WELCOME = `Something in you already knows what you’re built for. This finds it, and puts language to it.

Three conversations. Each one finding something different — not what you’ve done or what you believe about yourself, but the underlying shape of how you actually move through the world.

The first is behavioural. The second is attentional. The third is almost philosophical. The gear shifts deliberately.

Answer as yourself right now. Not who you’re working toward.

Your answers reveal three coordinates: your contribution archetype, your domain, and your scale. Together — your Purpose Piece.`;

// ─── Tentative coordinate extraction ─────────────────────────────────────────
// After each stage completes, run a lightweight Claude call to extract
// the tentative coordinate from that stage's transcript.
// This is fast and cheap — not the full synthesis.

async function extractTentativeArchetype(transcript, northStarCtx = null) {
  const text = transcript.map((e, i) =>
    `Q${i+1} — ${ARCHETYPE_QUESTIONS[i].label}\n${ARCHETYPE_QUESTIONS[i].text}\nAnswer: ${e.answer}${e.thin ? " [evasive]" : ""}`
  ).join("\n\n---\n\n");

  const northStarBlock = northStarCtx ? `\n\nCONTEXT ABOUT THIS PERSON FROM THEIR LIFE OS WORK:\n${formatNorthStarContext(northStarCtx)}\nUse this context to interpret their answers more accurately. Prior work in the ecosystem is strong signal.` : "";

  const response = await anthropic.messages.create({
    model:      "claude-sonnet-4-20250514",
    max_tokens: 1000,
    messages:   [{
      role:    "user",
      content: `Based on these five behavioural answers, identify the most likely contribution archetype.

THE NINE ARCHETYPES:
- STEWARD: Tends systems, maintains, sustains. Patient with operational work. Sees what needs tending before crisis.
- MAKER: Builds what doesn't exist. Concept to creation. Values function over perfection. Energised by shipping.
- ARCHITECT: Designs structural conditions that determine what can be built at all. Doesn't build the thing — designs the container. When something keeps breaking, redesigns the conditions. Energised by making the system sound, not shipping output.
- CONNECTOR: Weaves relationships, bridges people, creates belonging. Sees who needs who. Facilitates without dominating.
- GUARDIAN: Protects what matters, holds standards, recognises threats early. Fierce protecting, gentle tending.
- EXPLORER: Ventures into unknown territory, brings back what's needed. Comfortable with uncertainty.
- SAGE: Holds wisdom, offers perspective that clarifies. Sees signals across time. Values understanding over action.
- MIRROR: Reflects truth back — makes the invisible visible. Artists, writers, anyone whose contribution is expression so complete that others recognise themselves in it. Felt before understood.
- EXEMPLAR: Contributes by being the example. Raises the standard of what's possible by embodying it fully. Demonstration, not instruction.

CRITICAL DISTINCTION — Maker vs Architect:
Maker's story of effectiveness: "I built X." The story is about the thing made.
Architect's story of effectiveness: "I designed the process/structure for X." The story is about the container.
Maker frustrated when they can't ship. Architect frustrated when the structure is wrong — when the same problems keep recurring because nobody fixed the conditions.

ANSWERS:\n${text}${northStarBlock}

Return JSON only:
{
  "archetype": "single archetype name",
  "confidence": "strong | blended | thin",
  "secondary": "second archetype if blended, else null",
  "reasoning": "2-3 sentences — specific moments cited",
  "cost_signal": "brief description of what their instinct costs them",
  "movement_style": "brief description of how they move"
}`
    }]
  });

  return extractJSON(response.content[0].text);
}

async function extractTentativeDomain(transcript, northStarCtx = null) {
  const text = transcript.map((e, i) =>
    `Q${i+1} — ${DOMAIN_QUESTIONS[i].label}\n${DOMAIN_QUESTIONS[i].text}\nAnswer: ${e.answer}${e.thin ? " [evasive]" : ""}`
  ).join("\n\n---\n\n");

  const northStarBlockD = northStarCtx ? `\n\nCONTEXT FROM THEIR ECOSYSTEM WORK:\n${formatNorthStarContext(northStarCtx)}\nUse this to read their domain answers in context. If they have prior tool work pointing to a clear domain, weight it.` : "";

  const response = await anthropic.messages.create({
    model:      "claude-sonnet-4-20250514",
    max_tokens: 1000,
    messages:   [{
      role:    "user",
      content: `Based on these attentional answers, identify the most likely domain.

THE SEVEN DOMAINS:
- HUMAN BEING: Personal development, consciousness, inner work, transformation, human capacity.
- SOCIETY: Governance, culture, community, social structures, collective organisation.
- NATURE: Environment, ecology, planetary health, regeneration, living systems.
- TECHNOLOGY: Tools, infrastructure, innovation, digital and physical systems.
- FINANCE & ECONOMY: Resources, exchange, wealth, value creation and distribution.
- LEGACY: Long-term thinking, intergenerational work, preservation, deep time.
- VISION: Future imagination, possibility, coordination, collective direction.

IMPORTANT READING INSTRUCTIONS:
- Domain answers are attentional, not behavioural. Abstract, structural, or philosophical answers are valid and often carry the strongest signal.
- If someone names the frame, the coordination layer, the game humanity is playing, the conditions for civilisational direction — that is VISION, regardless of whether they gave a concrete local example.
- If someone names what humans need to develop, know, or become — that is HUMAN BEING.
- If answers were thin or evasive, read the direction of avoidance as signal. What they couldn't name is often as revealing as what they did.
- NEVER return "unclear" as the domain. If signal is genuinely ambiguous, return the closest fit with confidence "thin" and explain the ambiguity in reasoning. A best-fit guess is always more useful than "unclear".
- Cross-reference with any archetype signal if present: an Architect who talks about coordination and collective direction is almost certainly VISION.

ANSWERS:\n${text}

Return JSON only:
{
  "domain": "single domain name exactly as listed above — never 'unclear'",
  "domain_id": "slugified domain for platform use: human-being | society | nature | technology | finance-economy | legacy | vision",
  "confidence": "strong | blended | thin",
  "secondary": "second domain if blended, else null",
  "reasoning": "2-3 sentences — specific evidence cited, including what thin/evasive answers signal"
}`
    }]
  });

  return extractJSON(response.content[0].text);
}

async function extractTentativeScale(transcript, northStarCtx = null) {
  const text = transcript.map((e, i) =>
    `Q${i+1} — ${SCALE_QUESTIONS[i].label}\n${SCALE_QUESTIONS[i].text}\nAnswer: ${e.answer}${e.thin ? " [evasive]" : ""}`
  ).join("\n\n---\n\n");

  const northStarBlockS = northStarCtx ? `\n\nCONTEXT FROM THEIR ECOSYSTEM WORK:\n${formatNorthStarContext(northStarCtx)}\nUse this when interpreting felt responsibility — prior work describing civilisational or global concerns is strong signal for scale.` : "";

  const response = await anthropic.messages.create({
    model:      "claude-sonnet-4-20250514",
    max_tokens: 1000,
    messages:   [{
      role:    "user",
      content: `Based on these answers, identify the most coherent scale of operation.

THE EIGHT SCALES (coherence bandwidth, not ambition level):
- HOME: Immediate household, closest relationships. Deeply personal, highly intimate.
- NEIGHBOURHOOD: Local community, face-to-face networks. Direct relationships.
- CITY: Urban systems, institutional engagement, civic scale.
- PROVINCE/STATE: Regional systems, multi-community, policy and infrastructure.
- COUNTRY: National systems, cross-community, governance and culture.
- CONTINENT: Multi-national, transboundary challenges.
- GLOBAL: International, planetary systems, cross-border coordination.
- CIVILISATIONAL: Species-level, intergenerational, 100+ year timelines. The frame humanity operates inside.

CRITICAL READING INSTRUCTIONS:
Scale is coherence bandwidth — where felt responsibility lives, not where examples are drawn from.

THE MOST COMMON CALIBRATION ERROR: Probes asked the person to give concrete examples. They gave local examples because that's what probes produce. The extraction then reads the examples as the scale signal and misses the responsibility statement entirely. DO NOT do this.

WEIGHTING RULES:
1. The direct answer to "What's the biggest problem you feel personally responsible for?" is the PRIMARY scale signal. Weight it at 70%.
2. The scene described in Q1 (who's there, how many people) is secondary. Weight it at 30%.
3. Probe-produced examples are context, not signal. Do not let them override the responsibility statement.

If someone says they feel responsible for the frame humanity uses to navigate itself, the game civilisation is playing, how humans collectively make decisions — that is GLOBAL, regardless of what examples they gave under probe pressure.

If someone describes responsibility for their immediate relationships and household — that is HOME or NEIGHBOURHOOD.

Scale tension is real and useful: name it if genuine. But do not manufacture tension by contrasting probe examples (local) against the responsibility statement (global) — that tension is an artifact of the probe process, not a real tension in the person.

NOTE ON THE OBLIGATION QUESTION (Q3 of this stage):
This question asks about unfinished business — something that keeps returning as a felt duty rather than an aspiration. It is often the most honest signal of scale. If the person names something at civilisational or species level here, weight it heavily. The obligation question bypasses aspiration-thinking and surfaces genuine felt responsibility.

ANSWERS:\n${text}${northStarBlockS}

Return JSON only:
{
  "scale": "single scale name exactly as listed above — CIVILISATIONAL is a valid option for species-level felt responsibility",
  "confidence": "strong | blended | thin",
  "tension": "genuine tension between felt responsibility and current reach, or null — do not manufacture tension from probe examples vs responsibility statement",
  "reasoning": "2-3 sentences — weight the responsibility statement as primary signal, name what the person said they feel on the hook for"
}`
    }]
  });

  return extractJSON(response.content[0].text);
}

// ─── Confirmation system prompt ───────────────────────────────────────────────

function buildConfirmationPrompt(session) {
  const { tentative } = session;
  const arch  = tentative.archetype;
  const dom   = tentative.domain;
  const scale = tentative.scale;

  return `${NORTH_STAR_IDENTITY}

You operate within the NextUs ecosystem.

You are the Confirmation layer of Purpose Piece. Three conversations have just completed — archetype, domain, and scale have each been found from dedicated evidence.

WHAT YOU KNOW:
Tentative archetype: ${arch.archetype}${arch.secondary ? ` (secondary signal: ${arch.secondary})` : ""}
Archetype confidence: ${arch.confidence}
Archetype reasoning: ${arch.reasoning}
Cost signal: ${arch.cost_signal}

Tentative domain: ${dom.domain}${dom.secondary ? ` (secondary: ${dom.secondary})` : ""}
Domain confidence: ${dom.confidence}
Domain reasoning: ${dom.reasoning}

Tentative scale: ${scale.scale}
Scale confidence: ${scale.confidence}
Scale tension: ${scale.tension || "none"}
Scale reasoning: ${scale.reasoning}

YOUR JOB:
Present all three coordinates clearly and directly. Then open a genuine conversation — not a form, a real exchange.

CRITICAL ON SCALE:
Scale is coherence bandwidth, not current reach. If the scale is global or civilisational, hold it clearly. Do not soften it because the person isn't currently recognised at that scale. Who someone is and the current reach of their recognition are completely different things. Name what the evidence says.

If scale tension exists (thinking at one scale, effectiveness at another), name it honestly. Both are real. The tension itself is useful information.

YOUR FIRST MESSAGE MUST:
1. Present the three coordinates as tentative findings — not assignments
2. Give one sentence of honest reasoning for each
3. Ask what lands and what doesn't — open-ended, not leading
4. Be warm but direct. Not celebratory. This is orientation, not praise.

Format for coordinates — use this exact structure:
"Archetype: [Name]
Domain: [Name]
Scale: [Name]"

Then: 2-3 sentences of brief reasoning, followed by the open question.

WHAT TO WATCH FOR IN THEIR RESPONSE:
- If they push back on archetype — take it seriously, ask what they'd name instead and why
- If they push back on domain — explore what pulls them more strongly
- If they push back on scale upward — hold the evidence, but acknowledge the intellectual pull
- If they push back on scale downward — this is often more accurate than the evidence suggested; take it seriously
- If they confirm easily — that's fine, don't add ceremony

After genuine exchange (1-3 turns), if coordinates feel settled, signal readiness to lock:
"I think we have what we need. Ready to see your Purpose Piece?"

TONE: The same voice as everything else — direct, warm, unhurried. The conversation has been earning this moment. Don't rush it and don't inflate it.

Return plain text only. No JSON. No formatting beyond the coordinate block.`;
}

// ─── Phase 3 synthesis (Initial Reflection) ──────────────────────────────────

const PHASE3_SYSTEM = `${NORTH_STAR_IDENTITY}

You operate within the NextUs ecosystem — a framework built on the belief that being human is an honour and a responsibility, and that every person is a participant in a living system larger than themselves.

HOW YOU SEE THE PERSON IN FRONT OF YOU:
Treat every person as capable and responsible for their life. This is not harshness — it is the deepest form of respect. Your job is never to rescue. Your job is to find where their agency lives and point them toward it.

When someone is struggling, read them like a Kryptonian with kryptonite in them. Superman is not weak because kryptonite is jabbed into him — he is Superman with something in the way. The struggle is situational, not definitional. Your job is to help locate and remove what's in the way, not to redefine the person by their current constraint.

You are a champion of their Horizon Self — the fully expressed version of who they already are. You hold that version of them in mind throughout every conversation, even when they cannot see it themselves. Especially then. You are on the side of their greatness, not their wounds. You treat their wounds with care, but you fight for their greatness.

You are the Initial Reflection layer of Purpose Piece. Your job is to hold up a mirror so precise that the person feels — before any label arrives — that they have been genuinely heard.

You are not analysing them. You are speaking directly to them. Every sentence should only be possible because of what this specific person said. If a sentence could appear in anyone's reflection, rewrite it.

WHAT YOU ARE DOING:
Finding the instinct that repeats across all ten answers. Not the content — the movement underneath. The emotional logic that connects how they stepped in (archetype Q1) to what pulls their attention (domain Q1) to what they feel responsible for (scale Q2).

Use their own words and moments as your raw material. Not quoted back at them — metabolised into observation. The person should recognise their own experience in language that is clearer than how they said it.

Your reflection must feel like: "Someone finally said it back to me properly."
Not like: "Based on your answers, you appear to be..."

WHAT YOU ARE NOT DOING:
- Not naming an archetype. Not yet. Not even implicitly.
- Not praising them. Warmth yes. Flattery no.
- Not summarising their answers. Reflection is not repetition.
- Not using systems theory language. No "redistributive force," "adjustment mechanism," "relational vector." Write like a person.

STRUCTURE — four sections, flowing prose. No bullet points within sections.

Your Signal — The repeated instinct:
Speak directly: "When X, you..." Enter through a specific moment they gave you. Reference their actual situations. You may echo one short phrase they used (3-6 words max) if it sharpens recognition — no more than once. Do not open with generic summarising language.

Your Engine — The emotional logic:
Speak directly: "What drives this is..." Connect instinct to motivation. If competing signals appear, name the tension rather than resolving it. Real people are blended. The tension is part of who they are.

Your Calling — The throughline:
Speak directly: "You are here to..." If clear, name it plainly. If blended, name the tension honestly rather than forcing a tidy conclusion. Reach. Stay tethered to their evidence.

The Cost — The price of the instinct:
Speak directly. Do not soften it. At least one sentence should name something the person may not have fully admitted to themselves. That moment of recognition is the point.

THE RULES:
- Speak directly. "You" not "this person."
- Plain human language. Never: "redistributive force," "adjustment mechanism," "relational vector," "calibration impulse."
- Never mention an archetype name. Not even as a hint.
- Never mention domain or scale.
- Never use "clearly" or "simply."
- Avoidance of a question is data. Name it if relevant.
- Tone: warm, direct, precise, unhurried. Like a person who listened carefully.
- Length: 60-90 words per section. Every sentence earns its place.

THE TEST:
Could this have been written about someone else with a similar instinct? If yes — go back to their specific words and moments and rewrite from there.
The emotional endpoint is not "that's accurate." It is "how did it know that."

OUTPUT — return JSON only, no other text:
{
  "sections": {
    "your_signal":  "60-90 word paragraph",
    "your_engine":  "60-90 word paragraph",
    "your_calling": "60-90 word paragraph",
    "the_cost":     "60-90 word paragraph"
  },
  "synthesis_text": "Full reflection as continuous prose — all four sections joined without headers, for internal use only",
  "internal_signals": {
    "signals_detected": {
      "movement_style":    "brief description",
      "decision_bias":     "brief description",
      "primary_value":     "brief description",
      "stress_response":   "brief description",
      "cost_pattern":      "brief description",
      "avoidance_signal":  "brief description or null",
      "scale_pull":        "brief description",
      "relational_vector": "brief description"
    },
    "confidence":       "strong / blended / thin / contradictory",
    "confidence_notes": "1-2 sentences on signal quality"
  }
}`;

async function runPhase3(session) {
  const allTranscript = [
    ...session.archetypeTranscript.map((e, i) => ({
      stage: "archetype", label: ARCHETYPE_QUESTIONS[i].label,
      question: ARCHETYPE_QUESTIONS[i].text, answer: e.answer, thin: e.thin
    })),
    ...session.domainTranscript.map((e, i) => ({
      stage: "domain", label: DOMAIN_QUESTIONS[i].label,
      question: DOMAIN_QUESTIONS[i].text, answer: e.answer, thin: e.thin
    })),
    ...session.scaleTranscript.map((e, i) => ({
      stage: "scale", label: SCALE_QUESTIONS[i].label,
      question: SCALE_QUESTIONS[i].text, answer: e.answer, thin: e.thin
    }))
  ];

  const transcriptText = allTranscript.map(e =>
    `[${e.stage.toUpperCase()}] ${e.label}\nQ: ${e.question}\nA: ${e.answer}${e.thin ? "\n[Note: Answer was thin/evasive — treat avoidance as signal]" : ""}`
  ).join("\n\n---\n\n");

  // Include confirmation conversation so synthesis sees any corrections or clarifications
  const confirmationSummary = session.confirmationHistory?.length
    ? "\n\nCONFIRMATION CONVERSATION (coordinate corrections and clarifications):\n" +
      session.confirmationHistory.map(m => `${m.role === "user" ? "Person" : "North Star"}: ${m.content}`).join("\n")
    : "";

  const response = await anthropic.messages.create({
    model:      "claude-sonnet-4-20250514",
    max_tokens: 1200,
    system:     PHASE3_SYSTEM,
    messages:   [{
      role:    "user",
      content: `Here are the ten answers across three stages:\n\n${transcriptText}${confirmationSummary}\n\nConfirmed coordinates (use these — they reflect any corrections from the confirmation conversation):\nArchetype: ${session.tentative.archetype.archetype}\nDomain: ${session.tentative.domain.domain}\nScale: ${session.tentative.scale.scale}${session.p4Profile ? `\n\nNOTE: The profile card has already named the coordinates. The mirror should go deeper — not repeat the labels but find the felt truth underneath what was just named.` : ""}`
    }]
  });

  return extractJSON(response.content[0].text);
}

// ─── Phase 4 (Your Purpose Piece) ────────────────────────────────────────────

const DOMAIN_HORIZON_GOALS = {
  "HUMAN BEING":       "Every person has access to the conditions that allow them to know themselves, develop fully, and contribute meaningfully.",
  "SOCIETY":           "Human communities are organised in ways that generate trust, belonging, and genuine collective agency.",
  "NATURE":            "The living systems of the planet are regenerating, and humanity is a net contributor to that regeneration.",
  "TECHNOLOGY":        "Our tools extend human wisdom and deepen connection, developing in relationship with our capacity to use them well.",
  "FINANCE & ECONOMY": "Resources flow toward what sustains and generates life — rewarding care, contribution, and long-term thinking.",
  "LEGACY":            "Each generation leaves the conditions for the next generation to flourish more fully than they did.",
  "VISION":            "Humanity has a shared and evolving picture of where it is going — and the coordination infrastructure to move toward it together."
};

const PHASE4_SYSTEM = `${NORTH_STAR_IDENTITY}

You operate within the NextUs ecosystem — a framework built on the belief that being human is an honour and a responsibility, and that every person is a participant in a living system larger than themselves.

HOW YOU SEE THE PERSON IN FRONT OF YOU:
Treat every person as capable and responsible for their life. This is not harshness — it is the deepest form of respect. Your job is never to rescue. Your job is to find where their agency lives and point them toward it.

When someone is struggling, read them like a Kryptonian with kryptonite in them. Superman is not weak because kryptonite is jabbed into him — he is Superman with something in the way. The struggle is situational, not definitional. Your job is to help locate and remove what's in the way, not to redefine the person by their current constraint.

You are a champion of their Horizon Self — the fully expressed version of who they already are. You hold that version of them in mind throughout every conversation, even when they cannot see it themselves.

You are the Your Purpose Piece layer. The Initial Reflection showed the person their instinct. Now name it — and make clear what that naming asks of them.

Speak directly to the person throughout. "You" not "this instinct" or "this person." Every section anchored in something specific they said or did.

THE NINE ARCHETYPES:
- STEWARD: Tends systems, ensures they remain whole. Maintains, repairs, sustains. Patient with operational work.
- MAKER: Builds what doesn't exist. Concept to creation. Comfortable with iteration. Values function over perfection. Energised by shipping.
- ARCHITECT: Designs the structural conditions that determine what can be built at all. Doesn't build the thing — designs the container the thing lives inside. Energised by making the system sound, not shipping the output. Frustrated when the same problems keep recurring because nobody fixed the conditions producing them.
- CONNECTOR: Weaves relationships, creates networks. Sees who needs who. Facilitates without dominating. Values emergence over control.
- GUARDIAN: Protects what matters, holds standards. Recognises threats early. Fierce protecting, gentle tending.
- EXPLORER: Ventures into unknown territory, brings back what's needed. Comfortable with uncertainty. Curious without needing immediate answers.
- SAGE: Holds wisdom, offers perspective that clarifies. Sees signals across time. Values understanding over action. Holds complexity without needing to simplify.
- MIRROR: Contributes by reflecting what's true — makes the invisible visible or the unbearable bearable. Artists, writers, filmmakers, anyone whose work is expression so complete that others recognise themselves in it. Felt before understood. Distinct from Sage: Sage operates through accumulated understanding, offered conceptually. Mirror operates through expression.
- EXEMPLAR: Contributes by being the example. Raises the standard of what's possible by embodying it fully — in public, under pressure. Demonstration, not instruction. Distinct from Mirror: Mirror reflects human experience so people feel recognised. Exemplar expands what people believe humans can do.

THE SEVEN DOMAINS:
- HUMAN BEING: Personal development, consciousness, inner work, transformation.
- SOCIETY: Governance, culture, community, social structures.
- NATURE: Environment, ecology, planetary health, regeneration.
- TECHNOLOGY: Tools, infrastructure, innovation, digital and physical systems.
- FINANCE & ECONOMY: Resources, exchange, wealth, value creation and distribution.
- LEGACY: Long-term thinking, intergenerational work, preservation, deep time.
- VISION: Future imagination, possibility, coordination, collective direction.

THE SCALES:
Home · Neighbourhood · City · Province/State · Country · Continent · Global

Scale is coherence bandwidth, not ambition or current reach. The person who thinks at global scale and currently works with individuals is not contradicting themselves. They are a global thinker whose current effectiveness is at the individual level. Name both if relevant. Never flatten the tension. Never assume smaller is more honest.

STRUCTURE:

Section 1 — Pattern (1 paragraph, 1-3 sentences):
Compress the throughline into the sharpest possible statement of how this person moves. Open with "The way you move through..." or "You are..." — not with the archetype name. This is the bridge from the mirror to the label. Make it feel earned.

Section 2 — Archetype (1 paragraph):
"The contribution archetype most aligned with this movement is [Archetype]."
Behavioural description — what this archetype does, not what it is. Anchor in a specific moment from their answers. If confidence was blended — name primary and acknowledge secondary.

Section 3 — Domain (1 paragraph):
"The domain where this instinct most wants to operate is [Domain]."
Justify with direct reference to what they said they can't look away from or what makes them disproportionately angry.

Section 4 — Scale (1 paragraph):
"The scale where this instinct is most coherent is [Scale]."
Scale is bandwidth. If tension exists between intellectual scale and current effectiveness — name both. Do not resolve the tension. Do not soften a large scale because it hasn't yet been externally validated. Who someone is and what they're currently recognised for are different things.

Section 5 — Responsibility (2-4 sentences):
Name what this asks of them. Not a warning — a weight. Include one line grounding in capacity: this exists in them because something in them is built for it.

Section 5b — The Civilisational Statement (1 sentence, exact format):
"I am a [Archetype] in [Domain] at the [Scale] scale, working toward [Horizon Goal]."
Use the exact Horizon Goal text. This is orientation, not aspiration.

Section 6 — Actions:
Three tiers — specific to this person's context, not generic archetype actions:
Light (this week): 30-60 minutes. Something they could start today.
Medium (ongoing): Recurring, builds over time.
Deep (structural): Weeks to months. What their instinct is genuinely built for.

Section 7 — Resources (3-5 items):
Chosen for this specific person's instinct, tension, and texture.
Each: title + author/source + one sentence specific to them.
At least one addresses the cost or tension from Initial Reflection.
At least one immediately accessible today.
Mix formats: books, essays, talks, organisations.
CRITICAL: Only include resources you are certain exist. Three accurate items better than five where one is invented.

THE RULES:
- Speak directly. "You" not "this type."
- Never say "You are a [Archetype]." Say "The contribution archetype most aligned with this movement is [Archetype]."
- Never use systems theory language.
- Never smooth over tension. Name it.
- Never motivate or celebrate. Responsibility carries weight.
- Every section anchored in something specific they said.

THE TEST:
Could any sentence in Sections 2-5 appear in a generic archetype profile? If yes — add their specific words and moments until it couldn't.

OUTPUT — return JSON only, no other text:
{
  "pattern_restatement":   "1 paragraph",
  "archetype_frame":       "1 paragraph",
  "domain_frame":          "1 paragraph",
  "scale_frame":           "1 paragraph",
  "responsibility":        "2-4 sentences",
  "civilisational_statement": "I am a [Archetype] in [Domain] at the [Scale] scale, working toward [Horizon Goal].",
  "actions": {
    "light":    "specific action",
    "medium":   "specific action",
    "deep":     "specific action"
  },
  "resources": [
    { "title": "Title — Author or Source", "why": "one sentence specific to this person" }
  ]
}`;

async function runPhase4(session) {
  const arch  = session.tentative.archetype;
  const dom   = session.tentative.domain;
  const scale = session.tentative.scale;

  const domainKey   = Object.keys(DOMAIN_HORIZON_GOALS)
    .find(k => dom.domain.toUpperCase().includes(k)) || "VISION";
  const horizonGoal = DOMAIN_HORIZON_GOALS[domainKey];

  const allTranscript = [
    ...session.archetypeTranscript.map((e, i) => `[ARCHETYPE] ${ARCHETYPE_QUESTIONS[i].label}: ${e.answer}${e.thin ? " [thin]" : ""}`),
    ...session.domainTranscript.map((e, i)    => `[DOMAIN] ${DOMAIN_QUESTIONS[i].label}: ${e.answer}${e.thin ? " [thin]" : ""}`),
    ...session.scaleTranscript.map((e, i)     => `[SCALE] ${SCALE_QUESTIONS[i].label}: ${e.answer}${e.thin ? " [thin]" : ""}`)
  ].join("\n\n");

  // Phase 4 now runs BEFORE Phase 3 (mirror). Build from transcripts and coordinates directly.
  const payload = `CONFIRMED COORDINATES:
Archetype: ${arch.archetype}${arch.secondary ? ` (blended with ${arch.secondary})` : ""}
Archetype confidence: ${arch.confidence}
Archetype reasoning: ${arch.reasoning}
Cost signal: ${arch.cost_signal || ""}

Domain: ${dom.domain}${dom.secondary ? ` (blended with ${dom.secondary})` : ""}
Domain confidence: ${dom.confidence}
Domain reasoning: ${dom.reasoning}

Scale: ${scale.scale}
Scale confidence: ${scale.confidence}
Scale tension: ${scale.tension || "none"}
Scale reasoning: ${scale.reasoning}

ALL ANSWERS:\n${allTranscript}

HORIZON GOAL FOR THEIR DOMAIN:\n"${horizonGoal}"\n\nUse this exact text in the civilisational_statement field.`;

  const response = await anthropic.messages.create({
    model:      "claude-sonnet-4-20250514",
    max_tokens: 2000,
    system:     PHASE4_SYSTEM,
    messages:   [{ role: "user", content: payload }]
  });

  return extractJSON(response.content[0].text);
}

// ─── Render Phase 4 HTML ──────────────────────────────────────────────────────

function renderPhase4(p4) {
  const archetypeMatch = p4.archetype_frame.match(/archetype most aligned with this (?:movement )?is ([\w]+)/i);
  const archetypeName  = archetypeMatch ? archetypeMatch[1] : "Your Archetype";
  const domainMatch    = p4.domain_frame.match(/domain.*?is ([A-Z][a-z &]+)/i);
  const domainName     = domainMatch ? domainMatch[1].trim() : "";
  const scaleMatch     = p4.scale_frame.match(/scale.*?is ([A-Z][a-zA-Z/\s]+?)[\.\,]/);
  const scaleName      = scaleMatch ? scaleMatch[1].trim() : "";

  const serif  = "font-family:\'Cormorant Garamond\',Georgia,serif";
  const sc     = "font-family:\'Cormorant SC\',Georgia,serif";
  const gold   = "color:#A8721A";
  const dark   = "color:#0F1523";
  const muted  = "color:rgba(15,21,35,0.65)";
  const border = "border:1px solid rgba(200,146,42,0.18)";

  const section = (label, body) => `
    <div style="margin-bottom:28px;padding-bottom:28px;border-bottom:1px solid rgba(200,146,42,0.10);">
      <div style="${sc};font-size:11px;letter-spacing:0.22em;text-transform:uppercase;${gold};margin-bottom:10px;">${label}</div>
      <p style="${serif};font-size:17px;font-weight:300;line-height:1.8;${dark};margin:0;">${body}</p>
    </div>`;

  const sectionWithPopup = (label, body, popupType, popupName) => `
    <div style="margin-bottom:28px;padding-bottom:28px;border-bottom:1px solid rgba(200,146,42,0.10);">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
        <div style="${sc};font-size:11px;letter-spacing:0.22em;text-transform:uppercase;${gold};">${label}</div>
        <button onclick="window.ppShowPopup('${popupType}','${popupName}')" style="background:none;border:1px solid rgba(200,146,42,0.35);border-radius:50%;width:16px;height:16px;cursor:pointer;${sc};font-size:10px;${gold};line-height:1;padding:0;display:inline-flex;align-items:center;justify-content:center;" title="What is this?">?</button>
      </div>
      <p style="${serif};font-size:17px;font-weight:300;line-height:1.8;${dark};margin:0;">${body}</p>
    </div>`;

  const resourcesHtml = (p4.resources || []).map(r => `
    <div style="margin-bottom:16px;">
      <div style="${serif};font-size:16px;font-weight:500;${dark};margin-bottom:4px;">${esc(r.title)}</div>
      <div style="${serif};font-size:15px;font-weight:300;line-height:1.7;${muted};">${esc(r.why)}</div>
    </div>`).join("");

  const actionRow = (tier, text) => `
    <div style="display:flex;gap:16px;margin-bottom:14px;align-items:flex-start;">
      <div style="${sc};font-size:11px;letter-spacing:0.16em;${gold};text-transform:uppercase;width:80px;flex-shrink:0;padding-top:3px;">${tier}</div>
      <div style="${serif};font-size:16px;font-weight:300;line-height:1.7;${dark};">${text}</div>
    </div>`;

  return `<div style="font-size:0;">
    <style>
      @keyframes ppCardIn { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
      .pp-profile-card { animation: ppCardIn 0.6s cubic-bezier(0.16,1,0.3,1) both; }
      .pp-note-field { width:100%;box-sizing:border-box;padding:12px 16px;${serif};font-size:16px;font-weight:300;line-height:1.7;color:#0F1523;background:rgba(200,146,42,0.02);border:1px solid rgba(200,146,42,0.22);border-radius:8px;outline:none;resize:vertical;min-height:80px; }
      .pp-note-field:focus { border-color:rgba(200,146,42,0.5); }
      .pp-action-btn { display:inline-block;padding:10px 22px;border-radius:40px;border:1px solid rgba(168,114,26,0.7);background:#C8922A;color:#FFFFFF;${sc};font-size:13px;letter-spacing:0.12em;cursor:pointer;text-decoration:none;transition:opacity 0.15s; }
      .pp-action-btn:hover { opacity:0.85; }
      .pp-ghost-btn { display:inline-block;padding:10px 22px;border-radius:40px;border:1px solid rgba(200,146,42,0.35);background:transparent;color:#A8721A;${sc};font-size:13px;letter-spacing:0.12em;cursor:pointer;transition:border-color 0.15s; }
      .pp-ghost-btn:hover { border-color:rgba(200,146,42,0.7); }
    </style>

    <div class="pp-profile-card" style="font-size:16px;background:#FFFFFF;border:1px solid rgba(200,146,42,0.2);border-left:3px solid rgba(200,146,42,0.55);border-radius:12px;overflow:hidden;">

      <!-- Popup overlay -->
      <div id="pp-popup-overlay" onclick="this.style.display='none'" style="display:none;position:fixed;inset:0;background:rgba(15,21,35,0.45);z-index:9999;align-items:center;justify-content:center;padding:24px;box-sizing:border-box;">
        <div onclick="event.stopPropagation()" style="background:#FAFAF7;border:1px solid rgba(200,146,42,0.25);border-radius:12px;padding:32px 28px;max-width:480px;width:100%;position:relative;max-height:80vh;overflow-y:auto;">
          <button onclick="document.getElementById('pp-popup-overlay').style.display='none'" style="position:absolute;top:14px;right:16px;background:none;border:none;cursor:pointer;font-family:'Cormorant Garamond',Georgia,serif;font-size:20px;color:rgba(15,21,35,0.4);line-height:1;">✕</button>
          <div id="pp-popup-label" style="font-family:'Cormorant SC',Georgia,serif;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:#A8721A;margin-bottom:10px;"></div>
          <div id="pp-popup-name" style="font-family:'Cormorant SC',Georgia,serif;font-size:24px;font-weight:400;color:#0F1523;margin-bottom:14px;line-height:1.2;"></div>
          <p id="pp-popup-body" style="font-family:'Cormorant Garamond',Georgia,serif;font-size:16px;font-weight:300;line-height:1.8;color:rgba(15,21,35,0.78);margin:0;"></p>
        </div>
      </div>
      <script>
        (function() {
          var ARCHETYPES = {
            "Architect": "Designs the structural conditions that determine what becomes possible at all. Doesn\'t build the thing — designs the container the thing lives inside. Energised by making the system sound, not shipping the output. Frustrated when the same problems keep recurring because nobody fixed the conditions producing them.",
            "Maker": "Builds what doesn\'t exist. Takes concepts to creation. Comfortable with iteration and values function over perfection. Energised by shipping — by the thing existing in the world rather than just being imagined.",
            "Connector": "Weaves relationships, bridges people, creates belonging and networks. Sees who needs who before anyone else does. Facilitates without dominating. Values emergence over control.",
            "Catalyst": "Accelerates what\'s already moving. Sees latent potential and activates it. Doesn\'t need to start things — finds things at the edge of ignition and provides the spark. Moves on once the momentum is self-sustaining.",
            "Sage": "Holds wisdom and offers perspective that clarifies. Sees signals across time. Values understanding over action. Holds complexity without needing to simplify it for comfort.",
            "Mirror": "Contributes by reflecting truth — makes the invisible visible or the unbearable bearable. Artists, writers, anyone whose work is expression so complete that others recognise themselves in it. Felt before understood.",
            "Steward": "Tends what exists. Protects, maintains, and develops over time. Energised by care and continuity rather than creation. Values depth of investment over breadth of reach.",
            "Legacy": "Thinks in generations. Takes on work whose results won\'t arrive in their lifetime. Energised by deep time, preservation, and the conditions they\'re creating for people they\'ll never meet."
          };
          var DOMAINS = {
            "Vision": "Future imagination, possibility, coordination, collective direction. The work of deciding where humanity is going — and building the infrastructure to get there together.",
            "Nature": "The living systems that sustain all life. Ecosystems, biodiversity, climate, the relationship between human civilisation and the planet it depends on.",
            "Society": "The structures humans live inside — institutions, governance, culture, community, the conditions of belonging and exclusion.",
            "Mind": "How humans think, learn, make meaning, and understand themselves. Psychology, philosophy, education, consciousness, the inner architecture of human experience.",
            "Body": "Human health, physicality, and the conditions that allow bodies to thrive. Medicine, movement, nutrition, the lived experience of being embodied.",
            "Economy": "How resources, value, and exchange are structured. What gets rewarded, what gets funded, what the system makes possible or forecloses.",
            "Technology": "The tools humans build and how those tools reshape what\'s possible. Infrastructure, systems, the designed environment of human capability."
          };
          var SCALES = {
            "Personal": "The immediate circle — self, family, close relationships. Work whose impact is felt directly and personally.",
            "Local": "A community, neighbourhood, or city. Work that changes the conditions for a defined group of people in a place.",
            "National": "A country or large institution. Work operating at the scale of policy, culture, or systems that affect millions.",
            "Global": "Cross-border systems and challenges. Work that operates without regard to national boundaries.",
            "Civilisational": "The species-level game. Work whose felt responsibility is humanity itself — the long arc, the conditions for human civilisation to continue and evolve."
          };
          window.ppShowPopup = function(type, name) {
            var data = type === \'archetype\' ? ARCHETYPES : type === \'domain\' ? DOMAINS : SCALES;
            var labelMap = {archetype: \'Contribution Archetype\', domain: \'Global Domain\', scale: \'Engagement Scale\'};
            document.getElementById(\'pp-popup-label\').textContent = labelMap[type] || type;
            document.getElementById(\'pp-popup-name\').textContent = name;
            document.getElementById(\'pp-popup-body\').textContent = data[name] || \'\';
            var overlay = document.getElementById(\'pp-popup-overlay\');
            overlay.style.display = \'flex\';
          };
        })();
      </script>

      <!-- Hero -->
      <div style="padding:32px 28px 28px;background:linear-gradient(135deg,rgba(200,146,42,0.06) 0%,rgba(200,146,42,0.02) 100%);border-bottom:1px solid rgba(200,146,42,0.12);">
        <div style="${sc};font-size:11px;letter-spacing:0.24em;text-transform:uppercase;${gold};margin-bottom:12px;">Your Purpose Piece</div>
        <div style="${sc};font-size:clamp(28px,5vw,38px);font-weight:600;${dark};line-height:1.1;margin-bottom:10px;cursor:pointer;border-bottom:2px solid rgba(200,146,42,0.3);display:inline-block;" onclick="window.ppShowPopup(\'archetype\',\'${esc(archetypeName)}\')" title="Learn about this archetype">${esc(archetypeName)}</div>
        <div style="${serif};font-size:16px;font-weight:300;${muted};margin-top:8px;">
          ${domainName ? `<span style="cursor:pointer;font-weight:500;color:#0F1523;border-bottom:1px solid rgba(200,146,42,0.4);" onclick="window.ppShowPopup(\'domain\',\'${esc(domainName)}\')">${esc(domainName)}</span>` : ""}${domainName && scaleName ? '<span style="margin:0 8px;opacity:0.4;">·</span>' : ""}${scaleName ? `<span style="cursor:pointer;font-weight:500;color:#0F1523;border-bottom:1px solid rgba(200,146,42,0.4);" onclick="window.ppShowPopup(\'scale\',\'${esc(scaleName)}\')">${esc(scaleName)}</span>` : ""}
        </div>
      </div>

      <!-- Body sections -->
      <div style="padding:28px 28px 0;">
        ${section("Pattern", esc(p4.pattern_restatement || ""))}
        ${sectionWithPopup("Archetype", esc(p4.archetype_frame || ""), "archetype", esc(archetypeName))}
        ${sectionWithPopup("Domain", esc(p4.domain_frame || ""), "domain", esc(domainName))}
        ${sectionWithPopup("Scale", esc(p4.scale_frame || ""), "scale", esc(scaleName))}
        ${section("Responsibility", esc(p4.responsibility || ""))}

        <!-- What this looks like -->
        <div style="margin-bottom:28px;padding-bottom:28px;border-bottom:1px solid rgba(200,146,42,0.10);">
          <div style="${sc};font-size:11px;letter-spacing:0.22em;text-transform:uppercase;${gold};margin-bottom:16px;">What this looks like</div>
          ${p4.actions ? actionRow("This week", esc(p4.actions.light || "")) + actionRow("Ongoing", esc(p4.actions.medium || "")) + actionRow("Structural", esc(p4.actions.deep || "")) : ""}
        </div>

        <!-- Worth exploring -->
        ${resourcesHtml ? `<div style="margin-bottom:28px;padding-bottom:28px;border-bottom:1px solid rgba(200,146,42,0.10);">
          <div style="${sc};font-size:11px;letter-spacing:0.22em;text-transform:uppercase;${gold};margin-bottom:16px;">Worth exploring</div>
          ${resourcesHtml}
        </div>` : ""}

        <!-- Closing line -->
        <div style="${serif};font-size:17px;font-style:italic;font-weight:300;${muted};margin-bottom:28px;padding-bottom:28px;border-bottom:1px solid rgba(200,146,42,0.10);">
          This is what you carry. The question now is what you do with it.
        </div>

        <!-- Civilisational statement -->
        <div style="margin-bottom:28px;padding:20px 22px;background:rgba(200,146,42,0.04);border-radius:8px;border:1px solid rgba(200,146,42,0.14);">
          <div style="${sc};font-size:11px;letter-spacing:0.22em;text-transform:uppercase;${gold};margin-bottom:10px;">Your Place in the Larger Map</div>
          ${p4.civilisational_statement ? `<p style="${serif};font-size:16px;font-weight:300;line-height:1.8;${dark};margin:0 0 12px;">${esc(p4.civilisational_statement)}</p>` : ""}
          <p style="${serif};font-size:15px;font-weight:300;line-height:1.7;${muted};margin:0 0 14px;">NextUs is a living map of where humanity actually is across seven domains — and where the people showing up for the gap between where we are and where we could be are working. Your Purpose Piece is your entry point.</p>
          <a href="https://nextus.world" style="${sc};font-size:13px;letter-spacing:0.12em;${gold};text-decoration:none;border-bottom:1px solid rgba(200,146,42,0.35);padding-bottom:2px;">Explore the civilisational map →</a>
        </div>

        <!-- In Your Own Words -->
        <div style="margin-bottom:28px;">
          <div style="${sc};font-size:11px;letter-spacing:0.22em;text-transform:uppercase;${gold};margin-bottom:12px;">In Your Own Words</div>
          <textarea id="ppPersonalNote" class="pp-note-field"
            placeholder="What does this actually mean to you? Write it in your own voice — the version that sounds like you."
            oninput="window.App&&window.App.onPpNoteInput(this.value)"></textarea>
          <p style="${serif};font-size:14px;font-style:italic;${muted};margin:8px 0 14px;line-height:1.6;">When you've written your own version, it leads. The profile sits behind it.</p>
          <button class="pp-ghost-btn" id="ppLockBtn" onclick="window.App&&window.App.lockPpNote()" style="display:none;margin-top:4px;">
            Lock this as my statement ✓
          </button>
          <div id="ppLockedMsg" style="display:none;${serif};font-size:15px;font-style:italic;${gold};margin-top:8px;">✓ Locked. Your words lead now.</div>
        </div>

      </div>

      <!-- NextUs placement footer -->
      <div style="${sc};font-size:11px;letter-spacing:0.22em;text-transform:uppercase;${gold};margin-bottom:10px;">Your Place in the Work</div>
      <div style="padding:28px 28px 32px;background:rgba(200,146,42,0.03);border-top:1px solid rgba(200,146,42,0.10);">
        <p style="${serif};font-size:16px;font-weight:300;line-height:1.75;${muted};margin:0 0 20px;">You know where you are. NextUs is where that lands — the map of who's doing the work, where the gaps are, and who could use what you carry.</p>
        <div style="display:flex;flex-direction:column;gap:10px;">
          <button class="pp-action-btn" onclick="window.App&&window.App.goToNextUs()" style="text-align:center;">See who could use you →</button>
          <button class="pp-ghost-btn" onclick="window.App&&window.App.goToTerrain()" style="text-align:center;">Find your terrain →</button>
        </div>
        <div style="margin-top:16px;padding-top:16px;border-top:1px solid rgba(200,146,42,0.10);">
          <button onclick="window.App&&window.App.goDeeper()" style="background:none;border:none;cursor:pointer;font-family:'Cormorant Garamond',Georgia,serif;font-size:14px;font-style:italic;color:rgba(15,21,35,0.45);padding:0;">Or go deeper into what this means for you →</button>
        </div>
      </div>

    </div>
  </div>`;
}

// ─── Question phase handler ───────────────────────────────────────────────────
// Shared across archetype, domain, and scale stages.

async function handleQuestionPhase(session, latestInput, res, northStarCtx = null) {
  const stage     = session.stage;
  const qi        = getQI(session, stage);
  const questions = getStageQuestions(stage);
  const probes    = getStageProbes(stage);
  const transcript = getStageTranscript(session);
  const total     = getStageTotalQuestions(stage);

  const entry = transcript[qi];

  // ── Auto-advance / empty call — surface the correct question for this stage ─────────
  // Always derive from current stage + current stage's questionIndex.
  if (!latestInput) {
    session.currentQuestion = questions[qi].text;
    return res.status(200).json({
      questionLabel: `${capitalise(stage)} · ${qi + 1} of ${total}`,
      session,
      stage,
      questionIndex: qi,
      inputMode:     "text"
    });
  }

  // ── Duplicate message guard ─────────────────────────────────────────────────────────────
  const lastMsg = session.lastUserMessage || null;
  if (latestInput === lastMsg && entry) {
    // Return current question so the frontend can re-render rather than silently stalling
    session.currentQuestion = questions[qi].text;
    return res.status(200).json({
      session,
      stage,
      questionIndex: qi,
      inputMode: "text",
    });
  }
  session.lastUserMessage = latestInput;

  // ── First answer to this question ──────────────────────────────────────────────────────────────────
  if (!entry) {
    if (isConfused(latestInput)) {
      const reframe = CONFUSION_REFRAMES[stage]?.[qi];
      if (reframe) {
        session.currentQuestion = reframe;
        return res.status(200).json({
          message:   reframe,
          session,
          stage,
          inputMode: "text",
          isProbe:   true,
          isReframe: true
        });
      }
    }

    const thin = isThin(latestInput, stage, qi);

    if (!thin) {
      transcript.push({ question: questions[qi].text, answer: latestInput, probes: [], thin: false });
      setPC(session, stage, 0);
      const nextQI = qi + 1;
      setQI(session, stage, nextQI);

      if (nextQI >= total) {
        return await handleStageComplete(session, res, null, northStarCtx);
      }

      session.currentQuestion = questions[nextQI].text;
      return res.status(200).json({
        questionLabel: `${capitalise(stage)} · ${nextQI + 1} of ${total}`,
        session,
        stage,
        questionIndex: nextQI,
        inputMode:     "text"
      });
    }

    // Thin — probe 1
    transcript.push({ question: questions[qi].text, answer: latestInput, probes: [], thin: false });
    setPC(session, stage, 1);
    session.currentQuestion = probes[qi][0];
    return res.status(200).json({
      message:   probes[qi][0],
      session,
      stage,
      inputMode: "text",
      isProbe:   true
    });
  }

  // ── Responding to a probe ──────────────────────────────────────────────────────────────────────
  if (isConfused(latestInput)) {
    const reframe = CONFUSION_REFRAMES[stage]?.[qi];
    if (reframe) {
      session.currentQuestion = reframe;
      return res.status(200).json({
        message:   reframe,
        session,
        stage,
        inputMode: "text",
        isProbe:   true,
        isReframe: true
      });
    }
  }

  const pc         = getPC(session, stage);
  const probeIndex = Math.min(pc - 1, probes[qi].length - 1);
  entry.probes.push({ probe: probes[qi][probeIndex], response: latestInput });
  const combined = entry.answer + " " + entry.probes.map(p => p.response).join(" ");
  const thin     = isThin(combined, stage, qi);

  if (!thin || pc >= 2) {
    if (pc >= 2 && thin) {
      const check = await claudeSignalCheck(questions[qi].text, combined, stage, qi);
      entry.thin  = !check.has_signal;

      if (!check.has_signal && pc === 2) {
        setPC(session, stage, 3);
        const probe3Text = "I want to make sure I'm reading this clearly. Can you give me one specific example — a real moment, even a small one?";
        session.currentQuestion = probe3Text;
        return res.status(200).json({
          message:   probe3Text,
          session,
          stage,
          inputMode: "text",
          isProbe:   true
        });
      }

      if (pc >= 3) {
        entry.thin = true;
        setPC(session, stage, 0);
        const nextQI = qi + 1;
        setQI(session, stage, nextQI);

        if (nextQI >= total) {
          return await handleStageComplete(session, res, "Let's keep moving. I'll work with what's here.", northStarCtx);
        }

        session.currentQuestion = questions[nextQI].text;
        return res.status(200).json({
          message:       "Let's keep moving. I'll work with what's here.",
          questionLabel: `${capitalise(stage)} · ${nextQI + 1} of ${total}`,
          session,
          stage,
          questionIndex: nextQI,
          inputMode:     "text"
        });
      }
    }

    setPC(session, stage, 0);
    const nextQI = qi + 1;
    setQI(session, stage, nextQI);

    if (nextQI >= total) {
      return await handleStageComplete(session, res, null, northStarCtx);
    }

    session.currentQuestion = questions[nextQI].text;
    return res.status(200).json({
      questionLabel: `${capitalise(stage)} · ${nextQI + 1} of ${total}`,
      session,
      stage,
      questionIndex: nextQI,
      inputMode:     "text"
    });
  }

  // Still thin — probe 2
  setPC(session, stage, 2);
  const probe2Text = probes[qi][Math.min(1, probes[qi].length - 1)];
  session.currentQuestion = probe2Text;
  return res.status(200).json({
    message:   probe2Text,
    session,
    stage,
    inputMode: "text",
    isProbe:   true
  });
}
function capitalise(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ─── Stage complete handler ───────────────────────────────────────────────────
// Called when all questions in a stage are answered.
// Extracts tentative coordinate, then either opens next stage or confirmation.

async function handleStageComplete(session, res, prefixMessage = null, northStarCtx = null) {
  const completedStage = session.stage;

  // Extract tentative coordinate for completed stage
  try {
    if (completedStage === "archetype") {
      session.tentative = session.tentative || {};
      session.tentative.archetype = await extractTentativeArchetype(session.archetypeTranscript, northStarCtx);
    } else if (completedStage === "domain") {
      session.tentative.domain = await extractTentativeDomain(session.domainTranscript, northStarCtx);
    } else if (completedStage === "scale") {
      session.tentative.scale = await extractTentativeScale(session.scaleTranscript, northStarCtx);
    }
  } catch (e) {
    console.error(`Tentative extraction failed for ${completedStage}:`, e);
    // Non-fatal — confirmation will still run
  }

  const nextStage = getNextStage(completedStage);

  // Advance to next stage — per-stage counters remain independent
  session.stage = nextStage;

  // Opening next question stage
  if (nextStage === "domain" || nextStage === "scale") {
    const opening  = STAGE_OPENINGS[nextStage];
    const questions = getStageQuestions(nextStage);
    const total    = getStageTotalQuestions(nextStage);

    // Pre-set currentQuestion so the pinned header is ready after auto-advance
    session.currentQuestion = questions[0].text;

    return res.status(200).json({
      message:       opening,
      questionLabel: `${capitalise(nextStage)} · 1 of ${total}`,
      session,
      stage:         nextStage,
      questionIndex: 0,
      inputMode:     "none",
      autoAdvance:   true,
      advanceDelay:  2500,
      stageComplete: completedStage
    });
  }

  // Moving to confirmation
  if (nextStage === "confirmation") {
    let confirmationOpening;
    try {
      const confirmPrompt = buildConfirmationPrompt(session);
      const response = await anthropic.messages.create({
        model:      "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages:   [{
          role:    "user",
          content: "Present the three tentative coordinates and open the confirmation conversation."
        }],
        system: confirmPrompt
      });
      confirmationOpening = response.content[0].text.trim();
    } catch (e) {
      console.error("Confirmation opening failed:", e);
      const t = session.tentative;
      confirmationOpening = `Here's what emerged across the three conversations.\n\nArchetype: ${t.archetype?.archetype || "unclear"}\nDomain: ${t.domain?.domain || "unclear"}\nScale: ${t.scale?.scale || "unclear"}\n\nDoes this land? What feels right, and what doesn't?`;
    }

    session.confirmationHistory = [{ role: "assistant", content: confirmationOpening }];

    return res.status(200).json({
      message:       confirmationOpening,
      session,
      stage:         "confirmation",
      inputMode:     "text",
      stageComplete: completedStage
    });
  }

  return res.status(500).json({ error: "Unexpected stage transition" });
}

// ─── Confirmation phase handler ───────────────────────────────────────────────

async function handleConfirmation(session, latestInput, res, northStarCtx) {
  session.confirmationHistory = session.confirmationHistory || [];

  // ── Opening call — empty latestInput means "open the confirmation" ────────
  // This fires when the client sends stage: 'confirmation' with no user message.
  // If confirmationHistory already exists, return it as-is (idempotent).
  if (!latestInput) {
    if (session.confirmationHistory.length > 0) {
      // Already opened — return session state only, no new message (prevents duplicate bubbles)
      return res.status(200).json({
        session,
        stage:     "confirmation",
        inputMode: "text",
      });
    }
    // Fresh open — run confirmation opening (falls through to build below)
  } else {
    session.confirmationHistory.push({ role: "user", content: latestInput });
  }

  // Lock trigger: the "Yes, lock it in" button sends the canonical phrase,
  // but also catch clear freetext affirmations so the loop can't persist.
  // Lock phrases: only unambiguous explicit lock signals, scoped to confirmation stage only
  // Do NOT include short common words like "confirm", "confirmed", "that fits" — they appear in normal answers
  const lockPhrases = ["yes, lock it in.", "yes, lock it in", "lock it in", "lock it.", "that fits. lock it.", "yes lock it in", "lock it in."]
  const isLockSignal = session.stage === "confirmation" && latestInput && lockPhrases.some(p => latestInput.trim().toLowerCase() === p)
  if (isLockSignal) {
    session.stage = "thinking";
    return res.status(200).json({
      message:      "Reading everything together now.\n\nThis takes a moment.",
      session,
      stage:        "thinking",
      inputMode:    "none",
      autoAdvance:  true,
      advanceDelay: 2000
    });
  }

  // ── Ensure tentative coordinates exist before building confirmation prompt ──
  // They may be missing if the session was restored from Supabase and tentative
  // extraction never ran (e.g. cross-device restore or interrupted session).
  if (!session.tentative?.archetype || !session.tentative?.domain || !session.tentative?.scale) {
    try {
      session.tentative = session.tentative || {};
      if (!session.tentative.archetype && session.archetypeTranscript?.length)
        session.tentative.archetype = await extractTentativeArchetype(session.archetypeTranscript, northStarCtx);
      if (!session.tentative.domain && session.domainTranscript?.length)
        session.tentative.domain = await extractTentativeDomain(session.domainTranscript, northStarCtx);
      if (!session.tentative.scale && session.scaleTranscript?.length)
        session.tentative.scale = await extractTentativeScale(session.scaleTranscript, northStarCtx);
      // Clear stale confirmation history so the conversation starts fresh
      // with the newly extracted coordinates, not the old fallback message
      session.confirmationHistory = [];
    } catch (e) {
      console.error("Tentative recovery failed:", e);
      return res.status(500).json({ error: "Could not recover coordinates. Please try again." });
    }
  }

  // Guard: if still missing after recovery attempt, bail gracefully
  if (!session.tentative?.archetype || !session.tentative?.domain || !session.tentative?.scale) {
    return res.status(200).json({
      message:   "Something went wrong recovering your coordinates. Please refresh and try again.",
      session,
      stage:     "confirmation",
      inputMode: "text",
    });
  }

  // Continue confirmation conversation
  try {
    const confirmPrompt = buildConfirmationPrompt(session);
    // If history is empty (opening call), seed with the standard opening request
    const apiMessages = session.confirmationHistory.length > 0
      ? session.confirmationHistory.map(m => ({ role: m.role, content: m.content }))
      : [{ role: "user", content: "Present the three tentative coordinates and open the confirmation conversation." }];

    const response = await anthropic.messages.create({
      model:      "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system:     northStarCtx ? confirmPrompt + '\n\n' + formatNorthStarContext(northStarCtx) : confirmPrompt,
      messages:   apiMessages
    });

    const reply = response.content[0].text.trim();
    session.confirmationHistory.push({ role: "assistant", content: reply });

    // ── Extract any coordinate corrections from the conversation ────────────
    // After each turn, run a lightweight check to see if confirmed coordinates
    // differ from the tentative ones, and update session.tentative accordingly.
    // This ensures synthesis and framing use corrected coordinates, not the
    // original extraction results.
    try {
      const lastUserMsg = session.confirmationHistory.filter(m => m.role === "user").slice(-1)[0]?.content || "";
      const lockPhrasesCheck = ["yes, lock it in.", "yes, lock it in", "lock it in", "lock it.", "that fits. lock it.", "yes lock it in", "lock it in."]
      if (lastUserMsg && !lockPhrasesCheck.some(p => lastUserMsg.toLowerCase() === p)) {
        const correctionCheck = await anthropic.messages.create({
          model:      "claude-sonnet-4-20250514",
          max_tokens: 300,
          messages:   [{
            role:    "user",
            content: `The user is in a confirmation conversation about their Purpose Piece coordinates.
Current coordinates: Archetype: ${session.tentative.archetype?.archetype}, Domain: ${session.tentative.domain?.domain}, Scale: ${session.tentative.scale?.scale}
User's last message: "${lastUserMsg}"
Assistant's reply: "${reply}"

If the user has clearly corrected or agreed to change one or more coordinates, extract the corrections.
If coordinates are being confirmed as-is or the conversation is exploratory, return no changes.

Return JSON only:
{
  "archetype_correction": "corrected archetype name or null",
  "domain_correction": "corrected domain name or null",
  "scale_correction": "corrected scale name or null"
}`
          }]
        });
        const corrections = extractJSON(correctionCheck.content[0].text);
        if (corrections.archetype_correction) {
          session.tentative.archetype = { ...session.tentative.archetype, archetype: corrections.archetype_correction, confidence: "confirmed", reasoning: `Corrected in confirmation conversation to: ${corrections.archetype_correction}` };
        }
        if (corrections.domain_correction) {
          session.tentative.domain = { ...session.tentative.domain, domain: corrections.domain_correction, confidence: "confirmed", reasoning: `Corrected in confirmation conversation to: ${corrections.domain_correction}` };
        }
        if (corrections.scale_correction) {
          session.tentative.scale = { ...session.tentative.scale, scale: corrections.scale_correction, confidence: "confirmed", reasoning: `Corrected in confirmation conversation to: ${corrections.scale_correction}` };
        }
      }
    } catch { /* non-fatal — corrections are best-effort */ }

    // AI signals readiness — front-end shows the explicit "Yes, lock it in" button.
    const readySignals = ["ready to see", "ready to lock", "shall we", "want to proceed", "good to go"];
    const aiReadyNow   = readySignals.some(s => reply.toLowerCase().includes(s));

    return res.status(200).json({
      message:     reply,
      session,
      stage:       "confirmation",
      inputMode:   aiReadyNow ? "confirm" : "text",
      readyToLock: aiReadyNow
    });

  } catch (e) {
    console.error("Confirmation conversation error:", e);
    return res.status(500).json({ error: "Confirmation failed", details: e.message });
  }
}

// ─── Synthesis pipeline ───────────────────────────────────────────────────────
// Order: thinking → profile card (Phase 4) → auto-advance 6s → mirror (Phase 3)
// The profile names and structures. The mirror goes deeper.
// Confirmation conversation is optional, triggered post-mirror by the person.

async function runSynthesis(session, res) {
  // Guard: if tentative coordinates are missing, extract them now before Phase 4
  // This can happen if the frontend's session merge lost tentative data
  if (!session.tentative?.archetype || !session.tentative?.domain || !session.tentative?.scale) {
    try {
      session.tentative = session.tentative || {};
      if (!session.tentative.archetype && session.archetypeTranscript?.length)
        session.tentative.archetype = await extractTentativeArchetype(session.archetypeTranscript);
      if (!session.tentative.domain && session.domainTranscript?.length)
        session.tentative.domain = await extractTentativeDomain(session.domainTranscript);
      if (!session.tentative.scale && session.scaleTranscript?.length)
        session.tentative.scale = await extractTentativeScale(session.scaleTranscript);
    } catch (e) {
      console.error("Tentative recovery in runSynthesis failed:", e);
      return res.status(500).json({ error: "Could not extract coordinates. Please try again." });
    }
    // If still missing after recovery, bail
    if (!session.tentative?.archetype || !session.tentative?.domain || !session.tentative?.scale) {
      return res.status(500).json({ error: "Missing coordinates — please refresh and try again." });
    }
  }

  // Phase 4 fires first — profile card with all coordinates named
  let p4;
  try {
    p4 = await runPhase4(session);
  } catch (e) {
    console.error("Phase 4 error:", e);
    return res.status(500).json({ error: "Framing failed", details: e.message });
  }

  session.stage = "framing";

  // Save profile to session so mirror (Phase 3) has access to confirmed coordinates
  session.p4Profile = p4;

  return res.status(200).json({
    message:                   renderPhase4(p4),
    isHtml:                    true,
    session,
    stage:                     "synthesis",   // frontend treats this as the first reveal
    inputMode:                 "none",
    autoAdvance:               true,
    advanceDelay:              6000,           // 6-second pause before mirror fires
    profile:                   p4,
    identity_statement_system: p4.civilisational_statement || null
  });
}

async function runFraming(session, res) {
  // Phase 3 fires second — mirror reflection, unlabelled, going deeper
  let synthesis;
  try {
    synthesis = await runPhase3(session);
  } catch (e) {
    console.error("Phase 3 error:", e);
    return res.status(500).json({ error: "Reflection failed", details: e.message });
  }

  session.synthesis = synthesis;
  session.status    = "complete";
  session.stage     = "complete";

  return res.status(200).json({
    message:      synthesis.synthesis_text,
    sections:     synthesis.sections,
    session,
    stage:        "complete",
    inputMode:    "none",
    complete:     true,
    isMirror:     true,   // frontend uses this to apply mirror card styling
  });
}

// ─── Main handler ─────────────────────────────────────────────────────────────

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader("Access-Control-Allow-Headers", "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version");

  if (req.method === "OPTIONS") { res.status(200).end(); return; }

  const { messages, session: clientSession, userId } = req.body || {};

  const northStarCtx = userId ? await getNorthStarContext(userId) : null
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Messages array required" });
  }

  try {
    let session = clientSession || null;

    // ── New session ───────────────────────────────────────────────────────────────
    if (!session || session.status === undefined) {
      session = createSession();
      session.stage = "archetype";
      session.currentQuestion = ARCHETYPE_QUESTIONS[0].text;
      // Send archetype opening as a bubble, then auto-advance to Q1.
      // currentQuestion pre-set so pinned header is ready after advance.
      return res.status(200).json({
        message:      STAGE_OPENINGS.archetype,
        session,
        stage:        "archetype",
        inputMode:    "none",
        autoAdvance:  true,
        advanceDelay: 2500,
      });
    }

    // ── Complete ──────────────────────────────────────────────────────────────────────────
    if (session.status === "complete") {
      return res.status(200).json({
        message:   "Your Purpose Piece has been delivered.",
        session,
        stage:     "complete",
        inputMode: "none"
      });
    }

    const userMessages = messages.filter(m => m.role === "user");
    const latestInput  = userMessages[userMessages.length - 1]?.content?.trim() || "";

    // ── Welcome → archetype opening ─────────────────────────────────────────────────────
    if (session.stage === "welcome") {
      session.stage = "archetype";
      session.currentQuestion = ARCHETYPE_QUESTIONS[0].text;
      return res.status(200).json({
        message:      STAGE_OPENINGS.archetype,
        session,
        stage:        "archetype",
        inputMode:    "none",
        autoAdvance:  true,
        advanceDelay: 2500,
      });
    }

    // ── Question stages ───────────────────────────────────────────────────────
    if (["archetype", "domain", "scale"].includes(session.stage)) {
      return await handleQuestionPhase(session, latestInput, res, northStarCtx);
    }

    // ── Reveal — "See your Purpose Piece" button fires this ─────────────────
    // Triggered by client sending stage: 'reveal' with empty messages.
    // Runs extraction if needed, then fires profile card (Phase 4).
    if (session.stage === "reveal") {
      session.stage = "thinking";
      return await runSynthesis(session, res);
    }

    // ── Thinking → profile card (Phase 4) ────────────────────────────────────
    if (session.stage === "thinking") {
      return await runSynthesis(session, res);
    }

    // ── Framing → mirror (Phase 3) ────────────────────────────────────────────
    if (session.stage === "framing") {
      return await runFraming(session, res);
    }

    // ── Correction — optional post-mirror confirmation conversation ───────────
    // Triggered voluntarily by the person after seeing their full Purpose Piece.
    // Not a mandatory gate. Corrections write back to session.tentative.
    if (session.stage === "correction") {
      session.stage = "confirmation";
      return await handleConfirmation(session, latestInput, res, northStarCtx);
    }

    // ── Confirmation (ongoing turns) ──────────────────────────────────────────
    if (session.stage === "confirmation") {
      return await handleConfirmation(session, latestInput, res, northStarCtx);
    }

    return res.status(200).json({ message: "Something went wrong. Please refresh.", session, inputMode: "text" });

  } catch (error) {
    console.error("API error:", error);
    return res.status(500).json({ error: "Internal server error", details: error.message });
  }
};
