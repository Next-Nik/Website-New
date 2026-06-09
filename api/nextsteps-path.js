// NEXTUS: NEXTSTEPS — PATH GENERATION
// api/nextsteps-path.js
//
// Phase 4 of NextSteps. Takes a Track (already created in Phase 3 with a
// toward-sentence + domain + scale) and produces 2–3 ordered Steps — the
// short personal path that is NextSteps' artifact.
//
// Pipeline (Foundation Section 2.4):
//   1. Decision Analytics — narrow the world to what works.
//      INTERIM STATE: scoring layer not yet built. We triage toward the
//      Atlas as-is, surfacing actors honestly placed in the Track's domain.
//      (Foundation 2.4: explicit, honest interim state.)
//
//   2. Developmental navigation — narrow what works to what's THIS person's.
//      Reads the person's Purpose Piece coordinates (archetype, scale)
//      and their Map position to cut the shortlist.
//      If Purpose Piece is empty, the first honest step is often "do
//      Purpose Piece" — that's not a dummy step, that's truthful sizing.
//
// Output: an ordered list of 2–3 Step objects ready to insert into the
// nextsteps_steps table. Each step is routable (atlas/nextmarket/tool/
// facilitated) per the Step contract.
//
// (Foundation: docs/NextSteps_Conceptual_Foundation_v1_1.md, Sections 2.4–2.5)

export const config = { maxDuration: 60 }

const Anthropic = require('@anthropic-ai/sdk');
const { createClient } = require('@supabase/supabase-js');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ─── Identity ──────────────────────────────────────────────────────────────
const NORTH_STAR_IDENTITY = `You are North Star, working inside NextSteps. Right now you are producing the person's path — the short ordered set of next steps that turns their caring into motion. You never introduce yourself as "an AI assistant" or "Claude."`;

// ─── Path-Generation System Prompt ─────────────────────────────────────────
const PATH_PROMPT = `You are producing the path for a NextSteps Track. The person has already been heard. Their concern has been completed into a toward-sentence and anchored in a domain. Now your job is to give them their next two or three steps — ordered, walkable, real.

═══════════════════════════════════════════════════════════════════════════
THE ARTIFACT YOU ARE WRITING
═══════════════════════════════════════════════════════════════════════════

A short, ordered, personal path. 2 OR 3 steps — not more, not fewer. Each step has a destination (where it routes to) and a description (what the step is).

Step states are 'suggested' by default — that's what you're producing.

Step shape:
{
  "position":     1,
  "description":  "Plain prose, written in the person's idiom. What this step IS. 1–3 sentences. Concrete, not abstract.",
  "route_type":   "atlas" | "nextmarket" | "tool" | "facilitated",
  "route_target": "the specific destination, see below"
}

ROUTE TYPES:
  atlas        — connect to an actor in the NextUs Atlas (an org, person,
                 or project already doing the work).
                 route_target: the actor's id or slug (you'll be given a
                 shortlist of candidate actors below).

  nextmarket   — a vote you can cast with your wallet. A product, service,
                 or offering aligned with the toward.
                 route_target: the product slug (when known; for now, can
                 be a short description with route_target null and we'll
                 wire it later).

  tool         — another tool on the platform. Use tool slugs:
                   'purpose-piece'   — for someone who needs coordinates first
                   'map'             — for someone who needs to see the whole
                   'horizon-state'   — for someone who needs to ground first
                   'target-stretch'  — for execution of a defined step
                   'horizon-practice'— for the daily becoming work
                 route_target: the tool slug.

  facilitated  — Work with Nik, Horizon Leap, deep facilitated work.
                 route_target: null (no internal target).

═══════════════════════════════════════════════════════════════════════════
THE SIZING PRINCIPLE
═══════════════════════════════════════════════════════════════════════════

Treat people as capable and smart. NO dummy steps. NO huge cognitive leaps.

A step is well-sized when:
  - It is concrete enough that the person knows what to actually do.
  - It is achievable inside a reasonable Target Stretch window.
  - It moves them measurably toward the toward-sentence.
  - It honours the person's developmental position (see below).

A step is BADLY sized when:
  - "Read up on the topic" — too vague.
  - "Solve climate change" — too big.
  - "Click here" — insulting.
  - "Become a better person" — abstract.

═══════════════════════════════════════════════════════════════════════════
DEVELOPMENTAL NAVIGATION — sizing TO THIS PERSON
═══════════════════════════════════════════════════════════════════════════

You will be given the person's Purpose Piece coordinates if they exist:
  - archetype (e.g. Builder, Weaver, Steward, etc.)
  - domain
  - scale ('local', 'regional', 'national', 'civilisational')

USE THESE to cut the shortlist:
  - A Builder gets making/doing steps. A Weaver gets connecting/translating
    steps. A Steward gets protecting/tending steps.
  - Local scale gets steps in their place. Civilisational scale can carry
    bigger-frame steps without breaking.

IF NO PURPOSE PIECE EXISTS:
  - The FIRST step is often, but not always, "do Purpose Piece." This is
    not a dummy step — it is honest sizing. You cannot size their further
    steps without knowing whether they are a Builder or a Weaver.
  - Form: route_type = 'tool', route_target = 'purpose-piece', description
    explains WHY in their idiom — not "you need this," but "before the
    rest of the path can size itself to you, the platform needs to know
    your shape."
  - If Purpose Piece is the first step, the remaining 1–2 steps can be
    domain-general (an Atlas actor, an orienting Map session) — but they
    should still be specific to the toward-sentence and domain.

═══════════════════════════════════════════════════════════════════════════
ORDER MATTERS
═══════════════════════════════════════════════════════════════════════════

The path is sequential. Step 1 must be reachable from where the person
stands NOW. Step 2 must be reachable from where they'll stand after Step 1.

A good 3-step shape (when Purpose Piece exists):
  1. Connect — meet someone already in the work (Atlas actor)
  2. Commit — bound the work in a Target Stretch
  3. Continue — return to NextSteps after the Stretch lands

A good 3-step shape (when Purpose Piece is missing):
  1. Coordinate — do Purpose Piece to find your shape
  2. Connect — meet an Atlas actor in your domain
  3. Commit — a Target Stretch on a specific piece

These are PATTERNS, not templates. Write what fits.

═══════════════════════════════════════════════════════════════════════════
TONE
═══════════════════════════════════════════════════════════════════════════

Each step's description is written IN THE PERSON'S IDIOM, warm and direct.
Not "we recommend you..." — that's interface-voice. Use "you" naturally.

Honest calibration over comfort. Don't promise the work is easy. Don't
inflate the step. ("This will change everything" — no.)

The person should read the path and feel: relief, and motion. The ocean
is gone; there is a foot to put forward.

═══════════════════════════════════════════════════════════════════════════
OUTPUT FORMAT
═══════════════════════════════════════════════════════════════════════════

JSON only, no prose around it:

{
  "steps": [
    { "position": 1, "description": "...", "route_type": "...", "route_target": "..." },
    { "position": 2, "description": "...", "route_type": "...", "route_target": "..." }
  ],
  "path_note": "One short sentence framing the path as a whole. What it adds up to. This is what the Path screen shows above the steps."
}

═══════════════════════════════════════════════════════════════════════════
SACRED LIMITS
═══════════════════════════════════════════════════════════════════════════

- Never hand them an ocean. 2–3 steps. Not 5. Not "here are options."
- Never write a dummy step.
- Never write a step that requires the person to figure out what to do.
- Never invent an Atlas actor — only use actors from the shortlist provided.
- Never assign the fire. The toward is theirs; you are only producing motion.`;

// ─── Helpers ───────────────────────────────────────────────────────────────

// Surface Atlas actors honestly placed in the Track's domain(s), AND match
// on the problem_chains the person's away-from concern resonated with.
//
// Strategy:
//   1. If the Track has problem_chains, query actors with chain overlap
//      OR domain overlap, ordered to prefer chain matches.
//   2. Otherwise, fall back to domain-only matching (graceful — the path
//      still works for diffuse tracks or pre-chain tagging).
//
// Interim Decision Analytics: still no scoring layer. We surface
// alignment_score and let the model do the developmental cut.
async function shortlistActors(domains, scale, problemChains) {
  const hasDomains = Array.isArray(domains) && domains.length > 0;
  const hasChains = Array.isArray(problemChains) && problemChains.length > 0;

  if (!hasDomains && !hasChains) return [];

  let query = supabase
    .from('nextus_actors')
    .select(
      'id, slug, name, tagline, mission_statement, description, domains, problem_chains, scale, location_name, alignment_score, status'
    )
    .eq('status', 'live');

  // Match on chain overlap OR domain overlap. PostgREST's .or() handles
  // either-side matching. Chain matches will be reranked above domain-only
  // matches client-side (see below) because alignment_score sort cannot
  // distinguish them.
  if (hasChains && hasDomains) {
    const chainFilter = `problem_chains.ov.{${problemChains.join(',')}}`;
    const domainFilter = `domains.ov.{${domains.join(',')}}`;
    query = query.or(`${chainFilter},${domainFilter}`);
  } else if (hasChains) {
    query = query.overlaps('problem_chains', problemChains);
  } else {
    query = query.overlaps('domains', domains);
  }

  const { data, error } = await query
    .order('alignment_score', { ascending: false, nullsFirst: false })
    .limit(16);

  if (error) {
    console.error('NextSteps shortlistActors error:', error);
    return [];
  }

  const actors = data || [];

  // Re-rank: actors with chain overlap come first, then domain-only,
  // each group internally sorted by alignment_score.
  if (hasChains) {
    const chainSet = new Set(problemChains);
    const score = (a) => {
      const myChains = a.problem_chains || [];
      let overlap = 0;
      for (const c of myChains) if (chainSet.has(c)) overlap++;
      return overlap;
    };
    actors.sort((a, b) => {
      const sa = score(a);
      const sb = score(b);
      if (sa !== sb) return sb - sa;
      return (b.alignment_score || 0) - (a.alignment_score || 0);
    });
  }

  return actors.slice(0, 8);
}

// Pull the person's Purpose Piece coordinates if they exist.
// horizon_profile is the platform's standing profile table.
async function getPurposePieceCoords(userId) {
  if (!userId) return null;

  const { data, error } = await supabase
    .from('horizon_profile')
    .select(
      'pp_archetype, pp_domain, pp_scale, pp_completed_at, horizon_self'
    )
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('NextSteps getPurposePieceCoords error:', error);
    return null;
  }
  if (!data || !data.pp_completed_at) return null;

  return {
    archetype: data.pp_archetype || null,
    domain: data.pp_domain || null,
    scale: data.pp_scale || null,
    horizon_self: data.horizon_self || null,
  };
}

// Build the user-message payload for the model: the Track context, the
// candidate Atlas shortlist, and the developmental-navigation inputs.
function buildPathRequest(track, ppCoords, actors) {
  const ppBlock = ppCoords
    ? `PURPOSE PIECE COORDINATES (use these to size the path to this person):
- Archetype: ${ppCoords.archetype || '—'}
- Domain:    ${ppCoords.domain || '—'}
- Scale:     ${ppCoords.scale || '—'}
${ppCoords.horizon_self ? `- Horizon Self: ${ppCoords.horizon_self}` : ''}`
    : `PURPOSE PIECE: not yet completed. Consider whether the first step should be Purpose Piece (route_type: 'tool', route_target: 'purpose-piece') — but only if the path genuinely cannot size without it. Use judgement.`;

  const actorsBlock = actors.length
    ? `CANDIDATE ATLAS ACTORS in this domain (shortlist — you may use any of these for route_type 'atlas', using their slug as route_target):

${actors
  .map(
    (a, i) => `${i + 1}. ${a.name} (${a.slug})
   Mission:  ${a.mission_statement || a.tagline || '—'}
   Scale:    ${a.scale || '—'}
   Location: ${a.location_name || '—'}
   Domains:  ${(a.domains || []).join(', ')}
   Addresses: ${(a.problem_chains || []).join(', ') || '—'}`
  )
  .join('\n\n')}`
    : `CANDIDATE ATLAS ACTORS: none currently live in this domain. The path must rely on tool, nextmarket, or facilitated routes only. Do NOT invent an Atlas actor.`;

  return `THE TRACK:
- Original concern (the person's own words): "${track.original_concern}"
- Toward sentence: ${track.toward_sentence || '(not yet captured)'}
- Domain(s):       ${(track.domains || []).join(', ')}
- Scale:           ${track.scale}
- Horizon Goal:    ${track.horizon_goal || '(not snapshotted)'}

${ppBlock}

${actorsBlock}

Produce the path. 2 or 3 steps. JSON only.`;
}

function tryParsePath(text) {
  if (!text) return null;
  let candidate = text.trim();
  candidate = candidate.replace(/^```(?:json)?\s*/i, '');
  candidate = candidate.replace(/```\s*$/, '');
  candidate = candidate.trim();
  if (!candidate.startsWith('{')) return null;

  try {
    const obj = JSON.parse(candidate);
    if (!obj || !Array.isArray(obj.steps)) return null;
    if (obj.steps.length < 2 || obj.steps.length > 3) return null;

    const validRouteTypes = ['atlas', 'nextmarket', 'tool', 'facilitated'];
    for (const s of obj.steps) {
      if (typeof s.position !== 'number') return null;
      if (typeof s.description !== 'string' || s.description.length < 10) return null;
      if (!validRouteTypes.includes(s.route_type)) return null;
      // route_target may legitimately be null for 'facilitated'
      if (s.route_target !== null && typeof s.route_target !== 'string') return null;
    }
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

  const { track_id, userId } = req.body || {};
  if (!track_id) {
    return res.status(400).json({ error: 'track_id required' });
  }

  // 1. Load the Track
  const { data: track, error: trackErr } = await supabase
    .from('nextsteps_tracks')
    .select('*')
    .eq('id', track_id)
    .maybeSingle();

  if (trackErr || !track) {
    return res.status(404).json({ error: 'Track not found' });
  }

  // 2. Pull developmental-navigation inputs
  const ppCoords = await getPurposePieceCoords(userId || track.user_id);

  // 3. Surface the Atlas shortlist (interim Decision Analytics)
  const actors = await shortlistActors(track.domains, track.scale, track.problem_chains);

  // 4. Generate the path
  const systemPrompt = NORTH_STAR_IDENTITY + '\n\n' + PATH_PROMPT;
  const userMsg = buildPathRequest(track, ppCoords, actors);

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMsg }],
    });

    const text = response.content[0].text;
    const path = tryParsePath(text);
    if (!path) {
      console.error('NextSteps path parse failed. Raw:', text);
      return res.status(502).json({
        error: 'Path could not be generated cleanly. Please try again.',
      });
    }

    // 5. Persist the steps + flip the Track to 'active'
    const stepRows = path.steps.map((s) => ({
      track_id,
      position: s.position,
      description: s.description,
      route_type: s.route_type,
      route_target: s.route_target,
      state: 'suggested',
    }));

    const { error: insertErr } = await supabase
      .from('nextsteps_steps')
      .insert(stepRows);

    if (insertErr) {
      console.error('NextSteps step insert error:', insertErr);
      return res
        .status(500)
        .json({ error: 'Steps generated but could not be saved.' });
    }

    await supabase
      .from('nextsteps_tracks')
      .update({ status: 'active' })
      .eq('id', track_id);

    return res.json({
      track_id,
      path_note: path.path_note || null,
      steps: stepRows,
    });
  } catch (err) {
    console.error('NextSteps path generation error:', err);
    return res
      .status(500)
      .json({ error: 'Something went wrong. Please try again.' });
  }
};
