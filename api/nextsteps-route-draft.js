// NEXTUS: NEXTSTEPS — ROUTE DRAFTING
// api/nextsteps-route-draft.js
//
// The phase layer's drafting act. (Foundation v2.0.1 §2.4, §2.5.)
//
// "People cannot write their own path. That is the handstand problem itself:
//  authoring a route requires already knowing the territory, which is exactly
//  what the person standing at the bottom of it does not have. But everyone can
//  look at a proposed route and say 'no, phase two comes before phase one for
//  me.' Editing is easy; authoring is the hard part the tool removes."
//
// So this endpoint drafts. It does not decide. Nothing it writes is current,
// nothing it writes is the person's, until they ratify it in the UI. Every
// phase it inserts is state 'upcoming' and the track sits at route_state
// 'drafted' — a suggestion, plainly labelled as one, until a human says yes.
//
// The draft is not conjured from nothing. It is built from what The Map already
// knows: the person's Horizon Goal in their own words, their score, the
// BEHAVIOURAL EVIDENCE that placed that score (the gold — the evidence says why
// a domain is a 4 and not a 6, and the why is what phases are made of), and
// their avatar statement of who they are at 10.
//
// POST body: { track_id }
// Response:  { phases: Phase[], route_state: 'drafted' }

export const config = { maxDuration: 60 }

const Anthropic = require('@anthropic-ai/sdk');
const { createClient } = require('@supabase/supabase-js');
const { resolveUserId } = require('./_auth');
const { validateRoute } = require('./_exit-condition');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// The fractal connections (locked canon). A civ-scale track still belongs to a
// person, and that person's Now evidence lives on the self side. This is how a
// civ track gets real Now evidence instead of drafting from thin air.
const CIV_TO_SELF = {
  vision:  'path',
  human:   'spark',
  nature:  'body',
  finance: 'finances',
  society: 'connection',
  legacy:  'inner_game',
  tech:    'signal',
};

// The Map writes 'inner_game'; an older constant elsewhere carries 'inner-game'.
// Accept both rather than lose a domain's evidence to a hyphen.
function normaliseSelfKey(key) {
  return String(key || '').trim().toLowerCase().replace(/-/g, '_');
}

function selfKeysFor(track) {
  const domains = Array.isArray(track.domains) ? track.domains : [];
  const keys = domains.map((d) => {
    const k = normaliseSelfKey(d);
    return track.scale === 'civ' ? (CIV_TO_SELF[String(d).toLowerCase()] || null) : k;
  });
  return [...new Set(keys.filter(Boolean))];
}

// ─── The Now evidence ──────────────────────────────────────────────────────

async function getMapEvidence(userId, selfKeys) {
  if (!userId || selfKeys.length === 0) return [];

  const { data, error } = await supabase
    .from('map_results')
    .select('session, map_data, complete')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data || !data.session || !data.session.domainData) return [];

  const domainData = data.session.domainData;
  const out = [];

  for (const key of selfKeys) {
    // Walk both spellings of the key.
    const entry =
      domainData[key] ||
      domainData[key.replace(/_/g, '-')] ||
      null;
    if (!entry || typeof entry !== 'object') continue;

    out.push({
      domain:       key,
      currentScore: entry.currentScore,
      horizonScore: entry.horizonScore,
      // The Horizon Goal in the person's own words.
      horizonText:  entry.horizonText || null,
      // Who they are at 10.
      avatarFinal:  entry.avatarFinal || null,
      // THE GOLD: the behavioural evidence that placed the score.
      realityFinal: entry.realityFinal || null,
    });
  }

  return out;
}

async function getProfileRows(userId, selfKeys) {
  if (!userId) return [];
  const { data, error } = await supabase
    .from('horizon_profile')
    .select('domain, current_score, horizon_score, horizon_goal, ia_statement')
    .eq('user_id', userId);
  if (error || !data) return [];
  const wanted = new Set(selfKeys);
  return data.filter((r) => wanted.has(normaliseSelfKey(r.domain)));
}

async function getPurposePiece(userId) {
  if (!userId) return null;
  const { data, error } = await supabase
    .from('horizon_profile')
    .select('pp_archetype, pp_domain, pp_scale, pp_completed_at, horizon_self')
    .eq('user_id', userId)
    .not('pp_completed_at', 'is', null)
    .limit(1);
  if (error || !data || data.length === 0) return null;
  const row = data[0];
  return {
    archetype:    row.pp_archetype || null,
    domain:       row.pp_domain || null,
    scale:        row.pp_scale || null,
    horizon_self: row.horizon_self || null,
  };
}

// ─── The prompt ────────────────────────────────────────────────────────────

const IDENTITY = `You are North Star, working inside NextSteps. You are sketching a route for a person who has told you what they care about. You never introduce yourself as "an AI assistant" or "Claude." You never narrate your own mechanics.`;

const ROUTE_PROMPT = `You are drafting the ROUTE for one NextSteps Track: the ordered phases between where this person is now and the Horizon they have already named.

═══════════════════════════════════════════════════════════════════════
WHAT A PHASE IS
═══════════════════════════════════════════════════════════════════════

A path is an ordered list of phases, and A PHASE IS DEFINED BY ITS EXIT
CONDITION, NOT BY TIME.

Not "phase 2: months 3 to 6" but "you are in this phase until X is true."

The canonical illustration is learning a handstand. The route is not
"weeks 1-4, weeks 5-8." It is: wall holds until 60 seconds is easy, then
chest-to-wall until you can pull one foot off with control, then kick-ups
until you catch one in three. Each phase ends on evidence, and the evidence
is the thing that decides, not the calendar.

Every phase has exactly three parts:

  name            Short, plain, in the person's own language where you can.
                  Under about five words. Not a heading, a handle.

  work            What doing this phase looks like day to day. Two or three
                  sentences. Concrete enough that someone could start
                  tomorrow morning without asking you a follow-up question.

  exit_condition  ONE checkable statement. When it is true, the phase ends.

═══════════════════════════════════════════════════════════════════════
THE EXIT CONDITION IS THE HARD PART. GET IT RIGHT.
═══════════════════════════════════════════════════════════════════════

Checkable means THE PERSON THEMSELVES can honestly answer yes or no to it,
today, without anyone judging them. Behavioural evidence, not a feeling.

GOOD exit conditions:
  "You have had the conversation with your manager and you know what they said."
  "Three people you did not know before have replied to you."
  "You can name the three things that are actually stopping you, without notes."
  "You have shown up to the group three times a week for a month."
  "Your two lines about one organisation are live on the Atlas."
  "There is a written list of the organisations doing this, and you have contacted two."

FORBIDDEN exit conditions, and why:
  "You feel more confident."          A feeling is always affirmable, so it is
                                      never a real exit. This is fabricated
                                      progress, which is the deepest no there is.
  "You have a clearer understanding." Nobody can answer this yes or no.
  "By the end of March you have..."   A due date. Phases have no dates. Ever.
  "You are consistently showing up."  Unfalsifiable without a number.
  "Significant progress has been made." Who decides? Not checkable.

Frequency is NOT a deadline and is welcome: "three times a week for a month"
is behaviour a person can check. "By the end of March" is a due date. Know
the difference.

If you cannot state a checkable exit for a phase, THE PHASE IS NOT FINISHED
BEING DESIGNED. Redesign it into something that can be checked. Do not soften
the exit to make it fit.

═══════════════════════════════════════════════════════════════════════
THE SHAPE OF THE ROUTE
═══════════════════════════════════════════════════════════════════════

- 3 to 6 phases. Fewer is not a route. More is a plan pretending to a
  certainty it does not have.
- Phase 1 starts FROM WHERE THEY ACTUALLY ARE, which the evidence below tells
  you. If the evidence says a domain is a 4 because of a specific behaviour,
  phase 1 addresses that specific behaviour. Do not start everyone at zero.
- Later phases are deliberately sketchier than near ones. The route gets
  redrawn as the person walks, because walking changes the terrain. Phase 1
  and 2 should be sharp. Phase 5 can be a direction with a real exit on it.
- The last phase's exit condition should land recognisably close to the
  Horizon Goal they wrote. The route has to actually go where they said.

REGISTER TEST — apply it to every phase before you return it:
The whole route must be sayable to a smart 10-year-old.
"You're here. The goal is there. These are the five stages between. You're in
stage two. Stage two ends when this is true."
If a phase cannot be said that plainly, rewrite it until it can.

═══════════════════════════════════════════════════════════════════════
TONE
═══════════════════════════════════════════════════════════════════════

- A route is A PROPOSAL ABOUT THE ROAD, NEVER A DIAGNOSIS OF THE WALKER.
  Never "you are avoidant", "you struggle with", "you lack". Describe the
  terrain and the work, never the person's character.
- Never make the person wrong for where they are. The evidence is terrain,
  not failure.
- Never promise it is easy. The resistance is real. Give the fight a
  destination, not a discount.
- No urgency, no "act now", no engagement bait.
- No time pressure words at all: not "behind", not "on track", not "should
  have", not "quickly".
- British spelling.
- NO EM-DASHES anywhere in your output. Use commas or full stops.
- Write to a capable adult. No dummy steps, no cognitive leaps either.

═══════════════════════════════════════════════════════════════════════
OUTPUT
═══════════════════════════════════════════════════════════════════════

JSON only. No prose before or after. No markdown fence.

{
  "route_note": "One sentence naming what this route is for, in plain language. Optional but preferred.",
  "phases": [
    { "position": 1, "name": "...", "work": "...", "exit_condition": "..." },
    { "position": 2, "name": "...", "work": "...", "exit_condition": "..." },
    { "position": 3, "name": "...", "work": "...", "exit_condition": "..." }
  ]
}`;

function buildRouteRequest(track, evidence, profileRows, pp) {
  const evidenceBlock = evidence.length
    ? evidence
        .map((e) => {
          const lines = [`DOMAIN: ${e.domain}`];
          if (typeof e.currentScore === 'number') lines.push(`  Where they are now: ${e.currentScore} out of 10`);
          if (typeof e.horizonScore === 'number') lines.push(`  Where they want to be: ${e.horizonScore} out of 10`);
          if (e.horizonText)  lines.push(`  Their Horizon Goal, THEIR OWN WORDS: "${e.horizonText}"`);
          if (e.avatarFinal)  lines.push(`  Who they are at 10, their own words: "${e.avatarFinal}"`);
          if (e.realityFinal) lines.push(`  THE BEHAVIOURAL EVIDENCE that placed the score (this is the most\n  important input you have — it says WHY the score is what it is, and the\n  why is what phases are made of): "${e.realityFinal}"`);
          return lines.join('\n');
        })
        .join('\n\n')
    : `NOW EVIDENCE: this person has not completed The Map for the relevant domain, so you do not have their score or the behavioural evidence behind it.

Draft from the concern and the Horizon Goal alone, and keep phase 1 modest and
concrete. If, and only if, the route genuinely cannot be sized without knowing
what this person is built to contribute, phase 1 may be the work of doing
Purpose Piece or The Map. That is honest sizing, not a dummy phase. Do not
reach for it by default.`;

  const profileBlock = profileRows.length
    ? `STANDING PROFILE (may repeat or refine the above):\n` +
      profileRows
        .map(
          (r) =>
            `  ${r.domain}: now ${r.current_score ?? '—'}, horizon ${r.horizon_score ?? '—'}` +
            (r.horizon_goal ? `\n    Goal: "${r.horizon_goal}"` : '') +
            (r.ia_statement ? `\n    I am: "${r.ia_statement}"` : '')
        )
        .join('\n')
    : '';

  const ppBlock = pp
    ? `PURPOSE PIECE COORDINATES (what this person is built to do — size the route to this):
  Archetype: ${pp.archetype || '—'}
  Domain:    ${pp.domain || '—'}
  Scale:     ${pp.scale || '—'}${pp.horizon_self ? `\n  Horizon Self: "${pp.horizon_self}"` : ''}`
    : `PURPOSE PIECE: not completed.`;

  return `THE TRACK:

  What they said, in their own away-from words: "${track.original_concern}"
  The toward-sentence the reframe produced:     ${track.toward_sentence || '(not yet captured)'}
  Domain(s):                                    ${(track.domains || []).join(', ') || '—'}
  Scale:                                        ${track.scale}
  The domain's Horizon Goal:                    ${track.horizon_goal || '(not snapshotted)'}

${evidenceBlock}

${profileBlock}

${ppBlock}

Draft the route. 3 to 6 phases. Every exit condition checkable. JSON only.`;
}

function tryParseRoute(text) {
  if (!text) return null;
  let c = String(text).trim();
  c = c.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  const start = c.indexOf('{');
  if (start > 0) c = c.slice(start);
  if (!c.startsWith('{')) return null;
  try {
    const obj = JSON.parse(c);
    if (!obj || !Array.isArray(obj.phases)) return null;
    return obj;
  } catch (_) {
    return null;
  }
}

// ─── Handler ───────────────────────────────────────────────────────────────

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { track_id } = req.body || {};
  if (!track_id) return res.status(400).json({ error: 'track_id required' });

  const userId = await resolveUserId(req);
  if (!userId) return res.status(401).json({ error: 'Sign-in required' });

  const { data: track, error: trackErr } = await supabase
    .from('nextsteps_tracks')
    .select('*')
    .eq('id', track_id)
    .maybeSingle();

  if (trackErr || !track) return res.status(404).json({ error: 'Track not found' });
  if (track.user_id !== userId) return res.status(403).json({ error: 'Not your track' });

  // A ratified route is the person's own artifact. The machine does not get to
  // redraft over it. (Sacred Limit: NextSteps never imposes the path.)
  if (track.route_state === 'ratified') {
    const { data: existing } = await supabase
      .from('nextsteps_phases')
      .select('*')
      .eq('track_id', track_id)
      .order('position', { ascending: true });
    return res.status(409).json({
      error: 'This route is already yours. Edit it directly rather than redrafting.',
      phases: existing || [],
      route_state: 'ratified',
    });
  }

  const selfKeys = selfKeysFor(track);
  const [evidence, profileRows, pp] = await Promise.all([
    getMapEvidence(userId, selfKeys),
    getProfileRows(userId, selfKeys),
    getPurposePiece(userId),
  ]);

  const userMsg = buildRouteRequest(track, evidence, profileRows, pp);
  const messages = [{ role: 'user', content: userMsg }];

  let route = null;
  let lastProblems = [];

  // Two attempts. The second is handed the validator's own words as a
  // correction. If both fail, we return an honest error rather than persisting
  // a route with a soft exit condition in it. A phase that cannot state a
  // checkable exit is not finished being designed, and shipping it anyway would
  // be the exact failure the Sacred Limit exists to prevent.
  for (let attempt = 0; attempt < 2; attempt++) {
    let text;
    try {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2500,
        system: IDENTITY + '\n\n' + ROUTE_PROMPT,
        messages,
      });
      text = response.content[0].text;
    } catch (err) {
      console.error('NextSteps route draft model error:', err);
      return res.status(500).json({ error: 'Something went wrong. Please try again.' });
    }

    const parsed = tryParseRoute(text);
    if (parsed) {
      const check = validateRoute(parsed.phases);
      if (check.ok) {
        route = parsed;
        break;
      }
      lastProblems = check.problems;
    } else {
      lastProblems = ['The response was not the required JSON object.'];
    }

    if (attempt === 0) {
      messages.push({ role: 'assistant', content: text });
      messages.push({
        role: 'user',
        content: `That draft does not hold. Fix these and return the whole route again as JSON only:\n\n${lastProblems
          .map((p) => `- ${p}`)
          .join('\n')}\n\nEvery exit condition must be something the person can honestly answer yes or no to today. Do not soften an exit condition to make it fit; redesign the phase.`,
      });
    }
  }

  if (!route) {
    console.error('NextSteps route draft failed validation twice:', lastProblems);
    return res.status(502).json({
      error: 'The route did not come out checkable. Try again in a moment.',
      detail: lastProblems,
    });
  }

  // Replace any previous unratified draft cleanly, so a redraft does not stack.
  await supabase.from('nextsteps_phases').delete().eq('track_id', track_id);

  const rows = route.phases
    .slice()
    .sort((a, b) => (a.position || 0) - (b.position || 0))
    .map((p, i) => ({
      track_id,
      position:       i + 1,
      name:           String(p.name).trim(),
      work:           String(p.work).trim(),
      exit_condition: String(p.exit_condition).trim(),
      // Nothing is current until the person ratifies.
      state:          'upcoming',
      authored_by:    'ai',
    }));

  const { data: inserted, error: insertErr } = await supabase
    .from('nextsteps_phases')
    .insert(rows)
    .select('*');

  if (insertErr) {
    console.error('NextSteps phase insert error:', insertErr);
    return res.status(500).json({ error: 'The route was drafted but could not be saved.' });
  }

  await supabase
    .from('nextsteps_tracks')
    .update({ route_state: 'drafted' })
    .eq('id', track_id);

  return res.json({
    track_id,
    route_note:  route.route_note || null,
    route_state: 'drafted',
    phases:      (inserted || []).sort((a, b) => a.position - b.position),
  });
};
