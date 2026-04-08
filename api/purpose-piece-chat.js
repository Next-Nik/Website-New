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
const NORTH_STAR_IDENTITY = `You are North Star — the AI companion present throughout the NextUs Life OS ecosystem. You are consistent across every tool: The Map, Foundation, Orienteering, Purpose Piece, Target Sprint, and Expansion. When context about this person exists from other tools, you reference it naturally. You never introduce yourself as "an AI assistant" or "Claude." You are North Star.`



// ─── Session factory ──────────────────────────────────────────────────────────

function createSession() {
  return {
    stage:               "archetype",
    questionIndex:       0,
    probeCount:          0,
    archetypeTranscript: [],
    domainTranscript:    [],
    scaleTranscript:     [],
    tentative:           null,
    synthesis:           null,
    status:              "active"
  };
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

  // Cost and shadow questions are abstract — lower word minimum
  const minWords = (stage === "archetype" && qi >= 3) ? 15
                 : (stage === "domain")               ? 18
                 : (stage === "scale")                ? 12
                 : 20;

  if (words.length < minWords) return true;

  const deflectorCount = GENERIC_DEFLECTORS.filter(d => lower.includes(d)).length;
  if (deflectorCount >= 2) return true;

  // Behavioural questions need grounding — attentional and scale questions do not
  if (stage === "archetype" && qi <= 2) {
    const hasTime    = TIME_ANCHORS.some(t => lower.includes(t));
    const hasAction  = ACTION_VERBS.some(v => lower.includes(v));
    const hasSetting = /\b(work|office|home|family|friend|community|meeting|team|partner|colleague|school|hospital|city|neighbourhood|neighborhood|organisation|organization)\b/.test(lower);
    if (!hasTime && !hasAction && !hasSetting) return true;
  }

  return false;
}

async function claudeSignalCheck(question, answer) {
  try {
    const response = await anthropic.messages.create({
      model:      "claude-sonnet-4-20250514",
      max_tokens: 200,
      messages:   [{
        role:    "user",
        content: `Evaluate signal quality for a behavioural assessment answer.\n\nQuestion: "${question}"\nAnswer: "${answer}"\n\nReturn JSON only:\n{"has_signal": true or false, "missing": ["concrete_example","specificity","stakes","honesty"], "one_probe_question": "single best follow-up"}`
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
  archetype: null, // goes straight to Q1 from welcome

  domain: `Good. Now a different kind of question.

The last set was about what you do. This one is about what pulls your attention — what you find yourself caring about even when you have no reason to.

There are three questions. Answer honestly, not aspirationally.`,

  scale: `Last set.

These two questions are almost philosophical. Take your time with them. There are no right answers — only honest ones.`
};

// ─── Welcome ──────────────────────────────────────────────────────────────────

const WELCOME = `You have a specific role in the future of humanity. This is how we find it.

Three conversations. Each one finding something different about you — not what you've done or what you believe about yourself, but the underlying shape of how you move through the world.

Answer as yourself right now. Not who you're working toward. Not who you think you should be.

Your answers reveal three things: your contribution archetype, your domain, and your scale. Together — your Purpose Piece.

Ready?`;

// ─── Tentative coordinate extraction ─────────────────────────────────────────
// After each stage completes, run a lightweight Claude call to extract
// the tentative coordinate from that stage's transcript.
// This is fast and cheap — not the full synthesis.

async function extractTentativeArchetype(transcript) {
  const text = transcript.map((e, i) =>
    `Q${i+1} — ${ARCHETYPE_QUESTIONS[i].label}\n${ARCHETYPE_QUESTIONS[i].text}\nAnswer: ${e.answer}${e.thin ? " [evasive]" : ""}`
  ).join("\n\n---\n\n");

  const response = await anthropic.messages.create({
    model:      "claude-sonnet-4-20250514",
    max_tokens: 600,
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

ANSWERS:\n${text}

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

async function extractTentativeDomain(transcript) {
  const text = transcript.map((e, i) =>
    `Q${i+1} — ${DOMAIN_QUESTIONS[i].label}\n${DOMAIN_QUESTIONS[i].text}\nAnswer: ${e.answer}${e.thin ? " [evasive]" : ""}`
  ).join("\n\n---\n\n");

  const response = await anthropic.messages.create({
    model:      "claude-sonnet-4-20250514",
    max_tokens: 400,
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

ANSWERS:\n${text}

Return JSON only:
{
  "domain": "single domain name exactly as listed above",
  "confidence": "strong | blended | thin",
  "secondary": "second domain if blended, else null",
  "reasoning": "2-3 sentences — specific evidence cited"
}`
    }]
  });

  return extractJSON(response.content[0].text);
}

async function extractTentativeScale(transcript) {
  const text = transcript.map((e, i) =>
    `Q${i+1} — ${SCALE_QUESTIONS[i].label}\n${SCALE_QUESTIONS[i].text}\nAnswer: ${e.answer}${e.thin ? " [evasive]" : ""}`
  ).join("\n\n---\n\n");

  const response = await anthropic.messages.create({
    model:      "claude-sonnet-4-20250514",
    max_tokens: 400,
    messages:   [{
      role:    "user",
      content: `Based on these answers, identify the most coherent scale of operation.

THE SEVEN SCALES (coherence bandwidth, not ambition level):
- HOME: Immediate household, closest relationships. Deeply personal, highly intimate.
- NEIGHBOURHOOD: Local community, face-to-face networks. Direct relationships.
- CITY: Urban systems, institutional engagement, civic scale.
- PROVINCE/STATE: Regional systems, multi-community, policy and infrastructure.
- COUNTRY: National systems, cross-community, governance and culture.
- CONTINENT: Multi-national, transboundary challenges.
- GLOBAL: International, planetary systems, cross-border coordination.

IMPORTANT: Scale is coherence bandwidth — where the person can act with full presence and genuine effectiveness. Not where they aspire to operate. Not the scale of their interests. Where their felt responsibility actually lives.

A person can think at global scale and operate most effectively at neighbourhood scale. Both are real. Name where effectiveness actually lives, not where intellectual interest goes.

ANSWERS:\n${text}

Return JSON only:
{
  "scale": "single scale name exactly as listed above",
  "confidence": "strong | blended | thin",
  "tension": "if interest scale differs from effectiveness scale, describe the tension — else null",
  "reasoning": "2-3 sentences — specific evidence cited"
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

  const response = await anthropic.messages.create({
    model:      "claude-sonnet-4-20250514",
    max_tokens: 1200,
    system:     PHASE3_SYSTEM,
    messages:   [{
      role:    "user",
      content: `Here are the ten answers across three stages:\n\n${transcriptText}\n\nConfirmed coordinates:\nArchetype: ${session.tentative.archetype.archetype}\nDomain: ${session.tentative.domain.domain}\nScale: ${session.tentative.scale.scale}`
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

Section 1 — Signal (1 paragraph, 1-3 sentences):
Compress the Initial Reflection throughline. Open with the instinct, not the archetype name.

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
  "signal_restatement":    "1 paragraph",
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

  const payload = `INITIAL REFLECTION:\n${session.synthesis.synthesis_text}

INTERNAL SIGNALS:\n${JSON.stringify(session.synthesis.internal_signals, null, 2)}

CONFIRMED COORDINATES:
Archetype: ${arch.archetype}${arch.secondary ? ` (blended with ${arch.secondary})` : ""}
Domain: ${dom.domain}
Scale: ${scale.scale}${scale.tension ? `\nScale tension: ${scale.tension}` : ""}

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

  const domainMatch = p4.domain_frame.match(/domain.*?is ([A-Z][a-z &]+)/i);
  const domainName  = domainMatch ? domainMatch[1].trim() : "";

  const scaleMatch = p4.scale_frame.match(/scale.*?is ([A-Z][a-zA-Z/\s]+?)[\.\,]/);
  const scaleName  = scaleMatch ? scaleMatch[1].trim() : "";

  const resourcesHtml = p4.resources.map(r =>
    `<div class="profile-resource">
      <div class="profile-resource-title">${esc(r.title)}</div>
      <div class="profile-resource-why">${esc(r.why)}</div>
    </div>`
  ).join("");

  return `<div class="profile-card">

    <div class="profile-hero">
      <div class="profile-card-heading">Your Purpose Piece</div>
      <div class="profile-archetype-name">${esc(archetypeName)}</div>
      <div class="profile-meta">${esc(domainName)}<span class="profile-meta-divider">·</span>${esc(scaleName)}</div>
    </div>

    <div class="profile-section">
      <div class="profile-section-label">Signal</div>
      <p>${esc(p4.signal_restatement)}</p>
    </div>

    <div class="profile-section">
      <div class="profile-section-label">Archetype</div>
      <p>${esc(p4.archetype_frame)}</p>
    </div>

    <div class="profile-section">
      <div class="profile-section-label">Domain</div>
      <p>${esc(p4.domain_frame)}</p>
    </div>

    <div class="profile-section">
      <div class="profile-section-label">Scale</div>
      <p>${esc(p4.scale_frame)}</p>
    </div>

    <div class="profile-section">
      <div class="profile-section-label">Responsibility</div>
      <p>${esc(p4.responsibility)}</p>
    </div>

    <div class="profile-section profile-section-actions">
      <div class="profile-section-label">What this looks like</div>
      <div class="profile-actions">
        <div class="profile-action">
          <span class="profile-action-tier">This week</span>
          <span>${esc(p4.actions.light)}</span>
        </div>
        <div class="profile-action">
          <span class="profile-action-tier">Ongoing</span>
          <span>${esc(p4.actions.medium)}</span>
        </div>
        <div class="profile-action">
          <span class="profile-action-tier">Structural</span>
          <span>${esc(p4.actions.deep)}</span>
        </div>
      </div>
    </div>

    <div class="profile-section profile-section-resources">
      <div class="profile-section-label">Worth exploring</div>
      <div class="profile-resources">${resourcesHtml}</div>
    </div>

    <div class="profile-closing">This is what you carry. The question now is what you do with it.</div>

    <div class="profile-nexus">
      <div class="profile-nexus-eyebrow">Your Place in the Larger Map</div>
      <p class="profile-nexus-statement">${esc(p4.civilisational_statement || "")}</p>
      <p class="profile-nexus-body">NextUs is a living map of where humanity actually is across seven domains — and where the people showing up for the gap between where we are and where we could be are working. Your Purpose Piece is your entry point.</p>
      <a href="https://nextus.world" class="profile-nexus-link">Explore the civilisational map &rarr;</a>
    </div>

    <div class="profile-personal-note-section">
      <div class="profile-section-label">In Your Own Words</div>
      <textarea
        id="ppPersonalNote"
        class="pp-note-textarea"
        placeholder="What does this actually mean to you? Write it in your own voice — the version that sounds like you."
        oninput="App.onPpNoteInput(this.value)"
      ></textarea>
      <p class="pp-note-hint">When you've written your own version, it leads. The profile sits behind it.</p>
      <div id="ppToolOutputToggle" style="margin-top:14px;">
        <button class="pp-expand-btn" onclick="App.togglePpProfile()" id="ppExpandBtn">
          See your Purpose Piece profile →
        </button>
        <div id="ppProfileSummary" style="display:none;" class="pp-profile-summary">
          <p><strong>${esc(archetypeName)}</strong> · ${esc(domainName)} · ${esc(scaleName)}</p>
          <p style="margin-top:8px;font-style:italic;color:rgba(15,21,35,0.55);">${esc(p4.signal_restatement || "")}</p>
        </div>
      </div>
      <button class="pp-lock-btn" id="ppLockBtn" onclick="App.lockPpNote()" style="display:none;">
        Lock this as my statement ✓
      </button>
      <div class="pp-locked-msg" id="ppLockedMsg" style="display:none;">
        <span>✓ Locked.</span> Your words lead now.
      </div>
    </div>

    <div class="profile-threshold">
      <div class="profile-threshold-eyebrow">First Look</div>
      <p class="profile-threshold-body">This is your instinct as it reads from the outside. The shape is here. What isn't here yet is the tension — what this costs you at the bone, where the instinct breaks, and what it has been asking of you that you haven't fully faced. That's the second conversation.</p>
      <button class="btn-go-deeper" onclick="App.goDeeper()">Go deeper &rarr;</button>
    </div>

  </div>`;
}

// ─── Question phase handler ───────────────────────────────────────────────────
// Shared across archetype, domain, and scale stages.

async function handleQuestionPhase(session, latestInput, res) {
  const stage     = session.stage;
  const qi        = session.questionIndex;
  const questions = getStageQuestions(stage);
  const probes    = getStageProbes(stage);
  const transcript = getStageTranscript(session);
  const total     = getStageTotalQuestions(stage);

  const entry = transcript[qi];

  // ── Duplicate message guard ──────────────────────────────────────────────────
  // Two identical consecutive messages — treat as re-send, not a new answer
  const lastMsg = session.lastUserMessage || null;
  if (latestInput === lastMsg && entry) {
    // Already processed this answer — just re-send the last probe or current question
    const currentQ = session.currentQuestion || questions[qi].text;
    return res.status(200).json({
      message:   currentQ,
      session,
      stage,
      inputMode: "text",
      isProbe:   !!entry
    });
  }
  session.lastUserMessage = latestInput;

  // ── First answer to this question ──────────────────────────────────────────
  if (!entry) {
    // Confusion detection — user doesn't understand the question
    if (isConfused(latestInput)) {
      const reframe = CONFUSION_REFRAMES[stage]?.[qi];
      if (reframe) {
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
      session.probeCount  = 0;
      session.questionIndex++;

      // Stage complete
      if (session.questionIndex >= total) {
        return await handleStageComplete(session, res);
      }

      session.currentQuestion = questions[session.questionIndex].text;
      return res.status(200).json({
        message:       questions[session.questionIndex].text,
        questionLabel: `${capitalise(stage)} · ${session.questionIndex + 1} of ${total}`,
        session,
        stage,
        questionIndex: session.questionIndex,
        inputMode:     "text"
      });
    }

    // Thin — probe 1
    transcript.push({ question: questions[qi].text, answer: latestInput, probes: [], thin: false });
    session.probeCount = 1;
    return res.status(200).json({
      message:   probes[qi][0],
      session,
      stage,
      inputMode: "text",
      isProbe:   true
    });
  }

  // ── Responding to a probe ───────────────────────────────────────────────────
  // Confusion mid-probe — offer reframe
  if (isConfused(latestInput)) {
    const reframe = CONFUSION_REFRAMES[stage]?.[qi];
    if (reframe) {
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

  const probeIndex = Math.min(session.probeCount - 1, probes[qi].length - 1);
  entry.probes.push({ probe: probes[qi][probeIndex], response: latestInput });
  const combined = entry.answer + " " + entry.probes.map(p => p.response).join(" ");
  const thin     = isThin(combined, stage, qi);

  if (!thin || session.probeCount >= 2) {
    if (session.probeCount >= 2 && thin) {
      const check = await claudeSignalCheck(questions[qi].text, combined);
      entry.thin  = !check.has_signal;

      if (!check.has_signal && session.probeCount === 2) {
        session.probeCount = 3;
        return res.status(200).json({
          message:   "I want to make sure I'm reading this clearly. Can you give me one specific example — a real moment, even a small one?",
          session,
          stage,
          inputMode: "text",
          isProbe:   true
        });
      }

      if (session.probeCount >= 3) {
        entry.thin           = true;
        session.probeCount   = 0;
        session.questionIndex++;

        if (session.questionIndex >= total) {
          return await handleStageComplete(session, res, "Let's keep moving. I'll work with what's here.");
        }

        session.currentQuestion = questions[session.questionIndex].text;
        return res.status(200).json({
          message:       "Let's keep moving. I'll work with what's here.",
          questionLabel: `${capitalise(stage)} · ${session.questionIndex + 1} of ${total}`,
          session,
          stage,
          questionIndex: session.questionIndex,
          inputMode:     "text"
        });
      }
    }

    session.probeCount = 0;
    session.questionIndex++;

    if (session.questionIndex >= total) {
      return await handleStageComplete(session, res);
    }

    return res.status(200).json({
      message:       questions[session.questionIndex].text,
      questionLabel: `${capitalise(stage)} · ${session.questionIndex + 1} of ${total}`,
      session,
      stage,
      questionIndex: session.questionIndex,
      inputMode:     "text"
    });
  }

  // Still thin — probe 2
  session.probeCount = 2;
  return res.status(200).json({
    message:   probes[qi][Math.min(1, probes[qi].length - 1)],
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

async function handleStageComplete(session, res, prefixMessage = null) {
  const completedStage = session.stage;

  // Extract tentative coordinate for completed stage
  try {
    if (completedStage === "archetype") {
      session.tentative = session.tentative || {};
      session.tentative.archetype = await extractTentativeArchetype(session.archetypeTranscript);
    } else if (completedStage === "domain") {
      session.tentative.domain = await extractTentativeDomain(session.domainTranscript);
    } else if (completedStage === "scale") {
      session.tentative.scale = await extractTentativeScale(session.scaleTranscript);
    }
  } catch (e) {
    console.error(`Tentative extraction failed for ${completedStage}:`, e);
    // Non-fatal — confirmation will still run
  }

  const nextStage = getNextStage(completedStage);

  // Advance to next stage
  session.stage         = nextStage;
  session.questionIndex = 0;
  session.probeCount    = 0;

  // Opening next question stage
  if (nextStage === "domain" || nextStage === "scale") {
    const opening  = STAGE_OPENINGS[nextStage];
    const questions = getStageQuestions(nextStage);
    const total    = getStageTotalQuestions(nextStage);

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
        max_tokens: 500,
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

async function handleConfirmation(session, latestInput, res) {
  session.confirmationHistory = session.confirmationHistory || [];
  session.confirmationHistory.push({ role: "user", content: latestInput });

  // Client-driven lock: the "Yes, lock it in" button sends this exact phrase.
  // This is the single authoritative lock trigger — no freetext inference.
  if (latestInput.trim().toLowerCase() === "yes, lock it in.") {
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

  // Continue confirmation conversation
  try {
    const confirmPrompt = buildConfirmationPrompt(session);
    const apiMessages   = session.confirmationHistory.map(m => ({ role: m.role, content: m.content }));

    const response = await anthropic.messages.create({
      model:      "claude-sonnet-4-20250514",
      max_tokens: 500,
      system:     northStarCtx ? confirmPrompt + '\n\n' + formatNorthStarContext(northStarCtx) : confirmPrompt,
      messages:   apiMessages
    });

    const reply = response.content[0].text.trim();
    session.confirmationHistory.push({ role: "assistant", content: reply });

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

async function runSynthesis(session, res) {
  let synthesis;
  try {
    synthesis = await runPhase3(session);
  } catch (e) {
    console.error("Phase 3 error:", e);
    return res.status(500).json({ error: "Reflection failed", details: e.message });
  }

  session.synthesis = synthesis;
  session.stage     = "framing";

  return res.status(200).json({
    message:      synthesis.synthesis_text,
    sections:     synthesis.sections,
    session,
    stage:        "synthesis",
    inputMode:    "none",
    autoAdvance:  true,
    advanceDelay: 6000
  });
}

async function runFraming(session, res) {
  let p4;
  try {
    p4 = await runPhase4(session);
  } catch (e) {
    console.error("Phase 4 error:", e);
    return res.status(500).json({ error: "Framing failed", details: e.message });
  }

  session.status = "complete";
  session.stage  = "complete";

  return res.status(200).json({
    message:                   renderPhase4(p4),
    isHtml:                    true,
    session,
    stage:                     "complete",
    inputMode:                 "none",
    complete:                  true,
    profile:                   p4,
    identity_statement_system: p4.civilisational_statement || null
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

    // ── New session ───────────────────────────────────────────────────────────
    if (!session || session.status === undefined) {
      session = createSession();
      session.stage = "archetype";
      session.currentQuestion = ARCHETYPE_QUESTIONS[0].text;
      return res.status(200).json({
        message:       ARCHETYPE_QUESTIONS[0].text,
        questionLabel: `Archetype · 1 of ${ARCHETYPE_QUESTIONS.length}`,
        session,
        stage:         "archetype",
        inputMode:     "text"
      });
    }

    // ── Complete ──────────────────────────────────────────────────────────────
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

    // ── Welcome → first archetype question ───────────────────────────────────
    if (session.stage === "welcome") {
      session.stage = "archetype";
      return res.status(200).json({
        message:       ARCHETYPE_QUESTIONS[0].text,
        questionLabel: `Archetype · 1 of ${ARCHETYPE_QUESTIONS.length}`,
        session,
        stage:         "archetype",
        questionIndex: 0,
        inputMode:     "text"
      });
    }

    // ── Question stages ───────────────────────────────────────────────────────
    if (["archetype", "domain", "scale"].includes(session.stage)) {
      return await handleQuestionPhase(session, latestInput, res);
    }

    // ── Confirmation ──────────────────────────────────────────────────────────
    if (session.stage === "confirmation") {
      return await handleConfirmation(session, latestInput, res);
    }

    // ── Thinking → synthesis ──────────────────────────────────────────────────
    if (session.stage === "thinking") {
      return await runSynthesis(session, res);
    }

    // ── Framing ───────────────────────────────────────────────────────────────
    if (session.stage === "framing") {
      return await runFraming(session, res);
    }

    return res.status(200).json({ message: "Something went wrong. Please refresh.", session, inputMode: "text" });

  } catch (error) {
    console.error("API error:", error);
    return res.status(500).json({ error: "Internal server error", details: error.message });
  }
};
