// LIFE OS — CHAT ENGINE v3
// Seven domains + Brain as synthesis question
// Domains: Path, Spark, Body, Finances, Relationships, Inner Game, Outer Game
// Stewardship frame throughout. Behavioural evidence over self-report.
// Corpus upgrades: Avatar theatre framing, character synthesis step, thinness named not routed,
// Horizon Goal calibration probe, permission for partial models, job/path distinction,
// Spark permission-first, Finances dual-track (objective + emotional), Brain as closing synthesis.

const Anthropic = require("@anthropic-ai/sdk");
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── The seven domains ────────────────────────────────────────────────────────
const DOMAINS = [
  {
    id: "path",
    label: "Path",
    stewardshipQuestion: "Am I walking my path — or just walking?",
    fractal: "Vision",
    avatarPrompt: `We're starting with Path — not your job, but your gift alive in the world. The question this domain holds is: am I on my path, and am I actually moving?

To set your scale, I want you to build a character. Think of the people — living, historical, fictional, or composite — who represent what 10/10 looks like in this domain for someone like you. Not best in the world in general. Best in the world for the life you're here to live.

A few things worth knowing as you build this:

You can include someone you admire in one dimension even if you wouldn't want their whole life. Someone whose vision you want without their impact on people around them. Someone whose scale you want without their values. We're building a character, not endorsing a person — so bring the part that matters and leave the rest. Modifiers are welcome. That's not a caveat, it's useful data.

Don't edit the list toward people only in your field. The outliers often crack the pattern open.

One more thing worth naming: your job might be part of your Path — or it might simply be what puts food on the table while your Path gets lived somewhere else entirely. What you do for income doesn't have to be meaningful, it just has to be functional for you. Someone can be fully on their Path without their job being any part of it, as long as your job isn't taking away from your Path in a significant way. We're asking about Path, not employment.

Now — who's in your character? Give me the names, the composites, the qualities. Anyone who belongs.`,

    avatarSynthesisPrompt: `Good. Before we move to where you actually are, I want to make sure we've captured the character clearly enough.

Looking at who you named — what do these people share? What's the essential quality or combination of qualities you're pointing at? Imagine this character walking into a room or onto a stage. What would an audience immediately see and understand about them? What's unmistakable?

We're not looking for a list of their achievements. We're looking for the essence — specific enough that someone could play the role.`,

    placementPrompt: `Now — with that character as your 10 — describe what Path actually looks like in your life right now.

Not where you want it to be. Not where you're headed. Where it actually is.

What are you doing, how does it feel, what's genuinely moving, and where are you stalled or in the wrong lane entirely? If you're running two tracks — the work that pays and the work that calls — include both. They're often different and both matter here.`,

    horizonPrompt: `If a genie tapped you on the head right now and granted your wish in Path — what would it be?

Not the character you built. Not the ceiling. Your actual wish for your actual life.

Some people want the full expression of the character. Most want something more specific and closer — a particular project alive, a particular kind of day as the norm, a particular kind of contribution landing. There's no wrong answer. The genie is asking what would feel like winning for you specifically.`
  },
  {
    id: "spark",
    label: "Spark",
    stewardshipQuestion: "Is the fire on?",
    fractal: "Human Being",
    avatarPrompt: `Spark holds the animating force — the thing that makes you specifically alive. Not fun or relaxation, though those can be expressions of it. The real question this domain asks is: is the fire on?

To set your scale — who or what represents 10/10 in Spark for someone like you? Someone whose aliveness is unmistakable. Whose fire is clearly on. This might be a person, a way of being, a specific quality of presence.

Same rules: composites welcome, partial models welcome, outliers welcome. Who belongs in this character?`,

    avatarSynthesisPrompt: `What does this character radiate? If you distilled what you're pointing at down to the essential quality of their aliveness — what is it? What's on in them that you want on in you?`,

    permissionPrompt: `Before I ask where you are — one question first.

When you imagine genuinely making time for the things that make you feel alive — not productive, not useful, just alive — what comes up for you?

Is there anything in the way of that, even before we get to what it would look like?`,

    placementPrompt: `Where is your Spark right now — honestly?

Not your energy levels or your schedule. The fire itself. Is it on, off, dimmed, flickering? Where do you feel genuinely alive in your week, and where has something gone quiet that used to be lit?

Be specific about what's actually present and what's actually absent.`,

    horizonPrompt: `If a genie granted your wish in Spark — what would it be? What would genuinely alive feel like in your actual daily life? What would be present that isn't now?`
  },
  {
    id: "body",
    label: "Body",
    stewardshipQuestion: "How is this living system doing?",
    fractal: "Nature",
    avatarPrompt: `Body holds the living ecology — you're not maintaining a vessel, you're in relationship with a living system. The stewardship question is: how is this system doing?

To set your scale — who represents 10/10 in Body for someone like you specifically? Your age, your context, your history. Not a generic fitness ideal. The best physical expression of what's actually possible and meaningful for someone with your specific life.

Composites welcome. Partial models welcome — someone whose energy you want without their obsession, someone whose relationship with food you want without the extremes.`,

    avatarSynthesisPrompt: `What does this character's relationship with their body actually look like? What's the quality — not the metrics, but the lived experience? What would you immediately notice about how they inhabit their physical life?`,

    placementPrompt: `Where is your Body right now — honestly?

Describe the living system: energy levels, sleep, how you move, how you eat, how you feel inside your physical life day to day. Include what you're minimising or glossing over. Injuries count. Fatigue counts. Post-burnout recovery counts. The gap between what you intend and what you actually do counts.`,

    horizonPrompt: `If a genie granted your wish in Body — what would it be? Not the Avatar. What would genuinely thriving in your body feel like for your actual life? What would you be able to do, how would you feel, what would be different about how you inhabit your days?`
  },
  {
    id: "finances",
    label: "Finances",
    stewardshipQuestion: "Do I have the agency to act on what matters?",
    fractal: "Finance & Economy",
    avatarPrompt: `Finances holds agency — the power to make things happen. A low score here doesn't primarily mean not enough money. It means lacking the power to act on what matters.

To set your scale — who represents 10/10 in Finances for someone like you? Someone whose relationship with money and resources genuinely represents what's possible — not just the numbers, but the agency, the freedom, the relationship to abundance and scarcity.

Partial models especially welcome here. Someone whose financial freedom you want without their relationship to accumulation. Someone whose generosity you want without their specific path to it.

One thing worth naming: your job might be the engine that powers your finances, or your Path might be, or some combination. However income arrives is fine — we're asking about your relationship to resources and agency, not how you earn or whether your income is meaningful to you.`,

    avatarSynthesisPrompt: `What's the essential quality you're pointing at in this character? Is it the freedom, the security, the generosity, the agency — or some specific combination? What would you immediately sense about how they relate to money and resources?`,

    placementPrompt: `Where are you honestly right now in Finances?

Two things matter here and they're often different: your objective position — the actual numbers, debt, runway, income — and your emotional relationship to money — how it feels, how much it runs you, whether you feel empowered or constrained.

Tell me both. They're both real data.`,

    horizonPrompt: `If a genie granted your wish in Finances — what would it be? What would financial thriving actually look like for your specific life — not the ceiling, your actual wish?`
  },
  {
    id: "relationships",
    label: "Relationships",
    stewardshipQuestion: "Am I truly known by anyone?",
    fractal: "Society",
    avatarPrompt: `Relationships holds the depth of human connection — the question isn't how many people you know, it's whether anyone truly knows you.

To set your scale — who represents 10/10 here for someone like you? Someone whose depth of connection, quality of belonging, and health of bonds genuinely represents what's possible.

Think across the different layers: intimate partnership, close friendships, family, community. Your character might be stronger in some layers than others — that's worth noting.`,

    avatarSynthesisPrompt: `What's the essential quality in this character's relationships? Is it the depth, the safety, the being-known, the community — what's unmistakable about how they connect with people?`,

    placementPrompt: `Where are your Relationships right now — honestly?

The quality of your closest connections, your sense of belonging, what's genuinely deep and what's lonely or frayed. Include what's circumstantial — if you've recently moved, if people are far away, if there's been rupture. Context matters here.`,

    horizonPrompt: `If a genie granted your wish in Relationships — what would it be? What would your ideal relational life actually look like — not the perfect version, your genuine wish?`
  },
  {
    id: "inner_game",
    label: "Inner Game",
    stewardshipQuestion: "Are my stories tending me, or running me?",
    fractal: "Legacy",
    avatarPrompt: `Inner Game holds the stories you carry — not beliefs in the abstract, but the specific narrative inheritance from your history, your family, your culture, your inner critic. The stewardship question is: are these stories tending you, or running you?

To set your scale — who represents 10/10 in Inner Game for someone like you? Someone with a genuinely healthy, grounded, honest internal life. Not someone who has it all figured out — someone who has a real relationship with their own interior.`,

    avatarSynthesisPrompt: `What's the quality you're pointing at in this character's inner life? What does their relationship with themselves actually look like — under pressure, in private, when things go wrong?`,

    placementPrompt: `What's your Inner Game actually like right now?

Not the fluent version you'd give in a coaching session. The real one. The specific recurring patterns, the operating beliefs that run in the background, the stories about yourself you haven't fully examined. Where do you feel genuinely solid inside, and where are you running on old programming?

If this domain is hard to answer — that's worth naming too.`,

    horizonPrompt: `If a genie granted your wish in Inner Game — what would it be? What would a genuinely healthy, grounded inner life feel like for you specifically?`
  },
  {
    id: "outer_game",
    label: "Outer Game",
    stewardshipQuestion: "Is what I'm broadcasting aligned with who I actually am?",
    fractal: "Society",
    avatarPrompt: `Outer Game holds the broadcast — the signal you send to the world about who you are and what you stand for, whether you're conscious of it or not. A low score here isn't an aesthetic problem. It's a gap between inner truth and outer transmission.

To set your scale — who represents 10/10 in Outer Game for someone like you? Someone whose external expression — how they present, how they carry themselves, what they put into the world — is genuinely aligned with who they are inside.`,

    avatarSynthesisPrompt: `What's unmistakable about this character's broadcast? What do people immediately receive when they encounter them — online, in person, in their environment? What's the alignment you're pointing at?`,

    placementPrompt: `Where are you right now in Outer Game — honestly?

How you're actually showing up externally. Your appearance, your environment, your digital presence, the gap between how you want to be perceived and how you're actually coming across. Include what you've been meaning to change but haven't. The presence that's planned but not yet public.`,

    horizonPrompt: `If a genie granted your wish in Outer Game — what would it be? What would genuine alignment between your inner truth and your outer broadcast look like for your actual life?`
  }
];

// ─── Brain — closing synthesis question (not a peer domain) ──────────────────
const BRAIN_PROMPT = `One final question — and this one is different from the others.

Brain isn't a domain to assess like the rest. It's a synthesis question that takes its shape from everything you've just shared.

Given your Horizon Life across all seven domains — the life you've described wanting in Path, Spark, Body, Finances, Relationships, Inner Game, and Outer Game — what do you actually need to learn?

Not what you think you should learn. Not what's interesting in the abstract. What knowledge, skill, or understanding would most directly close the gap between where you are and where you want to be?`;

// ─── Session factory ──────────────────────────────────────────────────────────
function createSession() {
  return {
    phase: "welcome",
    domainIndex: 0,
    domainStep: "avatar",        // avatar → avatar_synthesis → permission(spark only) → placement → horizon → horizon_calibration
    probeCount: 0,
    transcript: [],
    domainData: {},
    currentPlacement: null,
    brainAnswer: null,
    status: "active"
  };
}

// ─── Thin answer detection ────────────────────────────────────────────────────
function isThin(answer) {
  const words = answer.trim().split(/\s+/).filter(Boolean);
  if (words.length < 12) return true;
  const deflectors = ["not sure", "idk", "i don't know", "nothing", "don't know", "not really"];
  const lower = answer.toLowerCase();
  return deflectors.filter(d => lower.includes(d)).length >= 2;
}

// ─── Thinness response — name it, don't route around it ──────────────────────
function thinnessResponse(step, probeCount) {
  if (probeCount === 0) {
    if (step === "avatar") return `I notice this one didn't come as easily. Is it that the domain feels less alive right now, or is there something here you're not quite ready to look at?\n\nEither way — even a rough answer works. Who came to mind first, even if they feel like an odd choice?`;
    if (step === "placement") return `I notice this one came out thin. Is this domain less active for you right now, or is there something that's harder to say honestly?\n\nBoth are useful. What's actually true here, even if it's uncomfortable?`;
    if (step === "horizon") return `When the genie question lands thin, it usually means one of two things — either this domain isn't live enough yet to imagine changing, or there's something you want but haven't let yourself fully go for.\n\nWhich is closer? What would you say if you let yourself answer honestly?`;
  }
  return `Even a brief honest answer is more useful than a complete one that isn't quite true. What's actually present here right now?`;
}

// ─── Placement inference prompt ───────────────────────────────────────────────
function placementInferencePrompt(session, domain) {
  return `You operate within the NextUs ecosystem — a framework built on the belief that being human is an honour and a responsibility, and that every person is a participant in a living system larger than themselves.

HOW YOU SEE THE PERSON IN FRONT OF YOU:
Treat every person as capable and responsible for their life. This is not harshness — it is the deepest form of respect. Your job is never to rescue. Your job is to find where their agency lives and point them toward it.

When someone is struggling, read them like a Kryptonian with kryptonite in them. Superman is not weak because kryptonite is jabbed into him — he is Superman with something in the way. The struggle is situational, not definitional. Your job is to help locate and remove what's in the way, not to redefine the person by their current constraint.

You are a champion of their Horizon Self — the fully expressed version of who they already are. You hold that version of them in mind throughout every conversation, even when they cannot see it themselves. Especially then. You are on the side of their greatness, not their wounds. You treat their wounds with care, but you fight for their greatness.

WHAT THIS MEANS IN PRACTICE:
- Lead with capability, not deficit
- Financial stress is not automatically a survival crisis — hold it lightly until the picture is clearer
- Everything starts with regulation — a dysregulated person cannot access their agency. AND execution-mode people also need a thinking partner, not just grounding exercises. Hold both.
- Vision-scale people should be met at the scale of their vision
- Never leave someone feeling smaller than when they arrived
- Always look for where the agency lives — even in exhaustion, even in constraint

u are the Life OS assessment engine. Infer honest placement for ${domain.label}.

Stewardship question: "${domain.stewardshipQuestion}"
Avatar character: ${session.domainData[domain.id]?.characterBrief || session.domainData[domain.id]?.avatarList || "not captured"}
Current reality: ${session.currentPlacement}

Infer an honest score from behavioural evidence only — not aspirations, not intentions, not self-assessment. Read what they emphasised, minimised, and omitted. The scale uses half-point increments.

THE HORIZON SCALE — score against these precisely. Each tier has a descriptive label (the wink) alongside the meaning.
10  World-Class       | Best in the world        — Complete coherence. Effortless mastery, luminous presence, contribution that uplifts others. The art and the artist are one.
9.5 Exemplar+         | Elite professional       — Integrated and at ease. Leads by example; influence radiates naturally.
9   Exemplar          | Professional             — Deeply skilled, balanced, reliable. Excellence feels natural and sustainable.
8.5 Fluent+           | Elite ranked amateur     — Competence meets wisdom; growth through curiosity and depth.
8   Fluent            | High level ranked amateur — Solid foundations, steady excellence, self-aware and grounded.
7.5 Capable+          | Elite recreational player — Consistent progress; confidence building through deliberate practice.
7   Capable           | High level recreational player — Dependable, engaged, purposeful.
6.5 Functional+       | Elite casual athlete     — Mostly consistent; stabilising habits, pacing energy.
6   Functional        | Casual athlete           — Competent, responsible; maintaining, sometimes fatigued.
5.5 Plateau+          | Making an effort (occasionally) — Curiosity stirring; ready to move again.
── THE LINE (5) — Development above. Healing below. ──
4.5 Friction+         | Teetering on the edge    — Restless recognition that change is due.
4   Friction          | Attempting to get off the couch — Desire present, momentum low; self-judgment softening into openness.
3.5 Strain+           | Leaving an indent on the couch — Inconsistent, overwhelmed, starting to see the cycle.
3   Strain            | Afraid to look in the mirror — Energy collapsed inward; fear or shame active. Needs rest, not force.
2.5 Crisis+           | Danger to oneself        — High stress, low support; survival instincts active.
2   Crisis            | Barely functioning       — Basics unmet, clarity lost; exhaustion or anxiety chronic.
1.5 Emergency+        | Hurting real bad / numb  — Alternating between intensity and shutdown.
1   Emergency         | Almost dead              — Spiritually or emotionally collapsed; light dimmed.
0   Ground Zero       | In the ground            — End of a cycle. Stillness before rebirth.

CRITICAL: Any score below 5 means this domain is actively creating harm to the person and the people around them. Name this honestly in the reflection without shame. Use the tier language naturally.

Write a 2-3 sentence reflection grounded in what they actually described. Warm, direct, precise. Reference specific things they said. Include the tier name naturally.

Respond ONLY with valid JSON, no markdown:
{"score":<0-10 in 0.5 increments>,"tier":"<tier name>","reflection":"<2-3 sentences>","invite_correction":"<one sentence>"}`;
}

// ─── Avatar synthesis prompt ──────────────────────────────────────────────────
function avatarSynthesisPrompt(session, domain) {
  return `You operate within the NextUs ecosystem — a framework built on the belief that being human is an honour and a responsibility, and that every person is a participant in a living system larger than themselves.

HOW YOU SEE THE PERSON IN FRONT OF YOU:
Treat every person as capable and responsible for their life. This is not harshness — it is the deepest form of respect. Your job is never to rescue. Your job is to find where their agency lives and point them toward it.

When someone is struggling, read them like a Kryptonian with kryptonite in them. Superman is not weak because kryptonite is jabbed into him — he is Superman with something in the way. The struggle is situational, not definitional. Your job is to help locate and remove what's in the way, not to redefine the person by their current constraint.

You are a champion of their Horizon Self — the fully expressed version of who they already are. You hold that version of them in mind throughout every conversation, even when they cannot see it themselves. Especially then. You are on the side of their greatness, not their wounds. You treat their wounds with care, but you fight for their greatness.

WHAT THIS MEANS IN PRACTICE:
- Lead with capability, not deficit
- Financial stress is not automatically a survival crisis — hold it lightly until the picture is clearer
- Everything starts with regulation — a dysregulated person cannot access their agency. AND execution-mode people also need a thinking partner, not just grounding exercises. Hold both.
- Vision-scale people should be met at the scale of their vision
- Never leave someone feeling smaller than when they arrived
- Always look for where the agency lives — even in exhaustion, even in constraint

u are the Life OS assessment engine. Synthesise a character brief for ${domain.label}.

Avatar list: ${session.domainData[domain.id]?.avatarList || ""}
Character description: ${session.domainData[domain.id]?.avatarCharacter || ""}

Write a 2-3 sentence character brief capturing the essential quality they're pointing at. Specific enough to be recognisable. Written as a character description, not a list of achievements.

Respond ONLY with valid JSON, no markdown:
{"characterBrief":"<2-3 sentences>"}`;
}

// ─── Final synthesis prompt ───────────────────────────────────────────────────
function finalSynthesisPrompt(session) {
  const domainSummaries = Object.entries(session.domainData).map(([id, data]) => {
    const d = DOMAINS.find(d => d.id === id);
    if (!d) return "";
    return `${d.label} — "${d.stewardshipQuestion}"
  Score: ${data.score}/10
  Character: ${data.characterBrief || data.avatarList || "not captured"}
  Current reality: ${data.placement || "not captured"}
  Horizon Goal: ${data.horizon || "not captured"}`;
  }).filter(Boolean).join("\n\n");

  return `You operate within the NextUs ecosystem — a framework built on the belief that being human is an honour and a responsibility, and that every person is a participant in a living system larger than themselves.

HOW YOU SEE THE PERSON IN FRONT OF YOU:
Treat every person as capable and responsible for their life. This is not harshness — it is the deepest form of respect. Your job is never to rescue. Your job is to find where their agency lives and point them toward it.

When someone is struggling, read them like a Kryptonian with kryptonite in them. Superman is not weak because kryptonite is jabbed into him — he is Superman with something in the way. The struggle is situational, not definitional. Your job is to help locate and remove what's in the way, not to redefine the person by their current constraint.

You are a champion of their Horizon Self — the fully expressed version of who they already are. You hold that version of them in mind throughout every conversation, even when they cannot see it themselves. Especially then. You are on the side of their greatness, not their wounds. You treat their wounds with care, but you fight for their greatness.

WHAT THIS MEANS IN PRACTICE:
- Lead with capability, not deficit
- Financial stress is not automatically a survival crisis — hold it lightly until the picture is clearer
- Everything starts with regulation — a dysregulated person cannot access their agency. AND execution-mode people also need a thinking partner, not just grounding exercises. Hold both.
- Vision-scale people should be met at the scale of their vision
- Never leave someone feeling smaller than when they arrived
- Always look for where the agency lives — even in exhaustion, even in constraint

u are the Life OS assessment engine delivering the final map.

Domain data:
${domainSummaries}

Brain synthesis: ${session.brainAnswer || "not provided"}

Produce the final Life OS map.

STAGE — identify from score patterns:
Stabilisation: Multiple domains 2-4, needs stabilisation before development work
Orientation: Mixed 3-6, needs honest self-location and life coherence
Alignment: Most domains 5-7, ready to look outward at contribution
Development: Most domains 6-8, compounding what's working
Transformation: Most domains 7+, hitting identity ceiling, ready for crossing

FOCUS DOMAINS — three most catalytic right now. CRITICAL TRIAGE RULE: any domain scoring below 5 is an active harm zone and must be included as a focus domain — this takes priority over catalytic potential. Below-5 domains are addressed before optimisation work elsewhere.

OVERALL REFLECTION — 3-4 paragraphs. This is the recognition moment. Write as someone who listened carefully to their whole life for the last hour. Not a report. Not a list. A genuine synthesis — their current reality, their Horizon Goals, what the patterns show, what's possible. Every sentence should only be possible because of what this specific person shared. The emotional endpoint is not "that's accurate" — it is "how did it know that."

Respond ONLY with valid JSON, no markdown:
{"stage":"<Stabilisation|Orientation|Alignment|Development|Transformation>","stage_description":"<2-3 sentences specific to them, not generic>","focus_domains":["<id>","<id>","<id>"],"focus_reasoning":"<why these three — below-5 domains named first if present, then catalytic logic>","overall_reflection":"<3-4 paragraphs>","brain_insight":"<what the Brain answer reveals>","next_step":"<one honest specific sentence>"}`;
}


// ─── Life Horizon synthesis prompt ───────────────────────────────────────────
function lifeHorizonPrompt(session) {
  const horizons = Object.entries(session.domainData).map(([id, data]) => {
    const d = DOMAINS.find(d => d.id === id);
    if (!d || !data.horizon) return null;
    return `${d.label}: "${data.horizon}"`;
  }).filter(Boolean).join("\n");

  return `You have the seven domain Horizon Goals that someone expressed for their own life during a Life OS assessment. Each is their honest answer to "if a genie granted your wish here, what would it be?"

Their seven domain horizons:
${horizons}

Their overall stage: ${session.brainAnswer ? "has completed Brain synthesis" : "assessment complete"}

Write a single unified Life Horizon Goal that holds all seven of these together — the whole life, not a summary of parts. This is not a list. It is one paragraph, one to three sentences, written in the first person as if this person is speaking it. It should feel like something they could read and say "yes — that's actually it."

Rules:
- Written in first person ("I am..." or "My life is..." or "I live...")
- One paragraph, 1-3 sentences maximum
- Holds the emotional truth across all seven, not just the loudest ones
- Describes a state, not a plan — present tense, alive quality
- Plain language — no management speak, no spiritual clichés
- Should feel like it could only have been written for this specific person based on what they shared

Return ONLY the text of the Horizon Goal. No preamble, no explanation, no JSON.`;
}

// ─── Main handler ─────────────────────────────────────────────────────────────
module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { messages = [], session: clientSession } = req.body;
  const session = clientSession || createSession();

  try {

    // ── Welcome ───────────────────────────────────────────────────────────────
    if (session.phase === "welcome" || messages.length === 0) {
      return res.json({
        session,
        phase: "welcome",
        phaseLabel: "The Map",
        message: `The Map is a process through which you will connect to the version of your life on the other side of the things you've been wanting to fix, change, alter, improve, repair, and heal. If that work was done, what life would you be living, and who would you be?\n\nFor the purpose of this tool, those are called your Horizon Life and your Horizon Self.\n\nThe process maps where you are and where you want to be across seven domains: Path, Spark, Body, Finances, Relationships, Inner Game, and Outer Game. You might think you only want to work on one specific area — but they're all interconnected, and often the stress you feel in one is a symptom of a lag in another. Map the whole system and we'll go from there.\n\nThree steps per domain:\n\n1. 10/10 — Build a character representing your ideal in that area. A living person, a dead person, a composite, or a list of qualities. This calibrates the scale to you specifically.\n2. Where are you now? — Using the scale, establish where you honestly are in each domain right now.\n3. Horizon Goal — If a genie tapped you on the head and granted your wish in this area, what would it be?\n\nSome people take five minutes per domain. Others take a full day or more. Work at your pace — your progress will be saved as you go.\n\nReady to begin?`,
        inputMode: "none",
        autoAdvance: true,
        advanceDelay: 2200
      });
    }

    // ── Welcome auto-advance → start Path ───────────────────────────────────────
    if (session.phase === "welcome") {
      session.phase = "domain";
      session.domainIndex = 0;
      session.domainStep = "avatar";
      return res.json({
        session,
        phase: "domain",
        phaseLabel: "Path — 1 of 7",
        message: DOMAINS[0].avatarPrompt,
        inputMode: "text"
      });
    }

    const userMessage = messages[messages.length - 1]?.content || "";
    session.transcript.push({ role: "user", content: userMessage });

    const domain = session.domainIndex < DOMAINS.length ? DOMAINS[session.domainIndex] : null;
    const domainId = domain?.id;

    // ── Brain synthesis ───────────────────────────────────────────────────────
    if (session.phase === "brain") {
      session.brainAnswer = userMessage;
      session.phase = "final_synthesis";

      // Run map synthesis and life horizon synthesis in parallel
      const [synthResponse, horizonResponse] = await Promise.all([
        anthropic.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2500,
          messages: [{ role: "user", content: finalSynthesisPrompt(session) }]
        }),
        anthropic.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 300,
          messages: [{ role: "user", content: lifeHorizonPrompt(session) }]
        })
      ]);

      let synthData;
      try {
        const raw = synthResponse.content[0].text.replace(/```json|```/g, "").trim();
        synthData = JSON.parse(raw);
      } catch {
        synthData = {
          stage: "Orientation",
          stage_description: "You're in the process of seeing your whole life clearly.",
          focus_domains: ["path", "spark", "inner_game"],
          focus_reasoning: "These three domains show the most catalytic potential based on what you've shared.",
          overall_reflection: "You've shared something real across all seven domains. The picture that emerges is of someone navigating meaningful gaps between current reality and a genuinely envisioned Horizon Life.",
          brain_insight: "Your learning gaps are specific and actionable.",
          next_step: "Start with your three focus domains and your Horizon Goal within each."
        };
      }

      // Attach life horizon draft
      const lifeHorizonDraft = horizonResponse.content[0].text.trim();
      synthData.life_horizon_draft = lifeHorizonDraft;

      session.phase = "complete";

      return res.json({
        session,
        phase: "complete",
        phaseLabel: "Your Life OS Map",
        complete: true,
        mapData: synthData,
        inputMode: "none"
      });
    }

    // ── Placement confirmation ────────────────────────────────────────────────
    if (session.phase === "placement_confirm") {
      if (!session.domainData[domainId]) session.domainData[domainId] = {};
      // Accept half-point corrections (e.g. "4.5", "7", "6.5")
      const correctionMatch = userMessage.match(/\b(10|[0-9](?:\.[05])?)\b/);
      if (correctionMatch) session.domainData[domainId].score = parseFloat(correctionMatch[1]);

      session.phase = "domain";
      session.domainStep = "horizon";
      session.probeCount = 0;

      return res.json({
        session,
        phase: "domain",
        phaseLabel: `${domain.label} — Horizon Goal`,
        message: domain.horizonPrompt,
        inputMode: "text"
      });
    }

    // ── Main domain flow ──────────────────────────────────────────────────────
    if (session.phase === "domain") {
      if (!session.domainData[domainId]) session.domainData[domainId] = {};

      // AVATAR — collect list
      if (session.domainStep === "avatar") {
        if (isThin(userMessage) && session.probeCount < 2) {
          session.probeCount++;
          return res.json({ session, phase: "domain", phaseLabel: `${domain.label} — Your 10`, message: thinnessResponse("avatar", session.probeCount - 1), inputMode: "text" });
        }

        session.domainData[domainId].avatarList = userMessage;
        session.domainStep = "avatar_synthesis";
        session.probeCount = 0;

        return res.json({
          session,
          phase: "domain",
          phaseLabel: `${domain.label} — The Character`,
          message: domain.avatarSynthesisPrompt,
          inputMode: "text"
        });
      }

      // AVATAR SYNTHESIS — extract character essence, Claude synthesises brief
      if (session.domainStep === "avatar_synthesis") {
        if (isThin(userMessage) && session.probeCount < 1) {
          session.probeCount++;
          return res.json({ session, phase: "domain", phaseLabel: `${domain.label} — The Character`, message: `What would be unmistakable about this character if they walked into a room? What's the one quality that ties all of them together?`, inputMode: "text" });
        }

        session.domainData[domainId].avatarCharacter = userMessage;

        const synthResponse = await anthropic.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 400,
          messages: [{ role: "user", content: avatarSynthesisPrompt(session, domain) }]
        });

        let synthData;
        try {
          const raw = synthResponse.content[0].text.replace(/```json|```/g, "").trim();
          synthData = JSON.parse(raw);
        } catch {
          synthData = { characterBrief: "Someone who embodies this domain at its fullest expression for someone like you." };
        }

        session.domainData[domainId].characterBrief = synthData.characterBrief;
        session.probeCount = 0;

        // Spark gets permission question before placement
        if (domain.id === "spark") {
          session.domainStep = "permission";
          return res.json({
            session,
            phase: "domain",
            phaseLabel: `${domain.label} — Permission`,
            message: `${synthData.characterBrief}\n\nThat's your 10 in Spark.\n\n${domain.permissionPrompt}`,
            inputMode: "text"
          });
        }

        session.domainStep = "placement";
        return res.json({
          session,
          phase: "domain",
          phaseLabel: `${domain.label} — Where You Are`,
          message: `${synthData.characterBrief}\n\nThat's your 10 in ${domain.label}.\n\n${domain.placementPrompt}`,
          inputMode: "text"
        });
      }

      // PERMISSION (Spark only) — acknowledge and move to placement
      if (session.domainStep === "permission") {
        session.domainData[domainId].permissionAnswer = userMessage;
        session.domainStep = "placement";
        session.probeCount = 0;

        return res.json({
          session,
          phase: "domain",
          phaseLabel: `${domain.label} — Where You Are`,
          message: domain.placementPrompt,
          inputMode: "text"
        });
      }

      // PLACEMENT — collect, then Claude infers score
      if (session.domainStep === "placement") {
        if (isThin(userMessage) && session.probeCount < 2) {
          session.probeCount++;
          return res.json({ session, phase: "domain", phaseLabel: `${domain.label} — Where You Are`, message: thinnessResponse("placement", session.probeCount - 1), inputMode: "text" });
        }

        session.currentPlacement = userMessage;
        session.domainData[domainId].placement = userMessage;

        const inferResponse = await anthropic.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 600,
          messages: [{ role: "user", content: placementInferencePrompt(session, domain) }]
        });

        let inferData;
        try {
          const raw = inferResponse.content[0].text.replace(/```json|```/g, "").trim();
          inferData = JSON.parse(raw);
        } catch {
          inferData = { score: 5, tier: "Plateau", reflection: "Here's what I'm reading from what you've shared.", invite_correction: "Does this feel accurate?" };
        }

        session.domainData[domainId].score = inferData.score;
        session.domainData[domainId].tier  = inferData.tier || "";
        session.phase = "placement_confirm";
        session.domainStep = "horizon";
        session.probeCount = 0;

        const tierLabel = inferData.tier ? ` — ${inferData.tier}` : "";
        const DESCRIPTIVE_LABELS = {
          "World-Class": "Best in the world", "Exemplar+": "Elite professional",
          "Exemplar": "Professional", "Fluent+": "Elite ranked amateur",
          "Fluent": "High level ranked amateur", "Capable+": "Elite recreational player",
          "Capable": "High level recreational player", "Functional+": "Elite casual athlete",
          "Functional": "Casual athlete", "Plateau+": "Making an effort (occasionally)",
          "Plateau": "The pass/fail mark", "Friction+": "Teetering on the edge",
          "Friction": "Attempting to get off the couch", "Strain+": "Leaving an indent on the couch",
          "Strain": "Afraid to look in the mirror", "Crisis+": "Danger to oneself",
          "Crisis": "Barely functioning", "Emergency+": "Hurting real bad / numb",
          "Emergency": "Almost dead", "Ground Zero": "In the ground"
        };
        const descriptive = inferData.tier ? DESCRIPTIVE_LABELS[inferData.tier] : null;
        const descriptiveLabel = descriptive ? ` _${descriptive}._` : "";
        return res.json({
          session,
          phase: "placement_confirm",
          phaseLabel: `${domain.label} — Placement`,
          message: `${inferData.reflection}\n\nI'm reading you at ${inferData.score}/10 in ${domain.label}${tierLabel}.${descriptiveLabel}\n\n${inferData.invite_correction}`,
          inputMode: "text"
        });
      }

      // HORIZON GOAL — genie question + calibration probe
      if (session.domainStep === "horizon") {
        if (isThin(userMessage) && session.probeCount < 1) {
          session.probeCount++;
          return res.json({ session, phase: "domain", phaseLabel: `${domain.label} — Horizon Goal`, message: thinnessResponse("horizon", 0), inputMode: "text" });
        }

        // Calibration probe — catches Avatar conflation (runs once per domain)
        if (!session.domainData[domainId].horizonCalibrated) {
          session.domainData[domainId].horizonCalibrated = true;
          session.domainData[domainId].horizonDraft = userMessage;

          return res.json({
            session,
            phase: "domain",
            phaseLabel: `${domain.label} — Horizon Goal`,
            message: `If you woke up tomorrow with that granted — what's the first thing you'd notice was different? What would your actual day look like?\n\nSometimes the wish and the character are the same thing. Sometimes they're not. Just want to make sure we have the real one.`,
            inputMode: "text"
          });
        }

        // Store final Horizon Goal
        session.domainData[domainId].horizon = userMessage;

        const nextIndex = session.domainIndex + 1;

        // All seven done — Brain synthesis question
        if (nextIndex >= DOMAINS.length) {
          session.phase = "brain";
          return res.json({
            session,
            phase: "brain",
            phaseLabel: "Brain — The Synthesis Question",
            message: BRAIN_PROMPT,
            inputMode: "text"
          });
        }

        // Next domain
        session.domainIndex = nextIndex;
        session.domainStep = "avatar";
        session.phase = "domain";
        session.probeCount = 0;

        const nextDomain = DOMAINS[nextIndex];
        const transitions = ["Good.", "Moving.", "Understood.", "With you.", "Noted.", "Continuing."];
        const transition = transitions[nextIndex - 1] || "";

        return res.json({
          session,
          phase: "domain",
          phaseLabel: `${nextDomain.label} — ${nextIndex + 1} of 7`,
          message: `${transition}\n\n${nextDomain.avatarPrompt}`,
          inputMode: "text"
        });
      }
    }

    return res.json({ session, phase: session.phase, message: "Let's keep going.", inputMode: "text" });

  } catch (err) {
    console.error("Life OS engine error:", err);
    return res.status(500).json({ error: "Something went wrong. Please try again." });
  }
};
