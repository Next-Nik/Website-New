// NEXTUS: NEXTSTEPS — TRACK CRUD
// api/nextsteps-track.js
//
// Track operations for NextSteps. Used by the frontend phases:
//   - Phase 2 → Phase 3 handoff: create a Track from a Reflection landing.
//   - Phase 3 → Phase 4: read a Track to display the Domain Landing.
//   - Phase 5: list a user's Tracks for the returning surface.
//   - Step state changes ('done' from a Target Stretch completion).
//
// Domain key normalisation: the seven civilisational domain keys are
// lowercase short forms (human, society, nature, tech, finance, legacy,
// vision). We accept these as authoritative.

export const config = { maxDuration: 15 }

const { createClient } = require('@supabase/supabase-js');
const { resolveUserId } = require('./_auth');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Horizon Goals snapshot — used to capture the goal text on Track creation
// so the record is stable even if the goal is later edited.
// (Foundation: each domain carries a Horizon Goal in toward grammar.)
const HORIZON_GOALS = {
  // Civ side
  human:
    'Human beings are embodied, attended to, and met — body, mind, meaning, mortality — across a full life.',
  society:
    'Human communities are organised in ways that generate trust, belonging, and genuine collective agency.',
  nature:
    'The living systems of the planet are regenerating, and humanity is a net contributor to that regeneration.',
  tech:
    'Technology serves the flourishing of life — built, governed, and shaped by those it touches.',
  finance:
    'Capital and work circulate in ways that reward contribution, regenerate the commons, and distribute resources to where they serve life.',
  legacy:
    'What we inherit is honoured, what we pass on is intentional, and the long arc of human story is held in living memory.',
  vision:
    'The futures we imagine are commensurate with what is actually possible, and our imagination becomes a force that pulls the present toward those futures.',
  // Self side — these mirror the civ domains at the personal scale
  path: 'Work that fits the shape of who you are.',
  spark: 'A life lit from inside.',
  body: 'A body you live in, not at war with.',
  finances: 'Resources that match the life you mean to live.',
  connection: 'People you belong with and to.',
  'inner-game': 'A mind that is on your side.',
  signal: 'A voice that lands where it matters.',
};

function snapshotHorizonGoal(domains, scale) {
  if (!Array.isArray(domains) || domains.length === 0) return null;
  // For multi-domain Tracks, snapshot the first domain's goal; the others
  // are stored in the domains array and visible in the Domain Landing UI.
  const key = domains[0];
  return HORIZON_GOALS[key] || null;
}

// ─── Handler ───────────────────────────────────────────────────────────────

module.exports = async (req, res) => {
  const method = req.method;

  // ── POST /api/nextsteps-track → create a Track from Phase 2 landing ──
  if (method === 'POST') {
    const {
      original_concern,
      toward_sentence,
      domains,
      scale,
      problem_chains,
      chain_gap,
      concern_shape,
      // branch is informational — 'reframe' or 'mirror'
      // mirror branch tracks may have toward_sentence === null
    } = req.body || {};

    // Reflection content — identity from the verified token only.
    const userId = await resolveUserId(req);
    if (!userId) return res.status(401).json({ error: 'Sign-in required' });
    if (!original_concern) {
      return res.status(400).json({ error: 'original_concern required' });
    }

    const horizon_goal = snapshotHorizonGoal(domains, scale);

    const { data, error } = await supabase
      .from('nextsteps_tracks')
      .insert({
        user_id: userId,
        original_concern,
        toward_sentence: toward_sentence || null,
        domains: Array.isArray(domains) ? domains : [],
        scale: scale === 'self' ? 'self' : 'civ',
        problem_chains: Array.isArray(problem_chains) ? problem_chains : [],
        horizon_goal,
        status: 'planning',
      })
      .select('*')
      .single();

    if (error) {
      console.error('NextSteps track create error:', error);
      return res.status(500).json({ error: 'Could not create track.' });
    }

    // Demand-side vocabulary learning (Slice 1 — capture).
    // A clear away-from concern that no live chain held. Write the scrubbed
    // shape to the learning corpus. The verbatim original_concern stays on the
    // track, untouched — this is a separate, de-identified record. The scrub
    // happens upstream in the reflection; we persist only the shape here.
    // Best-effort: a capture failure must never break track creation.
    if (chain_gap === true && typeof concern_shape === 'string' && concern_shape.trim()) {
      try {
        const { error: gapErr } = await supabase
          .from('nextsteps_chain_gaps')
          .insert({
            concern_shape: concern_shape.trim(),
            domains: Array.isArray(domains) ? domains : [],
            scale: scale === 'self' ? 'self' : 'civ',
            track_id: data.id,
            user_id: userId,
          });
        if (gapErr) console.error('NextSteps chain-gap capture (non-fatal):', gapErr);
      } catch (gapEx) {
        console.error('NextSteps chain-gap capture threw (non-fatal):', gapEx);
      }
    }

    return res.json({ track: data });
  }

  // ── GET /api/nextsteps-track?id=... or ?userId=... ───────────────────
  if (method === 'GET') {
    const { id } = req.query || {};

    if (id) {
      // Single track with its steps
      const { data: track, error: tErr } = await supabase
        .from('nextsteps_tracks')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (tErr || !track) {
        return res.status(404).json({ error: 'Track not found' });
      }
      const { data: steps } = await supabase
        .from('nextsteps_steps')
        .select('*')
        .eq('track_id', id)
        .order('position', { ascending: true });
      return res.json({ track, steps: steps || [] });
    }

    // A track list is personal reflection data — only the session's own
    // tracks are ever returned, regardless of what was asked for.
    const sessionUserId = await resolveUserId(req);
    if (sessionUserId) {
      const { data, error } = await supabase
        .from('nextsteps_tracks_with_counts')
        .select('*')
        .eq('user_id', sessionUserId)
        .order('updated_at', { ascending: false });
      if (error) {
        console.error('NextSteps track list error:', error);
        return res.status(500).json({ error: 'Could not list tracks.' });
      }
      return res.json({ tracks: data || [] });
    }

    return res.status(401).json({ error: 'Sign-in required' });
  }

  // ── PATCH /api/nextsteps-track → update Track or Step state ──────────
  if (method === 'PATCH') {
    const { track_id, step_id, track_update, step_update } = req.body || {};

    // Neither branch previously verified who was making the change — anyone
    // who knew a track_id or step_id could rewrite any field on it. Every
    // write below is now gated on the session owning the track first.
    const sessionUserId = await resolveUserId(req);
    if (!sessionUserId) return res.status(401).json({ error: 'Sign-in required' });

    if (track_id && track_update) {
      const { data: owned } = await supabase
        .from('nextsteps_tracks').select('user_id').eq('id', track_id).maybeSingle();
      if (!owned || owned.user_id !== sessionUserId) {
        return res.status(403).json({ error: 'Not your track' });
      }
      const { error } = await supabase
        .from('nextsteps_tracks')
        .update(track_update)
        .eq('id', track_id);
      if (error) {
        console.error('NextSteps track update error:', error);
        return res.status(500).json({ error: 'Could not update track.' });
      }
      return res.json({ ok: true });
    }

    if (step_id && step_update) {
      const { data: step } = await supabase
        .from('nextsteps_steps').select('track_id').eq('id', step_id).maybeSingle();
      if (!step) return res.status(404).json({ error: 'Step not found' });
      const { data: owned } = await supabase
        .from('nextsteps_tracks').select('user_id').eq('id', step.track_id).maybeSingle();
      if (!owned || owned.user_id !== sessionUserId) {
        return res.status(403).json({ error: 'Not your track' });
      }
      const { error } = await supabase
        .from('nextsteps_steps')
        .update(step_update)
        .eq('id', step_id);
      if (error) {
        console.error('NextSteps step update error:', error);
        return res.status(500).json({ error: 'Could not update step.' });
      }
      // If the Step just flipped to 'done', this is the trigger that
      // returns the person to NextSteps to re-read the Track. The Track's
      // updated_at is bumped by the database trigger. The UI handles the
      // re-read on Track open.
      return res.json({ ok: true });
    }

    return res.status(400).json({ error: 'No valid update payload.' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
