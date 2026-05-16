// NEXTUS: NEXTSTEPS — Actors Sample
// api/nextsteps-actors-sample.js
//
// Lightweight endpoint that returns a small sample of Atlas actors in a
// given domain. Used by the Domain Landing screen to surface the
// "not first, not alone" signal — 1–3 actors with name + tagline.
//
// No auth required — this is public Atlas data.

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { domain, limit = 3 } = req.body || {};
  if (!domain) return res.status(400).json({ error: 'domain required' });

  try {
    const { data, error } = await supabase
      .from('nextus_actors')
      .select('id, slug, name, tagline')
      .eq('status', 'live')
      .contains('domains', [domain])
      .order('alignment_score', { ascending: false, nullsFirst: false })
      .limit(Math.min(Math.max(parseInt(limit, 10) || 3, 1), 6));

    if (error) {
      console.error('NextSteps actors-sample error:', error);
      return res.status(500).json({ error: 'Could not load actors.' });
    }
    return res.json({ actors: data || [] });
  } catch (err) {
    console.error('NextSteps actors-sample exception:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
};
