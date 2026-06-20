// src/app/components/admin/SeedTab.jsx
//
// Phase D bulk seeding. Paste a list of URLs (one per line), and for each the
// engine reads the source via /api/org-extract and writes every floor-meeting
// actor it proposes, with "Seeded by NextUs" provenance — the same record the
// Add tab produces, run at batch scale. Floor-meeting is the gate: a proposal
// without a name, a domain, and an image or description is skipped and listed
// for a manual pass, never force-admitted.
//
// Images are persisted as hotlinks from the source, so seeds are visible
// immediately; the public actor-images bucket (copying images in-house) is a
// later nicety, not a prerequisite.

import { useState } from 'react'
import { supabase } from '../../../hooks/useSupabase'
import { useAuth } from '../../../hooks/useAuth'
import { tokens, body, sc } from '../../../lib/designTokens'

const gold = tokens.gold
const hair = '1px solid rgba(200,146,42,0.18)'

function parseUrls(text) {
  return [...new Set(
    (text || '')
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean)
  )]
}

function meetsFloor(p) {
  const hasDomain = (p.domains && p.domains.length) || p.domain_id
  return !!(p.name?.trim() && hasDomain && (p.image_url || p.description))
}

export default function SeedTab({ toast }) {
  const { user } = useAuth()
  const [text, setText]       = useState('')
  const [running, setRunning] = useState(false)
  const [rows, setRows]       = useState([])   // { url, state, found, seeded, skipped, error }

  // Faithful copy of the Add tab's save payload, plus the source image and the
  // seed floor status. Returns { id, name } on success, null on error.
  async function commitProposal(p) {
    const domains = p.domains?.length ? p.domains : (p.domain_id ? [p.domain_id] : [])
    const payload = {
      name:            p.name.trim(),
      type:            p.type || 'organisation',
      track:           p.track || null,
      domain_id:       domains[0] || null,
      domains,
      subdomains:      p.subdomains || [],
      fields:          p.fields || [],
      lenses:          p.lenses || [],
      problem_chains:  p.problem_chains || [],
      platform_principles: p.platform_principles || [],
      scale:           p.scale || null,
      scale_notes:     p.scale_notes?.trim() || null,
      location_name:   p.location_name?.trim() || null,
      website:         p.website?.trim() || null,
      description:     p.description?.trim() || null,
      impact_summary:  p.impact_summary?.trim() || null,
      image_url:       p.image_url || null,
      image_provenance: p.image_url ? 'hotlink' : null,
      alignment_score: (p.alignment_score !== '' && p.alignment_score != null) ? parseFloat(p.alignment_score) : null,
      alignment_score_computed:   true,
      alignment_score_updated_at: new Date().toISOString(),
      placement_tier:  p.placement_tier || null,
      horizon_floor_status: 'compatible',
      seeded_by:       'nextus',
      vetting_status:  'approved',
      data_source:     `Seeded by NextUs${p.label ? `: ${p.label}` : ''}`,
      alignment_reasoning: {
        hal_signals:     p.hal_signals,
        sfp_patterns:    p.sfp_patterns,
        score_reasoning: p.score_reasoning,
        confidence:      p.confidence,
        confidence_note: p.confidence_note,
        extracted_at:    new Date().toISOString(),
        input_mode:      'admin_seed_batch',
        label:           p.label,
      },
    }
    const { data, error } = await supabase.from('nextus_actors').insert(payload).select('id').single()
    if (error) return { error: error.message }
    return { id: data.id, name: p.name }
  }

  // Write in-batch relationships (parent_id / confirmed relationship rows),
  // resolving both ends by name within the same URL's saved set.
  async function linkRelationships(proposals, saved) {
    if (!saved?.length) return
    const nameToId = {}
    for (const s of saved) if (s?.id && s.name) nameToId[s.name.trim().toLowerCase()] = s.id
    for (const p of proposals) {
      const fromId = nameToId[p.name?.trim().toLowerCase()]
      if (!fromId) continue
      for (const rel of (p.relationships || [])) {
        const toId = nameToId[rel.to_name?.trim().toLowerCase()]
        if (!toId || toId === fromId) continue
        if (rel.relationship_type === 'parent_child') {
          await supabase.from('nextus_actors').update({ parent_id: toId }).eq('id', fromId)
        } else if (rel.relationship_type === 'member_of' || rel.relationship_type === 'partner') {
          await supabase.from('nextus_relationships').insert({
            actor_id: fromId, related_actor_id: toId, relationship_type: rel.relationship_type,
            status: 'confirmed', initiated_by: user?.id || null, confirmed_by: user?.id || null,
            confirmed_at: new Date().toISOString(),
          }).then(({ error }) => { if (error) console.error('seed relationship failed', error) })
        }
      }
    }
  }

  async function run() {
    const urls = parseUrls(text)
    if (urls.length === 0) { toast('Paste at least one URL'); return }
    setRunning(true)
    setRows(urls.map(url => ({ url, state: 'queued', found: 0, seeded: 0, skipped: 0, error: null })))

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i]
      const patch = (u) => setRows(rs => rs.map((r, idx) => idx === i ? { ...r, ...u } : r))
      patch({ state: 'reading' })
      try {
        const res = await fetch('/api/org-extract', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ input: url }),
        })
        const data = await res.json()
        if (data.error) { patch({ state: 'error', error: data.message || 'Could not read the site' }); continue }
        const proposals = data.results || []
        patch({ found: proposals.length, state: 'saving' })

        const toSeed = proposals.filter(meetsFloor)
        const skipped = proposals.length - toSeed.length
        const saved = []
        for (const p of toSeed) {
          const out = await commitProposal(p)
          if (out?.id) saved.push(out)
        }
        await linkRelationships(toSeed, saved)
        patch({ state: 'done', seeded: saved.length, skipped })
      } catch {
        patch({ state: 'error', error: 'Could not reach the reading service' })
      }
    }
    setRunning(false)
    toast('Seed run complete')
  }

  const totals = rows.reduce((a, r) => ({
    seeded: a.seeded + (r.seeded || 0),
    skipped: a.skipped + (r.skipped || 0),
    errored: a.errored + (r.state === 'error' ? 1 : 0),
  }), { seeded: 0, skipped: 0, errored: 0 })

  const stateColor = { queued: 'rgba(15,21,35,0.45)', reading: gold, saving: gold, done: '#2A6A3A', error: '#A02020' }

  return (
    <div style={{ maxWidth: '720px' }}>
      <h2 style={{ ...body, fontSize: '22px', fontWeight: 400, color: '#0F1523', marginBottom: '8px' }}>
        Seed the Atlas
      </h2>
      <p style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.55)', lineHeight: 1.65, marginBottom: '20px' }}>
        Paste URLs, one per line. Each source is read and every floor-meeting actor it proposes is placed with
        "Seeded by NextUs" provenance, image hotlinked from the source. Anything that doesn't meet the floor is
        skipped and counted, so you can finish it by hand on the Add tab.
      </p>

      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder={'https://www.rewild.org\nhttps://www.indigenousclimateaction.com\n…'}
        rows={8}
        style={{ ...body, fontSize: '15px', color: tokens.dark, width: '100%', background: tokens.bgCard, border: hair, borderRadius: '10px', padding: '12px 14px', boxSizing: 'border-box', lineHeight: 1.6, resize: 'vertical' }}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '14px', flexWrap: 'wrap' }}>
        <button type="button" onClick={run} disabled={running}
          style={{ ...sc, fontSize: '15px', letterSpacing: '0.14em', color: '#FFFFFF', background: gold, border: `1.5px solid ${gold}`, borderRadius: '40px', padding: '12px 28px', cursor: running ? 'default' : 'pointer', opacity: running ? 0.5 : 1 }}>
          {running ? 'Seeding…' : `Run seed (${parseUrls(text).length})`}
        </button>
        {rows.length > 0 && !running && (
          <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.08em', color: 'rgba(15,21,35,0.55)' }}>
            {totals.seeded} seeded · {totals.skipped} skipped · {totals.errored} errored
          </span>
        )}
      </div>

      {rows.length > 0 && (
        <div style={{ marginTop: '22px', border: hair, borderRadius: '12px', overflow: 'hidden' }}>
          {rows.map((r, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderTop: i === 0 ? 'none' : hair }}>
              <span style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.78)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.url}</span>
              {r.state === 'done' && (
                <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.06em', color: 'rgba(15,21,35,0.55)' }}>
                  {r.seeded} seeded{r.skipped ? ` · ${r.skipped} skipped` : ''}
                </span>
              )}
              {r.state === 'error' && (
                <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.06em', color: '#A02020' }}>{r.error}</span>
              )}
              <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.1em', textTransform: 'uppercase', color: stateColor[r.state] || gold, minWidth: '70px', textAlign: 'right' }}>
                {r.state}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
