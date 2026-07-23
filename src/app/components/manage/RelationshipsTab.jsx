// src/app/components/manage/RelationshipsTab.jsx
//
// Owner-managed relationships. Two mechanisms:
//   · Parent ("part of") is self-asserted — a column on the actor row.
//   · Partners and memberships are propose-then-confirm rows in
//     nextus_relationships; the other party has to confirm before they show
//     publicly. Children (actors who name this one as parent) are read-only here
//     — they set that on their own profile.
//
// Mounted only when the current user owns the profile (or stewards it). The
// owner-by-actor RLS in migration 150 is what lets the target of a pending
// proposal see and confirm it.

import { useState, useEffect } from 'react'
import { supabase } from '../../../hooks/useSupabase'
import { useAuth } from '../../../hooks/useAuth'
import { body, sc, gold, dark, Label, Hint, Btn } from '../OrgShared'

const PROPOSE_TYPES = [
  { value: 'partner',   label: 'Partner' },
  { value: 'member_of', label: 'Member of' },
]

// One-line description of a relationship from this actor's point of view.
function describe(rel, meId, nameById) {
  const iAmSource = rel.actor_id === meId
  const other     = nameById[iAmSource ? rel.related_actor_id : rel.actor_id]
  const name      = other?.name || 'Unknown actor'
  if (rel.relationship_type === 'partner')   return `Partner · ${name}`
  if (rel.relationship_type === 'member_of') return iAmSource ? `Member of ${name}` : `${name} · member`
  if (rel.relationship_type === 'parent_child') return iAmSource ? `Part of ${name}` : `Includes ${name}`
  return name
}

const cardStyle = {
  background: '#FFFFFF', border: '1px solid rgba(76,107,69,0.25)',
  borderRadius: '10px', padding: '14px 16px', display: 'flex',
  alignItems: 'center', justifyContent: 'space-between', gap: '12px',
}
const rowText = { ...body, fontSize: '15px', color: dark }

export function RelationshipsTab({ actor, onSave, toast }) {
  const { user } = useAuth()
  const [rels, setRels]         = useState([])
  const [parent, setParent]     = useState(null)
  const [children, setChildren] = useState([])
  const [nameById, setNameById] = useState({})
  const [loading, setLoading]   = useState(true)
  const [busy, setBusy]         = useState(false)

  const [proposeType, setProposeType] = useState('partner')
  const [query, setQuery]   = useState('')
  const [results, setResults] = useState([])

  async function load() {
    setLoading(true)
    const { data: r } = await supabase
      .from('nextus_relationships')
      .select('*')
      .or(`actor_id.eq.${actor.id},related_actor_id.eq.${actor.id}`)
      .neq('status', 'severed')
    const rows = r || []

    const ids = [...new Set(rows.flatMap(x => [x.actor_id, x.related_actor_id]))]
    const names = {}
    if (ids.length) {
      const { data: as } = await supabase.from('nextus_actors').select('id, name, slug').in('id', ids)
      for (const a of (as || [])) names[a.id] = a
    }

    let p = null
    if (actor.parent_id) {
      const { data: pa } = await supabase.from('nextus_actors').select('id, name, slug').eq('id', actor.parent_id).maybeSingle()
      p = pa || null
    }
    const { data: kids } = await supabase.from('nextus_actors')
      .select('id, name, slug').eq('parent_id', actor.id).eq('status', 'live')

    setRels(rows); setNameById(names); setParent(p); setChildren(kids || []); setLoading(false)
  }
  useEffect(() => { load() }, [actor.id])

  useEffect(() => {
    let active = true
    const q = query.trim()
    if (q.length < 2) { setResults([]); return }
    supabase.from('nextus_actors').select('id, name, slug, type')
      .ilike('name', `%${q}%`).neq('id', actor.id).limit(8)
      .then(({ data }) => { if (active) setResults(data || []) })
    return () => { active = false }
  }, [query, actor.id])

  async function setParentActor(target) {
    setBusy(true)
    const { error } = await supabase.from('nextus_actors')
      .update({ parent_id: target.id, updated_at: new Date().toISOString() }).eq('id', actor.id)
    setBusy(false)
    if (error) { toast('Could not set parent'); return }
    toast(`Part of ${target.name}`); setQuery(''); setResults([]); onSave?.(); load()
  }
  async function clearParent() {
    setBusy(true)
    await supabase.from('nextus_actors').update({ parent_id: null, updated_at: new Date().toISOString() }).eq('id', actor.id)
    setBusy(false); toast('Parent removed'); onSave?.(); load()
  }
  async function propose(target) {
    setBusy(true)
    const { error } = await supabase.from('nextus_relationships').insert({
      actor_id: actor.id, related_actor_id: target.id,
      relationship_type: proposeType, status: 'pending', initiated_by: user?.id || null,
    })
    setBusy(false)
    if (error) { toast(error.message || 'Could not propose'); return }
    toast(`Proposed · awaiting ${target.name}`); setQuery(''); setResults([]); load()
  }
  async function confirmRel(rel) {
    setBusy(true)
    const { error } = await supabase.from('nextus_relationships')
      .update({ status: 'confirmed', confirmed_by: user?.id || null, confirmed_at: new Date().toISOString() }).eq('id', rel.id)
    setBusy(false)
    if (error) { toast('Could not confirm'); return }
    toast('Confirmed'); load()
  }
  async function severRel(rel) {
    setBusy(true)
    await supabase.from('nextus_relationships').update({ status: 'severed' }).eq('id', rel.id)
    setBusy(false); toast('Removed'); load()
  }

  const incoming  = rels.filter(r => r.related_actor_id === actor.id && r.status === 'pending')
  const confirmed = rels.filter(r => r.status === 'confirmed')
  const outPending = rels.filter(r => r.actor_id === actor.id && r.status === 'pending')

  if (loading) return <p style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.55)' }}>Loading relationships…</p>

  return (
    <div style={{ maxWidth: '620px', display: 'flex', flexDirection: 'column', gap: '32px' }}>

      {/* Parent — self-asserted */}
      <div>
        <Label>Part of</Label>
        <Hint>The organisation or collective this profile belongs under. You set this yourself.</Hint>
        {parent ? (
          <div style={{ ...cardStyle, marginTop: '8px' }}>
            <span style={rowText}>{parent.name}</span>
            <Btn small variant="ghost" onClick={clearParent} disabled={busy}>Remove</Btn>
          </div>
        ) : (
          <p style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.55)', marginTop: '8px' }}>
            Not set. Search below and choose "Set as parent".
          </p>
        )}
      </div>

      {/* Incoming requests */}
      {incoming.length > 0 && (
        <div>
          <Label>Requests to you</Label>
          <Hint>Someone wants to link their profile to yours. It shows publicly once you confirm.</Hint>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
            {incoming.map(rel => (
              <div key={rel.id} style={cardStyle}>
                <span style={rowText}>{describe(rel, actor.id, nameById)}</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Btn small onClick={() => confirmRel(rel)} disabled={busy}>Confirm</Btn>
                  <Btn small variant="ghost" onClick={() => severRel(rel)} disabled={busy}>Decline</Btn>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirmed links */}
      <div>
        <Label>Partners & memberships</Label>
        <Hint>Confirmed links. These appear on your public profile.</Hint>
        {confirmed.length === 0 && outPending.length === 0 ? (
          <p style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.55)', marginTop: '8px' }}>
            None yet. Propose one below.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
            {confirmed.map(rel => (
              <div key={rel.id} style={cardStyle}>
                <span style={rowText}>{describe(rel, actor.id, nameById)}</span>
                <Btn small variant="ghost" onClick={() => severRel(rel)} disabled={busy}>Remove</Btn>
              </div>
            ))}
            {outPending.map(rel => (
              <div key={rel.id} style={{ ...cardStyle, opacity: 0.7 }}>
                <span style={rowText}>
                  {describe(rel, actor.id, nameById)}
                  <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.10em', color: gold, marginLeft: '10px', textTransform: 'uppercase' }}>pending</span>
                </span>
                <Btn small variant="ghost" onClick={() => severRel(rel)} disabled={busy}>Withdraw</Btn>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Children — read only */}
      {children.length > 0 && (
        <div>
          <Label>Includes</Label>
          <Hint>Profiles that name yours as their parent. They manage this themselves.</Hint>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
            {children.map(c => (
              <div key={c.id} style={cardStyle}><span style={rowText}>{c.name}</span></div>
            ))}
          </div>
        </div>
      )}

      {/* Propose / search */}
      <div>
        <Label>Add a link</Label>
        <Hint>Set a parent, or propose a partnership or membership for the other party to confirm.</Hint>
        <div style={{ display: 'flex', gap: '10px', marginTop: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
          {PROPOSE_TYPES.map(t => (
            <button key={t.value} type="button" onClick={() => setProposeType(t.value)}
              style={{ ...sc, fontSize: '13px', letterSpacing: '0.10em', padding: '7px 16px', borderRadius: '40px',
                cursor: 'pointer', background: proposeType === t.value ? '#4c6b45' : '#FFFFFF',
                color: proposeType === t.value ? '#FFFFFF' : '#2B4A42',
                border: `1px solid ${proposeType === t.value ? '#4c6b45' : 'rgba(76,107,69,0.40)'}` }}>
              {t.label}
            </button>
          ))}
        </div>
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by name…"
          style={{ ...body, fontSize: '15px', color: dark, width: '100%', background: '#FFFFFF',
            border: '1.5px solid rgba(76,107,69,0.35)', borderRadius: '8px', padding: '10px 14px',
            boxSizing: 'border-box', outline: 'none' }} />
        {results.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
            {results.map(r => (
              <div key={r.id} style={cardStyle}>
                <span style={rowText}>
                  {r.name}
                  {r.type && <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.10em', color: 'rgba(15,21,35,0.55)', marginLeft: '8px', textTransform: 'uppercase' }}>{r.type}</span>}
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Btn small variant="ghost" onClick={() => setParentActor(r)} disabled={busy}>Set as parent</Btn>
                  <Btn small onClick={() => propose(r)} disabled={busy}>
                    {proposeType === 'partner' ? 'Propose partner' : 'Propose membership'}
                  </Btn>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
