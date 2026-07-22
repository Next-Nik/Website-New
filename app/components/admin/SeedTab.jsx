// src/app/components/admin/SeedTab.jsx
//
// Phase D bulk seeding, with review. Paste a list of URLs (one per line); each
// source is read via /api/org-extract and every actor it proposes is collected
// into a review list — logo, profile, links, placement, score — the same content
// the single Add flow shows, at batch scale. Nothing is placed until you approve
// it. Floor-meeting proposals are pre-selected; below-floor ones are shown
// unticked and flagged, so you see everything before anything lands.

import { useState } from 'react'
import { supabase } from '../../../hooks/useSupabase'
import { useAuth } from '../../../hooks/useAuth'
import { tokens, body, sc } from '../../../lib/designTokens'

const goldText  = tokens.gold            // text only
const goldChrome = '#6E7F5C'             // borders / chrome
const hair = '1px solid rgba(76,107,69,0.18)'

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

// Normalised keys for duplicate detection. URL keeps the path so sub-orgs on a
// shared domain (e.g. a symposium at /regeneration27) stay distinct from the
// parent; name is trimmed and lower-cased.
function normUrl(u) {
  if (!u) return null
  try {
    const x = new URL(u.startsWith('http') ? u : `https://${u}`)
    return (x.hostname.replace(/^www\./, '') + x.pathname).toLowerCase().replace(/\/+$/, '') || null
  } catch { return null }
}
function normName(n) {
  const s = (n || '').trim().toLowerCase().replace(/\s+/g, ' ')
  return s || null
}
function isDuplicate(p, existing) {
  const u = normUrl(p.website)
  const n = normName(p.name)
  return !!((u && existing.urls.has(u)) || (n && existing.names.has(n)))
}

export default function SeedTab({ toast }) {
  const { user } = useAuth()
  const [text, setText]       = useState('')
  const [reading, setReading] = useState(false)
  const [placing, setPlacing] = useState(false)
  const [rows, setRows]       = useState([])   // per-URL read progress
  const [items, setItems]     = useState([])   // collected proposals awaiting review

  // Faithful copy of the Add tab's save payload, plus the source image and the
  // seed floor status. batchId stamps every record from one placing run so a
  // whole run can be audited or removed together. Returns { id, name } or { error }.
  async function commitProposal(p, batchId) {
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
        seed_batch_id:   batchId,
        seeded_at:       new Date().toISOString(),
      },
    }
    const { data, error } = await supabase.from('nextus_actors').insert(payload).select('id').single()
    if (error) return { error: error.message }
    return { id: data.id, name: p.name, image_url: payload.image_url }
  }

  // Write in-batch relationships, resolving both ends by name within the saved set.
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

  // Phase 1 — read every URL and collect proposals. Nothing is written.
  async function readAll() {
    const urls = parseUrls(text)
    if (urls.length === 0) { toast('Paste at least one URL'); return }
    setReading(true)
    setItems([])
    setRows(urls.map(url => ({ url, state: 'queued', found: 0, error: null })))

    // Snapshot what's already on the map so duplicates are flagged, not doubled.
    const existing = { urls: new Set(), names: new Set() }
    try {
      const { data } = await supabase.from('nextus_actors').select('name, website').limit(5000)
      for (const a of (data || [])) {
        const u = normUrl(a.website); if (u) existing.urls.add(u)
        const n = normName(a.name);   if (n) existing.names.add(n)
      }
    } catch {}

    const collected = []
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i]
      const patch = (u) => setRows(rs => rs.map((r, idx) => idx === i ? { ...r, ...u } : r))
      patch({ state: 'reading' })
      try {
        const res = await fetch('/api/org-extract', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ input: url }),
        })
        // Read text first so a non-JSON timeout surfaces clearly, not as a crash.
        const raw = await res.text()
        let data
        try { data = JSON.parse(raw) }
        catch { patch({ state: 'error', error: res.status === 504 ? 'Timed out' : 'Unexpected response' }); continue }
        if (data.error) { patch({ state: 'error', error: data.message || 'Could not read the site' }); continue }
        const proposals = data.results || []
        proposals.forEach((p, j) => {
          const dup = isDuplicate(p, existing)
          collected.push({
            ...p,
            _sourceUrl: url,
            _key: `${i}-${j}`,
            _duplicate: dup,
            _checked: meetsFloor(p) && !dup,
          })
          // Track within-batch so the same actor read twice also flags.
          const u = normUrl(p.website); if (u) existing.urls.add(u)
          const n = normName(p.name);   if (n) existing.names.add(n)
        })
        patch({ state: 'done', found: proposals.length })
        setItems([...collected])
      } catch {
        patch({ state: 'error', error: 'Could not reach the reading service' })
      }
    }
    setReading(false)
    toast(`Read complete · ${collected.length} record${collected.length !== 1 ? 's' : ''} to review`)
  }

  function toggle(key) {
    setItems(its => its.map(it => it._key === key ? { ...it, _checked: !it._checked } : it))
  }

  // Phase 2 — place only the approved records. Relationships resolve within the
  // group that came from the same source URL. Every record in this run shares one
  // batch id, and each placed image is rehosted into our bucket so it can't rot.
  async function placeSelected() {
    const chosen = items.filter(it => it._checked)
    if (!chosen.length) { toast('Select at least one first'); return }
    setPlacing(true)
    const batchId = `seed_${new Date().toISOString().replace(/[:.]/g, '-')}`
    const bySource = {}
    for (const it of chosen) (bySource[it._sourceUrl] = bySource[it._sourceUrl] || []).push(it)
    let seeded = 0
    const placed = []
    for (const url of Object.keys(bySource)) {
      const group = bySource[url]
      const saved = []
      for (const p of group) {
        const out = await commitProposal(p, batchId)
        if (out?.id) { saved.push(out); placed.push(out); seeded++ }
        else if (out?.error) toast(`Error placing ${p.name}: ${out.error}`)
      }
      await linkRelationships(group, saved)
    }
    // Rehost hotlinked logos into the actor-images bucket so they survive the
    // source site changing. Fire-and-forget — the record is already live.
    let rehostToken = null
    try { rehostToken = (await supabase.auth.getSession()).data.session?.access_token || null } catch {}
    for (const a of placed) {
      if (!a.image_url) continue
      fetch('/api/actor-image-upload', {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...(rehostToken ? { Authorization: `Bearer ${rehostToken}` } : {}) },
        body: JSON.stringify({ actorId: a.id }),
      }).catch(() => {})
    }
    setPlacing(false)
    const placedKeys = new Set(chosen.map(c => c._key))
    setItems(its => its.filter(it => !placedKeys.has(it._key)))
    toast(`${seeded} record${seeded !== 1 ? 's' : ''} placed · images rehosting`)
  }

  const selectedCount = items.filter(it => it._checked).length
  const stateColor = { queued: 'rgba(15,21,35,0.55)', reading: goldText, done: '#2A6A3A', error: '#A02020' }

  return (
    <div style={{ maxWidth: '760px' }}>
      <h2 style={{ ...body, fontSize: '22px', fontWeight: 400, color: '#0F1523', marginBottom: '8px' }}>
        Seed the Atlas
      </h2>
      <p style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.55)', lineHeight: 1.65, marginBottom: '20px' }}>
        Paste URLs, one per line. Each source is read and every actor it proposes is collected below for review —
        logo, profile, links, placement. Nothing is placed until you approve it. Tick the ones you want and place
        them; floor-meeting records are pre-selected, anything below floor is shown unticked and flagged.
      </p>

      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder={'https://www.rewild.org\nhttps://www.indigenousclimateaction.com\n…'}
        rows={8}
        style={{ ...body, fontSize: '15px', color: tokens.dark, width: '100%', background: tokens.bgCard, border: hair, borderRadius: '10px', padding: '12px 14px', boxSizing: 'border-box', lineHeight: 1.6, resize: 'vertical' }}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '14px', flexWrap: 'wrap' }}>
        <button type="button" onClick={readAll} disabled={reading || placing}
          style={{ ...sc, fontSize: '15px', letterSpacing: '0.14em', color: '#FFFFFF', background: goldChrome, border: `1.5px solid ${goldChrome}`, borderRadius: '40px', padding: '12px 28px', cursor: (reading || placing) ? 'default' : 'pointer', opacity: (reading || placing) ? 0.5 : 1 }}>
          {reading ? 'Reading…' : `Read all (${parseUrls(text).length})`}
        </button>
        {items.length > 0 && (
          <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.08em', color: 'rgba(15,21,35,0.55)' }}>
            {items.length} to review · {selectedCount} selected
          </span>
        )}
      </div>

      {/* Per-URL read progress */}
      {rows.length > 0 && (
        <div style={{ marginTop: '22px', border: hair, borderRadius: '12px', overflow: 'hidden' }}>
          {rows.map((r, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 16px', borderTop: i === 0 ? 'none' : hair }}>
              <span style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.78)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.url}</span>
              {r.state === 'done' && (
                <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.06em', color: 'rgba(15,21,35,0.55)' }}>
                  {r.found} found
                </span>
              )}
              {r.state === 'error' && (
                <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.06em', color: '#A02020' }}>{r.error}</span>
              )}
              <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.1em', textTransform: 'uppercase', color: stateColor[r.state] || goldText, minWidth: '64px', textAlign: 'right' }}>
                {r.state}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Review surface — the generated profiles, approved before they land */}
      {items.length > 0 && (
        <>
          <div style={{ marginTop: '28px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {items.map(it => (
              <ReviewCard key={it._key} item={it} onToggle={() => toggle(it._key)} />
            ))}
          </div>

          <div style={{ marginTop: '20px', paddingTop: '14px', borderTop: hair, display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <button type="button" onClick={placeSelected} disabled={placing || selectedCount === 0}
              style={{ ...sc, fontSize: '14px', letterSpacing: '0.16em', color: '#FFFFFF',
                background: (placing || selectedCount === 0) ? 'rgba(76,107,69,0.30)' : goldChrome,
                border: 'none', borderRadius: '40px', padding: '13px 32px',
                cursor: (placing || selectedCount === 0) ? 'not-allowed' : 'pointer' }}>
              {placing ? 'Placing…' : `Place ${selectedCount} selected`}
            </button>
            <span style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.55)' }}>
              Placed records carry "Seeded by NextUs" and land on the map.
            </span>
          </div>
        </>
      )}
    </div>
  )
}

// ── Review card — what's being generated, before it lands ──────
function ReviewCard({ item, onToggle }) {
  const floorOk = meetsFloor(item)
  const links = item.links || []
  const domains = item.domains?.length ? item.domains : (item.domain_id ? [item.domain_id] : [])
  const host = (() => { try { return new URL(item._sourceUrl.startsWith('http') ? item._sourceUrl : `https://${item._sourceUrl}`).hostname.replace(/^www\./, '') } catch { return item._sourceUrl } })()

  return (
    <div style={{
      background: item._checked ? '#FFFFFF' : 'rgba(15,21,35,0.03)',
      border: item._checked ? '1.5px solid rgba(76,107,69,0.40)' : '1.5px solid rgba(15,21,35,0.12)',
      borderRadius: '14px', padding: '16px 18px',
      opacity: item._checked ? 1 : 0.7,
      display: 'flex', gap: '14px', alignItems: 'flex-start',
    }}>
      <input type="checkbox" checked={item._checked} onChange={onToggle}
        style={{ width: '18px', height: '18px', accentColor: goldChrome, marginTop: '3px', flexShrink: 0, cursor: 'pointer' }} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          {/* Logo / image being placed */}
          <div style={{ flexShrink: 0, width: '52px', height: '52px', borderRadius: '8px',
            border: '1px solid rgba(76,107,69,0.30)', background: '#FFFFFF',
            overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {item.image_url
              ? <img src={item.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  onError={e => { e.currentTarget.style.display = 'none' }} />
              : <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.08em', color: 'rgba(15,21,35,0.55)' }}>NONE</span>}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ ...body, fontSize: '18px', color: '#0F1523' }}>{item.name || 'Untitled'}</span>
              {item.type && (
                <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(15,21,35,0.55)' }}>
                  {item.type}
                </span>
              )}
              {item.alignment_score != null && item.alignment_score !== '' && (
                <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.10em', color: goldText }}>
                  {item.alignment_score}/10
                </span>
              )}
            </div>
            {item.tagline && (
              <div style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.70)', lineHeight: 1.4, marginTop: '3px' }}>
                {item.tagline}
              </div>
            )}
            <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.10em', color: item._duplicate ? '#8A6020' : 'rgba(15,21,35,0.55)', marginTop: '4px' }}>
              from {host}{item._duplicate ? ' · already on the map' : (!floorOk ? ' · below floor' : '')}
            </div>
          </div>
        </div>

        {item.description && (
          <p style={{ ...body, fontSize: '14px', color: '#0F1523', lineHeight: 1.6, margin: '11px 0 0' }}>
            {item.description}
          </p>
        )}

        {domains.length > 0 && (
          <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.06em', color: 'rgba(15,21,35,0.60)', marginTop: '9px' }}>
            {domains.join(' · ')}{item.scale ? `  ·  ${item.scale}` : ''}
          </div>
        )}

        {links.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '9px' }}>
            {links.map((l, i) => (
              <span key={i} style={{ ...sc, fontSize: '13px', letterSpacing: '0.08em', textTransform: 'uppercase',
                color: goldText, background: 'rgba(76,107,69,0.06)',
                border: '1px solid rgba(76,107,69,0.30)', borderRadius: '40px', padding: '3px 10px' }}>
                {(l.link_type || 'link').replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
