// NEXTUS: NEXTSTEPS — Problem-Chain Auto-Tagger
// api/nextsteps-tag-actor.js
//
// Reads an actor's forward-facing text (mission_statement, working_on_now,
// description, tagline, domains) and assigns the relevant problem_chains
// from the controlled vocabulary. Orgs are never asked to do this — the
// platform does the translation invisibly.
//
// Two modes:
//   POST { actor_id }            — tag one actor (admin re-tag button,
//                                  or auto-called when an actor is
//                                  created/updated)
//   POST { actor_ids: [...] }    — tag a batch (backfill / bulk re-tag)
//   POST { mode: 'all_untagged' } — tag every live actor that has zero
//                                  problem_chains set
//
// Requires service-role auth.
//
// Strategy:
//   1. Load the actor's forward-facing text.
//   2. Load the active controlled vocabulary.
//   3. Send both to Claude with a structured prompt asking which chains
//      genuinely apply (no fishing — false positives are worse than misses).
//   4. Write the result back to actor.problem_chains.

export const config = { maxDuration: 300 }

const Anthropic = require('@anthropic-ai/sdk');
const { createClient } = require('@supabase/supabase-js');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const TAGGER_SYSTEM = `You are tagging an actor (organisation, project, practitioner) on the NextUs Atlas with problem-chains from a controlled vocabulary.

A problem-chain represents an away-from concern people walk in with — e.g. "biodiversity loss," "wealth concentration," "loneliness." The actor describes themselves in toward language (what they build). Your job is to identify which away-from concerns this actor's work genuinely addresses, so people arriving with that concern can be matched to them.

RULES:

1. Only tag chains the actor's described work GENUINELY addresses. False positives are worse than misses. If an org makes solar panels, tag 'climate-inaction' and 'energy-injustice' if appropriate — do NOT tag 'biodiversity-loss' just because they're "environmental."

2. Use slugs exactly as given in the vocabulary. Do not invent new chains. If nothing in the vocabulary fits well, return an empty list — that's fine.

3. Most actors will match 1–5 chains. Some may match more. If you're tagging more than 8, you're probably fishing.

4. Be honest about ambiguity. Don't tag a chain just because the actor's domain is adjacent — tag it because their actual work addresses that specific concern.

OUTPUT: JSON only, no prose around it:

{
  "chains": ["slug-1", "slug-2", ...],
  "reasoning": "One sentence explaining the tagging — for admin visibility."
}`;

function buildTaggerPrompt(actor, vocabulary) {
  const vocabLines = vocabulary
    .map(
      (v) =>
        `  - ${v.slug}: ${v.label}${v.description ? ` — ${v.description}` : ''}`
    )
    .join('\n');

  return `ACTOR TO TAG:

Name:        ${actor.name}
Type:        ${actor.type}
Domains:     ${(actor.domains || []).join(', ') || '(none set)'}
Tagline:     ${actor.tagline || '(none)'}
Mission:     ${actor.mission_statement || '(none)'}
Working on:  ${actor.working_on_now || '(none)'}
Description: ${actor.description || '(none)'}

ACTIVE PROBLEM-CHAIN VOCABULARY:

${vocabLines}

Identify which chains this actor's work genuinely addresses. JSON only.`;
}

function tryParseTagResult(text) {
  if (!text) return null;
  let candidate = text.trim();
  candidate = candidate.replace(/^```(?:json)?\s*/i, '');
  candidate = candidate.replace(/```\s*$/, '');
  candidate = candidate.trim();
  if (!candidate.startsWith('{')) return null;

  try {
    const obj = JSON.parse(candidate);
    if (!obj || !Array.isArray(obj.chains)) return null;
    return {
      chains: obj.chains.filter((s) => typeof s === 'string'),
      reasoning: obj.reasoning || null,
    };
  } catch (_) {
    return null;
  }
}

async function tagOneActor(actorId, vocabulary) {
  const { data: actor, error } = await supabase
    .from('nextus_actors')
    .select(
      'id, slug, name, type, domains, tagline, mission_statement, working_on_now, description'
    )
    .eq('id', actorId)
    .maybeSingle();

  if (error || !actor) {
    return { actor_id: actorId, ok: false, reason: 'actor not found' };
  }

  // Skip actors with no substantive forward-facing text — there's nothing
  // for the model to read.
  const hasText =
    actor.mission_statement ||
    actor.working_on_now ||
    actor.description ||
    actor.tagline;
  if (!hasText) {
    return {
      actor_id: actorId,
      ok: true,
      chains: [],
      skipped: 'no forward-facing text to read',
    };
  }

  const userMsg = buildTaggerPrompt(actor, vocabulary);

  let response;
  try {
    response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 800,
      system: TAGGER_SYSTEM,
      messages: [{ role: 'user', content: userMsg }],
    });
  } catch (err) {
    console.error('Tagger model error:', err);
    return { actor_id: actorId, ok: false, reason: 'model call failed' };
  }

  const text = response.content[0]?.text || '';
  const parsed = tryParseTagResult(text);
  if (!parsed) {
    console.error('Tagger parse failed for', actorId, '— raw:', text);
    return { actor_id: actorId, ok: false, reason: 'unparseable response' };
  }

  // Filter chains to those actually in the active vocabulary
  // (defence against the model hallucinating slugs).
  const validSlugs = new Set(vocabulary.map((v) => v.slug));
  const chains = parsed.chains.filter((s) => validSlugs.has(s));

  const { error: updErr } = await supabase
    .from('nextus_actors')
    .update({ problem_chains: chains })
    .eq('id', actorId);

  if (updErr) {
    console.error('Tagger update error:', updErr);
    return { actor_id: actorId, ok: false, reason: 'update failed' };
  }

  return {
    actor_id: actorId,
    name: actor.name,
    ok: true,
    chains,
    reasoning: parsed.reasoning,
  };
}

async function loadVocabulary() {
  const { data, error } = await supabase
    .from('nextus_problem_chains')
    .select('slug, label, description')
    .eq('status', 'active')
    .order('slug');
  if (error) {
    console.error('Tagger vocab load error:', error);
    return [];
  }
  return data || [];
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { actor_id, actor_ids, mode } = req.body || {};
  const vocabulary = await loadVocabulary();

  if (vocabulary.length === 0) {
    return res
      .status(500)
      .json({ error: 'No active problem-chain vocabulary found.' });
  }

  // ── Single actor ──
  if (actor_id) {
    const result = await tagOneActor(actor_id, vocabulary);
    return res.json(result);
  }

  // ── Batch by IDs ──
  if (Array.isArray(actor_ids) && actor_ids.length > 0) {
    const results = [];
    for (const id of actor_ids) {
      const r = await tagOneActor(id, vocabulary);
      results.push(r);
    }
    return res.json({ count: results.length, results });
  }

  // ── Mode: all_untagged ──
  if (mode === 'all_untagged') {
    const { data: untagged, error } = await supabase
      .from('nextus_actors')
      .select('id')
      .eq('status', 'live')
      .or('problem_chains.is.null,problem_chains.eq.{}');
    if (error) {
      return res.status(500).json({ error: 'Could not list untagged actors.' });
    }
    const results = [];
    for (const a of untagged || []) {
      const r = await tagOneActor(a.id, vocabulary);
      results.push(r);
    }
    return res.json({ count: results.length, results });
  }

  return res
    .status(400)
    .json({ error: 'Provide actor_id, actor_ids, or mode=all_untagged.' });
};
