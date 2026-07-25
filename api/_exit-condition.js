// api/_exit-condition.js
// ─────────────────────────────────────────────────────────────────────────────
// The Sacred Limit, as code.
//
//   "NextSteps never fakes an exit condition. Exit conditions are checkable
//    behavioural statements or they do not ship. The pressure will come to
//    soften them into feelings ('you feel more confident') because feelings are
//    always affirmable and progress then always available. That is fabricated
//    progress — the platform's deepest no. A phase that cannot state a checkable
//    exit is not finished being designed."
//                    — NextSteps Conceptual Foundation v2.0.1, Section 5
//
// A prompt asking a model nicely for behavioural exit conditions will produce
// soft ones some of the time. Soft exit conditions are the failure mode that
// quietly destroys the whole instrument, because a phase that ends when you
// "feel ready" never ends, or ends whenever you like — which is the same thing
// as fabricated progress. So the rule is enforced here, on the way out of the
// model, and a draft that cannot pass is refused rather than softened.
//
// This validator judges the AI's drafts ONLY. It is deliberately NOT applied to
// the person's own edits: the route is theirs once ratified, and policing their
// wording would be a verdict about the person (Tone Law 1).
//
// Underscore-prefixed so Vercel does not route it as an endpoint.
// ─────────────────────────────────────────────────────────────────────────────

// ─── 1. Feeling-state exits ──────────────────────────────────────────────────
// "You feel more confident." Unfalsifiable, so always affirmable, so worthless.
// The test is not the word "feel" in isolation: "you can name what you feel
// before you speak" is a real behavioural exit. What fails is a feeling as the
// TERMINAL CONDITION.
const FEELING_EXITS = [
  /\byou (?:feel|felt)\b(?!\s+(?:able|safe enough|ready) to\s+\w+)/i,
  /\bfeel(?:s|ing)?\s+(?:more|less|genuinely|truly|really)?\s*(?:confident|ready|calm|clear|settled|comfortable|secure|motivated|at peace|good|better|able|aligned|grounded)\b/i,
  /\b(?:sense|feeling) of (?:confidence|readiness|clarity|calm|peace|purpose|alignment|momentum)\b/i,
  /\byou (?:believe|trust|know) (?:in )?yourself\b/i,
  /\b(?:mindset|inner state|self-belief|self-worth|headspace) (?:has |is |feels )?(?:shift|change|improv|grow)/i,
  /\bno longer (?:feel|fear|doubt|worry)/i,
  /\byou are (?:comfortable|confident|ready|at ease|okay) (?:with|about)\b/i,
];

// ─── 2. Deadline grammar ─────────────────────────────────────────────────────
// "A phase has an exit condition, not a due date." (§4, forbidden patterns.)
// Note what is NOT here: frequency and streaks. "Three times a week for a
// month" is behavioural evidence a person can answer yes or no to, and is
// welcome. What is refused is a DUE DATE — time as the thing that ends the
// phase rather than the thing the evidence is measured over.
const DEADLINE_GRAMMAR = [
  /\bby (?:the end of|next|this coming|mid-|early |late )/i,
  /\bby (?:january|february|march|april|may|june|july|august|september|october|november|december)\b/i,
  /\bby (?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
  /\bwithin (?:the )?(?:next )?\d+\s*(?:day|week|month|year)/i,
  /\bwithin (?:a|one|two|three|four|five|six)\s+(?:day|week|month|year)/i,
  /\b(?:deadline|due date|target date|timeline|time frame|timeframe)\b/i,
  /\b(?:on track|behind schedule|ahead of schedule|falling behind)\b/i,
  /\byou should have\b/i,
  /\bafter (?:\d+|one|two|three|four|five|six|twelve)\s*(?:days?|weeks?|months?)\s+(?:of|have passed|has passed)?\s*$/i,
  /\b(?:phase|stage) \d+ (?:lasts|takes|runs for)\b/i,
];

// ─── 3. Uncheckable vagueness ────────────────────────────────────────────────
// An exit condition has to be answerable yes or no by the person themselves,
// without a judge. These are the shapes that cannot be.
const VAGUE_EXITS = [
  /\b(?:you )?(?:really |truly |fully )?understand(?:s|ing)?\b(?!\s+(?:what|how|why|the)\s+\w+.*\b(?:enough to|well enough to)\b)/i,
  /\byou (?:have )?(?:a )?(?:better|deeper|clearer|greater) (?:understanding|awareness|appreciation|grasp|relationship)\b/i,
  /\bwhen (?:it|the time) (?:feels|seems) right\b/i,
  /\byou (?:are|have become) (?:someone who|a person who|the kind of)\b/i,
  /\bsignificant(?:ly)? (?:progress|improvement|growth|change)\b/i,
  /\bas (?:much|often) as (?:you can|possible)\b/i,
  /\byou('| a)?re (?:doing|making) (?:well|good|progress)\b/i,
  /\bconsistently\b(?!\s+(?:for|over|across|\d))/i,
];

// A checkable exit is a statement about something that happened or is
// observably true. It should contain at least one anchor: a countable, an
// artifact, an observable act, or an explicit yes/no state of the world.
const BEHAVIOURAL_ANCHORS = [
  /\b\d+\b/,                                                    // any number
  /\b(?:once|twice|one|two|three|four|five|six|seven|eight|nine|ten)\b/i,
  /\b(?:every|each) (?:day|week|month|morning|evening|session)\b/i,
  /\bhas (?:been )?(?:sent|written|published|booked|signed|paid|filed|shipped|launched|posted|recorded|scheduled|completed|submitted|delivered|answered|met|joined|left|started|stopped)\b/i,
  /\byou have (?:sent|written|published|booked|signed|paid|filed|shipped|launched|posted|recorded|scheduled|completed|submitted|delivered|spoken|met|joined|asked|told|contacted|applied|volunteered|donated|attended|run|built|made|had|said|left|stopped|started)\b/i,
  /\byou (?:can|are able to) \w+/i,
  // Past-perfect anything: "has confirmed", "have replied", "had been accepted".
  // Deliberately broad. The three forbidden-pattern lists above do the real
  // filtering; this last test is only a backstop against a pure vibe with no
  // event in it at all, so it should not be the thing that fails a good draft.
  /\b(?:has|have|had) (?:been )?\w+(?:ed|en|nt|ung|one|ade)\b/i,
  /\bthere (?:is|are) (?:a|an|at least)\b/i,
  /\bexists?\b/i,
  /\bin (?:writing|your calendar|your diary|the shared)\b/i,
  /\bwithout (?:notes|help|preparation|checking|asking)\b/i,
];

/**
 * Validate one exit condition.
 * Returns { ok: true } or { ok: false, reason: string } where `reason` is
 * written to be fed straight back to the model as a correction instruction.
 */
function validateExitCondition(text) {
  const s = String(text || '').trim();

  if (!s) {
    return { ok: false, reason: 'The exit condition is empty.' };
  }
  if (s.length < 12) {
    return {
      ok: false,
      reason: `"${s}" is too short to be checkable. State the observable thing that must be true.`,
    };
  }
  if (s.length > 240) {
    return {
      ok: false,
      reason: `"${s.slice(0, 60)}…" is too long. One checkable statement, not a paragraph. If it needs an "and" for every clause, it is really two phases.`,
    };
  }

  for (const re of FEELING_EXITS) {
    if (re.test(s)) {
      return {
        ok: false,
        reason: `"${s}" ends the phase on a feeling. A feeling is always affirmable, so it is not a real exit. Replace it with the behaviour that would be evidence of that feeling — what would the person be DOING that they are not doing now?`,
      };
    }
  }

  for (const re of DEADLINE_GRAMMAR) {
    if (re.test(s)) {
      return {
        ok: false,
        reason: `"${s}" contains deadline grammar. A phase is defined by its exit condition, not by time. Remove the date or schedule. (Frequency over a period is fine: "three times a week for a month" is behaviour. "By the end of March" is a due date.)`,
      };
    }
  }

  for (const re of VAGUE_EXITS) {
    if (re.test(s)) {
      return {
        ok: false,
        reason: `"${s}" cannot be honestly answered yes or no. Rewrite it so the person themselves can tell, today, whether it is true, without anyone judging.`,
      };
    }
  }

  const anchored = BEHAVIOURAL_ANCHORS.some((re) => re.test(s));
  if (!anchored) {
    return {
      ok: false,
      reason: `"${s}" has no behavioural anchor. A checkable exit names something countable, something that exists, or something done: a number, an artifact, or an act. Rewrite it so there is one.`,
    };
  }

  return { ok: true };
}

/**
 * Validate a whole drafted route.
 * Returns { ok, problems: string[] } — problems are phrased as instructions.
 */
function validateRoute(phases) {
  const problems = [];

  if (!Array.isArray(phases) || phases.length < 3 || phases.length > 6) {
    problems.push(
      `A route is 3 to 6 phases. You returned ${Array.isArray(phases) ? phases.length : 0}. Fewer and it is not a route; more and it is a plan pretending to certainty it cannot have.`
    );
    return { ok: false, problems };
  }

  phases.forEach((p, i) => {
    const n = i + 1;
    if (!p || typeof p !== 'object') {
      problems.push(`Phase ${n} is not an object.`);
      return;
    }
    if (typeof p.name !== 'string' || p.name.trim().length < 2) {
      problems.push(`Phase ${n} needs a short plain name.`);
    }
    if (typeof p.name === 'string' && p.name.trim().length > 48) {
      problems.push(`Phase ${n}'s name is too long. Short and plain, the person's own language.`);
    }
    if (typeof p.work !== 'string' || p.work.trim().length < 20) {
      problems.push(
        `Phase ${n} needs a description of the work: what doing this phase looks like day to day.`
      );
    }
    const v = validateExitCondition(p.exit_condition);
    if (!v.ok) problems.push(`Phase ${n} exit condition: ${v.reason}`);
  });

  // Two phases with the same exit condition means one of them is not a phase.
  const seen = new Map();
  phases.forEach((p, i) => {
    const key = String(p?.exit_condition || '').trim().toLowerCase();
    if (!key) return;
    if (seen.has(key)) {
      problems.push(
        `Phases ${seen.get(key) + 1} and ${i + 1} share an exit condition. If two phases end on the same evidence, they are one phase.`
      );
    } else {
      seen.set(key, i);
    }
  });

  return { ok: problems.length === 0, problems };
}

module.exports = { validateExitCondition, validateRoute };
