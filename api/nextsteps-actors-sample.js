// NEXTUS: NEXTSTEPS — Actors Sample
// api/nextsteps-actors-sample.js
//
// Lightweight endpoint that returns a small sample of Atlas actors for
// the Domain Landing screen — the "not first, not alone" signal.
//
// Matches on:
//   - problem_chains overlap (preferred — closest to the person's
//     away-from concern)
//   - domain overlap (fallback when chains absent or sparse)
//
// Returns the actor's mission_statement (the forward-facing sentence)
// alongside the tagline. The Domain Landing prefers mission_statement
// when displaying.
//
// No auth required — this is public Atlas data.

export const config = { maxDuration: 15 }

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { domain, problem_chains, limit = 3 } = req.body || {};
  if (!domain && !(Array.isArray(problem_chains) && problem_chains.length)) {
    return res
      .status(400)
      .json({ error: 'domain or problem_chains required' });
  }

  const cap = Math.min(Math.max(parseInt(limit, 10) || 3, 1), 6);

  try {
    let query = supabase
      .from('nextus_actors')
      .select('id, slug, name, tagline, mission_statement, problem_chains, domains')
      .eq('status', 'live');

    const hasChains = Array.isArray(problem_chains) && problem_chains.length > 0;
    const hasDomain = !!domain;

    if (hasChains && hasDomain) {
      const chainFilter = `problem_chains.ov.{${problem_chains.join(',')}}`;
      const domainFilter = `domains.cs.{${domain}}`;
      query = query.or(`${chainFilter},${domainFilter}`);
    } else if (hasChains) {
      query = query.overlaps('problem_chains', problem_chains);
    } else {
      query = query.contains('domains', [domain]);
    }

    const { data, error } = await query
      .order('alignment_score', { ascending: false, nullsFirst: false })
      .limit(cap * 3); // overfetch so we can re-rank

    if (error) {
      console.error('NextSteps actors-sample error:', error);
      return res.status(500).json({ error: 'Could not load actors.' });
    }

    let actors = data || [];

    // Re-rank: chain-overlap actors first.
    if (hasChains) {
      const chainSet = new Set(problem_chains);
      const overlap = (a) =>
        (a.problem_chains || []).filter((c) => chainSet.has(c)).length;
      actors = actors.sort((a, b) => overlap(b) - overlap(a));
    }

    return res.json({ actors: actors.slice(0, cap) });
  } catch (err) {
    console.error('NextSteps actors-sample exception:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
};
