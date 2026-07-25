// NEXTUS: NEXTSTEPS — ROUTE OPERATIONS
// api/nextsteps-route.js
//
// Everything the owner does to their own route. (Foundation v2.0.1 §2.5, §2.9.)
//
//   GET    ?track_id=…                    read the route
//   PATCH  { phase_id, phase_update }     edit one phase's words
//   POST   { action: 'reorder', order }   move phases around
//   POST   { action: 'add', after }       add a phase the draft missed
//   POST   { action: 'ratify' }           the route becomes theirs
//   POST   { action: 'clear' }            exit condition answered true
//   DELETE ?phase_id=…                    cross a phase out
//
// The governing rule of this file is that the person wins. The draft is a
// proposal; every field of it is editable, before ratification and after. There
// is no endpoint here that lets the system overrule an owner's edit, and
// ratification cannot be performed by anything but an explicit call from the
// person's own session.
//
// Note what is NOT validated here: the person's own wording of an exit
// condition. The checkability validator runs on the MACHINE's drafts, in
// nextsteps-route-draft.js. Running it on a human's edit would be a verdict
// about the person, which is Tone Law 1, and it would also be false: they know
// their life and we do not.

export const config = { maxDuration: 15 }

const { createClient } = require('@supabase/supabase-js');
const { resolveUserId } = require('./_auth');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Fields of a phase the owner may rewrite. State is not among them: state moves
// through ratify and clear only, so that "exactly one current phase" and "a
// phase is cleared only by a person answering yes" both stay true.
const EDITABLE = ['name', 'work', 'exit_condition'];

async function ownedTrack(trackId, userId) {
  const { data } = await supabase
    .from('nextsteps_tracks')
    .select('*')
    .eq('id', trackId)
    .maybeSingle();
  if (!data || data.user_id !== userId) return null;
  return data;
}

async function trackForPhase(phaseId, userId) {
  const { data: phase } = await supabase
    .from('nextsteps_phases')
    .select('*')
    .eq('id', phaseId)
    .maybeSingle();
  if (!phase) return { phase: null, track: null };
  const track = await ownedTrack(phase.track_id, userId);
  return { phase, track };
}

async function readRoute(trackId) {
  const { data } = await supabase
    .from('nextsteps_phases')
    .select('*')
    .eq('track_id', trackId)
    .order('position', { ascending: true });
  return data || [];
}

// Rewrites positions to 1..n in the given id order. Two passes through a high
// offset because (track_id, position) is unique and a straight swap would
// collide mid-flight.
async function renumber(trackId, orderedIds) {
  const OFFSET = 1000;
  for (let i = 0; i < orderedIds.length; i++) {
    await supabase
      .from('nextsteps_phases')
      .update({ position: OFFSET + i + 1 })
      .eq('id', orderedIds[i])
      .eq('track_id', trackId);
  }
  for (let i = 0; i < orderedIds.length; i++) {
    await supabase
      .from('nextsteps_phases')
      .update({ position: i + 1 })
      .eq('id', orderedIds[i])
      .eq('track_id', trackId);
  }
}

async function bumpEdits(trackId, by = 1) {
  const { data } = await supabase
    .from('nextsteps_tracks')
    .select('route_edits')
    .eq('id', trackId)
    .maybeSingle();
  await supabase
    .from('nextsteps_tracks')
    .update({ route_edits: (data?.route_edits || 0) + by })
    .eq('id', trackId);
}

module.exports = async (req, res) => {
  const userId = await resolveUserId(req);
  if (!userId) return res.status(401).json({ error: 'Sign-in required' });

  // ── GET — read the route ──────────────────────────────────────────────
  if (req.method === 'GET') {
    const { track_id } = req.query || {};
    if (!track_id) return res.status(400).json({ error: 'track_id required' });
    const track = await ownedTrack(track_id, userId);
    if (!track) return res.status(403).json({ error: 'Not your track' });
    const phases = await readRoute(track_id);
    return res.json({
      track_id,
      route_state: track.route_state || 'none',
      route_edits: track.route_edits || 0,
      phases,
    });
  }

  // ── PATCH — edit one phase's words ────────────────────────────────────
  if (req.method === 'PATCH') {
    const { phase_id, phase_update } = req.body || {};
    if (!phase_id || !phase_update) {
      return res.status(400).json({ error: 'phase_id and phase_update required' });
    }
    const { phase, track } = await trackForPhase(phase_id, userId);
    if (!phase) return res.status(404).json({ error: 'Phase not found' });
    if (!track)  return res.status(403).json({ error: 'Not your route' });

    const update = {};
    for (const key of EDITABLE) {
      if (typeof phase_update[key] === 'string') {
        const v = phase_update[key].trim();
        if (v) update[key] = v;
      }
    }
    if (Object.keys(update).length === 0) {
      return res.status(400).json({ error: 'Nothing to update' });
    }

    // The person touched it, so it is their words now, not the draft's.
    update.authored_by = 'person';

    const { data, error } = await supabase
      .from('nextsteps_phases')
      .update(update)
      .eq('id', phase_id)
      .select('*')
      .single();

    if (error) {
      console.error('NextSteps phase update error:', error);
      return res.status(500).json({ error: 'Could not save that edit.' });
    }

    await bumpEdits(phase.track_id);
    return res.json({ phase: data });
  }

  // ── DELETE — cross a phase out ────────────────────────────────────────
  if (req.method === 'DELETE') {
    const { phase_id } = req.query || {};
    if (!phase_id) return res.status(400).json({ error: 'phase_id required' });
    const { phase, track } = await trackForPhase(phase_id, userId);
    if (!phase) return res.status(404).json({ error: 'Phase not found' });
    if (!track)  return res.status(403).json({ error: 'Not your route' });

    const phases = await readRoute(phase.track_id);
    if (phases.length <= 1) {
      return res.status(400).json({ error: 'A route needs at least one phase.' });
    }
    // Removing the phase you are standing in would leave the route with nowhere
    // current. Clearing it is the honest move, and that is a different verb.
    if (phase.state === 'current') {
      return res.status(400).json({
        error: 'That is the phase you are in. Clear it when its exit condition is true, or edit it.',
      });
    }

    await supabase.from('nextsteps_phases').delete().eq('id', phase_id);
    await renumber(
      phase.track_id,
      phases.filter((p) => p.id !== phase_id).map((p) => p.id)
    );
    await bumpEdits(phase.track_id);
    return res.json({ phases: await readRoute(phase.track_id) });
  }

  // ── POST — the verbs ──────────────────────────────────────────────────
  if (req.method === 'POST') {
    const { action, track_id } = req.body || {};
    if (!track_id) return res.status(400).json({ error: 'track_id required' });
    const track = await ownedTrack(track_id, userId);
    if (!track) return res.status(403).json({ error: 'Not your track' });

    // ── reorder ──
    if (action === 'reorder') {
      const { order } = req.body;
      if (!Array.isArray(order) || order.length === 0) {
        return res.status(400).json({ error: 'order must be an array of phase ids' });
      }
      const phases = await readRoute(track_id);
      const known = new Set(phases.map((p) => p.id));
      if (order.length !== phases.length || !order.every((id) => known.has(id))) {
        return res.status(400).json({ error: 'order must list every phase of this route exactly once' });
      }
      await renumber(track_id, order);
      await bumpEdits(track_id);
      return res.json({ phases: await readRoute(track_id) });
    }

    // ── add ── the person adds the phase the draft did not see
    if (action === 'add') {
      const { after, name, work, exit_condition } = req.body;
      const phases = await readRoute(track_id);
      if (phases.length >= 6) {
        return res.status(400).json({
          error: 'A route holds up to six phases. Merge two before adding another.',
        });
      }
      const afterIdx = after ? phases.findIndex((p) => p.id === after) : phases.length - 1;
      const insertAt = afterIdx < 0 ? phases.length : afterIdx + 1;

      const { data, error } = await supabase
        .from('nextsteps_phases')
        .insert({
          track_id,
          position:       phases.length + 1, // parked at the end, renumbered below
          name:           (name || 'New phase').trim(),
          work:           (work || '').trim() || 'Yours to describe.',
          exit_condition: (exit_condition || '').trim() || 'Yours to write.',
          state:          'upcoming',
          authored_by:    'person',
        })
        .select('*')
        .single();

      if (error) {
        console.error('NextSteps phase add error:', error);
        return res.status(500).json({ error: 'Could not add that phase.' });
      }

      const ids = phases.map((p) => p.id);
      ids.splice(insertAt, 0, data.id);
      await renumber(track_id, ids);
      await bumpEdits(track_id);
      return res.json({ phases: await readRoute(track_id) });
    }

    // ── ratify ── the moment the route becomes the person's own
    if (action === 'ratify') {
      if (track.route_state === 'ratified') {
        return res.json({ route_state: 'ratified', phases: await readRoute(track_id) });
      }
      const phases = await readRoute(track_id);
      if (phases.length === 0) {
        return res.status(400).json({ error: 'There is no route to ratify yet.' });
      }
      const { error } = await supabase.rpc('nextsteps_ratify_route', { p_track_id: track_id });
      if (error) {
        console.error('NextSteps ratify error:', error);
        return res.status(500).json({ error: 'Could not ratify the route.' });
      }
      return res.json({
        route_state: 'ratified',
        route_edits: track.route_edits || 0,
        phases: await readRoute(track_id),
      });
    }

    // ── clear ── the owner has answered the exit condition true
    if (action === 'clear') {
      const { phase_id } = req.body;
      if (!phase_id) return res.status(400).json({ error: 'phase_id required' });
      const { phase } = await trackForPhase(phase_id, userId);
      if (!phase || phase.track_id !== track_id) {
        return res.status(404).json({ error: 'Phase not found on this route' });
      }
      if (phase.state !== 'current') {
        return res.status(400).json({ error: 'That is not the phase you are in.' });
      }
      const { data, error } = await supabase.rpc('nextsteps_clear_phase', { p_phase_id: phase_id });
      if (error) {
        console.error('NextSteps clear phase error:', error);
        return res.status(500).json({ error: 'Could not clear that phase.' });
      }
      const phases = await readRoute(track_id);
      return res.json({
        phases,
        next_phase_id: data || null,
        route_complete: !data,
      });
    }

    return res.status(400).json({ error: 'Unknown action' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
